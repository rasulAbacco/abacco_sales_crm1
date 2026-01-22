import express from "express";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import crypto from "crypto";

const router = express.Router();
const prisma = new PrismaClient();

// Configure Multer (Memory Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

// 🔥 NEW: HTML Normalization Function
const normalizeEmailHtml = (html) => {
  if (!html) return "";

  return (
    html
      // Remove Outlook-specific junk
      .replace(/<o:p>.*?<\/o:p>/gi, "")
      // Add default paragraph spacing
      .replace(
        /<p>/gi,
        '<p style="margin:0 0 12px 0;line-height:1.15;font-family:Calibri,Arial,sans-serif;font-size:11pt;">',
      )
      .replace(
        /<div>/gi,
        '<div style="margin:0;line-height:1.15;font-family:Calibri,Arial,sans-serif;font-size:11pt;">',
      )
      // Collapse excessive breaks
      .replace(/<br>\s*<br>/gi, "<br>")
      // Remove empty blocks
      .replace(/<p[^>]*>\s*<\/p>/gi, "")
      .replace(/<div[^>]*>\s*<\/div>/gi, "")
      // Ensure there's a wrapper if missing
      .trim()
  );
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
    } = req.body;

    // 1️⃣ Validation
    if (!to || !emailAccountId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (to, emailAccountId)",
      });
    }

    // 2️⃣ Fetch Account + User
    const account = await prisma.emailAccount.findUnique({
      where: { id: Number(emailAccountId) },
      include: { User: { select: { name: true } } },
    });

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    const authenticatedEmail = account.smtpUser || account.email;

    // 🔥 FIX: Fallback to email prefix if no senderName
    const senderName =
      account.senderName ||
      account.User?.name ||
      authenticatedEmail.split("@")[0];

    /* ============================================================
       3️⃣ CONVERSATION LOGIC (🔥 FIXED - USE MESSAGE-ID FORMAT)
    ============================================================ */
    let finalConversationId = null;

    // A) If ID provided, verify it exists
    if (
      conversationId &&
      conversationId !== "undefined" &&
      conversationId !== "null"
    ) {
      const exists = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (exists) {
        finalConversationId = conversationId;

        // Update existing conversation
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: new Date(),
            messageCount: { increment: 1 },
          },
        });
      }
    }

    // B) Find by recipient email
    if (!finalConversationId) {
      const existing = await prisma.conversation.findFirst({
        where: {
          OR: [{ toRecipients: to }, { participants: { contains: to } }],
        },
        orderBy: { lastMessageAt: "desc" },
      });

      if (existing) {
        finalConversationId = existing.id;

        await prisma.conversation.update({
          where: { id: existing.id },
          data: {
            lastMessageAt: new Date(),
            messageCount: { increment: 1 },
          },
        });
      }
    }

    // C) Create NEW Conversation (🔥 FIX: Use Message-ID format)
    if (!finalConversationId) {
      console.log("🆕 Creating new conversation for:", to);

      // 🔥 CRITICAL FIX: Generate Message-ID format (not UUID)
      const timestamp = Date.now();
      const randomPart = crypto.randomBytes(8).toString("hex");
      const domain = authenticatedEmail.split("@")[1];
      finalConversationId = `<${timestamp}.${randomPart}@${domain}>`;

      await prisma.conversation.create({
        data: {
          id: finalConversationId, // 🔥 Message-ID format
          subject: subject || "(No Subject)",
          participants: `${authenticatedEmail}, ${to}${cc ? `, ${cc}` : ""}`,
          toRecipients: to,
          ccRecipients: cc || null,
          initiatorEmail: authenticatedEmail,
          lastMessageAt: new Date(),
          messageCount: 1,
          unreadCount: 0,
        },
      });
    }

    /* ==============================
       4️⃣ CONFIGURE SMTP
    ============================== */
    const smtpPort = Number(account.smtpPort) || 465;
    const isSecure = smtpPort === 465;

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: authenticatedEmail,
        pass: account.encryptedPass,
      },
      tls: { rejectUnauthorized: false },
    });

    /* ==============================
       5️⃣ PREPARE ATTACHMENTS
    ============================== */
    const smtpAttachments =
      req.files?.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      })) || [];

    const attachmentRecords =
      req.files?.map((file) => ({
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageUrl: "", // TODO: Upload to R2 if needed
        hash: "",
      })) || [];

    /* ==============================
       6️⃣ NORMALIZE HTML BODY (🔥 NEW)
    ============================== */
    const normalizedBody = normalizeEmailHtml(body);

    // 🔥 FIX: Proper "From" header with name
    const smtpFrom = `"${senderName}" <${authenticatedEmail}>`;

    /* ==============================
       7️⃣ GENERATE MESSAGE-ID (🔥 CONSISTENT FORMAT)
    ============================== */
    const timestamp = Date.now();
    const randomPart = crypto.randomBytes(8).toString("hex");
    const domain = authenticatedEmail.split("@")[1];
    const generatedMessageId = `<${timestamp}.${randomPart}@${domain}>`;

    /* ==============================
       8️⃣ SEND EMAIL
    ============================== */
    const info = await transporter.sendMail({
      from: smtpFrom, // 🔥 FIX: Include sender name
      to,
      cc,
      subject: (subject || "(No Subject)").replace(/[\r\n]/g, ""),
      html: normalizedBody, // 🔥 FIX: Use normalized HTML
      messageId: generatedMessageId, // 🔥 FIX: Consistent Message-ID
      attachments: smtpAttachments,
      inReplyTo: inReplyToId || undefined,
      references: inReplyToId || undefined,
    });

    console.log("📤 Email Sent! ID:", info.messageId);

    /* ==============================
       9️⃣ SAVE TO DATABASE
    ============================== */
    const savedMessage = await prisma.emailMessage.create({
      data: {
        emailAccountId: Number(emailAccountId),
        conversationId: finalConversationId,
        messageId: generatedMessageId, // 🔥 Use generated ID

        fromEmail: authenticatedEmail,
        fromName: senderName, // 🔥 FIX: Always has value

        toEmail: to,
        ccEmail: cc || null,
        subject: subject || "(No Subject)",

        body: normalizedBody, // 🔥 Save normalized HTML
        bodyHtml: normalizedBody, // 🔥 Also save in bodyHtml

        direction: "sent",
        sentAt: new Date(),
        folder: "sent",
        isRead: true,

        attachments:
          attachmentRecords.length > 0
            ? { create: attachmentRecords }
            : undefined,
      },
      include: { attachments: true },
    });

    return res.json({ success: true, data: savedMessage });
  } catch (error) {
    console.error("❌ SMTP SEND ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      details: error.meta || error.message,
    });
  }
});

