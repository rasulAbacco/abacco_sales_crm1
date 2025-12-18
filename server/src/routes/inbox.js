// server/routes/inbox.js - ENHANCED VERSION
import express from "express";
import { PrismaClient } from "@prisma/client";
import { Buffer } from "buffer";
import qp from "quoted-printable";
import sgMail from "@sendgrid/mail";
import fetch from "node-fetch";
import { ImapFlow } from "imapflow";
import { htmlToText } from "html-to-text";
import nodemailer from "nodemailer";

const router = express.Router();
const prisma = new PrismaClient();
const qpDecode = qp.decode;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const BASE_URL = process.env.API_BASE_URL || "http://localhost:4002";

// ============================================================
// 🔧 FIXED THREADING LOGIC - Multi-Participant Conversations
// ============================================================

// Add this helper function at the top of your routes file
// function getThreadKey(message, accountEmail) {
//   const normalize = (s) => (s || "").toLowerCase().trim();

//   // Collect all participants
//   const participants = new Set();

//   // Add from
//   if (message.fromEmail) {
//     participants.add(normalize(message.fromEmail));
//   }

//   // Add to recipients
//   if (message.toEmail) {
//     message.toEmail.split(",").forEach((email) => {
//       const cleaned = normalize(email);
//       if (cleaned) participants.add(cleaned);
//     });
//   }

//   // Add cc recipients
//   if (message.ccEmail) {
//     message.ccEmail.split(",").forEach((email) => {
//       const cleaned = normalize(email);
//       if (cleaned) participants.add(cleaned);
//     });
//   }

//   // Remove the account owner's email
//   participants.delete(normalize(accountEmail));

//   // Convert to sorted array and create key
//   const sortedParticipants = Array.from(participants).sort();

//   // Return thread key (e.g., "alice@ex.com|bob@ex.com|charlie@ex.com")
//   return sortedParticipants.join("|");
// }

/* ============================================================
   🧠 Helper – Normalize Subject for Threading
   ============================================================ */
function normalizeSubject(sub) {
  if (!sub) return "";
  return sub
    .toLowerCase()
    .replace(/^re:\s*/g, "")
    .replace(/^fwd?:\s*/g, "")
    .trim();
}

/* ============================================================
   🧠 Helper – Decode Body
   ============================================================ */
function decodeBody(msg) {
  let decoded = msg.body || "";
  try {
    if (/base64/i.test(msg.encoding || "")) {
      decoded = Buffer.from(msg.body, "base64").toString("utf-8");
    } else if (/quoted-printable/i.test(msg.encoding || "")) {
      decoded = qpDecode(msg.body).toString("utf-8");
    }
    decoded = decoded.replace(/=\r?\n/g, "").trim();
  } catch (err) {
    console.error("⚠️ Decode error:", err);
  }
  return decoded;
}

/* ============================================================
   🔗 Helper – Normalize Attachment URL
   ============================================================ */
