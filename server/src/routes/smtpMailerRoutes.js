import express from "express";
import nodemailer from "nodemailer";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
// Ensure these imports exist in your project
import { uploadToR2WithHash, generateHash } from "../services/r2.js";

const router = express.Router();
const prisma = new PrismaClient();

/* =====================================================
   MULTER CONFIG (Memory Storage for R2)
===================================================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

router.post("/send", upload.array("attachments"), async (req, res) => {
  try {
    const {
      to,
      cc,
      subject,
      body,
      emailAccountId,
      conversationId, // ✅ Use the ID from Frontend if available
      inReplyToId, // Optional: For threading headers
    } = req.body;

    // 1. Validation
    if (!to || !emailAccountId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (to, emailAccountId)",
      });
    }

    // 2. Fetch Account
    const account = await prisma.emailAccount.findUnique({
      where: { id: Number(emailAccountId) },
      include: { User: { select: { name: true } } },
    });

    if (!account || !account.smtpHost || !account.encryptedPass) {
      return res
        .status(400)
        .json({ success: false, message: "SMTP not configured" });
    }

    const authenticatedEmail = account.smtpUser || account.email;
    const senderName = account.User?.name || "Me";

    /* =====================================================
       🔥 THREADING LOGIC: Find or Create Conversation (Int)
       ===================================================== */
    let finalConversationId = conversationId ? Number(conversationId) : null;

    // A. Verify ID if provided
    if (finalConversationId) {
      const exists = await prisma.conversation.findUnique({
        where: { id: finalConversationId },
      });
      if (!exists) finalConversationId = null;
    }

    // B. Find by Email (If no ID provided)
    if (!finalConversationId) {
      const existing = await prisma.conversation.findFirst({
        where: {
          AND: [
            { emailAccountId: Number(emailAccountId) },
            { participants: { contains: to } }, // Simple check
          ],
        },
      });

      if (existing) {
        finalConversationId = existing.id;
        // Update timestamp
        await prisma.conversation.update({
          where: { id: existing.id },
          data: { lastMessageAt: new Date(), messageCount: { increment: 1 } },
        });
      } else {
        // C. Create New Conversation (Let DB auto-increment ID)
        const newConv = await prisma.conversation.create({
          data: {
            emailAccountId: Number(emailAccountId),
            subject: subject || "(No Subject)",
            participants: `${authenticatedEmail}, ${to}`,
            toRecipients: to,
            initiatorEmail: authenticatedEmail,
            lastMessageAt: new Date(),
            messageCount: 1,
            unreadCount: 0,
          },
        });
        finalConversationId = newConv.id;
      }
    }

    /* =====================================================
       📎 PREPARE ATTACHMENTS (Buffer for SMTP + R2)
       ===================================================== */
    // For Nodemailer
    const smtpAttachments =
      req.files?.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      })) || [];

    // For Database/R2
    const attachmentRecords = [];
    if (req.files?.length) {
      for (const file of req.files) {
        // 1. Generate Hash
        const hash = generateHash(file.buffer);
        const uniqueHash = `${hash}-${account.id}-${Date.now()}`;

        // 2. Upload to R2
        const storageUrl = await uploadToR2WithHash(
          file.buffer,
          file.mimetype,
          uniqueHash
        );

        // 3. Prepare DB Record
        attachmentRecords.push({
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          storageUrl, // Store R2 URL
          hash,
        });
      }
    }

    /* =====================================================
       🚀 SEND EMAIL VIA SMTP (FIXED FOR ZOHO)
       ===================================================== */
    const smtpPort = Number(account.smtpPort) || 465;
    const isSecure = smtpPort === 465; // True for 465, False for 587

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: authenticatedEmail,
        pass: account.encryptedPass,
      },
      // 🔥 CRITICAL FIX FOR ZOHO:
      tls: {
        // Don't fail if the cert chain is weird
        rejectUnauthorized: false,
        // Force older cipher support if needed
        ciphers: "SSLv3",
      },
    });

    const info = await transporter.sendMail({
      from: `"${senderName}" <${authenticatedEmail}>`,
      to,
      cc,
      subject: (subject || "(No Subject)").replace(/[\r\n]/g, ""),
      html: body,
      attachments: smtpAttachments,
      inReplyTo: inReplyToId || undefined,
      references: inReplyToId || undefined,
    });

    console.log("📤 Sent:", info.messageId);

    /* =====================================================
       💾 SAVE TO DATABASE
       ===================================================== */
    const savedMessage = await prisma.emailMessage.create({
      data: {
        emailAccountId: Number(emailAccountId),
        conversationId: finalConversationId, // ✅ Linked Correctly
        messageId: info.messageId,
        subject: subject || "(No Subject)",
        fromEmail: authenticatedEmail,
        fromName: senderName,
        toEmail: to,
        ccEmail: cc || null,
        body,
        direction: "sent",
        folder: "sent",
        sentAt: new Date(),
        isRead: true,
        // Attachments
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
    // Return specific error so we know if it's Auth or Connection
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

// import express from "express";
// import nodemailer from "nodemailer";
// import { PrismaClient } from "@prisma/client";

// const router = express.Router();
// const prisma = new PrismaClient();

// router.post("/send", async (req, res) => {
//   try {
//     // The frontend now sends 'from', 'to', 'cc', etc.
//     const {
//       from,
//       to,
//       cc,
//       subject,
//       body,
//       attachments = [],
//       emailAccountId,
//     } = req.body;

//     // We still validate 'to' and 'emailAccountId', but 'from' is now handled securely below.
//     if (!to || !emailAccountId) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields (to, emailAccountId)",
//       });
//     }

//     const account = await prisma.emailAccount.findUnique({
//       where: { id: Number(emailAccountId) },
//     });

//     if (!account) {
//       return res.status(404).json({
//         success: false,
//         message: "Email account not found",
//       });
//     }

//     /* ==============================
//        1. CONFIGURE TRANSPORTER
//        ============================== */
//     const smtpPort = Number(account.smtpPort) || 465;
//     const isSecure = smtpPort === 465;

//     console.log(
//       `🔌 Connecting to SMTP: ${account.smtpHost}:${smtpPort} (Secure: ${isSecure})`
//     );

//     const transporter = nodemailer.createTransport({
//       host: account.smtpHost,
//       port: smtpPort,
//       secure: isSecure,
//       auth: {
//         user: account.smtpUser || account.email,
//         pass: account.encryptedPass,
//       },
//       logger: true,
//       debug: true,
//     });

//     /* ==============================
//        2. VERIFY CONNECTION
//        ============================== */
//     try {
//       await transporter.verify();
//       console.log("✅ SMTP Connection Verified");
//     } catch (verifyErr) {
//       console.error("❌ SMTP Verification Failed:", verifyErr);
//       return res.status(400).json({
//         success: false,
//         message: "SMTP Connection Failed. Check credentials or App Password.",
//         details: verifyErr.message,
//       });
//     }

//     /* ==============================
//        3. FORMAT ATTACHMENTS (FIXED)
//        ============================== */
//     // Use 'href' for URLs. Nodemailer will fetch the content.
//     const formattedAttachments = attachments.map((att) => ({
//       filename: att.filename || att.name,
//       href: att.url, // <-- FIX: Use 'href' for URLs
//       contentType: att.type || att.mimeType || "application/octet-stream",
//     }));

//     /* ==============================
//        4. SEND EMAIL (FIXED)
//        ============================== */
//     // CRITICAL: Always use the authenticated account's email for the 'from' address.
//     // This prevents a 400/500 error from the SMTP server.
//     const authenticatedEmail = account.smtpUser || account.email;

//     // Sanitize subject to remove newlines, which can cause errors
//     const sanitizedSubject = (subject || "(No Subject)").replace(/[\r\n]/g, "");

//     const mailOptions = {
//       from: authenticatedEmail, // <-- CRITICAL FIX
//       to,
//       cc,
//       subject: sanitizedSubject, // <-- GOOD PRACTICE
//       html: body,
//       attachments: formattedAttachments,
//     };

//     const info = await transporter.sendMail(mailOptions);

//     console.log("📤 Email Sent! ID:", info.messageId);

//     /* ==============================
//        5. SAVE TO DATABASE
//        ============================== */
//     const attachmentsData = attachments.map((att) => ({
//       filename: att.filename || att.name,
//       mimeType: att.type || att.mimeType,
//       size: att.size || null,
//       storageUrl: att.url,
//       hash: att.hash || null,
//     }));

//     const savedMessage = await prisma.emailMessage.create({
//       data: {
//         emailAccountId: Number(emailAccountId),
//         messageId: info.messageId,
//         fromEmail: authenticatedEmail, // <-- FIX: Save the actual 'from' address used
//         toEmail: to,
//         ccEmail: cc || null,
//         subject: sanitizedSubject, // Save the sanitized subject
//         body,
//         direction: "sent",
//         sentAt: new Date(),

//         // UI Flags
//         folder: "sent",
//         isRead: true,
//         isSpam: false,
//         isTrash: false,

//         attachments: {
//           create: attachmentsData,
//         },
//       },
//       include: { attachments: true },
//     });

//     return res.json({ success: true, data: savedMessage });
//   } catch (error) {
//     console.error("❌ SMTP SEND ERROR:", error); // Check your server console for the full error
//     return res.status(500).json({
//       success: false,
//       message: "SMTP send failed",
//       // The 'details' field will contain the specific error message
//       details: error.message,
//     });
//   }
// });

// export default router;
