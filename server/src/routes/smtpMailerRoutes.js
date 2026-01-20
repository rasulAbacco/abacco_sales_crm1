import express from "express";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import crypto from "crypto"; // 👈 ADDED THIS IMPORT

const router = express.Router();
const prisma = new PrismaClient();

// Configure Multer (Memory Storage)
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
      conversationId,
      inReplyToId,
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

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    const authenticatedEmail = account.smtpUser || account.email;
    const senderName = account.User?.name || "Me";

    /* ============================================================
       🧠 CONVERSATION LOGIC (FIXED)
       ============================================================ */
    let finalConversationId = null;

    // A) If ID provided, verify it exists.
    if (
      conversationId &&
      conversationId !== "undefined" &&
      conversationId !== "null"
    ) {
      // Note: Since your DB uses String IDs, we don't wrap this in Number() if it's a UUID
      // But if your frontend sends numeric IDs, check your schema.
      // Based on error, it's a String.
      const exists = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (exists) finalConversationId = conversationId;
    }

    // B) Find by Email
    if (!finalConversationId) {
      // const existing = await prisma.conversation.findFirst({
      //   where: {
      //     AND: [
      //       { emailAccountId: Number(emailAccountId) },
      //       { participants: { contains: to } },
      //     ],
      //   },
      // });
      const existing = await prisma.conversation.findFirst({
        where: {
          OR: [{ toRecipients: to }, { participants: { contains: to } }],
        },
      });

      if (existing) {
        finalConversationId = existing.id;
        // await prisma.conversation.update({
        //   where: { id: existing.id },
        //   data: { lastMessageAt: new Date(), messageCount: { increment: 1 } },
        // });
      await prisma.conversation.update({
        where: { id: existing.id },
        data: {
          lastMessageAt: new Date(),
          messageCount: { increment: 1 },
        },
      });

      } else {
        // C) Create NEW Conversation (FIXED: Added ID)
        console.log("🆕 Creating new conversation for:", to);

        // 🛡️ GENERATE ID MANUALLY
        const newId = crypto.randomUUID();

        // const newConv = await prisma.conversation.create({
        //   data: {
        //     id: newId, // 👈 THE MISSING PIECE!
        //     emailAccountId: Number(emailAccountId),
        //     subject: subject || "(No Subject)",
        //     participants: `${authenticatedEmail}, ${to}`,
        //     toRecipients: to,
        //     initiatorEmail: authenticatedEmail,
        //     lastMessageAt: new Date(),
        //     messageCount: 1,
        //     unreadCount: 0,
        //   },
        // });
        const newConv = await prisma.conversation.create({
          data: {
            id: newId,
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

        finalConversationId = newConv.id;
      }
    }

    /* ==============================
       4. CONFIGURE SMTP
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
      tls: { rejectUnauthorized: false }, // Zoho Fix
    });

    /* ==============================
       5. PREPARE ATTACHMENTS
       ============================== */
    // For Nodemailer (Buffer)
    const smtpAttachments =
      req.files?.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      })) || [];

    // For Database (Metadata only for now, ideally upload to R2 here too)
    const attachmentRecords =
      req.files?.map((file) => ({
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageUrl: "", // Add R2 upload here if needed
        hash: "",
      })) || [];

    /* ==============================
       6. SEND EMAIL
       ============================== */
    const info = await transporter.sendMail({
      from: `"${senderName}" <${authenticatedEmail}>`,
      to,
      cc,
      subject: (subject || "(No Subject)").replace(/[\r\n]/g, ""),
      html: body,
      attachments: smtpAttachments,
      inReplyTo: inReplyToId || undefined,
    });

    console.log("📤 Email Sent! ID:", info.messageId);

    /* ==============================
       7. SAVE TO DATABASE
       ============================== */
    const savedMessage = await prisma.emailMessage.create({
      data: {
        emailAccountId: Number(emailAccountId),
        conversationId: finalConversationId,
        messageId: info.messageId,
        fromEmail: authenticatedEmail,
        fromName: senderName,
        toEmail: to,
        ccEmail: cc || null,
        subject: subject || "(No Subject)",
        body,
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