function normalizeAttachment(att) {
  if (!att) return null;

  // 🧠 Pick any possible path (including CID / filename fallback)
  const rawUrl =
    att.storageUrl ||
    att.url ||
    att.path ||
    (att.cid ? `/uploads/${att.cid}` : "") ||
    (att.filename ? `/uploads/${att.filename}` : "");

  // 🧠 Always build full absolute URL
  const absoluteUrl = rawUrl.startsWith("http")
    ? rawUrl
    : `${BASE_URL}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;

  // 🧩 Return unified structure
  return {
    id: att.id || Math.random().toString(36).substring(2, 9),
    filename: att.filename || att.name || "file",
    mimeType: att.mimeType || att.type || "application/octet-stream",
    size: att.size || 0,
    url: absoluteUrl,
    cid: att.cid || null,
    uploadedAt: att.uploadedAt || null,
  };
}

/* ============================================================
   📥 GET Routes
   ============================================================ */

/* 📥 GET: Inbox Messages (Received + Sent) */
router.get("/messages/inbox", async (req, res) => {
  try {
    const { emailAccountId } = req.query;
    if (!emailAccountId)
      return res.status(400).json({ error: "Missing emailAccountId" });

    const raw = await prisma.emailMessage.findMany({
      where: {
        emailAccountId: Number(emailAccountId),
        OR: [{ direction: "sent" }, { direction: "received" }],
      },
      orderBy: { sentAt: "desc" },
      include: { attachments: true },
    });

    const messages = raw.map((msg) => ({
      id: msg.id,
      fromEmail: msg.fromEmail,
      toEmail: msg.toEmail,
      subject: msg.subject || "(No Subject)",
      body: decodeBody(msg),
      direction: msg.direction,
      date: msg.sentAt,
      attachments: (msg.attachments || []).map(normalizeAttachment),
    }));

    res.json({ success: true, total: messages.length, data: messages });
  } catch (err) {
    console.error("❌ Inbox fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* 📤 GET: Sent Messages */
router.get("/messages/sent", async (req, res) => {
  try {
    const { emailAccountId } = req.query;
    if (!emailAccountId)
      return res.status(400).json({ error: "Missing emailAccountId" });

    const raw = await prisma.emailMessage.findMany({
      where: { emailAccountId: Number(emailAccountId), direction: "sent" },
      orderBy: { sentAt: "desc" },
      include: { attachments: true },
    });

    const messages = raw.map((msg) => ({
      id: msg.id,
      fromEmail: msg.fromEmail,
      toEmail: msg.toEmail,
      subject: msg.subject || "(No Subject)",
      body: decodeBody(msg),
      direction: "sent",
      date: msg.sentAt,
      attachments: (msg.attachments || []).map(normalizeAttachment),
    }));

    res.json({ success: true, total: messages.length, data: messages });
  } catch (err) {
    console.error("❌ Sent fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ============================================================
   🔥 FIX: GET CONVERSATION MESSAGES
   ⚠️ Simple: Just fetch messages by conversationId
   ============================================================ *
 */
// router.get("/conversation-detail", async (req, res) => {
//   try {
//     const { conversationId, accountId, folder } = req.query;

//     if (!conversationId || !accountId) {
//       return res.status(400).json({ success: false, message: "Missing IDs" });
//     }

//     // ------------------------------------------------------------
//     // 1️⃣ BUILD DETAIL QUERY
//     // ------------------------------------------------------------
//     let detailWhere = {
//       conversationId: conversationId,
//       emailAccountId: Number(accountId),
//     };

//     // 🔥 FIX: Strict folder-based logic that allows all directions for Spam/Trash
//     const lowerFolder = (folder || "inbox").toLowerCase();

//     if (lowerFolder === "sent") {
//       detailWhere.direction = "sent";
//       detailWhere.folder = "sent"; // Match IMAP sync placement
//     } else if (lowerFolder === "spam") {
//       detailWhere.folder = "spam"; // Match IMAP sync placement
//       // ❌ Removed direction: "received" to ensure bounces show
//     } else if (lowerFolder === "trash") {
//       detailWhere.folder = "trash";
//     } else {
//       // Default: Inbox (ONLY Received)
//       detailWhere.direction = "received";
//       detailWhere.folder = "inbox";
//       detailWhere.isTrash = false;
//       detailWhere.isSpam = false;
//     }

//     // ------------------------------------------------------------
//     // 2️⃣ FETCH MESSAGES
//     // ------------------------------------------------------------
//     const messages = await prisma.emailMessage.findMany({
//       where: detailWhere,
//       orderBy: { sentAt: "asc" }, // Oldest at top, newest at bottom (timeline style)
//       include: {
//         attachments: true,
//         tags: { include: { Tag: true } },
//       },
//     });

//     res.json({ success: true, data: messages });
//   } catch (err) {
//     console.error("❌ FETCH DETAIL ERROR:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });
/* server/routes/inbox.js */

router.get("/conversation-detail", async (req, res) => {
  try {
    const { conversationId, accountId, folder } = req.query;

    if (!conversationId || !accountId) {
      return res.status(400).json({ success: false, message: "Missing IDs" });
    }

    let detailWhere = {
      conversationId: conversationId,
      emailAccountId: Number(accountId),
    };

    // 🔥 FIX: Logic for the Trash folder view
    if (folder === "trash") {
      detailWhere.isTrash = true;
      detailWhere.hideTrash = false; // Ensure it's not permanently deleted
    } else if (folder === "sent") {
      detailWhere.direction = "sent";
    } else if (folder === "spam") {
      detailWhere.folder = "spam";
    } else {
      // Default: Inbox
      detailWhere.direction = "received";
      detailWhere.isTrash = false;
      detailWhere.isSpam = false;
      detailWhere.hideInbox = false;
    }

    const messages = await prisma.emailMessage.findMany({
      where: detailWhere,
      orderBy: { sentAt: "asc" },
      include: {
        attachments: true,
        tags: { include: { Tag: true } },
      },
    });

    res.json({ success: true, data: messages });
  } catch (err) {
    console.error("❌ FETCH DETAIL ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/* ============================================================
   🔥 FIX: GET CONVERSATIONS - Outlook-style (conversationId only)
   ⚠️ CRITICAL: This replaces the old complex participant-based logic
   ============================================================ */
// router.get("/conversations/:accountId", async (req, res) => {
//   try {
//     const accountId = Number(req.params.accountId);
//     const folder = req.query.folder || "inbox";
//     const searchEmail = req.query.searchEmail || "";

//     if (!accountId) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing accountId",
//       });
//     }

//     // ---------------------------
//     // 1️⃣ BUILD STRICT WHERE CLAUSE
//     // ---------------------------
//     let whereClause = {
//       emailAccountId: accountId,
//       conversationId: { not: null },
//     };

//     // 🔥 APPLY STRICT SEPARATION LOGIC
//     // Filter by 'direction' to ensure Inbox = Received and Sent = Sent
//     if (folder === "inbox") {
//       whereClause.direction = "received"; // 🔥 Show ONLY received messages
//       whereClause.hideInbox = false;
//       whereClause.isTrash = false;
//       whereClause.isSpam = false;
//     } else if (folder === "sent") {
//       whereClause.direction = "sent"; // 🔥 Show ONLY sent messages
//       whereClause.isTrash = false;
//       whereClause.isSpam = false;
//     } else if (folder === "spam") {
//       whereClause.isSpam = true;
//     } else if (folder === "trash") {
//       whereClause.isTrash = true;
//     }

//     // Include other UI filters from query
//     if (req.query.sender)
//       whereClause.fromEmail = {
//         contains: req.query.sender,
//         mode: "insensitive",
//       };
//     if (req.query.subject)
//       whereClause.subject = {
//         contains: req.query.subject,
//         mode: "insensitive",
//       };
//     if (req.query.isUnread === "true") whereClause.isRead = false;

//     // ---------------------------
//     // 2️⃣ FETCH CONVERSATIONS FROM DATABASE
//     // ---------------------------
//     const conversations = await prisma.conversation.findMany({
//       where: {
//         emailAccountId: accountId,
//         messages: {
//           some: whereClause, // 🔥 Filters sidebar list to only show threads with matching messages
//         },
//       },
//       include: {
//         messages: {
//           where: whereClause, // 🔥 Ensures the preview snippet matches the folder (Sent vs Received)
//           orderBy: { sentAt: "desc" },
//           take: 1,
//           include: {
//             leadDetail: { include: { leadEmailMeta: true } },
//           },
//         },
//       },
//       orderBy: { lastMessageAt: "desc" },
//     });

//     // ---------------------------
//     // 3️⃣ FORMAT RESPONSE
//     // ---------------------------
//     const result = conversations
//       .filter((conv) => conv.messages.length > 0)
//       .map((conv) => {
//         const latestMsg = conv.messages[0];

//         // Format unread count specifically for received messages
//         const unreadCount = conv.messages.filter(
//           (m) => m.direction === "received" && !m.isRead
//         ).length;

//         const country =
//           latestMsg.leadDetail?.leadEmailMeta?.country ||
//           latestMsg.leadDetail?.country ||
//           null;
//         const participants = conv.participants
//           .split(",")
//           .map((p) => p.trim())
//           .filter(Boolean);

//         // Optional filtering by country or search email
//         if (req.query.country && country !== req.query.country) return null;
//         if (searchEmail) {
//           const s = searchEmail.toLowerCase();
//           if (
//             !conv.participants.toLowerCase().includes(s) &&
//             !conv.initiatorEmail.toLowerCase().includes(s)
//           )
//             return null;
//         }

//         return {
//           conversationId: conv.id,
//           subject: conv.subject || "(No Subject)",
//           participants,
//           toRecipients: conv.toRecipients.split(",").map((p) => p.trim()),
//           primaryRecipient: conv.toRecipients.split(",")[0]?.trim(),
//           initiatorEmail: conv.initiatorEmail,
//           lastDate: conv.lastMessageAt,
//           lastBody: latestMsg.body
//             ? String(latestMsg.body)
//                 .replace(/<[^>]+>/g, " ")
//                 .replace(/\s+/g, " ")
//                 .substring(0, 120)
//             : "",
//           lastSenderEmail: latestMsg.fromEmail,
//           lastDirection: latestMsg.direction,
//           unreadCount,
//           messageCount: conv.messageCount,
//           isStarred: conv.isStarred,
//           country,
//         };
//       })
//       .filter(Boolean);

//     return res.json({ success: true, total: result.length, data: result });
//   } catch (err) {
//     console.error("🔥 ERROR /conversations:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to load conversations",
//       details: err.message,
//     });
//   }
// });

// router.get("/conversations/:accountId/stats", async (req, res) => {
//   try {
//     const accountId = Number(req.params.accountId);

//     const total = await prisma.emailMessage.count({
//       where: { emailAccountId: accountId },
//     });

//     const unread = await prisma.emailMessage.count({
//       where: {
//         emailAccountId: accountId,
//         isRead: false,
//         direction: "received",
//       },
//     });

//     const withAttachments = await prisma.emailMessage.count({
//       where: {
//         emailAccountId: accountId,
//         attachments: { some: {} },
//       },
//     });

//     res.json({
//       success: true,
//       data: {
//         totalMessages: total,
//         unreadMessages: unread,
//         messagesWithAttachments: withAttachments,
//       },
//     });
//   } catch (err) {
//     console.error("🔥 ERROR /inbox/conversations:", err);
//     res.status(500).json({
//       error: "Failed to load conversations",
//       details: err.message,
//     });
//   }
// });
/* server/routes/inbox.js */

router.get("/conversations/:accountId", async (req, res) => {
  try {
    const accountId = Number(req.params.accountId);
    const folder = (req.query.folder || "inbox").toLowerCase();
    const searchEmail = req.query.searchEmail || "";

    if (!accountId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing accountId" });
    }

    // ------------------------------------------------------------
    // 1️⃣ BUILD STRICT WHERE CLAUSE
    // ------------------------------------------------------------
    let whereClause = {
      emailAccountId: accountId,
      conversationId: { not: null },
    };

    // 🔥 1. APPLY STRICT FOLDER & TRASH SEPARATION LOGIC
    if (folder === "inbox") {
      whereClause.folder = "inbox"; // Check folder name from IMAP sync
      whereClause.direction = "received"; // Inbox = ONLY received
      whereClause.hideInbox = false; // 🔥 CRITICAL: Only show non-trashed messages
      whereClause.isTrash = false;
      whereClause.isSpam = false;
    } else if (folder === "sent") {
      whereClause.folder = "sent";
      whereClause.direction = "sent";
      whereClause.hideInbox = false; // Don't show sent items that were "deleted"
      whereClause.isTrash = false;
      whereClause.isSpam = false;
    } else if (folder === "spam") {
      whereClause.folder = "spam"; // Show messages from Spam folder
      whereClause.hideInbox = false; // Usually spam isn't "trashed" yet
    } else if (folder === "trash") {
      // 🔥 Trash folder logic:
      whereClause.isTrash = true; // Must be marked as trash
      whereClause.hideTrash = false; // 🔥 CRITICAL: Filter out permanently deleted items
    }

    // Include UI filters
    if (req.query.sender)
      whereClause.fromEmail = {
        contains: req.query.sender,
        mode: "insensitive",
      };
    if (req.query.subject)
      whereClause.subject = {
        contains: req.query.subject,
        mode: "insensitive",
      };
    if (req.query.isUnread === "true") whereClause.isRead = false;

    // ------------------------------------------------------------
    // 2️⃣ FETCH CONVERSATIONS FROM DATABASE
    // ------------------------------------------------------------
    const conversations = await prisma.conversation.findMany({
      where: {
        emailAccountId: accountId,
        messages: {
          some: whereClause, // Sidebar only shows threads with folder-matched messages
        },
      },
      include: {
        messages: {
          where: whereClause, // Snippets only pull from messages in this folder
          orderBy: { sentAt: "desc" },
          take: 1,
          include: {
            leadDetail: { include: { leadEmailMeta: true } },
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    // ------------------------------------------------------------
    // 3️⃣ FORMAT RESPONSE
    // ------------------------------------------------------------
    const result = conversations
      .filter((conv) => conv.messages.length > 0)
      .map((conv) => {
        const latestMsg = conv.messages[0];

        // Format unread count for received messages in this specific folder
        const unreadCount = conv.messages.filter(
          (m) => m.direction === "received" && !m.isRead
        ).length;

        const country =
          latestMsg.leadDetail?.leadEmailMeta?.country ||
          latestMsg.leadDetail?.country ||
          null;
        const participants = (conv.participants || "")
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);

        if (req.query.country && country !== req.query.country) return null;
        if (searchEmail) {
          const s = searchEmail.toLowerCase();
          if (
            !conv.participants?.toLowerCase().includes(s) &&
            !conv.initiatorEmail?.toLowerCase().includes(s)
          )
            return null;
        }

        return {
          conversationId: conv.id,
          subject: conv.subject || "(No Subject)",
          participants,
          toRecipients: (conv.toRecipients || "")
            .split(",")
            .map((p) => p.trim()),
          primaryRecipient: (conv.toRecipients || "").split(",")[0]?.trim(),
          initiatorEmail: conv.initiatorEmail,
          lastDate: conv.lastMessageAt,
          lastBody: latestMsg.body
            ? String(latestMsg.body)
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .substring(0, 120)
            : "",
          lastSenderEmail: latestMsg.fromEmail,
          lastDirection: latestMsg.direction,
          unreadCount,
          messageCount: conv.messageCount,
          isStarred: conv.isStarred,
          country,
        };
      })
      .filter(Boolean);

    return res.json({ success: true, total: result.length, data: result });
  } catch (err) {
    console.error("🔥 ERROR /conversations:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load conversations",
      details: err.message,
    });
  }
});

/* server/src/routes/inbox.js */

router.get("/conversations/:accountId/stats", async (req, res) => {
  try {
    const accountId = Number(req.params.accountId);

    // 🔥 Define the logic for what "Inbox" vs "Sent" means for the counts
    const inboxUnread = await prisma.emailMessage.count({
      where: {
        emailAccountId: accountId,
        direction: "received", // Inbox = Received
        isRead: false,
        isSpam: false,
        isTrash: false,
      },
    });

    const sentTotal = await prisma.emailMessage.count({
      where: {
        emailAccountId: accountId,
        direction: "sent", // Sent folder logic
      },
    });

    res.json({
      success: true,
      data: {
        unreadMessages: inboxUnread,
        sentMessages: sentTotal,
      },
    });
  } catch (err) {
    console.error("🔥 Stats Error:", err);
    res.status(500).json({ success: false });
  }
});
/* 📧 GET: All Messages in a Conversation Thread */
router.get("/conversations/:conversationId/messages", async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await prisma.emailMessage.findMany({
      where: {
        conversationId: conversationId,
        isTrash: false,
        isSpam: false,
      },
      orderBy: { sentAt: "asc" },
      include: {
        attachments: true,
        tags: {
          include: {
            Tag: true,
          },
        },
      },
    });

    // Format attachments properly
    const formattedMessages = messages.map((msg) => ({
      ...msg,
      attachments: (msg.attachments || []).map(normalizeAttachment),
      tags: msg.tags?.map((t) => t.Tag) || [],
    }));

    return res.json({
      success: true,
      data: formattedMessages,
    });
  } catch (err) {
    console.error("❌ Error fetching conversation messages:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* ✅ POST: Mark Entire Conversation as Read */
router.post("/conversations/:conversationId/read", async (req, res) => {
  try {
    const { conversationId } = req.params;

    await prisma.emailMessage.updateMany({
      where: {
        conversationId: conversationId,
        isRead: false,
        direction: "received",
      },
      data: { isRead: true },
    });

    // Update conversation table if it exists
    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
      });
    } catch (e) {
      // Conversation table might not exist yet
    }

    res.json({
      success: true,
      message: "Conversation marked as read",
    });
  } catch (err) {
    console.error("❌ Error marking conversation as read:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* 📥 GET: Download Attachment */
// router.get("/download/:uid/:filename", async (req, res) => {
//   try {
//     const { uid, filename } = req.params;
//     const { accountId } = req.query;

//     if (!accountId) {
//       return res.status(400).send("Missing accountId");
//     }

//     // Fetch account IMAP credentials
//     const account = await prisma.emailAccount.findUnique({
//       where: { id: Number(accountId) },
//     });

//     if (!account) {
//       return res.status(404).send("Email account not found");
//     }

//     // Connect to IMAP
//     const client = new ImapFlow({
//       host: account.imapHost,
//       port: account.imapPort || 993,
//       secure: true,
//       auth: {
//         user: account.imapUser || account.email,
//         pass: account.encryptedPass,
//       },
//       tls: { rejectUnauthorized: false },
//     });

//     await client.connect();
//     await client.mailboxOpen("INBOX");

//     // Fetch the raw email source
//     for await (let msg of client.fetch(uid, { source: true })) {
//       const parsed = await client.parse(msg.source);

//       const attachment = parsed.attachments?.find(
//         (att) => att.filename === filename
//       );

//       if (!attachment) {
//         await client.logout();
//         return res.status(404).send("Attachment not found");
//       }

//       res.setHeader("Content-Type", attachment.contentType);
//       res.setHeader(
//         "Content-Disposition",
//         `attachment; filename="${encodeURIComponent(filename)}"`
//       );

//       await client.logout();
//       return res.end(attachment.content);
//     }

//     await client.logout();
//     return res.status(404).send("Email not found");
//   } catch (err) {
//     console.error("🔥 ERROR /inbox/conversations:", err);
//     res.status(500).json({
//       error: "Failed to load conversations",
//       details: err.message,
//     });
//   }
// });
/* 📥 GET: Download Attachment */
router.get("/download/:uid/:filename", async (req, res) => {
  try {
    const { uid, filename } = req.params;
    const { accountId } = req.query;

    if (!accountId) return res.status(400).send("Missing accountId");

    const account = await prisma.emailAccount.findUnique({
      where: { id: Number(accountId) },
    });

    if (!account) return res.status(404).send("Email account not found");

    const client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort || 993,
      secure: true,
      auth: {
        user: account.imapUser || account.email,
        pass: account.encryptedPass,
      },
      tls: { rejectUnauthorized: false },
      // 🔥 ADD TIMEOUTS
      socketTimeout: 60000,
      connectionTimeout: 30000,
    });

    // 🔥 CRITICAL FIX: Prevent process crash on Socket Timeout
    client.on("error", (err) => {
      console.error(`⚠️ IMAP Download Error: ${err.message}`);
    });

    await client.connect();
    // ... rest of your existing logic ...
    await client.logout().catch(() => {});
  } catch (err) {
    console.error("🔥 Download Route Error:", err);
    res.status(500).json({ error: "Failed to download attachment" });
  }
});
/* 🔍 GET: Search Messages */
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json({ success: true, data: [] });

    const q = query.toLowerCase();

    const messages = await prisma.emailMessage.findMany({
      where: {
        OR: [
          { fromEmail: { contains: q, mode: "insensitive" } },
          { toEmail: { contains: q, mode: "insensitive" } },
          { ccEmail: { contains: q, mode: "insensitive" } },
          { subject: { contains: q, mode: "insensitive" } },
          { body: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { emailAccount: true },
      orderBy: { sentAt: "desc" },
    });

    res.json({ success: true, data: messages });
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* 📊 GET: Account Unread Count */
router.get("/accounts/:id/unread", async (req, res) => {
  try {
    const accountId = Number(req.params.id);

    if (!accountId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing accountId" });
    }

    // Inbox unread (not spam, not trash)
    const inboxUnread = await prisma.emailMessage.count({
      where: {
        emailAccountId: accountId,
        direction: "received",
        isRead: false,
        isSpam: false,
        isTrash: false,
      },
    });

    // Spam unread
    const spamUnread = await prisma.emailMessage.count({
      where: {
        emailAccountId: accountId,
        direction: "received",
        isRead: false,
        isSpam: true,
        isTrash: false,
      },
    });

    return res.json({
      success: true,
      data: {
        inboxUnread,
        spamUnread,
        totalUnread: inboxUnread + spamUnread,
      },
    });
  } catch (err) {
    console.error("🔥 Unread count API error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch unread count",
      error: err.message,
    });
  }
});

/* 📥 GET: Messages by Account ID with Filters */
router.get("/messages/:accountId", async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const {
      folder = "inbox",
      unreadOnly,
      sender,
      recipient,
      subject,
      dateFrom,
      dateTo,
      hasAttachment,
      isUnread,
      isStarred,
      status,
    } = req.query;

    // Verify account exists
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Email account not found",
      });
    }

    // Build where clause dynamically
    const where = {
      emailAccountId: accountId,
      folder: folder.toLowerCase(),
      isTrash: false, // Don't show deleted messages unless specifically asking for trash
    };

    // Apply filters
    if (unreadOnly === "true" || isUnread === "true") {
      where.isRead = false;
    }

    if (sender) {
      where.fromEmail = {
        contains: sender,
        mode: "insensitive",
      };
    }

    if (recipient) {
      where.toEmail = {
        contains: recipient,
        mode: "insensitive",
      };
    }

    if (subject) {
      where.subject = {
        contains: subject,
        mode: "insensitive",
      };
    }

    if (dateFrom || dateTo) {
      where.sentAt = {};
      if (dateFrom) {
        where.sentAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.sentAt.lte = new Date(dateTo);
      }
    }

    if (hasAttachment === "true") {
      where.attachments = {
        some: {},
      };
    }

    // Handle trash folder specially
    if (folder.toLowerCase() === "trash") {
      where.isTrash = true;
    }

    // Fetch messages
    const messages = await prisma.emailMessage.findMany({
      where,
      include: {
        attachments: true,
        tags: {
          include: {
            Tag: true,
          },
        },
      },
      orderBy: {
        sentAt: "desc",
      },
    });

    // Format response to match frontend expectations
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      messageId: msg.messageId,
      emailAccountId: msg.emailAccountId,
      fromEmail: msg.fromEmail,
      toEmail: msg.toEmail,
      ccEmail: msg.ccEmail,
      subject: msg.subject,
      body: msg.body || msg.bodyHtml,
      bodyHtml: msg.bodyHtml,
      direction: msg.direction,
      sentAt: msg.sentAt,
      isRead: msg.isRead,
      isStarred: msg.isStarred || false,
      folder: msg.folder,
      isDraft: msg.isDraft,
      isSpam: msg.isSpam,
      isTrash: msg.isTrash,
      uid: msg.uid,
      attachments: msg.attachments || [],
      tags: msg.tags?.map((t) => t.Tag) || [],
    }));

    return res.json({
      success: true,
      data: formattedMessages,
      count: formattedMessages.length,
    });
  } catch (error) {
    console.error("❌ Error fetching inbox messages:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

/* 🌍 GET: Countries */
router.get("/countries", async (req, res) => {
  try {
    const countries = await prisma.leadEmailMeta.findMany({
      where: {
        country: {
          not: null,
        },
      },
      select: {
        country: true,
      },
      distinct: ["country"],
    });

    const countryList = countries
      .map((c) => c.country)
      .filter(Boolean)
      .sort();

    return res.json({
      success: true,
      data: countryList,
    });
  } catch (err) {
    console.error("❌ Error fetching countries:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch countries",
      error: err.message,
    });
  }
});

/* 🌍 GET: Conversation Country */
router.get("/conversation/:email/country", async (req, res) => {
  try {
    const { email } = req.params;
    const { emailAccountId } = req.query;

    const leadDetail = await prisma.leadDetails.findFirst({
      where: {
        OR: [
          { email: email },
          { email: { contains: email, mode: "insensitive" } },
        ],
      },
      include: { leadEmailMeta: true },
    });

    let country = null;
    if (leadDetail?.leadEmailMeta?.country) {
      country = leadDetail.leadEmailMeta.country;
    } else if (leadDetail?.country) {
      country = leadDetail.country;
    }

    return res.json({ success: true, country });
  } catch (error) {
    console.error("Error fetching country:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch country" });
  }
});

/* 👤 GET: Account User */
router.get("/accounts/:accountId/user", async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await prisma.emailAccount.findUnique({
      where: { id: parseInt(accountId) },
      include: {
        User: { select: { name: true, email: true } },
      },
    });

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    return res.json({
      success: true,
      userName: account.User?.name || null,
      userEmail: account.User?.email || null,
    });
  } catch (error) {
    console.error("Error fetching user name:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch user name" });
  }
});

/* 📊 GET: Account Statistics */
router.get("/stats/:accountId", async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId);

    const [
      totalMessages,
      unreadCount,
      inboxCount,
      sentCount,
      spamCount,
      trashCount,
    ] = await Promise.all([
      prisma.emailMessage.count({
        where: { emailAccountId: accountId, isTrash: false },
      }),
      prisma.emailMessage.count({
        where: {
          emailAccountId: accountId,
          isRead: false,
          folder: "inbox",
          isTrash: false,
        },
      }),
      prisma.emailMessage.count({
        where: { emailAccountId: accountId, folder: "inbox", isTrash: false },
      }),
      prisma.emailMessage.count({
        where: { emailAccountId: accountId, folder: "sent", isTrash: false },
      }),
      prisma.emailMessage.count({
        where: { emailAccountId: accountId, folder: "spam", isTrash: false },
      }),
      prisma.emailMessage.count({
        where: { emailAccountId: accountId, isTrash: true },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        total: totalMessages,
        unread: unreadCount,
        inbox: inboxCount,
        sent: sentCount,
        spam: spamCount,
        trash: trashCount,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
      error: error.message,
    });
  }
});

/* ============================================================
   📤 POST Routes
   ============================================================ */

/* 📤 POST: Reply to Email (with conversation threading) */
router.post("/reply", async (req, res) => {
  try {
    const {
      emailAccountId,
      from,
      to,
      cc,
      subject,
      body,
      attachments = [],
      replyToMessageId, // ID of message being replied to
    } = req.body;

    const account = await prisma.emailAccount.findUnique({
      where: { id: Number(emailAccountId) },
    });
    if (!account)
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });

    // Get the original message for threading
    let originalMessage = null;
    let conversationId = null;
    let inReplyTo = null;
    let references = null;

    if (replyToMessageId) {
      originalMessage = await prisma.emailMessage.findUnique({
        where: { id: Number(replyToMessageId) },
      });

      if (originalMessage) {
        conversationId = originalMessage.conversationId;
        inReplyTo = originalMessage.messageId;
        // Build references chain
        references = originalMessage.references
          ? `${originalMessage.references} ${originalMessage.messageId}`
          : originalMessage.messageId;
      }
    }

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort || 465,
      secure: (account.smtpPort || 465) === 465,
      auth: {
        user: account.smtpUser || account.email,
        pass: account.encryptedPass,
      },
    });

    const smtpAttachments = attachments.map((file) => ({
      filename: file.filename || file.name,
      path: file.url,
      contentType: file.type || file.mimeType,
    }));

    const finalSubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

    // Generate Message-ID for this reply
    const replyMessageId = `<${Date.now()}.${Math.random()
      .toString(36)
      .substring(2)}@${account.email.split("@")[1]}>`;

    // Send email with threading headers
    const mailOptions = {
      from,
      to,
      cc,
      subject: finalSubject,
      html: body,
      attachments: smtpAttachments,
      messageId: replyMessageId,
      headers: {},
    };

    // Add threading headers
    if (inReplyTo) {
      mailOptions.headers["In-Reply-To"] = inReplyTo;
      mailOptions.headers["References"] = references;
    }

    const sentResult = await transporter.sendMail(mailOptions);

    console.log(`📨 Reply sent to ${to}`);

    // Save to Sent folder via IMAP (optional)
    try {
      const imap = new ImapFlow({
        host: account.imapHost,
        port: account.imapPort || 993,
        secure: true,
        auth: {
          user: account.imapUser || account.email,
          pass: account.encryptedPass,
        },
        tls: { rejectUnauthorized: false },
      });
      await imap.connect();
      await imap.append("Sent", sentResult.message, { flags: ["\\Seen"] });
      await imap.logout();
    } catch (e) {
      console.warn("⚠️ IMAP append failed:", e.message);
    }

    // Save to database with conversation threading
    const dbAttachments = attachments.map((file) => ({
      filename: file.filename || file.name,
      mimeType: file.mimeType || file.type,
      size: file.size || null,
      storageUrl: file.url,
    }));

    const savedReply = await prisma.emailMessage.create({
      data: {
        emailAccountId: Number(emailAccountId),
        conversationId, // Link to same conversation
        messageId: replyMessageId,
        fromEmail: from,
        toEmail: to,
        ccEmail: cc || null,
        subject: finalSubject,
        body,
        direction: "sent",
        sentAt: new Date(),
        folder: "sent",
        isRead: true,
        inReplyTo, // Threading header
        references, // Threading header
        attachments:
          dbAttachments.length > 0 ? { create: dbAttachments } : undefined,
      },
      include: { attachments: true },
    });

    // Update conversation metadata
    if (conversationId) {
      try {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: new Date(),
            messageCount: { increment: 1 },
          },
        });
      } catch (e) {
        // Conversation table might not exist yet
      }
    }

    return res.json({ success: true, message: `Reply sent`, data: savedReply });
  } catch (err) {
    console.error("❌ Reply error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to send reply",
      details: err.message,
    });
  }
});

/* 📤 POST: Reply All */
// router.post("/reply-all", async (req, res) => {
//   try {
//     const { emailAccountId, replyToId, fromEmail, body, attachments } =
//       req.body;

//     // 1️⃣ Fetch the original email from DB
//     const original = await prisma.emailMessage.findUnique({
//       where: { id: replyToId },
//     });

//     if (!original) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Original email not found" });
//     }

//     // 2️⃣ Parse headers
//     const sender = original.fromEmail; // main From
//     const toList = original.toEmail?.split(",") || [];
//     const ccList = original.ccEmail?.split(",") || [];

//     // 3️⃣ Build recipient list (REAL REPLY-ALL LOGIC)
//     let replyTo = sender;

//     let replyAllRecipients = [sender, ...toList, ...ccList]
//       .map((e) => e.trim().toLowerCase())
//       .filter((e) => e && e !== fromEmail.toLowerCase()); // remove yourself

//     // Remove duplicates
//     replyAllRecipients = [...new Set(replyAllRecipients)];

//     // 4️⃣ Build SMTP fields
//     const smtpTo = replyTo;
//     const smtpCc = replyAllRecipients.filter((e) => e !== replyTo);

//     // 5️⃣ Build email body (include quoted message)
//     const quoted = `
//         <br><br>
//         <div style="border-left: 3px solid #ccc; padding-left: 10px; margin-top:10px;">
//         <b>On ${original.sentAt.toLocaleString()}, ${
//       original.fromEmail
//     } wrote:</b><br>
//         ${original.body}
//         </div>
//     `;

//     const finalBody = body + quoted;

//     // 6️⃣ SMTP Send
//     await sendSMTPMail({
//       from: fromEmail,
//       to: smtpTo,
//       cc: smtpCc,
//       subject: "Re: " + (original.subject || ""),
//       html: finalBody,
//       attachments: attachments || [],
//     });

//     return res.json({
//       success: true,
//       message: "Reply-All sent successfully",
//     });
//   } catch (err) {
//     console.error("Reply All Error:", err);
//     return res
//       .status(500)
//       .json({ success: false, message: "Reply-All failed" });
//   }
// });
/* 📤 POST: Reply All */
router.post("/reply-all", async (req, res) => {
  try {
    const { emailAccountId, replyToId, fromEmail, body, attachments } =
      req.body;

    // 1️⃣ Fetch the original email from DB
    const original = await prisma.emailMessage.findUnique({
      where: { id: replyToId },
    });

    if (!original) {
      return res
        .status(404)
        .json({ success: false, message: "Original email not found" });
    }

    // 2️⃣ Fetch account details
    const account = await prisma.emailAccount.findUnique({
      where: { id: Number(emailAccountId) },
    });

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Email account not found" });
    }

    // 3️⃣ Parse headers
    const sender = original.fromEmail; // main From
    const toList = original.toEmail?.split(",") || [];
    const ccList = original.ccEmail?.split(",") || [];

    // 4️⃣ Build recipient list (REAL REPLY-ALL LOGIC)
    let replyTo = sender;

    // ✅ FIX: Handle undefined fromEmail safely
    const normalizedFromEmail = fromEmail ? fromEmail.toLowerCase() : "";

    let replyAllRecipients = [sender, ...toList, ...ccList]
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e !== normalizedFromEmail); // remove yourself

    // Remove duplicates
    replyAllRecipients = [...new Set(replyAllRecipients)];

    // 5️⃣ Build SMTP fields
    const smtpTo = replyTo;
    const smtpCc = replyAllRecipients.filter((e) => e !== replyTo);

    // 6️⃣ Create transporter
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort || 465,
      secure: (account.smtpPort || 465) === 465,
      auth: {
        user: account.smtpUser || account.email,
        pass: account.encryptedPass,
      },
    });

    // 7️⃣ Build email body (include quoted message)
    const quoted = `
        <br><br>
        <div style="border-left: 3px solid #ccc; padding-left: 10px; margin-top:10px;">
        <b>On ${original.sentAt.toLocaleString()}, ${
      original.fromEmail
    } wrote:</b><br>
        ${original.body}
        </div>
    `;

    const finalBody = body + quoted;

    // 8️⃣ Send email
    const smtpAttachments =
      attachments?.map((file) => ({
        filename: file.filename || file.name,
        path: file.url,
        contentType: file.type || file.mimeType,
      })) || [];

    await transporter.sendMail({
      from: fromEmail,
      to: smtpTo,
      cc: smtpCc.join(", "),
      subject: "Re: " + (original.subject || ""),
      html: finalBody,
      attachments: smtpAttachments,
    });

    return res.json({
      success: true,
      message: "Reply-All sent successfully",
    });
  } catch (err) {
    console.error("Reply All Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Reply-All failed" });
  }
});
/* ✅ POST: Mark Conversation Read */
// router.post("/mark-read-conversation", async (req, res) => {
//   try {
//     const { emailAccountId, peer } = req.body;

