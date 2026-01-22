// server/routes/inbox.js - ENHANCED VERSION
import express from "express";
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import { Buffer } from "buffer";
import qp from "quoted-printable";
import sgMail from "@sendgrid/mail";
import fetch from "node-fetch";
import { ImapFlow } from "imapflow";
import { htmlToText } from "html-to-text";
import crypto from "crypto";
import nodemailer from "nodemailer";

const router = express.Router();
const prisma = new PrismaClient();
const qpDecode = qp.decode;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const BASE_URL = process.env.API_BASE_URL || "http://localhost:4002";

function generateId() {
  return randomBytes(16).toString("hex");
}

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

function normalizeEmailHtml(html) {
  if (!html || typeof html !== "string") return "";

  let cleaned = html;

  // 1️⃣ Remove Outlook-only junk
  cleaned = cleaned
    .replace(/<o:p>\s*<\/o:p>/gi, "")
    .replace(/<o:p>.*?<\/o:p>/gi, "")
    .replace(/\sclass=["']?Mso[a-zA-Z0-9]+["']?/gi, "");

  // 2️⃣ Remove ONLY auto-empty blocks (Outlook)
  // ❌ <p>&nbsp;</p>
  // ❌ <div><br></div>
  cleaned = cleaned.replace(
    /<(p|div)[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi,
    "",
  );

  // 3️⃣ Normalize <p> style (Outlook-like)
  cleaned = cleaned.replace(
    /<p([^>]*)>/gi,
    `<p$1 style="margin:0 0 12px 0;line-height:1.15;font-family:Calibri,Arial,sans-serif;font-size:11pt;">`,
  );

  // 🚫 DO NOT collapse <br><br>
  return cleaned.trim();
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

  // 🔥 INLINE CID IMAGE → DO NOT CREATE URL
  if (att.cid) {
    return {
      id: att.id || crypto.randomUUID(),
      filename: att.filename || "inline-image",
      mimeType: att.mimeType || "image/png",
      size: att.size || 0,
      url: null, // ✅ VERY IMPORTANT
      cid: att.cid,
      inline: true,
    };
  }

  // Normal file attachment
  const rawUrl = att.storageUrl || att.url || att.path;
  if (!rawUrl) return null;

  return {
    id: att.id || crypto.randomUUID(),
    filename: att.filename || "file",
    mimeType: att.mimeType || "application/octet-stream",
    size: att.size || 0,
    url: rawUrl.startsWith("http")
      ? rawUrl
      : `${BASE_URL}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`,
    cid: null,
  };
}

async function getEmailsByLeadStatus(leadStatus) {
  if (!leadStatus) return [];

  const leads = await prisma.leadDetails.findMany({
    where: {
      leadStatus: {
        equals: leadStatus,
        mode: "insensitive",
      },
    },
    select: {
      email: true,
      cc: true,
    },
  });

  const emails = new Set();

  leads.forEach((l) => {
    if (l.email) emails.add(l.email.toLowerCase().trim());

    if (l.cc) {
      l.cc
        .split(/[;,]/)
        .map((e) => e.toLowerCase().trim())
        .forEach((e) => e && emails.add(e));
    }
  });

  return [...emails];
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

/* server/routes/inbox.js */
router.get("/conversation-detail", async (req, res) => {
  try {
    const { conversationId, accountId, folder } = req.query;

    if (!conversationId || !accountId) {
      return res.status(400).json({ success: false, message: "Missing IDs" });
    }

    const detailWhere = {
      conversationId,
      emailAccountId: Number(accountId),
    };

    if (folder === "trash") {
      detailWhere.isTrash = true;
      detailWhere.hideTrash = false;
    } else if (folder === "spam") {
      detailWhere.folder = "spam";
      detailWhere.isTrash = false;
      detailWhere.hideTrash = false;
    } else if (folder === "sent") {
      detailWhere.direction = "sent";
      detailWhere.isTrash = false;
      detailWhere.hideInbox = false;
    } else {
      /* 📥 FIX: THIS IS THE INBOX CASE */
      // 1. We remove "detailWhere.folder = 'inbox'" because
      // some messages in this thread are folder='sent' (your replies).

      // 2. Instead, we filter by what we WANT to exclude (Spam and Trash).
      detailWhere.isTrash = false;
      detailWhere.isSpam = false;
      detailWhere.hideInbox = false;

      // 3. (Optional but safer) Explicitly allow both folders
      detailWhere.folder = { in: ["inbox", "sent"] };
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

// router.get("/conversations/:accountId", async (req, res) => {
//   try {
//     const accountId = Number(req.params.accountId);
//     if (!accountId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid accountId" });
//     }

//     const {
//       folder = "inbox",
//       sender,
//       recipient,
//       subject,
//       isUnread,
//       isStarred,
//       dateFrom,
//       dateTo,
//       hasAttachment,
//       country,
//       leadStatus,
//       searchEmail,
//     } = req.query;

//     /* ==================================================
//        1️⃣ BUILD SQL CONDITIONS
//     ================================================== */
//     const conditions = [];
//     const params = [];

//     // account
//     conditions.push(`em."emailAccountId" = $${params.length + 1}`);
//     params.push(accountId);

//     // folder
//     if (folder === "inbox") {
//       conditions.push(`
//         em.folder = 'inbox'
//         AND em.direction = 'received'
//         AND em."isTrash" = false
//         AND em."isSpam" = false
//         AND em."hideInbox" = false
//       `);
//     } else if (folder === "sent") {
//       conditions.push(`
//         em.folder = 'sent'
//         AND em.direction = 'sent'
//         AND em."isTrash" = false
//       `);
//     } else if (folder === "spam") {
//       conditions.push(`em.folder = 'spam'`);
//     } else if (folder === "trash") {
//       conditions.push(`em."isTrash" = true`);
//     }

//     // sender / recipient / search
//     if (sender || recipient || searchEmail) {
//       const val = `%${(sender || recipient || searchEmail)
//         .toLowerCase()
//         .trim()}%`;
//       conditions.push(`
//         (
//           lower(em."fromEmail") LIKE $${params.length + 1}
//           OR lower(em."toEmail") LIKE $${params.length + 1}
//           OR lower(em."ccEmail") LIKE $${params.length + 1}
//         )
//       `);
//       params.push(val);
//     }

//     // subject
//     if (subject) {
//       conditions.push(`lower(em.subject) LIKE $${params.length + 1}`);
//       params.push(`%${subject.toLowerCase()}%`);
//     }

//     // unread
//     if (isUnread === "true") {
//       conditions.push(`em."isRead" = false`);
//     }

//     // starred
//     if (isStarred === "true") {
//       conditions.push(`em."isStarred" = true`);
//     }

//     // date range
//     if (dateFrom) {
//       conditions.push(`em."sentAt" >= $${params.length + 1}`);
//       params.push(new Date(dateFrom));
//     }
//     if (dateTo) {
//       conditions.push(`em."sentAt" <= $${params.length + 1}`);
//       params.push(new Date(dateTo));
//     }

//     // attachment
//     if (hasAttachment === "true") {
//       conditions.push(`
//         EXISTS (
//           SELECT 1 FROM "Attachment" a
//           WHERE a."emailMessageId" = em.id
//         )
//       `);
//     }

//     // country
//     if (country) {
//       conditions.push(`
//         (
//           lem.country = $${params.length + 1}
//           OR lem_fallback.country = $${params.length + 1}
//         )
//       `);
//       params.push(country);
//     }

//     /* ==================================================
//        2️⃣ FETCH MESSAGE IDS (RAW SQL)
//     ================================================== */
//     const sql = `
//       SELECT DISTINCT em.id
//       FROM "EmailMessage" em

//       LEFT JOIN "LeadDetails" ld
//         ON ld.id = em."leadDetailId"

//       LEFT JOIN "LeadEmailMeta" lem
//         ON lem."leadDetailId" = ld.id

//       LEFT JOIN "LeadEmailMeta" lem_fallback
//         ON (
//           lower(em."fromEmail") = lower(lem_fallback.email)
//           OR lower(em."toEmail") LIKE '%' || lower(lem_fallback.email) || '%'
//           OR lower(em."ccEmail") LIKE '%' || lower(lem_fallback.email) || '%'
//           OR lower(em."ccEmail") LIKE '%' || lower(lem_fallback.cc) || '%'
//         )

//       WHERE ${conditions.join(" AND ")}

//       ORDER BY em.id DESC
//     `;

//     const rows = await prisma.$queryRawUnsafe(sql, ...params);
//     const messageIds = rows.map((r) => r.id);

//     if (messageIds.length === 0) {
//       return res.json({ success: true, total: 0, data: [] });
//     }

//     /* ==================================================
//        3️⃣ FETCH CONVERSATIONS (✅ FIXED - NO emailAccountId)
//     ================================================== */
//     const conversations = await prisma.conversation.findMany({
//       where: {
//         // ✅ REMOVED: emailAccountId filter
//         messages: {
//           some: { id: { in: messageIds } },
//         },
//       },
//       include: {
//         messages: {
//           where: {
//             emailAccountId: accountId, // ✅ Filter messages by account here instead
//           },
//           orderBy: { sentAt: "desc" },
//           take: 1,
//         },
//       },
//       orderBy: { lastMessageAt: "desc" },
//     });

//     /* ==================================================
//        4️⃣ FORMAT RESPONSE
//     ================================================== */
//     let result = conversations
//       .filter((conv) => conv.messages.length > 0) // ✅ Only return conversations with messages for this account
//       .map((conv) => {
//         const m = conv.messages[0];

//         let displayName = "Unknown";
//         let displayEmail = "Unknown";

//         if (m?.direction === "received") {
//           displayName = m.fromName || m.fromEmail;
//           displayEmail = m.fromEmail;
//         } else {
//           const firstTo = m?.toEmail?.split(",")[0] || "";
//           displayName = m?.toName || firstTo;
//           displayEmail = firstTo;
//         }

//         return {
//           conversationId: conv.id,
//           subject: conv.subject || "(No Subject)",
//           initiatorEmail: conv.initiatorEmail,
//           lastSenderEmail: m?.fromEmail || null,
//           displayName,
//           displayEmail,
//           lastDate: conv.lastMessageAt,
//           lastBody: m?.body?.replace(/<[^>]+>/g, " ").slice(0, 120) || "",
//           unreadCount: conv.unreadCount,
//           messageCount: conv.messageCount,
//           isStarred: conv.isStarred,
//         };
//       });

//     /* ==================================================
//        5️⃣ LEAD STATUS FILTER
//     ================================================== */
//     if (leadStatus) {
//       const leads = await prisma.leadDetails.findMany({
//         where: {
//           leadStatus: { equals: leadStatus, mode: "insensitive" },
//         },
//         select: { email: true, cc: true },
//       });

//       const leadEmails = new Set();

//       leads.forEach((l) => {
//         if (l.email) leadEmails.add(l.email.toLowerCase().trim());
//         if (l.cc) {
//           l.cc
//             .split(/[;,]/)
//             .map((e) => e.toLowerCase().trim())
//             .forEach((e) => e && leadEmails.add(e));
//         }
//       });

//       const normalize = (s) =>
//         (s || "").toLowerCase().replace(/<|>|"/g, "").trim();

//       result = result.filter((conv) => {
//         return (
//           leadEmails.has(normalize(conv.displayEmail)) ||
//           leadEmails.has(normalize(conv.lastSenderEmail)) ||
//           leadEmails.has(normalize(conv.initiatorEmail))
//         );
//       });
//     }

//     /* ==================================================
//        6️⃣ RETURN
//     ================================================== */
//     return res.json({
//       success: true,
//       total: result.length,
//       data: result,
//     });
//   } catch (err) {
//     console.error("🔥 Inbox conversations error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to load conversations",
//       error: err.message,
//     });
//   }
// });
router.get("/conversations/:accountId", async (req, res) => {
  try {
    const accountId = Number(req.params.accountId);
    if (!accountId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid accountId" });
    }

    const {
      folder = "inbox",
      sender,
      recipient,
      subject,
      isUnread,
      isStarred,
      dateFrom,
      dateTo,
      hasAttachment,
      country,
      leadStatus,
      searchEmail,
    } = req.query;

    /* ==================================================
       1️⃣ BUILD SQL CONDITIONS
    ================================================== */
    const conditions = [];
    const params = [];

    // account
    conditions.push(`em."emailAccountId" = $${params.length + 1}`);
    params.push(accountId);

    // 🔥 GLOBAL SAFETY: never show permanently deleted
    conditions.push(`em."hideTrash" = false`);
    //AND em.direction = 'received'
    // folder logic (STRICT & MUTUALLY EXCLUSIVE)
    //   if (folder === "inbox") {
    //     conditions.push(`
    //   (
    //     (em.folder = 'inbox' AND em.direction = 'received')
    //     OR
    //     (em.folder = 'sent' AND em.direction = 'sent')
    //   )
    //   AND em."isTrash" = false
    //   AND em."isSpam" = false
    //   AND em."hideInbox" = false
    // `);
    if (folder === "inbox") {
      conditions.push(`
    em.direction = 'received'
    AND em."isTrash" = false
    AND em."isSpam" = false
    AND em."hideInbox" = false
  `);
    } else if (folder === "sent") {
      conditions.push(`
        em.folder = 'sent'
        AND em.direction = 'sent'
        AND em."isTrash" = false
      `);
    } else if (folder === "spam") {
      conditions.push(`
        em.folder = 'spam'
        AND em."isTrash" = false
      `);
    } else if (folder === "trash") {
      conditions.push(`
        em."isTrash" = true
      `);
    }

    // sender / recipient / search
    if (sender || recipient || searchEmail) {
      const val = `%${(sender || recipient || searchEmail)
        .toLowerCase()
        .trim()}%`;
      conditions.push(`
        (
          lower(em."fromEmail") LIKE $${params.length + 1}
          OR lower(em."toEmail") LIKE $${params.length + 1}
          OR lower(em."ccEmail") LIKE $${params.length + 1}
        )
      `);
      params.push(val);
    }

    // subject
    if (subject) {
      conditions.push(`lower(em.subject) LIKE $${params.length + 1}`);
      params.push(`%${subject.toLowerCase()}%`);
    }

    // unread
    if (isUnread === "true") {
      conditions.push(`em."isRead" = false`);
    }

    // starred
    if (isStarred === "true") {
      conditions.push(`em."isStarred" = true`);
    }

    // date range
    if (dateFrom) {
      conditions.push(`em."sentAt" >= $${params.length + 1}`);
      params.push(new Date(dateFrom));
    }
    if (dateTo) {
      conditions.push(`em."sentAt" <= $${params.length + 1}`);
      params.push(new Date(dateTo));
    }

    // attachment
    if (hasAttachment === "true") {
      conditions.push(`
        EXISTS (
          SELECT 1 FROM "Attachment" a
          WHERE a."messageId" = em.id
        )
      `);
    }

    // country
    if (country) {
      conditions.push(`
        (
          lem.country = $${params.length + 1}
          OR lem_fallback.country = $${params.length + 1}
        )
      `);
      params.push(country);
    }

    /* ==================================================
       2️⃣ FETCH MESSAGE IDS
    ================================================== */
    const sql = `
      SELECT DISTINCT em.id
      FROM "EmailMessage" em

      LEFT JOIN "LeadDetails" ld
        ON ld.id = em."leadDetailId"

      LEFT JOIN "LeadEmailMeta" lem
        ON lem."leadDetailId" = ld.id

      LEFT JOIN "LeadEmailMeta" lem_fallback
        ON (
          lower(em."fromEmail") = lower(lem_fallback.email)
          OR lower(em."toEmail") LIKE '%' || lower(lem_fallback.email) || '%'
          OR lower(em."ccEmail") LIKE '%' || lower(lem_fallback.email) || '%'
          OR lower(em."ccEmail") LIKE '%' || lower(lem_fallback.cc) || '%'
        )

      WHERE ${conditions.join(" AND ")}
      ORDER BY em.id DESC
    `;

    const rows = await prisma.$queryRawUnsafe(sql, ...params);
    const messageIds = rows.map((r) => r.id);

    if (messageIds.length === 0) {
      return res.json({ success: true, total: 0, data: [] });
    }

    /* ==================================================
       3️⃣ FETCH CONVERSATIONS
    ================================================== */
    const conversations = await prisma.conversation.findMany({
      where: {
        messages: {
          some: { id: { in: messageIds } },
        },
      },
      include: {
        messages: {
          where: {
            emailAccountId: accountId,
          },
          orderBy: { sentAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    /* ==================================================
       4️⃣ FORMAT RESPONSE
    ================================================== */
    let result = conversations
      .filter((conv) => conv.messages.length > 0)
      .map((conv) => {
        const m = conv.messages[0];

        let displayName;
        let displayEmail;

        if (m.direction === "received") {
          displayName = m.fromName || m.fromEmail;
          displayEmail = m.fromEmail;
        } else {
          const firstTo = m.toEmail?.split(",")[0] || "";
          displayName = m.toName || firstTo;
          displayEmail = firstTo;
        }

        return {
          conversationId: conv.id,
          subject: conv.subject || "(No Subject)",
          initiatorEmail: conv.initiatorEmail,
          lastSenderEmail: m.fromEmail,
          displayName,
          displayEmail,
          lastDate: conv.lastMessageAt,
          // lastBody: m.body?.replace(/<[^>]+>/g, " ").slice(0, 120) || "",
          // 🔥 UPDATED lastBody logic to strip style/script content properly
          lastBody: m.body
            ? m.body
                .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, "") // 1. Remove <style> and <script> contents
                .replace(/<[^>]+>/g, " ") // 2. Remove all remaining HTML tags
                .replace(/&nbsp;/g, " ") // 3. Replace HTML entities
                .replace(/\s+/g, " ") // 4. Collapse multiple spaces/newlines
                .trim()
                .slice(0, 120)
            : "",
          unreadCount: conv.unreadCount,
          messageCount: conv.messageCount,
          isStarred: conv.isStarred,
        };
      });

    /* ==================================================
       5️⃣ LEAD STATUS FILTER
    ================================================== */
    if (leadStatus) {
      const leads = await prisma.leadDetails.findMany({
        where: {
          leadStatus: { equals: leadStatus, mode: "insensitive" },
        },
        select: { email: true, cc: true },
      });

      const leadEmails = new Set();
      leads.forEach((l) => {
        if (l.email) leadEmails.add(l.email.toLowerCase().trim());
        if (l.cc) {
          l.cc
            .split(/[;,]/)
            .map((e) => e.toLowerCase().trim())
            .forEach((e) => e && leadEmails.add(e));
        }
      });

      const normalize = (s) =>
        (s || "").toLowerCase().replace(/<|>|"/g, "").trim();

      result = result.filter(
        (c) =>
          leadEmails.has(normalize(c.displayEmail)) ||
          leadEmails.has(normalize(c.lastSenderEmail)) ||
          leadEmails.has(normalize(c.initiatorEmail)),
      );
    }

    /* ==================================================
       6️⃣ RETURN
    ================================================== */
    return res.json({
      success: true,
      total: result.length,
      data: result,
    });
  } catch (err) {
    console.error("🔥 Inbox conversations error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load conversations",
      error: err.message,
    });
  }
});

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

// server/routes/inbox.js

router.post("/conversations/read", async (req, res) => {
  try {
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "Missing conversationId",
      });
    }

    // ✅ ARCHITECTURAL FIX: Use a transaction to keep messages and conversation counts in sync
    await prisma.$transaction([
      // 1. Mark all received messages in this thread as read
      prisma.emailMessage.updateMany({
        where: {
          conversationId: conversationId,
          isRead: false,
          direction: "received",
        },
        data: { isRead: true },
      }),

      // 2. Reset the unread counter for the conversation record
      prisma.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    // If the conversation record doesn't exist (P2025), return success for the messages
    if (err.code === "P2025") {
      return res.json({
        success: true,
        warning: "Messages updated; conversation record not found.",
      });
    }

    console.error("❌ Error marking read:", err);
    res.status(500).json({ success: false, error: err.message });
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

// router.get("/download/:uid/:filename", async (req, res) => {
//   try {
//     const { uid, filename } = req.params;
//     const { accountId } = req.query;

//     if (!accountId) return res.status(400).send("Missing accountId");

//     const account = await prisma.emailAccount.findUnique({
//       where: { id: Number(accountId) },
//     });

//     if (!account) return res.status(404).send("Email account not found");

//     const client = new ImapFlow({
//       host: account.imapHost,
//       port: account.imapPort || 993,
//       secure: true,
//       auth: {
//         user: account.imapUser || account.email,
//         pass: account.encryptedPass,
//       },
//       tls: { rejectUnauthorized: false },
//       // 🔥 ADD TIMEOUTS
//       socketTimeout: 60000,
//       connectionTimeout: 30000,
//     });

//     // 🔥 CRITICAL FIX: Prevent process crash on Socket Timeout
//     client.on("error", (err) => {
//       console.error(`⚠️ IMAP Download Error: ${err.message}`);
//     });

//     await client.connect();
//     // ... rest of your existing logic ...
//     await client.logout().catch(() => {});
//   } catch (err) {
//     console.error("🔥 Download Route Error:", err);
//     res.status(500).json({ error: "Failed to download attachment" });
//   }
// });
router.get("/download/:uid/:filename", async (req, res) => {
  let client; // Define outside to use in finally block
  try {
    const { uid, filename } = req.params;
    const { accountId } = req.query;

    // ... (fetch account logic)

    client = new ImapFlow({
      /* configs */
    });

    // Catch internal imapflow errors
    client.on("error", (err) => console.error("IMAP Client Error:", err));

    await client.connect();
    await client.mailboxOpen("INBOX");

    // ... (fetch logic)
  } catch (err) {
    console.error("🔥 Download Route Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Socket timeout or connection failed" });
    }
  } finally {
    if (client) {
      await client.logout().catch(() => {}); // Quietly logout
    }
  }
});

/* 🔍 GET: Search Messages */
router.get("/search", async (req, res) => {
  try {
    const { query, accountId } = req.query; // 🔥 ADD accountId

    if (!query) return res.json({ success: true, data: [] });
    if (!accountId)
      return res
        .status(400)
        .json({ success: false, message: "accountId required" });

    const q = query.toLowerCase();

    const messages = await prisma.emailMessage.findMany({
      where: {
        emailAccountId: Number(accountId), // 🔥 FILTER BY ACCOUNT
        OR: [
          { fromEmail: { contains: q, mode: "insensitive" } },
          { toEmail: { contains: q, mode: "insensitive" } },
          { ccEmail: { contains: q, mode: "insensitive" } },
          { subject: { contains: q, mode: "insensitive" } },
          { body: { contains: q, mode: "insensitive" } },
        ],
      },
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

/* 📤 POST: Reply to Email (FIXED – saves fromName) */
router.post("/reply", async (req, res) => {
  try {
    const {
      emailAccountId,
      to,
      cc,
      subject,
      body,
      attachments = [],
      replyToMessageId,
    } = req.body;

    // 🔹 1️⃣ Fetch Email Account + User (THIS IS STEP 1)
    const account = await prisma.emailAccount.findUnique({
      where: { id: Number(emailAccountId) },
    });

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    const senderName = account.senderName || null;
    const authEmail = account.smtpUser || account.email;

    // 🔹 2️⃣ Fetch original message for threading
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
        references = originalMessage.references
          ? `${originalMessage.references} ${originalMessage.messageId}`
          : originalMessage.messageId;
      }
    }

    // 🔹 3️⃣ Create SMTP transporter
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

    const finalSubject =
      subject && subject.startsWith("Re:") ? subject : `Re: ${subject || ""}`;

    // 🔹 4️⃣ Generate Message-ID
    const replyMessageId = `<${Date.now()}.${Math.random()
      .toString(36)
      .substring(2)}@${account.email.split("@")[1]}>`;
    const smtpFrom = senderName ? `"${senderName}" <${authEmail}>` : authEmail;
    const normalizedBody = normalizeEmailHtml(body);

    // 🔹 5️⃣ Send mail
    await transporter.sendMail({
      from: smtpFrom,
      to,
      cc: cc || undefined,
      subject: finalSubject,
      html: normalizedBody, // ✅ REPLACED
      attachments: smtpAttachments,
      messageId: replyMessageId,
      headers: inReplyTo
        ? {
            "In-Reply-To": inReplyTo,
            References: references,
          }
        : {},
    });
    // 🔥 UPDATE ONLY IF THIS WAS A SCHEDULED MESSAGE
    if (req.body.scheduledMessageId) {
      await prisma.scheduledMessage.update({
        where: {
          id: Number(req.body.scheduledMessageId),
        },
        data: {
          status: "sent",
          isFollowedUp: true,
          updatedAt: new Date(),
        },
      });
    }

    // 🔹 6️⃣ Save reply in DB (🔥 FIX HERE)
    const savedReply = await prisma.emailMessage.create({
      data: {
        emailAccountId: Number(emailAccountId),
        conversationId,
        messageId: replyMessageId,

        fromEmail: authEmail,
        fromName: senderName, // ✅ FIXED

        toEmail: to,
        ccEmail: cc || null,
        subject: finalSubject,
        body: normalizedBody, // ✅ REPLACED
        direction: "sent",
        sentAt: new Date(),
        folder: "inbox", // 🔥 KEY FIX
        // folder: "sent",
        isRead: true,
        inReplyTo,
        references,

        attachments:
          attachments.length > 0
            ? {
                create: attachments.map((file) => ({
                  filename: file.filename || file.name,
                  mimeType: file.mimeType || file.type,
                  size: file.size || null,
                  storageUrl: file.url,
                })),
              }
            : undefined,
      },
      include: { attachments: true },
    });

    // 🔹 7️⃣ Update conversation metadata
    if (conversationId) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          messageCount: { increment: 1 },
        },
      });
    }

    return res.json({
      success: true,
      message: "Reply sent successfully",
      data: savedReply,
    });
  } catch (err) {
    console.error("❌ Reply error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to send reply",
      details: err.message,
    });
  }
});

router.post("/reply-all", async (req, res) => {
  try {
    const {
      emailAccountId,
      replyToId,
      conversationId,
      fromEmail,
      body,
      attachments = [],
      scheduledMessageId,
    } = req.body;

    if (!emailAccountId || !fromEmail || !body) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    /* 1️⃣ Find original message */
    let original = null;

    if (replyToId) {
      original = await prisma.emailMessage.findUnique({
        where: { id: Number(replyToId) },
      });
    }

    if (!original && conversationId) {
      original = await prisma.emailMessage.findFirst({
        where: { conversationId },
        orderBy: { sentAt: "desc" },
      });
    }

    if (!original) {
      return res.status(400).json({
        success: false,
        message: "Original message not found",
      });
    }

    /* 2️⃣ Account */
    const account = await prisma.emailAccount.findUnique({
      where: { id: Number(emailAccountId) },
      include: { User: { select: { name: true } } },
    });

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    const senderName = account.senderName || null;
    const authEmail = account.smtpUser || account.email;

    /* 3️⃣ Build reply-all recipients */
    const normalize = (e) => e?.toLowerCase().trim();

    const sender = normalize(original.fromEmail);
    const toList = (original.toEmail || "").split(",").map(normalize);
    const ccList = (original.ccEmail || "").split(",").map(normalize);

    const exclude = normalize(authEmail);

    const all = [sender, ...toList, ...ccList]
      .filter(Boolean)
      .filter((e) => e !== exclude);

    const unique = [...new Set(all)];

    const smtpTo = sender;
    const smtpCc = unique.filter((e) => e !== smtpTo);

    /* 4️⃣ SMTP */
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort || 465,
      secure: (account.smtpPort || 465) === 465,
      auth: { user: authEmail, pass: account.encryptedPass },
    });

    /* 5️⃣ Body + subject */
    const finalSubject = original.subject?.startsWith("Re:")
      ? original.subject
      : `Re: ${original.subject || ""}`;

    const quoted = `
      <br><br>
      <div style="border-left:3px solid #ccc;padding-left:10px;">
        <b>On ${original.sentAt.toLocaleString()}, ${original.fromEmail} wrote:</b><br>
        ${original.body || ""}
      </div>
    `;

    const finalBody = body + quoted;

    /* 6️⃣ Message-ID */
    const msgId = `<${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}@${authEmail.split("@")[1]}>`;
    const smtpFrom = senderName ? `"${senderName}" <${authEmail}>` : authEmail;
    const normalizedBody = normalizeEmailHtml(finalBody);

    /* 7️⃣ Send */
    await transporter.sendMail({
      from: smtpFrom,
      to: smtpTo,
      cc: smtpCc.join(", "),
      subject: finalSubject,
      html: normalizedBody,
      messageId: msgId,
      headers: {
        "In-Reply-To": original.messageId,
        References: original.references
          ? `${original.references} ${original.messageId}`
          : original.messageId,
      },
      attachments: attachments.map((f) => ({
        filename: f.filename || f.name,
        path: f.url,
      })),
    });

    /* 8️⃣ Save message (THIS IS THE FIX) */
    const saved = await prisma.emailMessage.create({
      data: {
        emailAccountId: Number(emailAccountId),
        conversationId: original.conversationId,

        messageId: msgId,
        fromEmail: authEmail,
        fromName: senderName,

        toEmail: smtpTo, // ✅ EXACT
        ccEmail: smtpCc.join(", "), // ✅ EXACT

        subject: finalSubject,
        body: normalizedBody, // ✅ REPLACED
        direction: "sent",
        sentAt: new Date(),
        folder: "inbox",
        isRead: true,

        inReplyTo: original.messageId,
        references: original.references
          ? `${original.references} ${original.messageId}`
          : original.messageId,
      },
    });

    await prisma.conversation.update({
      where: { id: original.conversationId },
      data: {
        lastMessageAt: new Date(),
        messageCount: { increment: 1 },
      },
    });

    return res.json({ success: true, data: saved });
  } catch (err) {
    console.error("Reply-All error:", err);
    res.status(500).json({ success: false });
  }
});

// router.post("/forward", async (req, res) => {
//   try {
//     const {
//       emailAccountId,
//       forwardMessageId,
//       messageId, // ✅ fallback support
//       conversationId, // ✅ fallback support
//       fromEmail,
//       to,
//       cc,
//       body,
//       attachments = [],
//       scheduledMessageId,
//     } = req.body;

//     if (!emailAccountId || !to) {
//       return res.status(400).json({
//         success: false,
//         message: "emailAccountId and to are required",
//       });
//     }

//     /* ============================================================
//        1️⃣ FIND ORIGINAL MESSAGE (SAFE + FALLBACKS)
//     ============================================================ */
//     let original = null;
//     const originalId = forwardMessageId || messageId;

//     // Prefer explicit message id
//     if (originalId) {
//       original = await prisma.emailMessage.findUnique({
//         where: { id: Number(originalId) },
//       });
//     }

//     // Fallback: latest message in conversation
//     if (!original && conversationId) {
//       original = await prisma.emailMessage.findFirst({
//         where: { conversationId },
//         orderBy: { sentAt: "desc" },
//       });
//     }

//     if (!original) {
//       return res.status(400).json({
//         success: false,
//         message: "Original message not found for forward",
//       });
//     }

//     /* ============================================================
//        2️⃣ FETCH ACCOUNT + USER
//     ============================================================ */
//     const account = await prisma.emailAccount.findUnique({
//       where: { id: Number(emailAccountId) },
//       include: { User: { select: { name: true } } },
//     });

//     if (!account) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Account not found" });
//     }

//     const senderName = account.User?.name || null;
//     const authenticatedEmail = account.smtpUser || account.email;

//     /* ============================================================
//        3️⃣ CREATE NEW CONVERSATION (OUTLOOK STYLE)
//     ============================================================ */
//     const newConversationId = crypto.randomUUID();

//     const finalSubject = original.subject?.startsWith("Fwd:")
//       ? original.subject
//       : `Fwd: ${original.subject || ""}`;

//     await prisma.conversation.create({
//       data: {
//         id: newConversationId,
//         subject: finalSubject,

//         // ✅ Conversation = grouping only
//         initiatorEmail: authenticatedEmail,
//         participants: authenticatedEmail,

//         lastMessageAt: new Date(),
//         messageCount: 1,
//         unreadCount: 0,
//       },
//     });

//     /* ============================================================
//        4️⃣ SMTP TRANSPORTER
//     ============================================================ */
//     const transporter = nodemailer.createTransport({
//       host: account.smtpHost,
//       port: account.smtpPort || 465,
//       secure: (account.smtpPort || 465) === 465,
//       auth: {
//         user: authenticatedEmail,
//         pass: account.encryptedPass,
//       },
//       tls: { rejectUnauthorized: false },
//     });

//     /* ============================================================
//        5️⃣ BUILD FORWARDED BODY
//     ============================================================ */
//     const senderDisplay = original.fromName
//       ? `${original.fromName} &lt;${original.fromEmail}&gt;`
//       : original.fromEmail;

//     const forwardedBody = `
//       ${body || ""}
//       <br><br>
//       <hr />
//       <div>
//         <b>From:</b> ${senderDisplay}<br>
//         <b>Sent:</b> ${original.sentAt.toLocaleString()}<br>
//         <b>To:</b> ${original.toEmail}<br>
//         ${original.ccEmail ? `<b>Cc:</b> ${original.ccEmail}<br>` : ""}
//         <b>Subject:</b> ${original.subject || ""}
//       </div>
//       <br>
//       ${original.body || ""}
//     `;

//     /* ============================================================
//        6️⃣ GENERATE MESSAGE-ID
//     ============================================================ */
//     const forwardMessageIdValue = `<${Date.now()}.${Math.random()
//       .toString(36)
//       .substring(2)}@${authenticatedEmail.split("@")[1]}>`;

//     /* ============================================================
//        7️⃣ SEND EMAIL
//     ============================================================ */
//     await transporter.sendMail({
//       from: `"${senderName || ""}" <${authenticatedEmail}>`,
//       to,
//       cc,
//       subject: finalSubject,
//       html: forwardedBody,
//       messageId: forwardMessageIdValue,
//       attachments: attachments.map((file) => ({
//         filename: file.filename || file.name,
//         path: file.url,
//         contentType: file.type || file.mimeType,
//       })),
//     });

//     /* ============================================================
//        8️⃣ UPDATE SCHEDULED MESSAGE (OPTIONAL)
//     ============================================================ */
//     if (scheduledMessageId) {
//       await prisma.scheduledMessage.update({
//         where: { id: Number(scheduledMessageId) },
//         data: {
//           status: "sent",
//           isFollowedUp: true,
//           updatedAt: new Date(),
//         },
//       });
//     }

//     /* ============================================================
//        9️⃣ SAVE FORWARDED EMAIL (NEW CONVERSATION)
//     ============================================================ */
//     const savedForward = await prisma.emailMessage.create({
//       data: {
//         emailAccountId: Number(emailAccountId),
//         conversationId: newConversationId,
//         messageId: forwardMessageIdValue,

//         fromEmail: authenticatedEmail,
//         fromName: senderName,

//         toEmail: to,
//         ccEmail: cc || null,
//         subject: finalSubject,
//         body: forwardedBody,
//         direction: "sent",
//         sentAt: new Date(),
//         folder: "inbox",
//         isRead: true,

//         attachments:
//           attachments.length > 0
//             ? {
//                 create: attachments.map((file) => ({
//                   filename: file.filename || file.name,
//                   mimeType: file.mimeType || file.type,
//                   size: file.size || null,
//                   storageUrl: file.url,
//                 })),
//               }
//             : undefined,
//       },
//     });

//     return res.json({
//       success: true,
//       message: "Forward sent successfully (new conversation)",
//       data: savedForward,
//     });
//   } catch (err) {
//     console.error("❌ Forward Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Forward failed",
//       error: err.message,
//     });
//   }
// });
router.post("/forward", async (req, res) => {
  try {
    const {
      emailAccountId,
      forwardMessageId,
      conversationId,
      to,
      cc,
      body,
      attachments = [],
    } = req.body;

    if (!emailAccountId || !to) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    /* 1️⃣ Find original */
    let original = null;

    if (forwardMessageId) {
      original = await prisma.emailMessage.findUnique({
        where: { id: Number(forwardMessageId) },
      });
    }

    if (!original && conversationId) {
      original = await prisma.emailMessage.findFirst({
        where: { conversationId },
        orderBy: { sentAt: "desc" },
      });
    }

    if (!original) {
      return res
        .status(400)
        .json({ success: false, message: "Original not found" });
    }

    /* 2️⃣ Account */
    const account = await prisma.emailAccount.findUnique({
      where: { id: Number(emailAccountId) },
    });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const senderName = account.senderName || null;
    const authEmail = account.smtpUser || account.email;

    /* 3️⃣ NEW conversation */
    const newConversationId = crypto.randomUUID();

    const finalSubject = original.subject?.startsWith("Fwd:")
      ? original.subject
      : `Fwd: ${original.subject || ""}`;

    await prisma.conversation.create({
      data: {
        id: newConversationId,
        subject: finalSubject,

        initiatorEmail: authEmail,
        participants: authEmail,

        toRecipients: to, // ✅ REQUIRED
        ccRecipients: cc || null, // ✅ SAFE

        lastMessageAt: new Date(),
        messageCount: 1,
        unreadCount: 0,
      },
    });

    /* 4️⃣ SMTP */
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort || 465,
      secure: Number(account.smtpPort) === 465,
      auth: { user: authEmail, pass: account.encryptedPass },
    });

    const forwardedBody = `
      ${body || ""}
      <br><hr>
      <b>From:</b> ${original.fromEmail}<br>
      <b>Sent:</b> ${original.sentAt.toLocaleString()}<br>
      <b>Subject:</b> ${original.subject}<br><br>
      ${original.body}
    `;

    const msgId = `<${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}@${authEmail.split("@")[1]}>`;
    const smtpFrom = senderName ? `"${senderName}" <${authEmail}>` : authEmail;
    const normalizedBody = normalizeEmailHtml(forwardedBody);

    /* 5️⃣ Send */
    await transporter.sendMail({
      from: smtpFrom,
      to,
      cc: cc || undefined,
      subject: finalSubject,
      html: normalizedBody,
      messageId: msgId,
    });

    /* 6️⃣ Save */
    const saved = await prisma.emailMessage.create({
      data: {
        emailAccountId: Number(emailAccountId),
        conversationId: newConversationId,

        messageId: msgId,
        fromEmail: authEmail,
        fromName: senderName,

        toEmail: to, // ✅ ONLY NEW
        ccEmail: cc || null,

        subject: finalSubject,
        body: normalizedBody, // ✅ REPLACED
        direction: "sent",
        sentAt: new Date(),
        folder: "inbox",
        isRead: true,
      },
    });

    return res.json({ success: true, data: saved });
  } catch (err) {
    console.error("Forward error:", err);
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

router.post("/delete", async (req, res) => {
  try {
    const { conversationIds, folder } = req.body;

    if (!conversationIds?.length) {
      return res.status(400).json({ success: false });
    }

    if (folder === "trash") {
      // ✅ PERMANENT DELETE
      await prisma.emailMessage.updateMany({
        where: {
          conversationId: { in: conversationIds },
          isTrash: true,
          hideTrash: false,
        },
        data: {
          hideTrash: true,
        },
      });
    } else {
      // ✅ MOVE TO TRASH
      await prisma.emailMessage.updateMany({
        where: {
          conversationId: { in: conversationIds },
        },
        data: {
          isTrash: true,
          isSpam: false,
          hideInbox: true,
          folder: "trash",
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ success: false });
  }
});
router.post("/move-to-inbox", async (req, res) => {
  try {
    const { conversationIds, accountId } = req.body;

    if (!conversationIds?.length || !accountId) {
      return res.status(400).json({
        success: false,
        message: "Missing conversationIds or accountId",
      });
    }

    await prisma.emailMessage.updateMany({
      where: {
        conversationId: { in: conversationIds },
        emailAccountId: Number(accountId),
      },
      data: {
        folder: "inbox",
        isSpam: false,
        isTrash: false,
        hideInbox: false,
        hideTrash: false,
        // direction: "received", // 🔥 CRITICAL FIX
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ MOVE TO INBOX ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to move messages to inbox",
    });
  }
});

//  🗑️ DELETE Routes

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
