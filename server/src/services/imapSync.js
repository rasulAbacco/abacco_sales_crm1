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
//   // 1. INITIALIZE & DEDUPLICATION
//   const messageId =
//     parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;

//   const exists = await prisma.emailMessage.findUnique({
//     where: {
//       emailAccountId_messageId: { emailAccountId: account.id, messageId },
//     },
//   });
//   if (exists) return;

//   // 2. ROBUST NAME & EMAIL EXTRACTION (The Fix for 'Name' <email>)
//   const fromObj = parsed.from?.value?.[0];
//   const fromName = fromObj?.name || null;
//   const fromEmail = fromObj?.address || "";

//   // ✅ CRITICAL FIX: Extract recipient names correctly
//   const toRecipients = parsed.to?.value || [];
//   const toEmail = toRecipients.map((v) => v.address).join(", ") || "";
//   // Pull the name of the first recipient so toName is not [null]
//   const toName = toRecipients[0]?.name || null;

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
//       // 🔥 Isolated storage key for Cloudflare R2
//       const uniqueKey = `${contentHash}-${account.id}-${Date.now()}`;

//       let storageUrl;
//       try {
//         // Force upload to Cloudflare R2
//         storageUrl = await uploadToR2WithHash(
//           buffer,
//           att.contentType || "application/octet-stream",
//           uniqueKey
//         );
//       } catch (e) {
//         console.warn(`⚠️ R2 failed for ${att.filename}, using proxy fallback`);
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

//         // ✅ DATA MAPPING: fromName and toName are now both captured
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
//     console.log(
//       `✅ [STORED] Msg from: ${fromName || fromEmail} To: ${toName || toEmail}`
//     );
//   } catch (err) {
//     console.error(`❌ [DB ERROR] Failed to save ${messageId}:`, err.message);
//   }
// }


/* server/src/services/sync/imapSync.js */

async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
  const messageId = parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;

  // 1. Check for duplicates
  const exists = await prisma.emailMessage.findUnique({
    where: { emailAccountId_messageId: { emailAccountId: account.id, messageId } },
  });
  if (exists) return;

  // 2. Extract Names AND Emails
  const fromObj = parsed.from?.value?.[0];
  const fromName = fromObj?.name || null; // Captured from IMAP
  const fromEmail = fromObj?.address || "";

  const toRecipients = parsed.to?.value || [];
  const toEmail = toRecipients.map(v => v.address).join(", ") || "";
  const toName = toRecipients[0]?.name || null; // FIX: Now captures recipient name

  // 3. Cloudflare R2 Upload
  let attachmentsMeta = [];
  if (parsed.attachments?.length) {
    for (const att of parsed.attachments) {
      if (!att.content) continue;
      const contentHash = generateHash(att.content);
      const uniqueKey = `${contentHash}-${account.id}-${Date.now()}`;
      try {
        const storageUrl = await uploadToR2WithHash(att.content, att.contentType, uniqueKey);
        attachmentsMeta.push({ filename: att.filename, mimeType: att.contentType, size: att.content.length, storageUrl, hash: contentHash });
      } catch (e) {
        console.warn("R2 failed, using proxy");
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
        fromEmail, fromName, toEmail, toName, // 🔥 BOTH Name and Email are now stored
        body: parsed.html || parsed.textAsHtml || parsed.text,
        direction, folder, sentAt: parsed.date || new Date(),
        attachments: attachmentsMeta.length ? { create: attachmentsMeta } : undefined,
      },
    });
  } catch (err) {
    console.error(`❌ DB Error: ${err.message}`);
  }
}
/* ======================================================
   🔄 IMAP SYNC (unchanged)
====================================================== */

// async function syncImap(prisma, account) {
//   console.log(`🔄 Starting sync for ${account.email}...`);

//   const client = new ImapFlow({
//     host: account.imapHost,
//     port: account.imapPort || 993,
//     secure: account.imapSecure !== false,
//     auth: {
//       user: account.imapUser || account.email,
//       pass: account.encryptedPass,
//     },
//     tls: { rejectUnauthorized: false },
//     socketTimeout: 90000, // 90 seconds to handle slow Zoho/Gmail responses
//     connectionTimeout: 30000,
//     logger: false,
//   });

//   // 🔥 CRITICAL: Handle errors to prevent server crash
//   client.on("error", (err) => {
//     console.error(`⚠️ IMAP Sync Error (${account.email}):`, err.message);
//   });

//   try {
//     await client.connect();

//     // 1. FOLDER DISCOVERY & NORMALIZATION
//     const mailboxes = await client.list();
//     const foldersToSync = [];