//     if (!emailAccountId || !peer) {
//       return res.status(400).json({ success: false, message: "Missing data" });
//     }

//     const accountId = Number(emailAccountId);
//     const account = await prisma.emailAccount.findUnique({
//       where: { id: accountId },
//     });
//     if (!account) return res.status(404).json({ success: false });

//     const accountEmail = account.email.toLowerCase().trim();
//     const targetRoot = peer.toLowerCase().trim();

//     // 1. Fetch unread messages to filter them
//     const messages = await prisma.emailMessage.findMany({
//       where: {
//         emailAccountId: accountId,
//         isRead: false,
//         direction: "received",
//       },
//       orderBy: { sentAt: "asc" },
//     });

//     const normalize = (s) => (s || "").toLowerCase().trim();
//     const getRootSubject = (sub) => {
//       if (!sub) return "";
//       return sub
//         .toLowerCase()
//         .replace(/^(re|fwd?|fw|response|reply):\s*/gi, "")
//         .replace(/\[.*?\]/g, "")
//         .replace(/[^a-z0-9]/g, "")
//         .trim();
//     };

//     const subjectMap = {};
//     const threads = {};
//     const idsToMark = [];

//     // 2. Run the logic to find which messages belong to 'targetRoot'
//     for (const msg of messages) {
//       const from = normalize(msg.fromEmail);
//       const toList = (msg.toEmail || "")
//         .split(",")
//         .map((x) => normalize(x))
//         .filter(Boolean);
//       const ccList = (msg.ccEmail || "")
//         .split(",")
//         .map((x) => normalize(x))
//         .filter(Boolean);
//       const cleanSubject = getRootSubject(msg.subject);

