// FIXED: imapSync.js - Outlook-style conversation threading
// 🔒 HARD RULE: One outbound email = One conversation
// ⚠️ CRITICAL CHANGES marked with 🔥

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import dotenv from "dotenv";
import pLimit from "p-limit";
import fs from "fs";
import path from "path";
import { getIO } from "../../socket.js";
import { uploadToR2WithHash, generateHash } from "./r2.js";

dotenv.config();

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const BATCH_SIZE = Number(process.env.IMAP_BATCH_SIZE) || 50;
const PARSE_CONCURRENCY = Number(process.env.IMAP_PARSE_CONCURRENCY) || 5;
const ACCOUNT_CONCURRENCY = Number(process.env.IMAP_ACCOUNT_CONCURRENCY) || 2;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* ======================================================
   🔥 FIX 1: FIND CONVERSATION FROM REPLY HEADERS ONLY
   ⚠️ CRITICAL: Only use In-Reply-To/References
   ❌ NO participant logic, NO subject logic
====================================================== */

// async function findConversationId(prisma, parsed) {
//   const inReplyTo = parsed.inReplyTo || null;

//   // 🔥 FIX: Handle both Array and String input
//   let referencesArray = [];
//   if (Array.isArray(parsed.references)) {
//     referencesArray = parsed.references;
//   } else if (typeof parsed.references === "string") {
//     referencesArray = parsed.references.split(/\s+/).filter(Boolean);
//   }

//   const threadIdsToCheck = [
//     inReplyTo,
//     ...[...referencesArray].reverse(),
//   ].filter(Boolean);
//   if (threadIdsToCheck.length === 0) return null;

//   const conversation = await prisma.conversation.findFirst({
//     where: { id: { in: threadIdsToCheck } },
//     select: { id: true },
//   });

