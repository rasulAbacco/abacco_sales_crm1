import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import dotenv from "dotenv";
import pLimit from "p-limit";
import fs from "fs";
import path from "path";
import { uploadToR2WithHash, generateHash } from "./r2.js";

dotenv.config();

// ======================================================
// 📂 LOGGING SETUP
// ======================================================
const LOG_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const ERROR_LOG_FILE = path.join(LOG_DIR, "imap-errors.log");

function logErrorToFile(accountEmail, errorMsg) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${accountEmail}] ${errorMsg}\n`;
  console.error(`❌ [${accountEmail}] ${errorMsg}`);
  fs.appendFile(ERROR_LOG_FILE, logEntry, (err) => {
    if (err) console.error("Failed to write to log file:", err);
  });
}

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const ACCOUNT_CONCURRENCY = Number(process.env.IMAP_ACCOUNT_CONCURRENCY) || 2;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* ======================================================
   🔥 HELPER: FIND CONVERSATION
====================================================== */
async function findConversationId(prisma, parsed) {
  const inReplyTo = parsed.inReplyTo || null;
  let referencesArray = [];
  if (Array.isArray(parsed.references)) {
    referencesArray = parsed.references;
  } else if (typeof parsed.references === "string") {
    referencesArray = parsed.references.split(/\s+/).filter(Boolean);
  }

  const threadIdsToCheck = [
    inReplyTo,
    ...[...referencesArray].reverse(),
  ].filter(Boolean);

  if (threadIdsToCheck.length === 0) return null;

  const conversation = await prisma.conversation.findFirst({
    where: { id: { in: threadIdsToCheck } },
    select: { id: true },
  });

  return conversation?.id || null;
}

/* ======================================================
   🔥 HELPER: CREATE MISSING CONVERSATION
====================================================== */
async function createNewConversation(
  prisma,
  account,
  parsed,
  messageId,
  fromEmail,
  toEmail
) {
  try {
    const subject = parsed.subject || "(No Subject)";
    const sentAt = parsed.date || new Date();
    const accountId = Number(account.id);

    // Optimized: No extra DB check here. Prisma throws error if account missing.
    const newConv = await prisma.conversation.create({
      data: {
        id: messageId,
        emailAccountId: accountId,
        subject,
        participants: [fromEmail, toEmail].filter(Boolean).join(","),
        toRecipients: toEmail,
        initiatorEmail: fromEmail,
        lastMessageAt: sentAt,
        messageCount: 1,
        unreadCount: 1,
      },
    });
    return newConv.id;
  } catch (err) {
    if (err.code === "P2002") return messageId;
    throw err;
  }
}

/* ======================================================
   CORE: SAVE EMAIL TO DB
====================================================== */
async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
  const messageId =
    parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;

  // 1️⃣ Check if message exists
  const exists = await prisma.emailMessage.findUnique({
    where: {
      emailAccountId_messageId: {
        emailAccountId: account.id,
        messageId,
      },
    },
  });

  // 🔥 FIX: If message exists but has NO name, update it!
  if (exists) {
    const fromObj = parsed.from?.value?.[0];
    const fromName = fromObj?.name || null;

    if (fromName && !exists.fromName) {
      console.log(`🔧 Fixing missing name for message: ${messageId}`);
      await prisma.emailMessage.update({
        where: { id: exists.id },
        data: { fromName },
      });
    }
    return; // Message handled
  }

  // 2️⃣ Extract Info
  const fromObj = parsed.from?.value?.[0];
  const fromName = fromObj?.name || null;
  const fromEmail = fromObj?.address || "";

  const toRecipients = parsed.to?.value || [];
  const toEmail = toRecipients.map((v) => v.address).join(", ") || "";
  const toName = toRecipients[0]?.name || null;

  const ccRecipients = parsed.cc?.value || [];
  const ccEmail = ccRecipients.map((v) => v.address).join(", ") || "";

  // 3️⃣ Find Matching Lead
  let leadDetailId = null;
  try {
    const emailsToMatch = [];
    if (fromEmail) emailsToMatch.push(fromEmail.toLowerCase());
    toEmail
      .split(",")
      .forEach((e) => e.trim() && emailsToMatch.push(e.trim().toLowerCase()));
    ccEmail
      .split(",")
      .forEach((e) => e.trim() && emailsToMatch.push(e.trim().toLowerCase()));

    if (emailsToMatch.length) {
      const lead = await prisma.leadDetails.findFirst({
        where: {
          OR: [{ email: { in: emailsToMatch } }, { cc: { in: emailsToMatch } }],
        },
        select: { id: true },
      });
      leadDetailId = lead?.id || null;
    }
  } catch (err) {
    logErrorToFile(account.email, `Lead match failed: ${err.message}`);
  }

  // 4️⃣ Process Attachments
  let attachmentsMeta = [];
  if (parsed.attachments?.length) {
    for (const att of parsed.attachments) {
      if (!att.content) continue;
      const contentHash = generateHash(att.content);
      const uniqueKey = `${contentHash}-${account.id}-${Date.now()}`;
      try {
        const storageUrl = await uploadToR2WithHash(
          att.content,
          att.contentType || "application/octet-stream",
          uniqueKey
        );
        attachmentsMeta.push({
          filename: att.filename || "file",
          mimeType: att.contentType || "application/octet-stream",
          size: att.content.length,
          storageUrl,
          hash: contentHash,
        });
      } catch (e) {
        logErrorToFile(
          account.email,
          `R2 Failed (${att.filename}): ${e.message}`
        );
      }
    }
  }

  // 5️⃣ Find/Create Conversation
  let conversationId = await findConversationId(prisma, parsed);
  if (!conversationId) {
    try {
      conversationId = await createNewConversation(
        prisma,
        account,
        parsed,
        messageId,
        fromEmail,
        toEmail
      );
    } catch (err) {
      logErrorToFile(
        account.email,
        `Failed to create conversation: ${err.message}`
      );
      return;
    }
  }

  // 6️⃣ Save Message
  try {
    await prisma.emailMessage.create({
      data: {
        emailAccountId: account.id,
        conversationId,
        messageId,
        subject: parsed.subject || "(No Subject)",
        fromEmail,
        fromName, // ✅ Name Saved
        toEmail,
        toName,
        ccEmail,
        body: parsed.html || parsed.textAsHtml || parsed.text,
        direction,
        folder,
        sentAt: parsed.date || new Date(),
        leadDetailId,
        attachments: attachmentsMeta.length
          ? { create: attachmentsMeta }
          : undefined,
      },
    });

    await prisma.conversation
      .update({
        where: { id: conversationId },
        data: {
          lastMessageAt: parsed.date || new Date(),
          messageCount: { increment: 1 },
        },
      })
      .catch(() => {});
  } catch (err) {
    if (err.code !== "P2002")
      logErrorToFile(account.email, `DB Save Error: ${err.message}`);
  }
}

/* ======================================================
   CORE: SYNC IMAP ACCOUNT
====================================================== */
const activeSyncs = new Set();

async function syncImap(prisma, account) {
  if (activeSyncs.has(account.id)) return;

  // ✅ CRITICAL FIX: Verify account exists to prevent zombie processes
  const freshAccount = await prisma.emailAccount.findUnique({
    where: { id: account.id },
  });
  if (!freshAccount) {
    console.log(
      `⚠️ Aborting sync: Account ${account.email} (ID ${account.id}) was deleted.`
    );
    return;
  }

  activeSyncs.add(account.id);
  console.log(`🔄 Syncing: ${account.email}`);

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort || 993,
    secure: true,
    auth: {
      user: account.imapUser || account.email,
      pass: account.encryptedPass,
    },
    tls: { rejectUnauthorized: false },
    logger: false,
    socketTimeout: 60000,
    connectionTimeout: 30000,
  });

  client.on("error", (err) =>
    logErrorToFile(account.email, `IMAP Error: ${err.message}`)
  );

  try {
    await client.connect();
    const mailboxes = await client.list();
    const foldersToSync = [];

    for (const box of mailboxes) {
      const lowerPath = box.path.toLowerCase();
      if (lowerPath === "inbox" || box.specialUse === "\\Inbox")
        foldersToSync.push({ path: box.path, type: "inbox" });
      else if (lowerPath.includes("sent") || box.specialUse === "\\Sent")
        foldersToSync.push({ path: box.path, type: "sent" });
      else if (lowerPath.includes("spam") || box.specialUse === "\\Junk")
        foldersToSync.push({ path: box.path, type: "spam" });
    }

    for (const { path, type } of foldersToSync) {
      if (!client.usable) break;
      const lock = await client.getMailboxLock(path);
      try {
        await client.mailboxOpen(path);
        const uids = await client.search({ all: true });
        if (uids.length > 0) {
          const reversedUids = uids.reverse();
          const SMALL_BATCH = 2;
          const STABLE_LIMIT = pLimit(1);
          const THROTTLE_MS = 1000;

          for (let i = 0; i < reversedUids.length; i += SMALL_BATCH) {
            if (!client.usable) break;
            const batch = reversedUids.slice(i, i + SMALL_BATCH);
            await Promise.all(
              batch.map((uid) =>
                STABLE_LIMIT(async () => {
                  try {
                    if (!client.usable) return;
                    await new Promise((resolve) =>
                      setTimeout(resolve, THROTTLE_MS)
                    );
                    const msg = await client.fetchOne(String(uid), {
                      uid: true,
                      source: true,
                      envelope: true,
                      internalDate: true,
                    });
                    if (!msg) return;
                    const parsed = await simpleParser(msg.source);
                    const fromAddr =
                      parsed.from?.value?.[0]?.address?.toLowerCase() || "";
                    const direction =
                      fromAddr === account.email.toLowerCase()
                        ? "sent"
                        : "received";
                    await saveEmailToDB(
                      prisma,
                      account,
                      parsed,
                      msg,
                      direction,
                      type
                    );
                  } catch (e) {
                    if (e.message.includes("Connection not available"))
                      client.close();
                    logErrorToFile(
                      account.email,
                      `UID ${uid} Failed: ${e.message}`
                    );
                  }
                })
              )
            );
          }
        }
      } finally {
        if (lock) lock.release();
      }
    }
  } catch (err) {
    logErrorToFile(account.email, `Sync Fatal Error: ${err.message}`);
  } finally {
    activeSyncs.delete(account.id);
    if (client) await client.logout().catch(() => {});
    console.log(`✅ Finished: ${account.email}`);
  }
}

export async function runSync(prisma) {
  const accounts = await prisma.emailAccount.findMany({
    where: { verified: true },
  });
  const limit = pLimit(ACCOUNT_CONCURRENCY);
  await Promise.allSettled(
    accounts.map((acc) => limit(() => syncImap(prisma, acc)))
  );
}

export async function runSyncForAccount(prisma, email) {
  const acc = await prisma.emailAccount.findUnique({ where: { email } });
  if (acc) await syncImap(prisma, acc);
}