//       let rootEmail = null;

//       if (from === accountEmail) {
//         // Outgoing logic (unlikely for 'received' msg, but safe to keep)
//         rootEmail = toList[0] || toList.find((e) => e !== accountEmail);
//         if (cleanSubject && rootEmail) subjectMap[cleanSubject] = rootEmail;
//       } else {
//         // Incoming logic
//         if (cleanSubject && subjectMap[cleanSubject]) {
//           rootEmail = subjectMap[cleanSubject];
//         } else {
//           const participants = [...toList, ...ccList].filter(
//             (e) => e !== accountEmail && e !== from
//           );
//           // Check if targetRoot is involved
//           if (participants.includes(targetRoot) || from === targetRoot) {
//             rootEmail = targetRoot;
//             if (cleanSubject) subjectMap[cleanSubject] = rootEmail;
//           } else {
//             const existingOwner = participants.find((p) => threads[p]);
//             rootEmail = existingOwner || from;
//             if (cleanSubject) subjectMap[cleanSubject] = rootEmail;
//           }
//         }
//       }

//       if (rootEmail) threads[rootEmail] = true;

//       // 3. If this message belongs to the conversation we clicked, mark it
//       if (rootEmail === targetRoot) {
//         idsToMark.push(msg.id);
//       }
//     }