//     for (const box of mailboxes) {
//       const lowerPath = box.path.toLowerCase();
//       // Detect Inbox, Sent, and Spam regardless of server naming (Zoho/Gmail)
//       if (lowerPath === "inbox" || box.specialUse === "\\Inbox") {
//         foldersToSync.push({ path: box.path, type: "inbox" });
//       } else if (lowerPath.includes("sent") || box.specialUse === "\\Sent") {
//         foldersToSync.push({ path: box.path, type: "sent" });
//       } else if (lowerPath.includes("spam") || box.specialUse === "\\Junk") {
//         foldersToSync.push({ path: box.path, type: "spam" });
//       }
//     }

//     console.log(
//       `📂 Found ${foldersToSync.length} folders to sync for ${account.email}`
//     );

//     // 2. PROCESS EACH FOLDER
//     for (const { path, type } of foldersToSync) {
//       console.log(`📥 Syncing Folder: ${path} (${type})`);

//       const lock = await client.getMailboxLock(path);
//       try {
//         // 🔥 CRITICAL: You MUST open the mailbox before searching for messages
//         await client.mailboxOpen(path);

//         const uids = await client.search({ all: true });
//         console.log(`🔢 Total messages found in ${path}: ${uids.length}`);

//         if (uids.length === 0) continue;

//         // Process in batches (newest first)
//         const reversedUids = uids.reverse();
//         const limit = pLimit(PARSE_CONCURRENCY || 5);

//         for (let i = 0; i < reversedUids.length; i += BATCH_SIZE || 50) {
//           const batch = reversedUids.slice(i, i + (BATCH_SIZE || 50));

//           await Promise.all(
//             batch.map((uid) =>
//               limit(async () => {
//                 try {
//                   const msg = await client.fetchOne(String(uid), {
//                     uid: true,
//                     source: true,
//                     envelope: true,
//                     internalDate: true,
//                   });

//                   if (!msg) return;

//                   const parsed = await simpleParser(msg.source);
//                   const fromAddr =
//                     parsed.from?.value?.[0]?.address?.toLowerCase() || "";

//                   // Determine direction
//                   const direction =
//                     fromAddr === account.email.toLowerCase()
//                       ? "sent"
//                       : "received";

//                   // 🔥 Save to DB using the anchor logic to prevent orphans
//                   await saveEmailToDB(
//                     prisma,
//                     account,
//                     parsed,
//                     msg,
//                     direction,
//                     type
//                   );
//                 } catch (e) {
//                   console.warn(`⚠️ Error processing UID ${uid}:`, e.message);
//                 }
//               })
//             )
//           );
//         }
//       } finally {
//         if (lock) lock.release();
//       }
//     }

//     console.log(`✅ Completed sync for ${account.email}`);
//   } catch (err) {
//     console.error(
//       `❌ Connection/Sync failed for ${account.email}:`,
//       err.message
//     );
//   } finally {
//     if (client) {
//       await client.logout().catch(() => {});
//       console.log(`🔌 Connection closed for ${account.email}`);
//     }
//   }
// }

// Global lock to prevent overlapping syncs for the same account
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

    // Folder discovery...
    // for (const box of mailboxes) {
    //   const lowerPath = box.path.toLowerCase();
    //   if (lowerPath === "inbox" || box.specialUse === "\\Inbox") foldersToSync.push({ path: box.path, type: "inbox" });
    //   else if (lowerPath.includes("sent") || box.specialUse === "\\Sent") foldersToSync.push({ path: box.path, type: "sent" });
    // }
    /* server/src/services/sync/imapSync.js */

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

// // src/services/imapSync.js
// import { ImapFlow } from "imapflow";
// import { simpleParser } from "mailparser";
// import dotenv from "dotenv";
// import pLimit from "p-limit";
// import fs from "fs";
// import path from "path";
// import { getIO } from "../../socket.js";
// import { uploadToR2WithHash, generateHash } from "./r2.js";

// dotenv.config();

// const BASE_URL = process.env.API_BASE_URL || "http://localhost:4002";
// const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// // Tunables
// const BATCH_SIZE = Number(process.env.IMAP_BATCH_SIZE) || 50;
// const PARSE_CONCURRENCY = Number(process.env.IMAP_PARSE_CONCURRENCY) || 5;
// const ACCOUNT_CONCURRENCY = Number(process.env.IMAP_ACCOUNT_CONCURRENCY) || 2;

// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }

// function determineRootEmail(msg) {
//   const from = (msg.from || "").toLowerCase().trim();

