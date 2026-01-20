// src/routes/emailRoutes.js
import express from "express";
import sgMail from "@sendgrid/mail";
import  prisma  from "../prismaClient.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const router = express.Router();

router.post("/send", async (req, res) => {
  try {
    const { userId, fromEmail, to, cc, subject, body } = req.body;

    console.log("📩 Incoming Email Request:", { fromEmail, to, subject });

    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is missing from .env");
    }

    if (!fromEmail || !to || !subject || !body) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const msg = {
      to,
      from: fromEmail,
      subject,
      html: body,
      ...(cc && { cc }),
    };

    console.log("🟢 Sending via SendGrid:", msg);

    await sgMail.send(msg);

    await prisma.emailMessage.create({
      data: {
        fromEmail,
        toEmail: to,
        ccEmail: cc,
        subject,
        body,
        direction: "sent",
        sentAt: new Date(),
      },
    });

    res.json({ success: true, message: "✅ Email sent successfully via SendGrid!" });
  } catch (error) {
    console.error("❌ SendGrid Error:", error.response?.body || error.message);

    res.status(500).json({
      success: false,
      message: "Failed to send or store email",
      error: error.response?.body || error.message,
    });
  }
});

router.get("/accounts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const account = await prisma.emailAccount.findMany({
      where: { userId: id },
      select: {
        id: true,
        email: true,
        provider: true,
        smtpHost: true,
        smtpPort: true,
        imapHost: true,
        imapPort: true,
        verified: true,
        createdAt: true,
      },
    });
    res.json(account);
  } catch (err) {
    console.error("❌ Error fetching email accounts:", err);
    res.status(500).json({ error: "Failed to fetch email accounts" });
  }
});


export default router;