//     if (idsToMark.length > 0) {
//       await prisma.emailMessage.updateMany({
//         where: { id: { in: idsToMark } },
//         data: { isRead: true },
//       });
//     }

//     return res.json({
//       success: true,
//       message: "Conversation marked as read",
//       updatedCount: idsToMark.length,
//     });
//   } catch (err) {
//     console.error("🔥 ERROR /inbox/conversations:", err);
//     res.status(500).json({
//       error: "Failed to load conversations",
//       details: err.message,
//     });
//   }
// });
/* ✅ POST: Mark Conversation Read (backward compatibility) */
router.post("/mark-read-conversation", async (req, res) => {
  try {
    const { conversationId, accountId } = req.body;

    if (!conversationId || !accountId) {
      return res.status(400).json({
        success: false,
        message: "conversationId and accountId required",
      });
    }

    // Mark all messages in conversation as read
    const updated = await prisma.emailMessage.updateMany({
      where: {
        conversationId,
        emailAccountId: Number(accountId),
        direction: "received",
        isRead: false,
      },
      data: { isRead: true },
    });

    // Update conversation unread count
    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
      });
    } catch (e) {
      // Conversation might not exist
    }

    res.json({
      success: true,
      updatedCount: updated.count,
    });
  } catch (err) {
    console.error("❌ MARK READ ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================================
   🔧 PATCH Routes
   ============================================================ */

/* ✅ PATCH: Mark Single Email as Read */
router.patch("/mark-read/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.emailMessage.update({
      where: { id: Number(id) },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("🔥 ERROR /inbox/conversations:", err);
    res.status(500).json({
      error: "Failed to load conversations",
      details: err.message,
    });
  }
});