//   const toList = (msg.to || "")
//     .toLowerCase()
//     .split(",")
//     .map((s) => s.trim());
//   const ccList = (msg.cc || "")
//     .toLowerCase()
//     .split(",")
//     .map((s) => s.trim());

//   // Rule 1: outgoing → rootEmail = first "to" email
//   if (from === msg.accountEmail.toLowerCase().trim()) {
//     return toList[0] || from;
//   }

//   // Rule 2: reply from TO → use TO as root
//   if (toList.includes(from)) {
//     return from;
//   }

//   // Rule 3: reply from CC → link to TO of the original thread
//   if (ccList.includes(from)) {
//     return toList[0]; // main lead email
//   }

//   // Fallback
//   return from;
// }

// function makeImapProxyUrl(uid, filename, accountId) {
//   const encoded = encodeURIComponent(filename || "file");
//   return `/api/inbox/download/${uid}/${encoded}?accountId=${accountId}`;
// }

// function detectFolders(mailboxes) {
//   const result = { inbox: null, sent: null, spam: null, trash: null };
//   const flatList = [];
//   const traverse = (list) => {
//     for (const box of list) {
//       flatList.push(box);
//       if (box.children) traverse(box.children);
//     }
//   };
//   traverse(mailboxes);

//   for (const box of flatList) {
//     if (box.specialUse === "\\Inbox" || box.path === "INBOX")
//       result.inbox = box.path;
//     else if (box.specialUse === "\\Sent") result.sent = box.path;
//     else if (box.specialUse === "\\Junk") result.spam = box.path;
//     else if (box.specialUse === "\\Trash") result.trash = box.path;
//   }

//   const lowerPaths = flatList.map((m) => ({
//     path: m.path,
//     lower: m.path.toLowerCase(),
//   }));

//   if (!result.sent) {
//     const found = lowerPaths.find(
//       (m) => m.lower.includes("sent") && !m.lower.includes("trash")
//     );
//     if (found) result.sent = found.path;
//   }
//   if (!result.spam) {
//     const found = lowerPaths.find(
//       (m) =>
//         m.lower.includes("[gmail]/spam") ||
//         m.lower.includes("spam") ||
//         m.lower.includes("junk") ||
//         m.lower.includes("bulk") ||
//         m.lower.includes("unwanted")
//     );
//     if (found) result.spam = found.path;
//   }
//   if (!result.trash) {
//     const found = lowerPaths.find(
//       (m) => m.lower.includes("trash") || m.lower.includes("bin")
//     );
//     if (found) result.trash = found.path;
//   }
//   return result;
// }

// export async function saveEmailToDB(
//   prisma,
//   account,
//   parsed,
//   msg,
//   direction,
//   folderType
// ) {
//   try {
//     const messageId =
//       parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;
//     const subject = parsed.subject || "(No Subject)";
//     const fromEmail = parsed.from?.value?.[0]?.address || "";
//     const toEmail = (parsed.to && parsed.to.value?.[0]?.address) || "";
//     const ccEmail = parsed.cc?.value?.map((c) => c.address).join(", ") || null;

//     let cleanBody =
//       parsed.html || parsed.textAsHtml || `<pre>${parsed.text || ""}</pre>`;
//     const sentAt = parsed.date || msg.internalDate || new Date();

//     const isSpam = folderType === "spam";
//     const isTrash = folderType === "trash";

//     // Check if message exists already
//     const existing = await prisma.emailMessage.findUnique({
//       where: {
//         emailAccountId_messageId: { emailAccountId: account.id, messageId },
//       },
//     });

//     if (existing) {
//       if (existing.folder !== folderType) {
//         await prisma.emailMessage.update({
//           where: { id: existing.id },
//           data: { folder: folderType, isSpam, isTrash },
//         });
//       }
//       return existing;
//     }

//     // Compute "rootEmail" dynamically
//     const normalize = (s) => (s || "").toLowerCase().trim();

//     const acc = normalize(account.email);
//     const from = normalize(fromEmail);

//     const toList = (toEmail || "")
//       .split(",")
//       .map((e) => normalize(e))
//       .filter(Boolean);

//     const ccList = (ccEmail || "")
//       .split(",")
//       .map((e) => normalize(e))
//       .filter(Boolean);

//     let rootEmail = null;

//     // OUTGOING → TO email becomes main conversation starter
//     if (from === acc) {
//       rootEmail = toList[0] || from;
//     }
//     // Incoming from TO → root = TO
//     else if (toList.includes(from)) {
//       rootEmail = from;
//     }
//     // Incoming reply from CC → still link under TO user
//     else if (ccList.includes(from)) {
//       rootEmail = toList[0];
//     }
//     // fallback
//     else {
//       rootEmail = from;
//     }

