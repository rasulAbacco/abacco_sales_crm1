import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import dotenv from "dotenv";
import pLimit from "p-limit";
import fs from "fs";
import path from "path";
import { uploadToR2WithHash, generateHash } from "./r2.js";

dotenv.config();

// ======================================================
// 📂 LOGGING SETUP (Clean Console, File Logging)
// ======================================================
const LOG_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const ERROR_LOG_FILE = path.join(LOG_DIR, "imap-errors.log");

function logErrorToFile(accountEmail, errorMsg) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${accountEmail}] ${errorMsg}\n`;
  // Print clean red message to console
  console.error(`❌ [${accountEmail}] ${errorMsg}`);
  // Save full detail to file
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
   🔥 HELPER: FIND CONVERSATION (Threading)
   Looks for existing threads via In-Reply-To / References
====================================================== */
async function findConversationId(prisma, parsed) {
  const inReplyTo = parsed.inReplyTo || null;

  let referencesArray = [];
  if (Array.isArray(parsed.references)) {
    referencesArray = parsed.references;
  } else if (typeof parsed.references === "string") {
    referencesArray = parsed.references.split(/\s+/).filter(Boolean);
  }

  // Check In-Reply-To and References (reverse order to check newest first)
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
   Prevents "Foreign Key" crashes if thread doesn't exist
====================================================== */
// async function createNewConversation(
//   prisma,
//   account,
//   parsed,
//   messageId,
//   fromEmail,
//   toEmail
// ) {
//   try {
//     const subject = parsed.subject || "(No Subject)";
//     const sentAt = parsed.date || new Date();

//     const newConv = await prisma.conversation.create({
//       data: {
//         id: messageId, // Start the thread with this Message ID
//         emailAccountId: account.id,
//         subject,
//         participants: [fromEmail, toEmail].filter(Boolean).join(","),
//         toRecipients: toEmail,
//         initiatorEmail: fromEmail,
//         lastMessageAt: sentAt,
//         messageCount: 1,
//         unreadCount: 1,
//       },
//     });
//     return newConv.id;
//   } catch (err) {
//     // If it exists (Race condition), return the ID anyway
//     if (err.code === "P2002") {
//       return messageId;
//     }
//     throw err;
//   }
// }
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

    // 🔥 FIX: Ensure account.id is a Number, as your schema defines it as Int
    const accountId = Number(account.id);

    // Optional: Safety check to verify account exists before proceeding
    const accountExists = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });

    if (!accountExists) {
      throw new Error(`EmailAccount with ID ${accountId} not found.`);
    }

    const newConv = await prisma.conversation.create({
      data: {
        id: messageId,
        emailAccountId: accountId, // Use the verified ID
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
// async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
//   const messageId =
//     parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;

//   // 1. Check for duplicates
//   const exists = await prisma.emailMessage.findUnique({
//     where: {
//       emailAccountId_messageId: { emailAccountId: account.id, messageId },
//     },
//   });
//   if (exists) return;

//   // 2. Extract Names AND Emails
//   const fromObj = parsed.from?.value?.[0];
//   const fromName = fromObj?.name || null;
//   const fromEmail = fromObj?.address || "";

//   const toRecipients = parsed.to?.value || [];
//   const toEmail = toRecipients.map((v) => v.address).join(", ") || "";
//   const toName = toRecipients[0]?.name || null;

//   // 3. Attachments (R2 Upload)
//   let attachmentsMeta = [];
//   if (parsed.attachments?.length) {
//     for (const att of parsed.attachments) {
//       if (!att.content) continue;
//       const contentHash = generateHash(att.content);
//       const uniqueKey = `${contentHash}-${account.id}-${Date.now()}`;
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

//   // 4. 🔥 FIND OR CREATE CONVERSATION
//   let conversationId = await findConversationId(prisma, parsed);

//   // If NO conversation found, we MUST create one before saving
//   if (!conversationId) {
//     try {
//       conversationId = await createNewConversation(
//         prisma,
//         account,
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
//       return; // Stop here if we can't link the email
//     }
//   }

//   // 5. Save the Message
//   try {
//     await prisma.emailMessage.create({
//       data: {
//         emailAccountId: account.id,
//         conversationId, // ✅ Guaranteed to exist now
//         messageId,
//         subject: parsed.subject || "(No Subject)",
//         fromEmail,
//         fromName,
//         toEmail,
//         toName,
//         body: parsed.html || parsed.textAsHtml || parsed.text,
//         direction,
//         folder,
//         sentAt: parsed.date || new Date(),
//         attachments: attachmentsMeta.length
//           ? { create: attachmentsMeta }
//           : undefined,
//       },
//     });

//     // Bump conversation timestamp
//     await prisma.conversation
//       .update({
//         where: { id: conversationId },
//         data: {
//           lastMessageAt: parsed.date || new Date(),
//           messageCount: { increment: 1 },
//         },
//       })
//       .catch(() => {});
//   } catch (err) {
//     if (err.code !== "P2002") {
//       logErrorToFile(account.email, `DB Save Error: ${err.message}`);
//     }
//   }
// }
async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
  const messageId =
    parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;

  // 1️⃣ Prevent duplicates
  const exists = await prisma.emailMessage.findUnique({
    where: {
      emailAccountId_messageId: {
        emailAccountId: account.id,
        messageId,
      },
    },
  });
  if (exists) return;

  // 2️⃣ Extract FROM / TO / CC (emails + names)
  const fromObj = parsed.from?.value?.[0];
  const fromName = fromObj?.name || null;
  const fromEmail = fromObj?.address || "";

  const toRecipients = parsed.to?.value || [];
  const toEmail = toRecipients.map((v) => v.address).join(", ") || "";
  const toName = toRecipients[0]?.name || null;

  const ccRecipients = parsed.cc?.value || [];
  const ccEmail = ccRecipients.map((v) => v.address).join(", ") || "";

  // 3️⃣ 🔥 FIND MATCHING LEAD (from / to / cc)
  let leadDetailId = null;
  try {
    const emailsToMatch = [];

    if (fromEmail) emailsToMatch.push(fromEmail.toLowerCase());

    toEmail
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .forEach((e) => emailsToMatch.push(e.toLowerCase()));

    ccEmail
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .forEach((e) => emailsToMatch.push(e.toLowerCase()));

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

  // 4️⃣ Attachments (Cloudflare R2 upload)
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

  // 5️⃣ Find or create conversation
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

  // 6️⃣ Save EmailMessage (🔥 leadDetailId ADDED)
  try {
    await prisma.emailMessage.create({
      data: {
        emailAccountId: account.id,
        conversationId,
        messageId,
        subject: parsed.subject || "(No Subject)",
        fromEmail,
        fromName,
        toEmail,
        toName,
        ccEmail,
        body: parsed.html || parsed.textAsHtml || parsed.text,
        direction,
        folder,
        sentAt: parsed.date || new Date(),
        leadDetailId, // ✅ THIS FIXES COUNTRY FILTER
        attachments: attachmentsMeta.length
          ? { create: attachmentsMeta }
          : undefined,
      },
    });

    // 7️⃣ Update conversation stats
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
    tls: { rejectUnauthorized: false }, // Helps with certificate errors
    logger: false, // 🔇 Silence the JSON logs
    socketTimeout: 60000,
    connectionTimeout: 30000,
  });

  client.on("error", (err) => {
    logErrorToFile(account.email, `IMAP Error: ${err.message}`);
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
      } else if (lowerPath.includes("spam") || box.specialUse === "\\Junk") {
        foldersToSync.push({ path: box.path, type: "spam" });
      }
    }

    for (const { path, type } of foldersToSync) {
      if (!client.usable) break;
      const lock = await client.getMailboxLock(path);

      try {
        await client.mailboxOpen(path);
        // Search all (relying on DB duplicate check to skip existing)
        const uids = await client.search({ all: true });

        if (uids.length > 0) {
          const reversedUids = uids.reverse();

          // 🛡️ ULTRA-SAFE SETTINGS (Prevents "Connection Not Available")
          // If you still get errors, increase THROTTLE_MS to 2000
          const SMALL_BATCH = 2; // Process 2 emails at a time
          const STABLE_LIMIT = pLimit(1); // One active fetch at a time (Sequential)
          const THROTTLE_MS = 1000; // Wait 1.0 second between batches

          for (let i = 0; i < reversedUids.length; i += SMALL_BATCH) {
            if (!client.usable) break;
            const batch = reversedUids.slice(i, i + SMALL_BATCH);

            await Promise.all(
              batch.map((uid) =>
                STABLE_LIMIT(async () => {
                  try {
                    if (!client.usable) return;

                    // 🛑 Throttle to keep server happy
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
                    if (e.message.includes("Connection not available")) {
                      client.close();
                    }
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

/* ======================================================
   🚀 EXPORTS
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
// const BATCH_SIZE = Number(process.env.IMAP_BATCH_SIZE) || 50;
// const PARSE_CONCURRENCY = Number(process.env.IMAP_PARSE_CONCURRENCY) || 5;
// const ACCOUNT_CONCURRENCY = Number(process.env.IMAP_ACCOUNT_CONCURRENCY) || 2;

// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }

// /* ======================================================
//    🔥 HELPER: FIND CONVERSATION (Threading)
// ====================================================== */
// async function findConversationId(prisma, parsed) {
//   const inReplyTo = parsed.inReplyTo || null;

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

// /* ======================================================
//    🔥 HELPER: CREATE MISSING CONVERSATION
// ====================================================== */
// async function createNewConversation(
//   prisma,
//   account,
//   parsed,
//   messageId,
//   fromEmail,
//   toEmail
// ) {
//   try {
//     // 1. Prepare Data
//     const subject = parsed.subject || "(No Subject)";
//     const sentAt = parsed.date || new Date();

//     // 2. Create in DB
//     const newConv = await prisma.conversation.create({
//       data: {
//         id: messageId, // Use messageId as the Conversation ID for the start of a thread
//         emailAccountId: account.id,
//         subject,
//         participants: [fromEmail, toEmail].filter(Boolean).join(","),
//         toRecipients: toEmail,
//         initiatorEmail: fromEmail,
//         lastMessageAt: sentAt,
//         messageCount: 1,
//         unreadCount: 1, // New thread = unread
//       },
//     });
//     return newConv.id;
//   } catch (err) {
//     // If it failed because it exists (Race condition), that's fine, return the ID
//     if (err.code === "P2002") {
//       return messageId;
//     }
//     throw err; // Real error
//   }
// }

// /* ======================================================
//    CORE: SAVE EMAIL TO DB
// ====================================================== */
// async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
//   const messageId =
//     parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;

//   // 1. Check for duplicates
//   const exists = await prisma.emailMessage.findUnique({
//     where: {
//       emailAccountId_messageId: { emailAccountId: account.id, messageId },
//     },
//   });
//   if (exists) return;

//   // 2. Extract Names AND Emails
//   const fromObj = parsed.from?.value?.[0];
//   const fromName = fromObj?.name || null;
//   const fromEmail = fromObj?.address || "";

//   const toRecipients = parsed.to?.value || [];
//   const toEmail = toRecipients.map((v) => v.address).join(", ") || "";
//   const toName = toRecipients[0]?.name || null;

//   // 3. Attachments (R2)
//   let attachmentsMeta = [];
//   if (parsed.attachments?.length) {
//     for (const att of parsed.attachments) {
//       if (!att.content) continue;
//       const contentHash = generateHash(att.content);
//       const uniqueKey = `${contentHash}-${account.id}-${Date.now()}`;
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

//   // 4. 🔥 FIND OR CREATE CONVERSATION (The Fix)
//   let conversationId = await findConversationId(prisma, parsed);

//   // If NO conversation found, we MUST create one before saving the message
//   if (!conversationId) {
//     try {
//       conversationId = await createNewConversation(
//         prisma,
//         account,
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
//       return; // Stop here if we can't create a parent
//     }
//   }

//   // 5. Save the Message
//   try {
//     await prisma.emailMessage.create({
//       data: {
//         emailAccountId: account.id,
//         conversationId, // ✅ This is now guaranteed to exist
//         messageId,
//         subject: parsed.subject || "(No Subject)",
//         fromEmail,
//         fromName,
//         toEmail,
//         toName,
//         body: parsed.html || parsed.textAsHtml || parsed.text,
//         direction,
//         folder,
//         sentAt: parsed.date || new Date(),
//         attachments: attachmentsMeta.length
//           ? { create: attachmentsMeta }
//           : undefined,
//       },
//     });

//     // Update conversation timestamp
//     await prisma.conversation
//       .update({
//         where: { id: conversationId },
//         data: {
//           lastMessageAt: parsed.date || new Date(),
//           messageCount: { increment: 1 },
//         },
//       })
//       .catch(() => {}); // Ignore update errors
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

//   activeSyncs.add(account.id);
//   console.log(`🔄 Syncing: ${account.email}`);

//   const client = new ImapFlow({
//     host: account.imapHost,
//     port: account.imapPort || 993,
//     secure: true,
//     auth: {
//       user: account.imapUser || account.email,
//       pass: account.encryptedPass,
//     },
//     tls: { rejectUnauthorized: false },
//     logger: false,
//     socketTimeout: 60000,
//     connectionTimeout: 30000,
//   });

//   client.on("error", (err) => {
//     logErrorToFile(account.email, `IMAP Error: ${err.message}`);
//   });

//   try {
//     await client.connect();
//     const mailboxes = await client.list();
//     const foldersToSync = [];

//     for (const box of mailboxes) {
//       const lowerPath = box.path.toLowerCase();
//       if (lowerPath === "inbox" || box.specialUse === "\\Inbox") {
//         foldersToSync.push({ path: box.path, type: "inbox" });
//       } else if (lowerPath.includes("sent") || box.specialUse === "\\Sent") {
//         foldersToSync.push({ path: box.path, type: "sent" });
//       } else if (lowerPath.includes("spam") || box.specialUse === "\\Junk") {
//         foldersToSync.push({ path: box.path, type: "spam" });
//       }
//     }

//     for (const { path, type } of foldersToSync) {
//       if (!client.usable) break;
//       const lock = await client.getMailboxLock(path);

//       try {
//         await client.mailboxOpen(path);
//         // Only fetch emails from last 30 days to prevent history overload issues
//         // const uids = await client.search({ all: true });
//         // Better: Search UNSEN or recent? For now keeping ALL but relying on duplicate check
//         const uids = await client.search({ all: true });

//         if (uids.length > 0) {
//           const reversedUids = uids.reverse();
//           const SMALL_BATCH = 15;
//           const STABLE_LIMIT = pLimit(2);
//           const THROTTLE_MS = 250;

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

// // FIXED: imapSync.js - Outlook-style conversation threading
// // 🔒 HARD RULE: One outbound email = One conversation
// // ⚠️ CRITICAL CHANGES marked with 🔥

// import { ImapFlow } from "imapflow";
// import { simpleParser } from "mailparser";
// import dotenv from "dotenv";
// import pLimit from "p-limit";
// import fs from "fs";
// import path from "path";
// import { getIO } from "../../socket.js";
// import { uploadToR2WithHash, generateHash } from "./r2.js";

// dotenv.config();

// const UPLOAD_DIR = path.join(process.cwd(), "uploads");
// const BATCH_SIZE = Number(process.env.IMAP_BATCH_SIZE) || 50;
// const PARSE_CONCURRENCY = Number(process.env.IMAP_PARSE_CONCURRENCY) || 5;
// const ACCOUNT_CONCURRENCY = Number(process.env.IMAP_ACCOUNT_CONCURRENCY) || 2;

// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }

// /* ======================================================
//    🔥 FIX 1: FIND CONVERSATION FROM REPLY HEADERS ONLY
//    ⚠️ CRITICAL: Only use In-Reply-To/References
//    ❌ NO participant logic, NO subject logic
// ====================================================== */

// // async function findConversationId(prisma, parsed) {
// //   const inReplyTo = parsed.inReplyTo || null;

// //   // 🔥 FIX: Handle both Array and String input
// //   let referencesArray = [];
// //   if (Array.isArray(parsed.references)) {
// //     referencesArray = parsed.references;
// //   } else if (typeof parsed.references === "string") {
// //     referencesArray = parsed.references.split(/\s+/).filter(Boolean);
// //   }

// //   const threadIdsToCheck = [
// //     inReplyTo,
// //     ...[...referencesArray].reverse(),
// //   ].filter(Boolean);
// //   if (threadIdsToCheck.length === 0) return null;

// //   const conversation = await prisma.conversation.findFirst({
// //     where: { id: { in: threadIdsToCheck } },
// //     select: { id: true },
// //   });

// //   return conversation?.id || null;
// // }
// /* Helper to safely handle threading headers */
// async function findConversationId(prisma, parsed) {
//   const inReplyTo = parsed.inReplyTo || null;

//   // 🔥 FIX: Normalize references into an array regardless of source format
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
// /* ======================================================
//    🔥 FIX 2: CREATE CONVERSATION FOR OUTBOUND EMAIL
//    ⚠️ CRITICAL: This is the ONLY way conversations are created
//    🎯 Rule: One outbound email = One conversation
// ====================================================== */
// async function createConversationForOutbound(
//   prisma,
//   account,
//   parsed,
//   messageId
// ) {
//   const toEmail = parsed.to?.value?.map((v) => v.address).join(", ") || "";
//   const ccEmail = parsed.cc?.value?.map((v) => v.address).join(", ") || null;
//   const subject = parsed.subject || "(No Subject)";
//   const sentAt = parsed.date || new Date();

//   try {
//     // Use the Message-ID as the conversationId (Outlook-style)
//     const conversation = await prisma.conversation.create({
//       data: {
//         id: messageId, // 🔥 Message-ID IS the conversationId
//         emailAccountId: account.id,
//         subject,
//         participants: [toEmail, ccEmail].filter(Boolean).join(","),
//         toRecipients: toEmail, // 🔥 This defines the conversation
//         ccRecipients: ccEmail,
//         lastMessageAt: sentAt,
//         messageCount: 1,
//         unreadCount: 0,
//         initiatorEmail: account.email,
//       },
//     });
//     console.log(`🆕 Created conversation: ${conversation.id}`);
//     console.log(`   From: ${account.email}`);
//     console.log(`   To: ${toEmail}`);
//     console.log(`   Cc: ${ccEmail || "none"}`);
//     return conversation.id;
//   } catch (err) {
//     // Conversation already exists (duplicate Message-ID)
//     if (err.code === "P2002") {
//       console.log(`⚠️ Conversation already exists: ${messageId}`);
//       return messageId;
//     }
//     console.error("❌ Error creating conversation:", err);
//     return null;
//   }
// }

// /* ======================================================
//    📎 IMAP ATTACHMENT URL (unchanged)
// ====================================================== */
// function makeImapProxyUrl(uid, filename, accountId) {
//   const encoded = encodeURIComponent(filename || "file");
//   return `/api/inbox/download/${uid}/${encoded}?accountId=${accountId}`;
// }

// /* ======================================================
//    🔥 FIX 3: SAVE EMAIL WITH PROPER CONVERSATION LOGIC
//    ⚠️ CRITICAL CHANGES:
//    1. For OUTBOUND (sent): Create conversation if no In-Reply-To/References
//    2. For INBOUND (received): Find conversation via In-Reply-To/References
//    3. Never create conversations for inbound emails
// ====================================================== */

// /* server/src/services/sync/imapSync.js */

// // async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
// //   // 1. INITIALIZE & DEDUPLICATION
// //   const messageId =
// //     parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;

// //   const exists = await prisma.emailMessage.findUnique({
// //     where: {
// //       emailAccountId_messageId: { emailAccountId: account.id, messageId },
// //     },
// //   });
// //   if (exists) return;

// //   // 2. ROBUST NAME & EMAIL EXTRACTION
// //   const fromObj = parsed.from?.value?.[0];
// //   const fromName = fromObj?.name || null;
// //   const fromEmail = fromObj?.address || "";

// //   // ✅ FIX: Capture all recipients and specifically the name of the primary recipient
// //   const toRecipients = parsed.to?.value || [];
// //   const toEmail = toRecipients.map((v) => v.address).join(", ") || "";
// //   const toName = toRecipients[0]?.name || null; // This fills the [null] column you found in DB

// //   // Extract CC Details
// //   const ccRecipients = parsed.cc?.value || [];
// //   const ccEmail = ccRecipients.map((v) => v.address).join(", ") || null;

// //   // Normalize Threading Headers
// //   const inReplyTo = parsed.inReplyTo || null;
// //   let referencesStr = null;
// //   if (Array.isArray(parsed.references)) {
// //     referencesStr = parsed.references.join(" ");
// //   } else if (typeof parsed.references === "string") {
// //     referencesStr = parsed.references;
// //   }

// //   // 3. CONVERSATION THREADING
// //   let conversationId = await findConversationId(prisma, parsed);

// //   if (!conversationId) {
// //     conversationId = messageId;
// //     try {
// //       await prisma.conversation.upsert({
// //         where: { id: messageId },
// //         update: { lastMessageAt: parsed.date || new Date() },
// //         create: {
// //           id: messageId,
// //           emailAccountId: account.id,
// //           subject: parsed.subject || "(No Subject)",
// //           participants: [fromEmail, toEmail].filter(Boolean).join(","),
// //           toRecipients: toEmail,
// //           lastMessageAt: parsed.date || new Date(),
// //           initiatorEmail: fromEmail,
// //         },
// //       });
// //     } catch (err) {
// //       conversationId = messageId;
// //     }
// //   }

// //   // 4. CLOUDFLARE R2 ATTACHMENT PROCESSING
// //   let attachmentsMeta = [];
// //   if (parsed.attachments?.length) {
// //     for (const att of parsed.attachments) {
// //       const buffer = att.content;
// //       if (!buffer) continue;

// //       const contentHash = generateHash(buffer);
// //       // 🔥 Unique suffix for Cloudflare R2 isolated storage
// //       const uniqueKey = `${contentHash}-${account.id}-${Date.now()}`;

// //       let storageUrl;
// //       try {
// //         // Upload directly to Cloudflare R2
// //         storageUrl = await uploadToR2WithHash(
// //           buffer,
// //           att.contentType || "application/octet-stream",
// //           uniqueKey
// //         );
// //       } catch (e) {
// //         console.warn(
// //           `⚠️ R2 Upload failed for ${att.filename}, using proxy fallback`
// //         );
// //         storageUrl = makeImapProxyUrl(msg.uid, att.filename, account.id);
// //       }

// //       attachmentsMeta.push({
// //         filename: att.filename || "file",
// //         mimeType: att.contentType,
// //         size: buffer.length,
// //         storageUrl: storageUrl,
// //         hash: contentHash,
// //       });
// //     }
// //   }

// //   // 5. FINAL DATABASE INSERTION
// //   try {
// //     await prisma.emailMessage.create({
// //       data: {
// //         emailAccountId: account.id,
// //         conversationId,
// //         messageId,
// //         subject: parsed.subject || "(No Subject)",

// //         // ✅ DATA CAPTURE: Correctly mapping names to schema
// //         fromEmail,
// //         fromName,
// //         toEmail,
// //         toName,

// //         ccEmail,
// //         body: parsed.html || parsed.textAsHtml || parsed.text,
// //         direction,
// //         folder,
// //         sentAt: parsed.date || msg.internalDate || new Date(),
// //         inReplyTo,
// //         references: referencesStr,
// //         attachments: attachmentsMeta.length
// //           ? { create: attachmentsMeta }
// //           : undefined,
// //       },
// //     });
// //     console.log(`✅ [STORED] Msg from: ${fromName || fromEmail}`);
// //   } catch (err) {
// //     console.error(`❌ [DB ERROR] Failed to save ${messageId}:`, err.message);
// //   }
// // }

// /* server/src/services/sync/imapSync.js */

// // async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
// //   const messageId = parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;

// //   // 1. Check for duplicates
// //   const exists = await prisma.emailMessage.findUnique({
// //     where: { emailAccountId_messageId: { emailAccountId: account.id, messageId } },
// //   });
// //   if (exists) return;

// //   // 2. Extract Names AND Emails
// //   const fromObj = parsed.from?.value?.[0];
// //   const fromName = fromObj?.name || null; // Captured from IMAP
// //   const fromEmail = fromObj?.address || "";

// //   const toRecipients = parsed.to?.value || [];
// //   const toEmail = toRecipients.map(v => v.address).join(", ") || "";
// //   const toName = toRecipients[0]?.name || null; // FIX: Now captures recipient name

// //   // 3. Cloudflare R2 Upload
// //   let attachmentsMeta = [];
// //   if (parsed.attachments?.length) {
// //     for (const att of parsed.attachments) {
// //       if (!att.content) continue;
// //       const contentHash = generateHash(att.content);
// //       const uniqueKey = `${contentHash}-${account.id}-${Date.now()}`;
// //       try {
// //         const storageUrl = await uploadToR2WithHash(att.content, att.contentType, uniqueKey);
// //         attachmentsMeta.push({ filename: att.filename, mimeType: att.contentType, size: att.content.length, storageUrl, hash: contentHash });
// //       } catch (e) {
// //         console.warn("R2 failed, using proxy");
// //       }
// //     }
// //   }

// //   // 4. Save to Database
// //   try {
// //     await prisma.emailMessage.create({
// //       data: {
// //         emailAccountId: account.id,
// //         conversationId: (await findConversationId(prisma, parsed)) || messageId,
// //         messageId,
// //         subject: parsed.subject || "(No Subject)",
// //         fromEmail, fromName, toEmail, toName, // 🔥 BOTH Name and Email are now stored
// //         body: parsed.html || parsed.textAsHtml || parsed.text,
// //         direction, folder, sentAt: parsed.date || new Date(),
// //         attachments: attachmentsMeta.length ? { create: attachmentsMeta } : undefined,
// //       },
// //     });
// //   } catch (err) {
// //     console.error(`❌ DB Error: ${err.message}`);
// //   }
// // }
// /* server/services/sync/imapSync.js */

// async function saveEmailToDB(prisma, account, parsed, msg, direction, folder) {
//   const messageId =
//     parsed.messageId || msg.envelope?.messageId || `uid-${msg.uid}`;

//   // 1. Check for duplicates
//   const exists = await prisma.emailMessage.findUnique({
//     where: {
//       emailAccountId_messageId: { emailAccountId: account.id, messageId },
//     },
//   });
//   if (exists) return;

//   // 2. Extract Names AND Emails
//   const fromObj = parsed.from?.value?.[0];
//   const fromName = fromObj?.name || null;
//   const fromEmail = fromObj?.address || "";

//   const toRecipients = parsed.to?.value || [];
//   const toEmail = toRecipients.map((v) => v.address).join(", ") || "";
//   const toName = toRecipients[0]?.name || null;

//   // 3. Cloudflare R2 Upload & Attachment Processing
//   let attachmentsMeta = [];
//   if (parsed.attachments?.length) {
//     for (const att of parsed.attachments) {
//       if (!att.content) continue;

//       const contentHash = generateHash(att.content);
//       const uniqueKey = `${contentHash}-${account.id}-${Date.now()}`;

//       try {
//         const storageUrl = await uploadToR2WithHash(
//           att.content,
//           att.contentType,
//           uniqueKey
//         );

//         // 🔥 FIX: Added fallback '|| "file"' to prevent crash on missing filenames
//         attachmentsMeta.push({
//           filename: att.filename || "file",
//           mimeType: att.contentType || "application/octet-stream",
//           size: att.content.length,
//           storageUrl,
//           hash: contentHash,
//         });
//       } catch (e) {
//         console.warn("R2 failed, using proxy", e.message);
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
//         fromEmail,
//         fromName,
//         toEmail,
//         toName,
//         body: parsed.html || parsed.textAsHtml || parsed.text,
//         direction,
//         folder,
//         sentAt: parsed.date || new Date(),
//         attachments: attachmentsMeta.length
//           ? { create: attachmentsMeta }
//           : undefined,
//       },
//     });
//   } catch (err) {
//     console.error(`❌ DB Error: ${err.message}`);
//   }
// }

// const activeSyncs = new Set();

// async function syncImap(prisma, account) {
//   if (activeSyncs.has(account.id)) {
//     console.log(
//       `⏳ Sync already in progress for ${account.email}, skipping...`
//     );
//     return;
//   }

//   activeSyncs.add(account.id);
//   console.log(`🔄 Starting High-Capacity Sync for ${account.email}...`);

//   const client = new ImapFlow({
//     host: account.imapHost,
//     port: account.imapPort || 993,
//     secure: true,
//     auth: {
//       user: account.imapUser || account.email,
//       pass: account.encryptedPass,
//     },
//     tls: { rejectUnauthorized: false },
//     // ⏱️ Increase timeouts to handle slower connections
//     socketTimeout: 60000,
//     connectionTimeout: 30000,
//   });

//   // 🔥 CRITICAL: Add this to stop the "bsdk" crashing
//   client.on("error", (err) => {
//     console.error(`⚠️ IMAP Error [${account.email}]:`, err.message);
//     // This empty handler prevents the process from crashing
//   });

//   try {
//     await client.connect();
//     const mailboxes = await client.list();
//     const foldersToSync = [];

//     for (const box of mailboxes) {
//       const lowerPath = box.path.toLowerCase();

//       if (lowerPath === "inbox" || box.specialUse === "\\Inbox") {
//         foldersToSync.push({ path: box.path, type: "inbox" });
//       } else if (lowerPath.includes("sent") || box.specialUse === "\\Sent") {
//         foldersToSync.push({ path: box.path, type: "sent" });
//       }
//       // 🔥 EXPANDED SPAM DETECTION
//       else if (
//         lowerPath.includes("spam") ||
//         lowerPath.includes("junk") ||
//         lowerPath.includes("bulk") ||
//         box.specialUse === "\\Junk"
//       ) {
//         foldersToSync.push({ path: box.path, type: "spam" });
//       }
//     }

//     for (const { path, type } of foldersToSync) {
//       if (!client.usable) break;

//       console.log(`📥 Processing Folder: ${path}`);
//       const lock = await client.getMailboxLock(path);

//       try {
//         await client.mailboxOpen(path);

//         // 🔥 HIGH-VOLUME OPTIMIZATION: Only sync messages from the last 30 days
//         // to prevent crashing on 10,000+ historical emails initially
//         const searchCriteria = { all: true };
//         const uids = await client.search(searchCriteria);

//         if (uids.length === 0) continue;

//         const reversedUids = uids.reverse();

//         // 🔥 STABILITY SETTINGS
//         const SMALL_BATCH = 15; // Process few items per database transaction
//         const STABLE_LIMIT = pLimit(2); // Low concurrency to prevent DB locking
//         const THROTTLE_MS = 250; // 1/4 second delay to prevent server resets

//         for (let i = 0; i < reversedUids.length; i += SMALL_BATCH) {
//           if (!client.usable) break;

//           const batch = reversedUids.slice(i, i + SMALL_BATCH);

//           await Promise.all(
//             batch.map((uid) =>
//               STABLE_LIMIT(async () => {
//                 try {
//                   if (!client.usable) return;

//                   // 🔥 FIX: Aggressive throttling for 10k+ mailboxes
//                   await new Promise((resolve) =>
//                     setTimeout(resolve, THROTTLE_MS)
//                   );

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
//                   const direction =
//                     fromAddr === account.email.toLowerCase()
//                       ? "sent"
//                       : "received";

//                   await saveEmailToDB(
//                     prisma,
//                     account,
//                     parsed,
//                     msg,
//                     direction,
//                     type
//                   );
//                 } catch (e) {
//                   if (e.message.includes("Connection not available"))
//                     client.close();
//                   console.warn(`⚠️ UID ${uid} failed:`, e.message);
//                 }
//               })
//             )
//           );
//         }
//       } finally {
//         if (lock) lock.release();
//       }
//     }
//   } catch (err) {
//     console.error(`❌ Sync Failed:`, err.message);
//   } finally {
//     activeSyncs.delete(account.id);
//     if (client) await client.logout().catch(() => {});
//     console.log(`🔌 Connection closed for ${account.email}`);
//   }
// }
// /* ======================================================
//    🚀 PUBLIC EXPORTS
// ====================================================== */
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
