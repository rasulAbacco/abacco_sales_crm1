import express from "express";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import crypto from "crypto";
import { htmlToText } from "html-to-text";

const router = express.Router();
const prisma = new PrismaClient();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

/**
 * 🔥 SPAM-SAFE NORMALIZATION
 * Strips complex inline styles and wraps content in a single clean container.
 */
const normalizeEmailHtml = (html) => {
  if (!html) return "";

  let bodyContent = html
    .replace(/<o:p>.*?<\/o:p>/gi, "") // Remove Outlook junk tags
    // 🛡️ Remove ALL existing inline style attributes to prevent "code bloat"
    .replace(/\sstyle="[^"]*"/gi, "")
    // Basic paragraph spacing
    .replace(/<p>/gi, '<p style="margin: 0 0 12px 0;">')
    .replace(/<div>/gi, '<div style="margin: 0;">')
    .replace(/<br>\s*<br>/gi, "<br>")
    .trim();

  // 💎 Wrap once with a professional font. Filters prefer this over per-tag styling.
  return `
<div style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.2; color: #000000;">
  ${bodyContent}
</div>`.trim();
};

router.post("/send", upload.array("attachments"), async (req, res) => {
  try {
    const {
      to,
      cc,
      subject,
      body,
      emailAccountId,
      conversationId,
      inReplyToId,
      leadDetailId,
    } = req.body;

    if (!to || !emailAccountId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const account = await prisma.emailAccount.findUnique({
      where: { id: Number(emailAccountId) },
    });

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    const authenticatedEmail = account.smtpUser || account.email;
    const senderName = account.senderName?.trim() || null;
    const smtpFrom = senderName
      ? `"${senderName}" <${authenticatedEmail}>`
      : `<${authenticatedEmail}>`;

    // --- CONVERSATION LOGIC ---
    let finalConversationId = conversationId;
    if (
      !finalConversationId ||
      finalConversationId === "null" ||
      finalConversationId === "undefined"
    ) {
      const timestamp = Date.now();
      const randomPart = crypto.randomBytes(8).toString("hex");
      const domain = authenticatedEmail.split("@")[1];
      finalConversationId = `<${timestamp}.${randomPart}@${domain}>`;

      await prisma.conversation.create({
        data: {
          id: finalConversationId,
          subject: subject || "(No Subject)",
          participants: `${authenticatedEmail}, ${to}${cc ? `, ${cc}` : ""}`,
          toRecipients: to,
          ccRecipients: cc || null,
          initiatorEmail: authenticatedEmail,
          lastMessageAt: new Date(),
          messageCount: 1,
          unreadCount: 0,
          leadDetailId: leadDetailId ? Number(leadDetailId) : null,
        },
      });
    }

    // --- SMTP CONFIG ---
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: Number(account.smtpPort) || 587,
      secure: Number(account.smtpPort) === 465,
      requireTLS: Number(account.smtpPort) === 587,
      auth: {
        user: authenticatedEmail,
        pass: account.encryptedPass,
      },
      tls: {
        servername: account.smtpHost,
        rejectUnauthorized: true,
      },
    });

    // --- PREPARE CONTENT ---
    // 🛡️ Always normalize. Bypassing this is what triggers the spam filter.
    const normalizedBody = normalizeEmailHtml(body);

    const textVersion = htmlToText(normalizedBody, { wordwrap: 80 });

    const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString("hex")}@${authenticatedEmail.split("@")[1]}>`;

    // ⏳ Anti-bot delay
    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.floor(Math.random() * 2000)),
    );

    // --- SEND ---
    /* ==============================
   8️⃣ SEND EMAIL
   ============================== */
    const info = await transporter.sendMail({
      from: smtpFrom, // Now correctly using senderName
      to,
      cc,
      subject: (subject || "(No Subject)").replace(/[\r\n]/g, "").trim(),

      html: normalizedBody,
      text: textVersion,

      messageId: generatedMessageId,
      inReplyTo: inReplyToId || undefined,
      references: inReplyToId || undefined,

      // 🔥 ADD THESE HEADERS HERE
      headers: {
        "X-Mailer": "Microsoft Outlook",
        "Content-Language": "en-US",
        "X-Priority": "3", // 3 = Normal priority
        Importance: "Normal",
      },
    });

    // --- SAVE TO DB ---
    const savedMessage = await prisma.emailMessage.create({
      data: {
        emailAccountId: Number(emailAccountId),
        conversationId: finalConversationId,
        messageId: messageId,
        fromEmail: authenticatedEmail,
        fromName: senderName,
        toEmail: to,
        ccEmail: cc || null,
        subject: subject || "(No Subject)",
        body: normalizedBody,
        bodyHtml: normalizedBody,
        direction: "sent",
        sentAt: new Date(),
        folder: "sent",
        isRead: true,
        leadDetailId: leadDetailId ? Number(leadDetailId) : null,
      },
    });

    return res.json({ success: true, data: savedMessage });
  } catch (error) {
    console.error("❌ SMTP SEND ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

// import express from "express";
// import nodemailer from "nodemailer";
// import { PrismaClient } from "@prisma/client";
// import multer from "multer";
// import crypto from "crypto";
// import { htmlToText } from "html-to-text";

// const router = express.Router();
// const prisma = new PrismaClient();

// // Configure Multer (Memory Storage)
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
// });

// // 🔥 NEW: HTML Normalization Function
// // const normalizeEmailHtml = (html) => {
// //   if (!html) return "";

// //   // 1️⃣ Extract forwarded header block (DO NOT TOUCH)
// //   const headerMatch = html.match(
// //     /<!-- FORWARDED_HEADER_START -->[\s\S]*?<!-- FORWARDED_HEADER_END -->/i,
// //   );

// //   const forwardedHeader = headerMatch ? headerMatch[0] : "";

// //   // 2️⃣ Remove header from body temporarily
// //   let bodyWithoutHeader = html.replace(forwardedHeader, "");

// //   // 3️⃣ Normalize ONLY user content
// //   bodyWithoutHeader = bodyWithoutHeader
// //     .replace(/<o:p>.*?<\/o:p>/gi, "")
// //     .replace(
// //       /<p>/gi,
// //       '<p style="margin:0 0 12px 0;line-height:1.15;font-family:Calibri,Arial,sans-serif;font-size:11pt;">',
// //     )
// //     .replace(
// //       /<div>/gi,
// //       '<div style="margin:0;line-height:1.15;font-family:Calibri,Arial,sans-serif;font-size:11pt;">',
// //     )
// //     .replace(/<br>\s*<br>/gi, "<br>")
// //     // .replace(/<p[^>]*>\s*<\/p>/gi, "")
// //     // .replace(/<div[^>]*>\s*<\/div>/gi, "")
// //     .trim();

// //   // 4️⃣ Reattach forwarded header at the TOP
// //   return `${forwardedHeader}${bodyWithoutHeader}`.trim();
// // };
// const normalizeEmailHtml = (html) => {
//   if (!html) return "";

//   let bodyContent = html
//     .replace(/<o:p>.*?<\/o:p>/gi, "") // Remove Outlook specific tags
//     // Remove aggressive inline styles that are repeated on every tag
//     .replace(/style="[^"]*font-family:[^"]*"/gi, "")
//     .replace(/style="[^"]*font-size:[^"]*"/gi, "")
//     // Keep only basic margins for readability
//     .replace(/<p[^>]*>/gi, '<p style="margin:0 0 12px 0;">')
//     .replace(/<div[^>]*>/gi, '<div style="margin:0;">')
//     .replace(/<br>\s*<br>/gi, "<br>")
//     .trim();

//   // Wrap the entire email ONCE with the professional font styling
//   return `
//     <div style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.15; color: #000000;">
//       ${bodyContent}
//     </div>`.trim();
// };
// router.post("/send", upload.array("attachments"), async (req, res) => {
//   try {
//     const {
//       to,
//       cc,
//       subject,
//       body,
//       emailAccountId,
//       conversationId,
//       inReplyToId,
//       leadDetailId, // 🔥 ADD THIS
//     } = req.body;

//     // 1️⃣ Validation
//     if (!to || !emailAccountId) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields (to, emailAccountId)",
//       });
//     }

//     // 2️⃣ Fetch Account + User
//     const account = await prisma.emailAccount.findUnique({
//       where: { id: Number(emailAccountId) },
//       include: { User: { select: { name: true } } },
//     });

//     if (!account) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Account not found" });
//     }

//     const authenticatedEmail = account.smtpUser || account.email;

//     // 🔥 FIX: Fallback to email prefix if no senderName
//     // const senderName = account.senderName || authenticatedEmail.split("@")[0];
//     const senderName = account.senderName?.trim() || null;
//     const smtpFrom = senderName
//       ? `"${senderName}" <${authenticatedEmail}>`
//       : `<${authenticatedEmail}>`;
//     // 🧪 DEBUG (TEMPORARY – REMOVE AFTER FIX)
//     console.log("SMTP CONFIG", {
//       host: account.smtpHost,
//       port: account.smtpPort,
//       user: authenticatedEmail,
//       hasPass: !!account.encryptedPass,
//     });

//     /* ============================================================
//        3️⃣ CONVERSATION LOGIC (🔥 FIXED - USE MESSAGE-ID FORMAT)
//     ============================================================ */
//     let finalConversationId = null;

//     // A) If ID provided, verify it exists
//     if (
//       conversationId &&
//       conversationId !== "undefined" &&
//       conversationId !== "null"
//     ) {
//       const exists = await prisma.conversation.findUnique({
//         where: { id: conversationId },
//       });
//       if (exists) {
//         finalConversationId = conversationId;

//         // Update existing conversation
//         await prisma.conversation.update({
//           where: { id: conversationId },
//           data: {
//             lastMessageAt: new Date(),
//             messageCount: { increment: 1 },
//           },
//         });
//       }
//     }
//     // B) Find by recipient email
//     if (!finalConversationId) {
//       const existing = await prisma.conversation.findFirst({
//         where: {
//           OR: [{ toRecipients: to }, { participants: { contains: to } }],
//         },
//         orderBy: { lastMessageAt: "desc" },
//         select: {
//           id: true,
//           leadDetailId: true, // 🔥 IMPORTANT
//         },
//       });

//       if (existing) {
//         finalConversationId = existing.id;

//         await prisma.conversation.update({
//           where: { id: existing.id },
//           data: {
//             lastMessageAt: new Date(),
//             messageCount: { increment: 1 },

//             // 🔥 ATTACH LEAD ONLY IF NOT ALREADY ATTACHED
//             ...(leadDetailId && !existing.leadDetailId
//               ? { leadDetailId: Number(leadDetailId) }
//               : {}),
//           },
//         });
//       }
//     }

//     // C) Create NEW Conversation (🔥 FIX: Use Message-ID format)
//     if (!finalConversationId) {
//       console.log("🆕 Creating new conversation for:", to);

//       // 🔥 CRITICAL FIX: Generate Message-ID format (not UUID)
//       const timestamp = Date.now();
//       const randomPart = crypto.randomBytes(8).toString("hex");
//       const domain = authenticatedEmail.split("@")[1];
//       finalConversationId = `<${timestamp}.${randomPart}@${domain}>`;

//       await prisma.conversation.create({
//         data: {
//           id: finalConversationId, // 🔥 Message-ID format
//           subject: subject || "(No Subject)",
//           participants: `${authenticatedEmail}, ${to}${cc ? `, ${cc}` : ""}`,
//           toRecipients: to,
//           ccRecipients: cc || null,
//           initiatorEmail: authenticatedEmail,
//           lastMessageAt: new Date(),
//           messageCount: 1,
//           unreadCount: 0,
//           leadDetailId: leadDetailId ? Number(leadDetailId) : null, // 🔥 ADD
//         },
//       });
//     }

//     /* ==============================
//        4️⃣ CONFIGURE SMTP
//     ============================== */
//     const smtpPort = Number(account.smtpPort) || 465;
//     const isSecure = smtpPort === 465;

//     // const transporter = nodemailer.createTransport({
//     //   host: account.smtpHost,
//     //   port: smtpPort,

//     //   // 🔥 CRITICAL FOR PORT 587
//     //   secure: false, // must be false for 587
//     //   requireTLS: true, // 👈 REQUIRED on Render

//     //   auth: {
//     //     user: authenticatedEmail,
//     //     pass: account.encryptedPass,
//     //   },

//     //   tls: {
//     //     servername: account.smtpHost, // ✅ MUST MATCH HOST
//     //     rejectUnauthorized: true,
//     //   },
//     // });
//     const transporter = nodemailer.createTransport({
//       host: account.smtpHost,
//       port: Number(account.smtpPort) || 587,

//       secure: Number(account.smtpPort) === 465, // true ONLY for 465
//       requireTLS: Number(account.smtpPort) === 587, // true for 587

//       auth: {
//         user: authenticatedEmail,
//         pass: account.encryptedPass,
//       },

//       tls: {
//         servername: account.smtpHost, // 🔥 FIX
//         rejectUnauthorized: true,
//       },
//     });

//     /* ==============================
//        5️⃣ PREPARE ATTACHMENTS
//     ============================== */
//     const smtpAttachments =
//       req.files?.map((file) => ({
//         filename: file.originalname,
//         content: file.buffer,
//         contentType: file.mimetype,
//       })) || [];

//     const attachmentRecords =
//       req.files?.map((file) => ({
//         filename: file.originalname,
//         mimeType: file.mimetype,
//         size: file.size,
//         storageUrl: "", // TODO: Upload to R2 if needed
//         hash: "",
//       })) || [];
//     /* ==============================
//    🛡️ FIRST EMAIL TRUST GUARD
//    (Silently remove attachments)
// ============================== */
//     let safeAttachments = smtpAttachments;
//     let safeAttachmentRecords = attachmentRecords;

//     if (!inReplyToId && smtpAttachments.length > 0) {
//       console.log("⚠️ First email detected — attachments removed for trust");
//       safeAttachments = [];
//       safeAttachmentRecords = [];
//     }

//     /* ==============================
//        6️⃣ NORMALIZE HTML BODY (🔥 NEW)
//     ============================== */
//     const normalizedBody = normalizeEmailHtml(body);

//     /* ==============================
//    📝 TEXT/PLAIN VERSION (TRUST)
// ============================== */
//     const textVersion = htmlToText(normalizedBody, {
//       wordwrap: 80,
//     });

//     // 🔥 FIX: Proper "From" header with name
//     // const smtpFrom = `"${senderName}" <${authenticatedEmail}>`;

//     /* ==============================
//        7️⃣ GENERATE MESSAGE-ID (🔥 CONSISTENT FORMAT)
//     ============================== */
//     const timestamp = Date.now();
//     const randomPart = crypto.randomBytes(8).toString("hex");
//     const domain = authenticatedEmail.split("@")[1];
//     const generatedMessageId = `<${timestamp}.${randomPart}@${domain}>`;
//     /* ==============================
//    ⏳ HUMAN SEND DELAY (TRUST)
//       ============================== */
//     await new Promise((resolve) =>
//       setTimeout(resolve, 2000 + Math.floor(Math.random() * 2000)),
//     );

//     /* ==============================
//        8️⃣ SEND EMAIL
//     ============================== */
//     const info = await transporter.sendMail({
//       from: smtpFrom, // ✅ Correct (Name <email>)
//       to, // ✅ Required
//       cc, // ✅ Optional
//       subject: (subject || "(No Subject)").replace(/[\r\n]/g, ""), // ✅ Safe

//       html: normalizedBody, // ✅ Correct (formatted HTML)
//       text: textVersion, // ✅ Good for deliverability

//       messageId: generatedMessageId, // ✅ Proper threading
//       inReplyTo: inReplyToId || undefined, // ✅ Replies work
//       references: inReplyToId || undefined, // ✅ Outlook/Gmail threading

//       attachments: safeAttachments, // ✅ Guarded attachments

//       headers: {
//         "Content-Type": "text/html; charset=UTF-8", // ✅ IMPORTANT & correct
//       },
//     });

//     console.log("📤 Email Sent! ID:", info.messageId);

//     /* ==============================
//        9️⃣ SAVE TO DATABASE
//     ============================== */
//     const savedMessage = await prisma.emailMessage.create({
//       data: {
//         emailAccountId: Number(emailAccountId),
//         conversationId: finalConversationId,
//         messageId: generatedMessageId, // 🔥 Use generated ID

//         fromEmail: authenticatedEmail,
//         fromName: senderName, // 🔥 FIX: Always has value

//         toEmail: to,
//         ccEmail: cc || null,
//         subject: subject || "(No Subject)",

//         body: normalizedBody, // 🔥 Save normalized HTML
//         bodyHtml: normalizedBody, // 🔥 Also save in bodyHtml

//         direction: "sent",
//         sentAt: new Date(),
//         folder: "sent",
//         isRead: true,
//         leadDetailId: leadDetailId ? Number(leadDetailId) : null, // 🔥 ADD THIS

//         attachments:
//           safeAttachmentRecords.length > 0
//             ? { create: safeAttachmentRecords }
//             : undefined,
//       },
//       include: { attachments: true },
//     });

//     return res.json({ success: true, data: savedMessage });
//   } catch (error) {
//     console.error("❌ SMTP SEND ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//       details: error.meta || error.message,
//     });
//   }
// });

// export default router;