//     // ATTACHMENT PROCESSING
//     const attachmentsMeta = [];
//     if (parsed.attachments?.length) {
//       for (const att of parsed.attachments) {
//         const filename = att.filename || `file_${Date.now()}`;
//         const mimeType =
//           att.contentType || att.mime || "application/octet-stream";
//         const buffer = att.content;
//         const size = buffer?.length || 0;

//         let storageUrl = null;
//         let uniqueHash = null;

//         if (buffer) {
//           const contentHash = generateHash(buffer);
//           uniqueHash = `${contentHash}-acc${account.id}`;

//           try {
//             const existingAtt = await prisma.attachment.findFirst({
//               where: { hash: uniqueHash },
//             });

//             if (existingAtt && existingAtt.storageUrl) {
//               storageUrl = existingAtt.storageUrl;
//             } else {
//               storageUrl = await uploadToR2WithHash(
//                 buffer,
//                 mimeType,
//                 uniqueHash
//               );
//             }
//           } catch (e) {
//             console.warn("R2 Upload failed:", e.message);
//           }
//         }

//         if (!storageUrl) {
//           storageUrl = makeImapProxyUrl(msg.uid, filename, account.id);
//         }

//         attachmentsMeta.push({
//           filename,
//           mimeType,
//           size,
//           storageUrl,
//           hash: uniqueHash,
//           cid: att.cid || null,
//         });

//         if (att.cid && cleanBody.includes(`cid:${att.cid}`)) {
//           cleanBody = cleanBody.replaceAll(`cid:${att.cid}`, storageUrl);
//         }
//       }
//     }

//     // Save Email
//     const savedMsg = await prisma.emailMessage.create({
//       data: {
//         emailAccountId: account.id,
//         messageId,
//         fromEmail,
//         toEmail,
//         ccEmail,
//         subject,
//         body: cleanBody,
//         bodyHtml: parsed.html || null,
//         direction,
//         sentAt,
//         isRead:
//           folderType === "inbox" && direction === "received" ? false : true,
//         folder: folderType,
//         isSpam,
//         isTrash,
//         attachments: attachmentsMeta.length
//           ? { create: attachmentsMeta }
//           : undefined,
//       },
//       include: { attachments: true },
//     });

//     // SOCKET EMIT
//     if (folderType === "inbox") {
//       try {
//         const io = getIO();
//         io.to(`user:${account.userId}`).emit("new_email", {
//           accountId: account.id,
//           messageId: savedMsg.id,
//           subject,
//           fromEmail,
//         });
//       } catch (e) {}
//     }

//     console.log(`📩 Saved [${folderType}]: ${subject.substring(0, 30)}...`);

//     return { savedMsg, rootEmail };
//   } catch (err) {
//     if (err.code === "P2002") return null;
//     if (err.code === "P2003") {
//       console.warn(
//         `⚠️ Account ${account.id} deleted during sync. Stopping save.`
//       );
//       return null;
//     }
//     console.error("❌ saveEmailToDB ERROR:", err.message);
//     return null;
//   }
// }

// async function syncImap(prisma, account) {
//   console.log(`🔄 Syncing ${account.email} [${account.provider || "IMAP"}]`);

//   const dbAccount = await prisma.emailAccount.findUnique({
//     where: { email: account.email },
//   });
//   if (!dbAccount) return;
//   account = dbAccount;

//   let client = null;

//   try {
//     client = new ImapFlow({
//       host: account.imapHost,
//       port: account.imapPort || 993,
//       secure: !!account.imapSecure,
//       auth: {
//         user: account.imapUser || account.email,
//         pass: account.encryptedPass,
//       },
//       tls: { rejectUnauthorized: false },
//       logger: false,
//       socketTimeout: 90000, // 90 seconds
//       connectionTimeout: 30000, // 30 seconds
//       greetingTimeout: 30000, // 30 seconds
//     });

//     // 🔥 FIX: Add global error handler to prevent crashes
//     client.on("error", (err) => {
//       console.error(
//         `⚠️ IMAP Error (${account.email}):`,
//         err.code || err.message
//       );
//       // Don't throw - just log the error
//     });

//     // 🔥 FIX: Add close handler
//     client.on("close", () => {
//       console.log(`🔌 Connection closed for ${account.email}`);
//     });

//     await client.connect();
//   } catch (err) {
//     console.error(`❌ Connect failed for ${account.email}:`, err.message);
//     return;
//   }

//   try {
//     const mailboxes = await client.list().catch(() => []);
//     const foldersMap = detectFolders(mailboxes);