export default router;

// import express from "express";
// import nodemailer from "nodemailer";
// import { PrismaClient } from "@prisma/client";
// import multer from "multer";
// import crypto from "crypto"; // 👈 ADDED THIS IMPORT

// const router = express.Router();
// const prisma = new PrismaClient();

// // Configure Multer (Memory Storage)
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
// });

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
//     } = req.body;

//     // 1. Validation
//     if (!to || !emailAccountId) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields (to, emailAccountId)",
//       });
//     }

//     // 2. Fetch Account
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
//     const senderName = account.User?.name || "Me";

//     /* ============================================================
//        🧠 CONVERSATION LOGIC (FIXED)
//        ============================================================ */
//     let finalConversationId = null;

//     // A) If ID provided, verify it exists.
//     if (
//       conversationId &&
//       conversationId !== "undefined" &&
//       conversationId !== "null"
//     ) {
//       // Note: Since your DB uses String IDs, we don't wrap this in Number() if it's a UUID
//       // But if your frontend sends numeric IDs, check your schema.
//       // Based on error, it's a String.
//       const exists = await prisma.conversation.findUnique({
//         where: { id: conversationId },
//       });
//       if (exists) finalConversationId = conversationId;
//     }

//     // B) Find by Email
//     if (!finalConversationId) {
//       // const existing = await prisma.conversation.findFirst({
//       //   where: {
//       //     AND: [
//       //       { emailAccountId: Number(emailAccountId) },
//       //       { participants: { contains: to } },
//       //     ],
//       //   },
//       // });
//       const existing = await prisma.conversation.findFirst({
//         where: {
//           OR: [{ toRecipients: to }, { participants: { contains: to } }],
//         },
//       });

