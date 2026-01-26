import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import dotenv from "dotenv";
import pLimit from "p-limit";
import fs from "fs";
import path from "path";
import { htmlToText } from "html-to-text";
import { uploadToR2WithHash, generateHash } from "./r2.js";
import { notifyNewEmail } from "../services/notification.service.js";

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
   🔥 HELPER: FIND CONVERSATION (Account-Independent)
====================================================== */
async function findConversationId(prisma, parsed) {
  const inReplyTo = parsed.inReplyTo || null;
  let referencesArray = [];

  if (Array.isArray(parsed.references)) {
    referencesArray = parsed.references;
  } else if (typeof parsed.references === "string") {
    referencesArray = parsed.references.split(/\s+/).filter(Boolean);
  }

  // ✅ NO account prefix - just pure Message-IDs
  const threadIdsToCheck = [
    inReplyTo,
    ...[...referencesArray].reverse(),
  ].filter(Boolean);

  if (threadIdsToCheck.length === 0) return null;

  // ✅ Search across ALL accounts (no emailAccountId filter)
  // ✅ FIX: resolve conversation via EmailMessage (ROOT-safe)
  const msg = await prisma.emailMessage.findFirst({
    where: {
      OR: [
        { messageId: { in: threadIdsToCheck } },
        { inReplyTo: { in: threadIdsToCheck } },
        {
          references: {
            contains: threadIdsToCheck[threadIdsToCheck.length - 1],
          },
        },
      ],
      conversationId: { not: null },
    },
    select: { conversationId: true },
    orderBy: { sentAt: "asc" }, // root message wins
  });

  const conversationId = msg?.conversationId || null;

return conversationId;
}
function normalizeEmailHtml(html) {
  if (!html) return "";

  return (
    html
      // Remove Outlook-specific junk
      .replace(/<o:p>.*?<\/o:p>/gi, "")
      // Normalize block spacing (Outlook fix)
      .replace(/<p>/gi, '<p style="margin:0;mso-line-height-rule:exactly;">')
      .replace(
        /<div>/gi,
        '<div style="margin:0;mso-line-height-rule:exactly;">',
      )
      // Collapse excessive breaks
      .replace(/<br>\s*<br>/gi, "<br>")
      // Remove empty blocks
      .replace(/<p[^>]*>\s*<\/p>/gi, "")
      .replace(/<div[^>]*>\s*<\/div>/gi, "")
  );
}
/* ======================================================
   🔥 HELPER: CREATE MISSING CONVERSATION (Account-Independent)
====================================================== */
async function createNewConversation(
  prisma,
  parsed,
  messageId,
  fromEmail,
  toEmail,
) {
  try {
    const subject = parsed.subject || "(No Subject)";
    const sentAt = parsed.date || new Date();

    // ✅ Use pure messageId as conversation ID (no account prefix)
    const conversationId = messageId;

    // ✅ Check if conversation already exists (from ANY account)
    const existing = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (existing) {
      console.log(
        `♻️ Conversation ${conversationId} already exists, reusing it`,
      );
      return existing.id;
    }

    // ✅ Create new conversation (NO emailAccountId field)
    const newConv = await prisma.conversation.create({
      data: {
        id: conversationId, // Pure messageId
        subject,
        participants: [fromEmail, toEmail].filter(Boolean).join(","),
        toRecipients: toEmail,
        initiatorEmail: fromEmail,
        lastMessageAt: sentAt,
        messageCount: 0,
        unreadCount: 0,
      },
    });

    console.log(`✅ Created new conversation: ${conversationId}`);
    return newConv.id;
  } catch (err) {
    if (err.code === "P2002") {
      // Unique constraint violation - conversation exists
      return messageId;
    }
    throw err;
  }
}