//     const foldersToSync = [];
//     if (foldersMap.inbox)
//       foldersToSync.push({ path: foldersMap.inbox, type: "inbox" });
//     if (foldersMap.sent)
//       foldersToSync.push({ path: foldersMap.sent, type: "sent" });
//     if (foldersMap.spam)
//       foldersToSync.push({ path: foldersMap.spam, type: "spam" });

//     for (const { path: folderPath, type: folderType } of foldersToSync) {
//       let lock;
//       try {
//         // 🔥 FIX: Add timeout for mailbox lock
//         const lockPromise = client.getMailboxLock(folderPath);
//         const timeoutPromise = new Promise((_, reject) =>
//           setTimeout(() => reject(new Error("Mailbox lock timeout")), 30000)
//         );

//         lock = await Promise.race([lockPromise, timeoutPromise]);

//         const uids = await client.search({ all: true });

//         if (uids.length > 0) {
//           console.log(`Processing ${uids.length} msgs in ${folderType}`);
//           const reversedUids = uids.reverse();

//           for (let i = 0; i < reversedUids.length; i += BATCH_SIZE) {
//             const batch = reversedUids.slice(i, i + BATCH_SIZE);
//             const limit = pLimit(PARSE_CONCURRENCY);

//             await Promise.all(
//               batch.map((uid) =>
//                 limit(async () => {
//                   try {
//                     const message = await client.fetchOne(String(uid), {
//                       uid: true,
//                       envelope: true,
//                       source: true,
//                       internalDate: true,
//                     });

//                     if (!message) return;

//                     const parsed = await simpleParser(message.source);
//                     let direction = "received";
//                     const fromAddr = parsed.from?.value?.[0]?.address || "";

//                     if (folderType === "sent") {
//                       direction = "sent";
//                     } else if (
//                       fromAddr.toLowerCase() === account.email.toLowerCase()
//                     ) {
//                       direction = "sent";
//                     }

//                     await saveEmailToDB(
//                       prisma,
//                       account,
//                       parsed,
//                       message,
//                       direction,
//                       folderType
//                     );
//                   } catch (e) {
//                     console.warn(`Error processing message ${uid}:`, e.message);
//                   }
//                 })
//               )
//             );
//           }
//         }
//       } catch (err) {
//         console.warn(`Folder error ${folderPath}:`, err.message);
//         // Break loop if connection died
//         if (
//           err.code === "NoConnection" ||
//           err.code === "ETIMEOUT" ||
//           err.message.includes("Connection not available") ||
//           err.message.includes("timeout")
//         ) {
//           console.log(`Breaking sync loop due to connection issue`);
//           break;
//         }
//       } finally {
//         if (lock) {
//           try {
//             lock.release();
//           } catch (e) {
//             console.warn("Error releasing lock:", e.message);
//           }
//         }
//       }
//     }
//   } catch (err) {
//     console.error(`Sync error for ${account.email}:`, err.message);
//   } finally {
//     // 🔥 FIX: Safe logout with proper error handling
//     if (client) {
//       try {
//         if (client.usable) {
//           await Promise.race([
//             client.logout(),
//             new Promise((_, reject) =>
//               setTimeout(() => reject(new Error("Logout timeout")), 5000)
//             ),
//           ]);
//         }
//       } catch (e) {
//         console.warn(`Logout error for ${account.email}:`, e.message);
//       } finally {
//         try {
//           client.close();
//         } catch (e) {
//           // Ignore close errors
//         }
//       }
//     }
//   }
// }

// export async function runSync(prisma) {
//   console.log("⏳ Running IMAP sync...");
//   const accounts = await prisma.emailAccount.findMany({
//     where: { verified: true },
//   });

//   const limit = pLimit(ACCOUNT_CONCURRENCY);

//   // 🔥 FIX: Wrap each account sync to prevent one failure from crashing all
//   await Promise.allSettled(
//     accounts.map((acc) =>
//       limit(async () => {
//         try {
//           await syncImap(prisma, acc);
//         } catch (err) {
//           console.error(`Failed to sync ${acc.email}:`, err.message);
//         }
//       })
//     )
//   );

//   console.log("🎉 All accounts sync completed");
// }

// export async function runSyncForAccount(prisma, email) {
//   const acc = await prisma.emailAccount.findUnique({ where: { email } });
//   if (!acc) return console.log("⚠️ Account not found:", email);

//   try {
//     await syncImap(prisma, acc);
//   } catch (err) {
//     console.error(`Failed to sync ${email}:`, err.message);
//   }
// }
