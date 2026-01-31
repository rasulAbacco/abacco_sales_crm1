import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import prisma from "../prismaClient.js";

dotenv.config();

const router = express.Router();

const SENDGRID_API = "https://api.sendgrid.com/v3";
const SENDGRID_KEY = process.env.SENDGRID_API_KEY; // 🔑 from .env

// 🟩 Create new sender + send verification email
router.post("/account", async (req, res) => {
  try {
    const { email } = req.body;

    const payload = {
      address: "123 Business Street",
      city: "Bengaluru",
      country: "IN",
      from: { email },
      nickname: email,
      reply_to: { email },
    };

    const sgRes = await fetch(`${SENDGRID_API}/senders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const sgData = await sgRes.json();

    if (!sgRes.ok) {
      console.error("SendGrid error:", sgData);
      return res.status(400).json({
        success: false,
        message: sgData.errors?.[0]?.message || "Failed to create sender",
      });
    }

    const newAcc = await prisma.emailAccount.create({
      data: {
        userId: 1, // Replace with logged-in user ID
        email,
        provider: "SendGrid",
        verified: false,
        sendgridSenderId: sgData.id,
        isPrimary: false,
      },
    });

    res.json({
      success: true,
      message: "✅ Sender added. Verification email sent via SendGrid.",
      data: newAcc,
    });
  } catch (err) {
    console.error("Error creating sender:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🟩 Check sender verification status
router.post("/verify/:id", async (req, res) => {
  try {
    const acc = await prisma.emailAccount.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!acc) return res.json({ success: false, message: "Sender not found" });

    const res2 = await fetch(`${SENDGRID_API}/senders/${acc.sendgridSenderId}`, {
      headers: { Authorization: `Bearer ${SENDGRID_KEY}` },
    });
    const data = await res2.json();

    const updated = await prisma.emailAccount.update({
      where: { id: acc.id },
      data: { verified: !!data.verified },
    });

    res.json({
      success: true,
      message: updated.verified
        ? "✅ Sender is verified!"
        : "⏳ Still pending verification. Please check your inbox.",
      data: updated,
    });
  } catch (err) {
    console.error("Verification check error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🟩 Get all SendGrid accounts (for current user)
router.get("/accounts", async (req, res) => {
  try {
    const accounts = await prisma.emailAccount.findMany({
      where: { provider: "SendGrid", userId: 1 },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching accounts" });
  }
});

// 🟩 Send email using verified SendGrid sender
router.post("/send", async (req, res) => {
  try {
    const { emailAccountId, fromEmail, toEmail, subject, body } = req.body;
    const acc = await prisma.emailAccount.findUnique({
      where: { id: Number(emailAccountId) },
    });

    if (!acc?.verified) {
      return res.json({ success: false, message: "Sender not verified yet" });
    }

    const sgRes = await fetch(`${SENDGRID_API}/mail/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }], subject }],
        from: { email: fromEmail },
        content: [{ type: "text/plain", value: body }],
      }),
    });

    if (!sgRes.ok) {
      const errText = await sgRes.text();
      console.error("SendGrid send failed:", errText);
      return res.json({ success: false, message: "SendGrid send failed" });
    }

    const saved = await prisma.emailMessage.create({
      data: {
        emailAccountId: acc.id,
        fromEmail,
        toEmail,
        subject,
        body,
        direction: "sent",
      },
    });

    res.json({ success: true, data: saved });
  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({ success: false, message: "Send error" });
  }
});

// 🟩 Get conversation
router.get("/conversation/:email", async (req, res) => {
  try {
    const msgs = await prisma.emailMessage.findMany({
      where: { toEmail: req.params.email },
      orderBy: { sentAt: "asc" },
    });
    res.json({ success: true, data: msgs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error loading conversation" });
  }
});

// 🟩 Mock today's follow-ups
router.get("/followups/today", async (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, client: "Arun Kumar", email: "arun@client.com" },
      { id: 2, client: "Zara Ali", email: "zara@client.com" },
    ],
  });
});

export default router;