/* ======================================================
   CORE: SAVE EMAIL TO DB
====================================================== */
async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
  if (!account || !account.id) return;

  const messageId =
    parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;
  const accountId = account.id;

  /* ======================================================
     1️⃣ CHECK IF MESSAGE ALREADY EXISTS
  ====================================================== */
  const exists = await prisma.emailMessage.findUnique({
    where: {
      emailAccountId_messageId: {
        emailAccountId: accountId,
        messageId,
      },
    },
  });

  // 🔒 DO NOT let IMAP overwrite SMTP-sent messages
  if (direction === "sent" && exists) {
    return;
  }

  // 🔧 Backfill missing sender name (safe)
  if (exists) {
    const fromObj = parsed.from?.value?.[0];
    const fromName = fromObj?.name || null;

    if (fromName && !exists.fromName) {
      await prisma.emailMessage.update({
        where: { id: exists.id },
        data: { fromName },
      });
    }
    return;
  }

  /* ======================================================
     2️⃣ EXTRACT CORE FIELDS
  ====================================================== */
  const fromObj = parsed.from?.value?.[0];
  const fromName = fromObj?.name || null;
  const fromEmail = fromObj?.address || "";

  const toRecipients = parsed.to?.value || [];
  const toEmail = toRecipients.map((v) => v.address).join(", ") || "";
  const toName = toRecipients[0]?.name || null;

  const ccRecipients = parsed.cc?.value || [];
  const ccEmail = ccRecipients.map((v) => v.address).join(", ") || "";

  /* ======================================================
     3️⃣ NORMALIZE HTML (🔥 SPACING FIX)
  ====================================================== */
  const rawHtml =
    parsed.html || parsed.textAsHtml || `<pre>${parsed.text || ""}</pre>`;

  const safeHtml = normalizeEmailHtml(rawHtml);
  const bodyText = htmlToText(safeHtml, { wordwrap: false });

  /* ======================================================
     4️⃣ LEAD MATCHING (UNCHANGED LOGIC)
  ====================================================== */
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

  /* ======================================================
     5️⃣ ATTACHMENTS (INLINE-SAFE)
  ====================================================== */
  const attachmentsMeta = [];

  if (parsed.attachments?.length) {
    for (const att of parsed.attachments) {
      // ✅ INLINE IMAGE (CID) — DO NOT UPLOAD
      if (att.cid) {
        attachmentsMeta.push({
          filename: att.filename || "inline",
          mimeType: att.contentType,
          cid: att.cid,
          isInline: true,
        });
        continue;
      }

      if (!att.content) continue;

      try {
        const contentHash = generateHash(att.content);
        const uniqueKey = `${contentHash}-${accountId}-${Date.now()}`;
        const storageUrl = await uploadToR2WithHash(
          att.content,
          att.contentType || "application/octet-stream",
          uniqueKey,
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
          `R2 Failed (${att.filename}): ${e.message}`,
        );
      }
    }
  }

  /* ======================================================
     6️⃣ FIND / CREATE CONVERSATION
  ====================================================== */
  let conversationId = await findConversationId(prisma, parsed);

  if (!conversationId) {
    try {
      conversationId = await createNewConversation(
        prisma,
        parsed,
        messageId,
        fromEmail,
        toEmail,
      );
    } catch (err) {
      logErrorToFile(
        account.email,
        `Failed to create conversation: ${err.message}`,
      );
      return;
    }
  }

  /* ======================================================
   🔥 BACKFILL LEAD FROM CONVERSATION (CRITICAL FIX)
====================================================== */
  if (!leadDetailId && conversationId) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { leadDetailId: true },
    });

    if (conv?.leadDetailId) {
      leadDetailId = conv.leadDetailId;
    }
  }

  /* ======================================================
     7️⃣ SAVE MESSAGE (CLEAN & SAFE)
  ====================================================== */
  try {
    await prisma.emailMessage.create({
      data: {
        emailAccountId: accountId,
        conversationId,
        messageId,
        subject: parsed.subject || "(No Subject)",

        fromEmail,
        fromName,
        toEmail,
        toName,
        ccEmail,

        bodyHtml: safeHtml,
        bodyText,

        direction,
        folder,
        sentAt: parsed.date || new Date(),
        leadDetailId,

        inReplyTo: parsed.inReplyTo || null,
        references:
          typeof parsed.references === "string"
            ? parsed.references
            : Array.isArray(parsed.references)
              ? parsed.references.join(" ")
              : null,

        attachments: attachmentsMeta.length
          ? { create: attachmentsMeta }
          : undefined,
      },
    });

    /* 🔔 NOTIFICATION (RECEIVED ONLY) */
    if (direction === "received") {
      try {
        await notifyNewEmail({
          userId: account.userId,
          accountId: account.id,
          conversationId,
          fromEmail,
          subject: parsed.subject || "(No Subject)",
        });
      } catch {
        /* non-blocking */
      }
    }

    /* ======================================================
       8️⃣ UPDATE CONVERSATION META
    ====================================================== */
    const updateData = {
      lastMessageAt: parsed.date || new Date(),
      messageCount: { increment: 1 },
    };

    if (direction === "received") {
      updateData.unreadCount = { increment: 1 };
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...updateData,
        ...(leadDetailId
          ? { leadDetailId } // 🔥 PERMANENT LINK
          : {}),
      },
    });
  } catch (err) {
    if (err.code !== "P2002") {
      logErrorToFile(account.email, `DB Save Error: ${err.message}`);
    }
  }
}