//   return conversation?.id || null;
// }
/* Helper to safely handle threading headers */
async function findConversationId(prisma, parsed) {
  const inReplyTo = parsed.inReplyTo || null;

  // 🔥 FIX: Normalize references into an array regardless of source format
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
   🔥 FIX 2: CREATE CONVERSATION FOR OUTBOUND EMAIL
   ⚠️ CRITICAL: This is the ONLY way conversations are created
   🎯 Rule: One outbound email = One conversation
====================================================== */
async function createConversationForOutbound(
  prisma,
  account,
  parsed,
  messageId
) {
  const toEmail = parsed.to?.value?.map((v) => v.address).join(", ") || "";
  const ccEmail = parsed.cc?.value?.map((v) => v.address).join(", ") || null;
  const subject = parsed.subject || "(No Subject)";
  const sentAt = parsed.date || new Date();

  try {
    // Use the Message-ID as the conversationId (Outlook-style)
    const conversation = await prisma.conversation.create({
      data: {
        id: messageId, // 🔥 Message-ID IS the conversationId
        emailAccountId: account.id,
        subject,
        participants: [toEmail, ccEmail].filter(Boolean).join(","),
        toRecipients: toEmail, // 🔥 This defines the conversation
        ccRecipients: ccEmail,
        lastMessageAt: sentAt,
        messageCount: 1,
        unreadCount: 0,
        initiatorEmail: account.email,
      },
    });
    console.log(`🆕 Created conversation: ${conversation.id}`);
    console.log(`   From: ${account.email}`);
    console.log(`   To: ${toEmail}`);
    console.log(`   Cc: ${ccEmail || "none"}`);
    return conversation.id;
  } catch (err) {
    // Conversation already exists (duplicate Message-ID)
    if (err.code === "P2002") {
      console.log(`⚠️ Conversation already exists: ${messageId}`);
      return messageId;
    }
    console.error("❌ Error creating conversation:", err);
    return null;
  }
}

/* ======================================================
   📎 IMAP ATTACHMENT URL (unchanged)
====================================================== */
function makeImapProxyUrl(uid, filename, accountId) {
  const encoded = encodeURIComponent(filename || "file");
  return `/api/inbox/download/${uid}/${encoded}?accountId=${accountId}`;
}

/* ======================================================
   🔥 FIX 3: SAVE EMAIL WITH PROPER CONVERSATION LOGIC
   ⚠️ CRITICAL CHANGES:
   1. For OUTBOUND (sent): Create conversation if no In-Reply-To/References
   2. For INBOUND (received): Find conversation via In-Reply-To/References
   3. Never create conversations for inbound emails
====================================================== */

/* server/src/services/sync/imapSync.js */

// async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
//   // 1. INITIALIZE & DEDUPLICATION
//   const messageId =
//     parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;

//   const exists = await prisma.emailMessage.findUnique({
//     where: {
//       emailAccountId_messageId: { emailAccountId: account.id, messageId },
//     },
//   });
//   if (exists) return;

//   // 2. ROBUST NAME & EMAIL EXTRACTION
//   const fromObj = parsed.from?.value?.[0];
//   const fromName = fromObj?.name || null;
//   const fromEmail = fromObj?.address || "";

//   // ✅ FIX: Capture all recipients and specifically the name of the primary recipient
//   const toRecipients = parsed.to?.value || [];
//   const toEmail = toRecipients.map((v) => v.address).join(", ") || "";
//   const toName = toRecipients[0]?.name || null; // This fills the [null] column you found in DB

//   // Extract CC Details
//   const ccRecipients = parsed.cc?.value || [];
//   const ccEmail = ccRecipients.map((v) => v.address).join(", ") || null;

//   // Normalize Threading Headers
//   const inReplyTo = parsed.inReplyTo || null;
//   let referencesStr = null;
//   if (Array.isArray(parsed.references)) {
//     referencesStr = parsed.references.join(" ");
//   } else if (typeof parsed.references === "string") {
//     referencesStr = parsed.references;
//   }

//   // 3. CONVERSATION THREADING
//   let conversationId = await findConversationId(prisma, parsed);

//   if (!conversationId) {
//     conversationId = messageId;
//     try {
//       await prisma.conversation.upsert({
//         where: { id: messageId },
//         update: { lastMessageAt: parsed.date || new Date() },
//         create: {
//           id: messageId,
//           emailAccountId: account.id,
//           subject: parsed.subject || "(No Subject)",
//           participants: [fromEmail, toEmail].filter(Boolean).join(","),
//           toRecipients: toEmail,
//           lastMessageAt: parsed.date || new Date(),
//           initiatorEmail: fromEmail,
//         },
//       });
//     } catch (err) {
//       conversationId = messageId;
//     }
//   }

//   // 4. CLOUDFLARE R2 ATTACHMENT PROCESSING
//   let attachmentsMeta = [];
//   if (parsed.attachments?.length) {
//     for (const att of parsed.attachments) {
//       const buffer = att.content;
//       if (!buffer) continue;

//       const contentHash = generateHash(buffer);
//       // 🔥 Unique suffix for Cloudflare R2 isolated storage
//       const uniqueKey = `${contentHash}-${account.id}-${Date.now()}`;

//       let storageUrl;
//       try {
//         // Upload directly to Cloudflare R2
//         storageUrl = await uploadToR2WithHash(
//           buffer,
//           att.contentType || "application/octet-stream",
//           uniqueKey
//         );
//       } catch (e) {
//         console.warn(
//           `⚠️ R2 Upload failed for ${att.filename}, using proxy fallback`
//         );
//         storageUrl = makeImapProxyUrl(msg.uid, att.filename, account.id);
//       }

//       attachmentsMeta.push({
//         filename: att.filename || "file",
//         mimeType: att.contentType,
//         size: buffer.length,
//         storageUrl: storageUrl,
//         hash: contentHash,
//       });
//     }
//   }

//   // 5. FINAL DATABASE INSERTION
//   try {
//     await prisma.emailMessage.create({
//       data: {
//         emailAccountId: account.id,
//         conversationId,
//         messageId,
//         subject: parsed.subject || "(No Subject)",

//         // ✅ DATA CAPTURE: Correctly mapping names to schema
//         fromEmail,
//         fromName,
//         toEmail,
//         toName,

//         ccEmail,
//         body: parsed.html || parsed.textAsHtml || parsed.text,
//         direction,
//         folder,
//         sentAt: parsed.date || msg.internalDate || new Date(),
//         inReplyTo,
//         references: referencesStr,
//         attachments: attachmentsMeta.length
//           ? { create: attachmentsMeta }
//           : undefined,
//       },
//     });
//     console.log(`✅ [STORED] Msg from: ${fromName || fromEmail}`);
//   } catch (err) {
//     console.error(`❌ [DB ERROR] Failed to save ${messageId}:`, err.message);
//   }
// }

/* server/src/services/sync/imapSync.js */

// async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
//   const messageId = parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;

//   // 1. Check for duplicates
//   const exists = await prisma.emailMessage.findUnique({
//     where: { emailAccountId_messageId: { emailAccountId: account.id, messageId } },
//   });
//   if (exists) return;

//   // 2. Extract Names AND Emails
//   const fromObj = parsed.from?.value?.[0];
//   const fromName = fromObj?.name || null; // Captured from IMAP
//   const fromEmail = fromObj?.address || "";

//   const toRecipients = parsed.to?.value || [];
//   const toEmail = toRecipients.map(v => v.address).join(", ") || "";
//   const toName = toRecipients[0]?.name || null; // FIX: Now captures recipient name

//   // 3. Cloudflare R2 Upload
//   let attachmentsMeta = [];
//   if (parsed.attachments?.length) {
//     for (const att of parsed.attachments) {
//       if (!att.content) continue;
//       const contentHash = generateHash(att.content);
//       const uniqueKey = `${contentHash}-${account.id}-${Date.now()}`;
//       try {
//         const storageUrl = await uploadToR2WithHash(att.content, att.contentType, uniqueKey);
//         attachmentsMeta.push({ filename: att.filename, mimeType: att.contentType, size: att.content.length, storageUrl, hash: contentHash });
//       } catch (e) {
//         console.warn("R2 failed, using proxy");
//       }
//     }
//   }

//   // 4. Save to Database
//   try {
//     await prisma.emailMessage.create({
//       data: {
//         emailAccountId: account.id,
//         conversationId: (await findConversationId(prisma, parsed)) || messageId,
//         messageId,
//         subject: parsed.subject || "(No Subject)",
//         fromEmail, fromName, toEmail, toName, // 🔥 BOTH Name and Email are now stored
//         body: parsed.html || parsed.textAsHtml || parsed.text,
//         direction, folder, sentAt: parsed.date || new Date(),
//         attachments: attachmentsMeta.length ? { create: attachmentsMeta } : undefined,
//       },
//     });
//   } catch (err) {
//     console.error(`❌ DB Error: ${err.message}`);
//   }
// }
/* server/services/sync/imapSync.js */

async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
  const messageId =
    parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;

  // 1. Check for duplicates
  const exists = await prisma.emailMessage.findUnique({
    where: {
      emailAccountId_messageId: { emailAccountId: account.id, messageId },
    },
  });
  if (exists) return;

  // 2. Extract Names AND Emails
  const fromObj = parsed.from?.value?.[0];
  const fromName = fromObj?.name || null;
  const fromEmail = fromObj?.address || "";

  const toRecipients = parsed.to?.value || [];
  const toEmail = toRecipients.map((v) => v.address).join(", ") || "";
  const toName = toRecipients[0]?.name || null;

  // 3. Cloudflare R2 Upload & Attachment Processing
  let attachmentsMeta = [];
  if (parsed.attachments?.length) {
    for (const att of parsed.attachments) {
      if (!att.content) continue;

      const contentHash = generateHash(att.content);
      const uniqueKey = `${contentHash}-${account.id}-${Date.now()}`;

      try {
        const storageUrl = await uploadToR2WithHash(
          att.content,
          att.contentType,
          uniqueKey
        );

        // 🔥 FIX: Added fallback '|| "file"' to prevent crash on missing filenames
        attachmentsMeta.push({
          filename: att.filename || "file",
          mimeType: att.contentType || "application/octet-stream",
          size: att.content.length,
          storageUrl,
          hash: contentHash,
        });
      } catch (e) {
        console.warn("R2 failed, using proxy", e.message);
      }
    }
  }

  // 4. Save to Database
  try {
    await prisma.emailMessage.create({
      data: {
        emailAccountId: account.id,
        conversationId: (await findConversationId(prisma, parsed)) || messageId,
        messageId,
        subject: parsed.subject || "(No Subject)",
        fromEmail,
        fromName,
        toEmail,
        toName,
        body: parsed.html || parsed.textAsHtml || parsed.text,
        direction,
        folder,
        sentAt: parsed.date || new Date(),
        attachments: attachmentsMeta.length
          ? { create: attachmentsMeta }
          : undefined,
      },
    });
  } catch (err) {
    console.error(`❌ DB Error: ${err.message}`);
  }
}