/* 🔒 PATCH: Hide Message from Inbox */
router.patch("/hide-inbox/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const msg = await prisma.emailMessage.update({
      where: { id },
      data: {
        hideInbox: true,
      },
    });

    return res.json({
      success: true,
      message: "Message hidden from inbox",
      data: msg,
    });
  } catch (err) {
    console.error("❌ hide-inbox failed:", err);
    return res.status(500).json({ success: false });
  }
});

/* 🗑️ PATCH: Hide Message from Trash */
router.patch("/hide-trash/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const msg = await prisma.emailMessage.update({
      where: { id },
      data: {
        hideTrash: true,
      },
    });

    return res.json({
      success: true,
      message: "Message hidden from trash",
      data: msg,
    });
  } catch (err) {
    console.error("❌ hide-trash failed:", err);
    return res.status(500).json({ success: false });
  }
});

/* 🔒 PATCH: Hide Conversation from Inbox */
// router.patch("/hide-inbox-conversation", async (req, res) => {
//   try {
//     const { emailAccountId, peer } = req.body;

//     if (!emailAccountId || !peer) {
//       return res.status(400).json({
//         success: false,
//         message: "emailAccountId and peer are required",
//       });
//     }

//     const normalizedPeer = peer.toLowerCase().trim();

//     // Update ALL messages between account and peer
//     const updated = await prisma.emailMessage.updateMany({
//       where: {
//         emailAccountId: Number(emailAccountId),
//         OR: [{ fromEmail: normalizedPeer }, { toEmail: normalizedPeer }],
//       },
//       data: { hideInbox: true },
//     });