/* ======================================================
   CORE: SYNC IMAP ACCOUNT
====================================================== */
const activeSyncs = new Set();

async function syncImap(prisma, account) {
  if (activeSyncs.has(account.id)) return;

  const freshAccount = await prisma.emailAccount.findUnique({
    where: { id: account.id },
  });

  if (!freshAccount) {
    console.log(
      `⚠️ Aborting sync: Account ${account.email} (ID ${account.id}) was deleted.`,
    );
    return;
  }

  activeSyncs.add(account.id);
  console.log(`🔄 Syncing: ${account.email}`);

  let client;
  try {
    client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort || 993,
      secure: true,
      auth: {
        user: account.imapUser || account.email,
        pass: account.encryptedPass,
      },
      tls: { rejectUnauthorized: false },
      logger: false,
      socketTimeout: 90000,
      connectionTimeout: 60000,
    });

    client.on("error", (err) =>
      logErrorToFile(account.email, `IMAP Error: ${err.message}`),
    );

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

          // Speed settings
          const SMALL_BATCH = 10;
          const STABLE_LIMIT = pLimit(5);
          const THROTTLE_MS = 150;

          for (let i = 0; i < reversedUids.length; i += SMALL_BATCH) {
            if (!client.usable) break;
            const batch = reversedUids.slice(i, i + SMALL_BATCH);
            await Promise.all(
              batch.map((uid) =>
                STABLE_LIMIT(async () => {
                  try {
                    if (!client.usable) return;
                    await new Promise((resolve) =>
                      setTimeout(resolve, THROTTLE_MS),
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

                    const isFromSelf = fromAddr === account.email.toLowerCase();

                    const direction = isFromSelf ? "sent" : "received";
                    const isExternal = isFromSelf; // sent from Outlook/Gmail UI

                    await saveEmailToDB(
                      prisma,
                      freshAccount,
                      parsed,
                      msg,
                      direction,
                      type,
                    );
                  } catch (e) {
                    if (e.message.includes("Connection not available"))
                      client.close();
                    logErrorToFile(
                      account.email,
                      `UID ${uid} Failed: ${e.message}`,
                    );
                  }
                }),
              ),
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
    accounts.map((acc) => limit(() => syncImap(prisma, acc))),
  );
}

export async function runSyncForAccount(prisma, email) {
  const acc = await prisma.emailAccount.findUnique({ where: { email } });
  if (acc) await syncImap(prisma, acc);
}

// import { ImapFlow } from "imapflow";
// import { simpleParser } from "mailparser";
// import dotenv from "dotenv";
// import pLimit from "p-limit";
// import fs from "fs";
// import path from "path";
// import { uploadToR2WithHash, generateHash } from "./r2.js";

// dotenv.config();

// // ======================================================
// // 📂 LOGGING SETUP
// // ======================================================
// const LOG_DIR = path.join(process.cwd(), "logs");
// if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// const ERROR_LOG_FILE = path.join(LOG_DIR, "imap-errors.log");

// function logErrorToFile(accountEmail, errorMsg) {
//   const timestamp = new Date().toISOString();
//   const logEntry = `[${timestamp}] [${accountEmail}] ${errorMsg}\n`;
//   console.error(`❌ [${accountEmail}] ${errorMsg}`);
//   fs.appendFile(ERROR_LOG_FILE, logEntry, (err) => {
//     if (err) console.error("Failed to write to log file:", err);
//   });
// }

// const UPLOAD_DIR = path.join(process.cwd(), "uploads");
// const ACCOUNT_CONCURRENCY = Number(process.env.IMAP_ACCOUNT_CONCURRENCY) || 2;

// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }

// /* ======================================================
//    🔥 HELPER: FIND CONVERSATION (Account-Independent)
// ====================================================== */
// async function findConversationId(prisma, parsed) {
//   const inReplyTo = parsed.inReplyTo || null;
//   let referencesArray = [];

//   if (Array.isArray(parsed.references)) {
//     referencesArray = parsed.references;
//   } else if (typeof parsed.references === "string") {
//     referencesArray = parsed.references.split(/\s+/).filter(Boolean);
//   }

//   // ✅ NO account prefix - just pure Message-IDs
//   const threadIdsToCheck = [inReplyTo, ...[...referencesArray].reverse()]
//     .filter(Boolean);

//   if (threadIdsToCheck.length === 0) return null;

//   // ✅ Search across ALL accounts (no emailAccountId filter)
//   const conversation = await prisma.conversation.findFirst({
//     where: {
//       id: { in: threadIdsToCheck },
//     },
//     select: { id: true },
//   });

//   return conversation?.id || null;
// }

// /* ======================================================
//    🔥 HELPER: CREATE MISSING CONVERSATION (Account-Independent)
// ====================================================== */
// async function createNewConversation(
//   prisma,
//   parsed,
//   messageId,
//   fromEmail,
//   toEmail
// ) {
//   try {
//     const subject = parsed.subject || "(No Subject)";
//     const sentAt = parsed.date || new Date();

//     // ✅ Use pure messageId as conversation ID (no account prefix)
//     const conversationId = messageId;

//     // ✅ Check if conversation already exists (from ANY account)
//     const existing = await prisma.conversation.findUnique({
//       where: { id: conversationId },
//     });

//     if (existing) {
//       console.log(`♻️ Conversation ${conversationId} already exists, reusing it`);
//       return existing.id;
//     }

//     // ✅ Create new conversation (NO emailAccountId field)
//     const newConv = await prisma.conversation.create({
//       data: {
//         id: conversationId, // Pure messageId
//         subject,
//         participants: [fromEmail, toEmail].filter(Boolean).join(","),
//         toRecipients: toEmail,
//         initiatorEmail: fromEmail,
//         lastMessageAt: sentAt,
//         messageCount: 1,
//         unreadCount: 1,
//       },
//     });

//     console.log(`✅ Created new conversation: ${conversationId}`);
//     return newConv.id;
//   } catch (err) {
//     if (err.code === "P2002") {
//       // Unique constraint violation - conversation exists
//       return messageId;
//     }
//     throw err;
//   }
// }

// /* ======================================================
//    CORE: SAVE EMAIL TO DB
// ====================================================== */
// async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
//   const messageId =
//     parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;
//   const accountId = Number(account.id);

//   // 1️⃣ Check if message exists for THIS account
//   const exists = await prisma.emailMessage.findUnique({
//     where: {
//       emailAccountId_messageId: {
//         emailAccountId: accountId,
//         messageId,
//       },
//     },
//   });

//   if (exists) {
//     const fromObj = parsed.from?.value?.[0];
//     const fromName = fromObj?.name || null;

//     if (fromName && !exists.fromName) {
//       console.log(`🔧 Fixing missing name for message: ${messageId}`);
//       await prisma.emailMessage.update({
//         where: { id: exists.id },
//         data: { fromName },
//       });
//     }
//     return;
//   }

//   // 2️⃣ Extract Info
//   const fromObj = parsed.from?.value?.[0];
//   const fromName = fromObj?.name || null;
//   const fromEmail = fromObj?.address || "";

//   const toRecipients = parsed.to?.value || [];
//   const toEmail = toRecipients.map((v) => v.address).join(", ") || "";
//   const toName = toRecipients[0]?.name || null;

//   const ccRecipients = parsed.cc?.value || [];
//   const ccEmail = ccRecipients.map((v) => v.address).join(", ") || "";

//   // 3️⃣ Find Matching Lead
//   let leadDetailId = null;
//   try {
//     const emailsToMatch = [];
//     if (fromEmail) emailsToMatch.push(fromEmail.toLowerCase());
//     toEmail
//       .split(",")
//       .forEach((e) => e.trim() && emailsToMatch.push(e.trim().toLowerCase()));
//     ccEmail
//       .split(",")
//       .forEach((e) => e.trim() && emailsToMatch.push(e.trim().toLowerCase()));

//     if (emailsToMatch.length) {
//       const lead = await prisma.leadDetails.findFirst({
//         where: {
//           OR: [{ email: { in: emailsToMatch } }, { cc: { in: emailsToMatch } }],
//         },
//         select: { id: true },
//       });
//       leadDetailId = lead?.id || null;
//     }
//   } catch (err) {
//     logErrorToFile(account.email, `Lead match failed: ${err.message}`);
//   }

//   // 4️⃣ Attachments
//   let attachmentsMeta = [];
//   if (parsed.attachments?.length) {
//     for (const att of parsed.attachments) {
//       if (!att.content) continue;
//       const contentHash = generateHash(att.content);
//       const uniqueKey = `${contentHash}-${accountId}-${Date.now()}`;
//       try {
//         const storageUrl = await uploadToR2WithHash(
//           att.content,
//           att.contentType || "application/octet-stream",
//           uniqueKey
//         );
//         attachmentsMeta.push({
//           filename: att.filename || "file",
//           mimeType: att.contentType || "application/octet-stream",
//           size: att.content.length,
//           storageUrl,
//           hash: contentHash,
//         });
//       } catch (e) {
//         logErrorToFile(
//           account.email,
//           `R2 Failed (${att.filename}): ${e.message}`
//         );
//       }
//     }
//   }

//   // 5️⃣ Find/Create Conversation (✅ NO accountId parameter)
//   let conversationId = await findConversationId(prisma, parsed);

//   if (!conversationId) {
//     try {
//       conversationId = await createNewConversation(
//         prisma,
//         parsed,
//         messageId,
//         fromEmail,
//         toEmail
//       );
//     } catch (err) {
//       logErrorToFile(
//         account.email,
//         `Failed to create conversation: ${err.message}`
//       );
//       return;
//     }
//   }

//   // 6️⃣ Save Message
//   try {
//     await prisma.emailMessage.create({
//       data: {
//         emailAccountId: accountId,
//         conversationId,
//         messageId,
//         subject: parsed.subject || "(No Subject)",
//         fromEmail,
//         fromName,
//         toEmail,
//         toName,
//         ccEmail,
//         body: parsed.html || parsed.textAsHtml || parsed.text,
//         direction,
//         folder,
//         sentAt: parsed.date || new Date(),
//         leadDetailId,

//         // ✅ Threading headers (for future reference)
//         inReplyTo: parsed.inReplyTo || null,
//         references: typeof parsed.references === 'string'
//           ? parsed.references
//           : Array.isArray(parsed.references)
//             ? parsed.references.join(' ')
//             : null,

//         attachments: attachmentsMeta.length
//           ? { create: attachmentsMeta }
//           : undefined,
//       },
//     });

//     // ✅ Update conversation metadata
//     await prisma.conversation
//       .update({
//         where: { id: conversationId },
//         data: {
//           lastMessageAt: parsed.date || new Date(),
//           messageCount: { increment: 1 },
//         },
//       })
//       .catch((e) => {
//         // Conversation might have been updated by another process
//         console.warn(`⚠️ Conversation update race condition: ${e.message}`);
//       });

//   } catch (err) {
//     if (err.code !== "P2002") {
//       logErrorToFile(account.email, `DB Save Error: ${err.message}`);
//     }
//   }
// }

// /* ======================================================
//    CORE: SYNC IMAP ACCOUNT
// ====================================================== */
// const activeSyncs = new Set();

// async function syncImap(prisma, account) {
//   if (activeSyncs.has(account.id)) return;

//   const freshAccount = await prisma.emailAccount.findUnique({
//     where: { id: account.id },
//   });

//   if (!freshAccount) {
//     console.log(
//       `⚠️ Aborting sync: Account ${account.email} (ID ${account.id}) was deleted.`
//     );
//     return;
//   }

//   activeSyncs.add(account.id);
//   console.log(`🔄 Syncing: ${account.email}`);

//   let client;
//   try {
//     client = new ImapFlow({
//       host: account.imapHost,
//       port: account.imapPort || 993,
//       secure: true,
//       auth: {
//         user: account.imapUser || account.email,
//         pass: account.encryptedPass,
//       },
//       tls: { rejectUnauthorized: false },
//       logger: false,
//       socketTimeout: 90000,
//       connectionTimeout: 60000,
//     });

//     client.on("error", (err) =>
//       logErrorToFile(account.email, `IMAP Error: ${err.message}`)
//     );

//     await client.connect();
//     const mailboxes = await client.list();
//     const foldersToSync = [];

//     for (const box of mailboxes) {
//       const lowerPath = box.path.toLowerCase();
//       if (lowerPath === "inbox" || box.specialUse === "\\Inbox")
//         foldersToSync.push({ path: box.path, type: "inbox" });
//       else if (lowerPath.includes("sent") || box.specialUse === "\\Sent")
//         foldersToSync.push({ path: box.path, type: "sent" });
//       else if (lowerPath.includes("spam") || box.specialUse === "\\Junk")
//         foldersToSync.push({ path: box.path, type: "spam" });
//     }

//     for (const { path, type } of foldersToSync) {
//       if (!client.usable) break;
//       const lock = await client.getMailboxLock(path);
//       try {
//         await client.mailboxOpen(path);
//         const uids = await client.search({ all: true });
//         if (uids.length > 0) {
//           const reversedUids = uids.reverse();

//           // Speed settings
//           const SMALL_BATCH = 10;
//           const STABLE_LIMIT = pLimit(5);
//           const THROTTLE_MS = 150;

//           for (let i = 0; i < reversedUids.length; i += SMALL_BATCH) {
//             if (!client.usable) break;
//             const batch = reversedUids.slice(i, i + SMALL_BATCH);
//             await Promise.all(
//               batch.map((uid) =>
//                 STABLE_LIMIT(async () => {
//                   try {
//                     if (!client.usable) return;
//                     await new Promise((resolve) =>
//                       setTimeout(resolve, THROTTLE_MS)
//                     );
//                     const msg = await client.fetchOne(String(uid), {
//                       uid: true,
//                       source: true,
//                       envelope: true,
//                       internalDate: true,
//                     });
//                     if (!msg) return;
//                     const parsed = await simpleParser(msg.source);
//                     const fromAddr =
//                       parsed.from?.value?.[0]?.address?.toLowerCase() || "";
//                     const direction =
//                       fromAddr === account.email.toLowerCase()
//                         ? "sent"
//                         : "received";
//                     await saveEmailToDB(
//                       prisma,
//                       account,
//                       parsed,
//                       msg,
//                       direction,
//                       type
//                     );
//                   } catch (e) {
//                     if (e.message.includes("Connection not available"))
//                       client.close();
//                     logErrorToFile(
//                       account.email,
//                       `UID ${uid} Failed: ${e.message}`
//                     );
//                   }
//                 })
//               )
//             );
//           }
//         }
//       } finally {
//         if (lock) lock.release();
//       }
//     }
//   } catch (err) {
//     logErrorToFile(account.email, `Sync Fatal Error: ${err.message}`);
//   } finally {
//     activeSyncs.delete(account.id);
//     if (client) await client.logout().catch(() => {});
//     console.log(`✅ Finished: ${account.email}`);
//   }
// }

// export async function runSync(prisma) {
//   const accounts = await prisma.emailAccount.findMany({
//     where: { verified: true },
//   });
//   const limit = pLimit(ACCOUNT_CONCURRENCY);
//   await Promise.allSettled(
//     accounts.map((acc) => limit(() => syncImap(prisma, acc)))
//   );
// }

// export async function runSyncForAccount(prisma, email) {
//   const acc = await prisma.emailAccount.findUnique({ where: { email } });
//   if (acc) await syncImap(prisma, acc);
// }