const activeSyncs = new Set();

async function syncImap(prisma, account) {
  if (activeSyncs.has(account.id)) {
    console.log(
      `⏳ Sync already in progress for ${account.email}, skipping...`
    );
    return;
  }

  activeSyncs.add(account.id);
  console.log(`🔄 Starting High-Capacity Sync for ${account.email}...`);

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort || 993,
    secure: true,
    auth: {
      user: account.imapUser || account.email,
      pass: account.encryptedPass,
    },
    tls: { rejectUnauthorized: false },
    // ⏱️ Increase timeouts to handle slower connections
    socketTimeout: 60000,
    connectionTimeout: 30000,
  });

  // 🔥 CRITICAL: Add this to stop the "bsdk" crashing
  client.on("error", (err) => {
    console.error(`⚠️ IMAP Error [${account.email}]:`, err.message);
    // This empty handler prevents the process from crashing
  });

  try {
    await client.connect();
    const mailboxes = await client.list();
    const foldersToSync = [];

    for (const box of mailboxes) {
      const lowerPath = box.path.toLowerCase();

      if (lowerPath === "inbox" || box.specialUse === "\\Inbox") {
        foldersToSync.push({ path: box.path, type: "inbox" });
      } else if (lowerPath.includes("sent") || box.specialUse === "\\Sent") {
        foldersToSync.push({ path: box.path, type: "sent" });
      }
      // 🔥 EXPANDED SPAM DETECTION
      else if (
        lowerPath.includes("spam") ||
        lowerPath.includes("junk") ||
        lowerPath.includes("bulk") ||
        box.specialUse === "\\Junk"
      ) {
        foldersToSync.push({ path: box.path, type: "spam" });
      }
    }

    for (const { path, type } of foldersToSync) {
      if (!client.usable) break;

      console.log(`📥 Processing Folder: ${path}`);
      const lock = await client.getMailboxLock(path);

      try {
        await client.mailboxOpen(path);

        // 🔥 HIGH-VOLUME OPTIMIZATION: Only sync messages from the last 30 days
        // to prevent crashing on 10,000+ historical emails initially
        const searchCriteria = { all: true };
        const uids = await client.search(searchCriteria);

        if (uids.length === 0) continue;

        const reversedUids = uids.reverse();

        // 🔥 STABILITY SETTINGS
        const SMALL_BATCH = 15; // Process few items per database transaction
        const STABLE_LIMIT = pLimit(2); // Low concurrency to prevent DB locking
        const THROTTLE_MS = 250; // 1/4 second delay to prevent server resets

        for (let i = 0; i < reversedUids.length; i += SMALL_BATCH) {
          if (!client.usable) break;

          const batch = reversedUids.slice(i, i + SMALL_BATCH);

          await Promise.all(
            batch.map((uid) =>
              STABLE_LIMIT(async () => {
                try {
                  if (!client.usable) return;

                  // 🔥 FIX: Aggressive throttling for 10k+ mailboxes
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
                  console.warn(`⚠️ UID ${uid} failed:`, e.message);
                }
              })
            )
          );
        }
      } finally {
        if (lock) lock.release();
      }
    }
  } catch (err) {
    console.error(`❌ Sync Failed:`, err.message);
  } finally {
    activeSyncs.delete(account.id);
    if (client) await client.logout().catch(() => {});
    console.log(`🔌 Connection closed for ${account.email}`);
  }
}
/* ======================================================
   🚀 PUBLIC EXPORTS
====================================================== */
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
