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
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
});

// Helper function to pause execution (prevent SMTP rate limiting)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

router.post("/bulk-send", upload.array("attachments"), async (req, res) => {
  try {
    const {
      recipients, // Expecting a JSON string of array: ["email1@test.com", "email2@test.com"]
      subject,
      body,
      emailAccountId,
    } = req.body;

    // 1. Validation
    if (!recipients || !emailAccountId) {
      return res.status(400).json({
        success: false,
        message: "Missing recipients or emailAccountId",
      });
    }

    // Parse recipients (Multipart form-data sends arrays as strings)
    let recipientList = [];
    try {
      recipientList =
        typeof recipients === "string" ? JSON.parse(recipients) : recipients;
    } catch (e) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid recipients format" });
    }

    if (!Array.isArray(recipientList) || recipientList.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Recipients list cannot be empty" });
    }

    // 2. Fetch Sender Account
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
    const senderName = account.senderName || account.User?.name || "Me";

    // 3. Configure SMTP Transporter (Create once, reuse for loop)
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
      pool: true, // 🔥 Use pooled connections for bulk sending
      maxConnections: 5, // Limit concurrent connections
      maxMessages: 100,
    });

    // Verify connection before starting loop
    await transporter.verify();

    // 4. Prepare Attachments (Prepare once)
    const smtpAttachments =
      req.files?.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      })) || [];

    // Results tracking
    const results = {
      successCount: 0,
      failureCount: 0,
      failedEmails: [],
    };

    console.log(
      `🚀 Starting bulk send to ${recipientList.length} recipients from ${authenticatedEmail}`
    );

    // 5. Iterate and Send
    for (const toEmail of recipientList) {
      if (!toEmail || !toEmail.includes("@")) continue;

      try {
        // --- A. Conversation Logic (Per Recipient) ---
        let finalConversationId = null;

        // Check if conversation exists for this specific pair
        const existingConv = await prisma.conversation.findFirst({
          where: {
            AND: [
              { emailAccountId: Number(emailAccountId) },
              { toRecipients: toEmail }, // Strict check on primary recipient
            ],
          },
        });

        if (existingConv) {
          finalConversationId = existingConv.id;
          // Update conversation metadata
          await prisma.conversation.update({
            where: { id: existingConv.id },
            data: {
              lastMessageAt: new Date(),
              messageCount: { increment: 1 },
            },
          });
        } else {
          // Create NEW Conversation
          const newId = crypto.randomUUID();
          const newConv = await prisma.conversation.create({
            data: {
              id: newId,
              emailAccountId: Number(emailAccountId),
              subject: subject || "(No Subject)",
              participants: `${authenticatedEmail}, ${toEmail}`,
              toRecipients: toEmail,
              initiatorEmail: authenticatedEmail,
              lastMessageAt: new Date(),
              messageCount: 1,
              unreadCount: 0,
            },
          });
          finalConversationId = newConv.id;
        }

        // --- B. Send Email via SMTP ---
        const info = await transporter.sendMail({
          from: `"${senderName}" <${authenticatedEmail}>`,
          to: toEmail,
          subject: (subject || "(No Subject)").replace(/[\r\n]/g, ""),
          html: body,
          attachments: smtpAttachments,
        });

        // --- C. Save to Database ---
        // Create attachment metadata records
        const attachmentRecords =
          req.files?.map((file) => ({
            filename: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            storageUrl: "", // Add S3/R2 URL here if you implement cloud storage
          })) || [];

        await prisma.emailMessage.create({
          data: {
            emailAccountId: Number(emailAccountId),
            conversationId: finalConversationId,
            messageId: info.messageId,
            fromEmail: authenticatedEmail,
            fromName: senderName,
            toEmail: toEmail,
            subject: subject || "(No Subject)",
            body: body,
            direction: "sent",
            sentAt: new Date(),
            folder: "sent",
            isRead: true,
            attachments:
              attachmentRecords.length > 0
                ? { create: attachmentRecords }
                : undefined,
          },
        });

        results.successCount++;

        // --- D. Rate Limiting (Crucial for Bulk) ---
        // Sleep for 500ms - 2 seconds between emails to avoid hitting provider spam filters
        await sleep(1000);
      } catch (innerError) {
        console.error(`❌ Failed to send to ${toEmail}:`, innerError.message);
        results.failureCount++;
        results.failedEmails.push({
          email: toEmail,
          error: innerError.message,
        });
      }
    }

    transporter.close(); // Clean up connections

    return res.json({
      success: true,
      message: "Bulk processing complete",
      stats: results,
    });
  } catch (error) {
    console.error("❌ BULK SEND ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