//       if (existing) {
//         finalConversationId = existing.id;
//         // await prisma.conversation.update({
//         //   where: { id: existing.id },
//         //   data: { lastMessageAt: new Date(), messageCount: { increment: 1 } },
//         // });
//       await prisma.conversation.update({
//         where: { id: existing.id },
//         data: {
//           lastMessageAt: new Date(),
//           messageCount: { increment: 1 },
//         },
//       });

//       } else {
//         // C) Create NEW Conversation (FIXED: Added ID)
//         console.log("🆕 Creating new conversation for:", to);

//         // 🛡️ GENERATE ID MANUALLY
//         const newId = crypto.randomUUID();

//         const newConv = await prisma.conversation.create({
//           data: {
//             id: newId,
//             subject: subject || "(No Subject)",
//             participants: `${authenticatedEmail}, ${to}${cc ? `, ${cc}` : ""}`,
//             toRecipients: to,
//             ccRecipients: cc || null,
//             initiatorEmail: authenticatedEmail,
//             lastMessageAt: new Date(),
//             messageCount: 1,
//             unreadCount: 0,
//           },
//         });

//         finalConversationId = newConv.id;
//       }
//     }

//     /* ==============================
//        4. CONFIGURE SMTP
//        ============================== */
//     const smtpPort = Number(account.smtpPort) || 465;
//     const isSecure = smtpPort === 465;

//     const transporter = nodemailer.createTransport({
//       host: account.smtpHost,
//       port: smtpPort,
//       secure: isSecure,
//       auth: {
//         user: authenticatedEmail,
//         pass: account.encryptedPass,
//       },
//       tls: { rejectUnauthorized: false }, // Zoho Fix
//     });

//     /* ==============================
//        5. PREPARE ATTACHMENTS
//        ============================== */
//     // For Nodemailer (Buffer)
//     const smtpAttachments =
//       req.files?.map((file) => ({
//         filename: file.originalname,
//         content: file.buffer,
//         contentType: file.mimetype,
//       })) || [];

//     // For Database (Metadata only for now, ideally upload to R2 here too)
//     const attachmentRecords =
//       req.files?.map((file) => ({
//         filename: file.originalname,
//         mimeType: file.mimetype,
//         size: file.size,
//         storageUrl: "", // Add R2 upload here if needed
//         hash: "",
//       })) || [];

//     /* ==============================
//        6. SEND EMAIL
//        ============================== */
//     const info = await transporter.sendMail({
//       from: `"${senderName}" <${authenticatedEmail}>`,
//       to,
//       cc,
//       subject: (subject || "(No Subject)").replace(/[\r\n]/g, ""),
//       html: body,
//       attachments: smtpAttachments,
//       inReplyTo: inReplyToId || undefined,
//     });

//     console.log("📤 Email Sent! ID:", info.messageId);

//     /* ==============================
//        7. SAVE TO DATABASE
//        ============================== */
//     const savedMessage = await prisma.emailMessage.create({
//       data: {
//         emailAccountId: Number(emailAccountId),
//         conversationId: finalConversationId,
//         messageId: info.messageId,
//         fromEmail: authenticatedEmail,
//         fromName: senderName,
//         toEmail: to,
//         ccEmail: cc || null,
//         subject: subject || "(No Subject)",
//         body,
//         direction: "sent",
//         sentAt: new Date(),
//         folder: "sent",
//         isRead: true,
//         attachments:
//           attachmentRecords.length > 0
//             ? { create: attachmentRecords }
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