//     return res.json({
//       success: true,
//       message: "Conversation hidden from inbox",
//       updatedCount: updated.count,
//     });
//   } catch (err) {
//     console.error("❌ hide-inbox-conversation failed:", err);
//     return res.status(500).json({ success: false, error: err.message });
//   }
// });
/* 🔒 PATCH: Hide Conversation from Inbox */
/* server/routes/inbox.js - Line 840 */

router.patch("/hide-inbox-conversation", async (req, res) => {
  try {
    const { conversationId, accountId } = req.body;

    if (!conversationId || !accountId) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    // 🔥 Update ALL messages in this thread to be hidden from Inbox
    const updated = await prisma.emailMessage.updateMany({
      where: {
        conversationId,
        emailAccountId: Number(accountId),
      },
      data: {
        hideInbox: true, // Hide from main view
        isTrash: true, // Mark as trash so it appears in the Trash folder
      },
    });

    res.json({ success: true, updatedCount: updated.count });
  } catch (err) {
    console.error("❌ HIDE INBOX ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* 🗑️ PATCH: Hide Conversation from Trash */
router.patch("/hide-trash-conversation", async (req, res) => {
  try {
    const { emailAccountId, peer } = req.body;

    if (!emailAccountId || !peer) {
      return res.status(400).json({
        success: false,
        message: "emailAccountId and peer are required",
      });
    }

    const normalizedPeer = peer.toLowerCase().trim();

    const updated = await prisma.emailMessage.updateMany({
      where: {
        emailAccountId: Number(emailAccountId),
        OR: [{ fromEmail: normalizedPeer }, { toEmail: normalizedPeer }],
      },
      data: { hideTrash: true },
    });

    return res.json({
      success: true,
      message: "Conversation hidden from trash",
      updatedCount: updated.count,
    });
  } catch (err) {
    console.error("❌ hide-trash-conversation failed:", err);
    return res.status(500).json({ success: false });
  }
});

/* server/routes/inbox.js */

// RESTORE: Move from Trash back to Inbox
router.patch("/restore-conversation", async (req, res) => {
  try {
    const { conversationId, accountId } = req.body;
    const updated = await prisma.emailMessage.updateMany({
      where: { conversationId, emailAccountId: Number(accountId) },
      data: {
        hideInbox: false, // 🔥 Make visible in Inbox again
        isTrash: false, // 🔥 Remove from Trash view
        hideTrash: false, // Reset safety flag
      },
    });
    res.json({ success: true, updatedCount: updated.count });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// PERMANENT HIDE: Remove from Trash folder
router.patch("/permanent-delete-conversation", async (req, res) => {
  try {
    const { conversationId, accountId } = req.body;
    const updated = await prisma.emailMessage.updateMany({
      where: { conversationId, emailAccountId: Number(accountId) },
      data: {
        hideTrash: true, // 🔥 Mark as permanently hidden
        hideInbox: true, // Ensure it stays hidden from primary view
      },
    });
    res.json({ success: true, updatedCount: updated.count });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* ============================================================
   🗑️ DELETE Routes
   ============================================================ */

/* 🗑️ DELETE: Message */
router.delete("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.emailMessage.delete({ where: { id: Number(id) } });
    res.json({ success: true, message: "Message deleted successfully" });
  } catch (err) {
    console.error("🔥 ERROR /inbox/conversations:", err);
    res.status(500).json({
      error: "Failed to load conversations",
      details: err.message,
    });
  }
});

export default router;
