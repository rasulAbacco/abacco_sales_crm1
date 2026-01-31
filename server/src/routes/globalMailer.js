import express from "express";
import prisma from "../prismaClient.js";
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();




// ✅ Initialize SendGrid (for scheduled emails / reminders)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/* ============================================================
   ✅ POST /api/mail/send
   Sends email:
   1️⃣ Via SMTP — Gmail, GSuite, Zoho, Bluehost (preferred)
   2️⃣ Via SendGrid fallback — for reminders / schedules
   ============================================================ */
router.post("/send", async (req, res) => {
  try {
    const {
      from,
      to,
      cc,
      subject,
      body,
      attachments = [],
      emailAccountId,
      fromName,
    } = req.body;

    if (!from || !to || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (from, to, subject, body)",
      });
    }

    /* ============================================================
       🧩 Step 1: Normalize attachments (URLs → Base64)
       ============================================================ */
    const preparedAttachments = await Promise.all(
      attachments.map(async (att) => {
        if (att.content) {
          return {
            filename: att.name || att.filename || "file",
            content: att.content,
            type: att.type || "application/octet-stream",
            disposition: "attachment",
          };
        }

        if (att.url) {
          try {
            const resp = await fetch(att.url);
            const buf = await resp.arrayBuffer();
            return {
              filename: att.name || att.filename || "file",
              content: Buffer.from(buf).toString("base64"),
              type: att.type || "application/octet-stream",
              disposition: "attachment",
            };
          } catch (err) {
            console.error(`⚠️ Failed to fetch attachment: ${att.url}`, err);
            return null;
          }
        }

        return null;
      })
    ).then((arr) => arr.filter(Boolean));

    /* ============================================================
       ✅ Step 2: Try direct SMTP if account provided
       ============================================================ */
    if (emailAccountId) {
      const account = await prisma.emailAccount.findUnique({
        where: { id: Number(emailAccountId) },
      });

      if (!account) {
        return res
          .status(404)
          .json({ success: false, message: "Email account not found" });
      }

      console.log(`📤 Sending via SMTP (${account.smtpHost})`);

      // ✅ Works for Gmail, GSuite, Zoho, Bluehost
      const smtpUser = (account.smtpUser || account.email || "").trim();
      const smtpPass = (account.encryptedPass || "").trim();

      if (!smtpUser || !smtpPass) {
        return res.status(400).json({
          success: false,
          message: "Missing SMTP credentials (username or password)",
        });
      }

      const transporter = nodemailer.createTransport({
        host: account.smtpHost,
        port: account.smtpPort || 465,
        secure: (account.smtpPort || 465) === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      const mailOptions = {
        from: `${fromName || account.email} <${from}>`,
        to,
        cc,
        subject,
        html: body,
        attachments: preparedAttachments.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, "base64"),
          contentType: a.type,
        })),
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("✅ SMTP sent:", info.messageId);

      await prisma.emailMessage.create({
        data: {
          emailAccountId: account.id,
          fromEmail: from,
          toEmail: to,
          ccEmail: cc || null,
          subject,
          body,
          direction: "sent",
          sentAt: new Date(),
        },
      });

      return res.json({
        success: true,
        method: "SMTP",
        message: `Email sent successfully via ${account.provider}`,
      });
    }

    /* ============================================================
       🟡 Step 3: Fallback — SendGrid (for reminders/scheduled)
       ============================================================ */
    console.log("📤 Sending via SendGrid fallback...");

    const msg = {
      to,
      from: { email: from, name: fromName || from.split("@")[0] },
      cc: cc || undefined,
      subject,
      html: body,
      attachments:
        preparedAttachments.length > 0 ? preparedAttachments : undefined,
    };

    await sgMail.send(msg);
    console.log("✅ Sent via SendGrid");

    await prisma.emailMessage.create({
      data: {
        fromEmail: from,
        toEmail: to,
        ccEmail: cc || null,
        subject,
        body,
        direction: "sent",
        sentAt: new Date(),
      },
    });

    return res.json({
      success: true,
      method: "SendGrid",
      message: "Email sent successfully via SendGrid",
    });
  } catch (err) {
    console.error("❌ Global Mail Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: err.message,
    });
  }
});

export default router;




