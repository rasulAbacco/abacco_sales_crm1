import express from "express";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/send", async (req, res) => {
  try {
    // The frontend now sends 'from', 'to', 'cc', etc.
    const {
      from,
      to,
      cc,
      subject,
      body,
      attachments = [],
      emailAccountId,
    } = req.body;

    // We still validate 'to' and 'emailAccountId', but 'from' is now handled securely below.
    if (!to || !emailAccountId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (to, emailAccountId)",
      });
    }

    const account = await prisma.emailAccount.findUnique({
      where: { id: Number(emailAccountId) },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Email account not found",
      });
    }

    /* ==============================
       1. CONFIGURE TRANSPORTER
       ============================== */
    const smtpPort = Number(account.smtpPort) || 465;
    const isSecure = smtpPort === 465;

    console.log(
      `🔌 Connecting to SMTP: ${account.smtpHost}:${smtpPort} (Secure: ${isSecure})`
    );

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: account.smtpUser || account.email,
        pass: account.encryptedPass,
      },
      logger: true,
      debug: true,
    });

    /* ==============================
       2. VERIFY CONNECTION
       ============================== */
    try {
      await transporter.verify();
      console.log("✅ SMTP Connection Verified");
    } catch (verifyErr) {
      console.error("❌ SMTP Verification Failed:", verifyErr);
      return res.status(400).json({
        success: false,
        message: "SMTP Connection Failed. Check credentials or App Password.",
        details: verifyErr.message,
      });
    }

    /* ==============================
       3. FORMAT ATTACHMENTS (FIXED)
       ============================== */
    // Use 'href' for URLs. Nodemailer will fetch the content.
    const formattedAttachments = attachments.map((att) => ({
      filename: att.filename || att.name,
      href: att.url, // <-- FIX: Use 'href' for URLs
      contentType: att.type || att.mimeType || "application/octet-stream",
    }));

    /* ==============================
       4. SEND EMAIL (FIXED)
       ============================== */
    // CRITICAL: Always use the authenticated account's email for the 'from' address.
    // This prevents a 400/500 error from the SMTP server.
    const authenticatedEmail = account.smtpUser || account.email;

    // Sanitize subject to remove newlines, which can cause errors
    const sanitizedSubject = (subject || "(No Subject)").replace(/[\r\n]/g, "");

    const mailOptions = {
      from: authenticatedEmail, // <-- CRITICAL FIX
      to,
      cc,
      subject: sanitizedSubject, // <-- GOOD PRACTICE
      html: body,
      attachments: formattedAttachments,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("📤 Email Sent! ID:", info.messageId);

    /* ==============================
       5. SAVE TO DATABASE
       ============================== */
    const attachmentsData = attachments.map((att) => ({
      filename: att.filename || att.name,
      mimeType: att.type || att.mimeType,
      size: att.size || null,
      storageUrl: att.url,
      hash: att.hash || null,
    }));

    const savedMessage = await prisma.emailMessage.create({
      data: {
        emailAccountId: Number(emailAccountId),
        messageId: info.messageId,
        fromEmail: authenticatedEmail, // <-- FIX: Save the actual 'from' address used
        toEmail: to,
        ccEmail: cc || null,
        subject: sanitizedSubject, // Save the sanitized subject
        body,
        direction: "sent",
        sentAt: new Date(),

        // UI Flags
        folder: "sent",
        isRead: true,
        isSpam: false,
        isTrash: false,

        attachments: {
          create: attachmentsData,
        },
      },
      include: { attachments: true },
    });

    return res.json({ success: true, data: savedMessage });
  } catch (error) {
    console.error("❌ SMTP SEND ERROR:", error); // Check your server console for the full error
    return res.status(500).json({
      success: false,
      message: "SMTP send failed",
      // The 'details' field will contain the specific error message
      details: error.message,
    });
  }
});

export default router;
