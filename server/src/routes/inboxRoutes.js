import express from "express";
import prisma from "../prismaClient.js";
import sendgrid from "@sendgrid/mail";

const router = express.Router();

// ✅ Configure SendGrid
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

/* ==========================================================
   1️⃣ Fetch Scheduled Follow-Ups (for Inbox)
   ========================================================== */
router.get("/scheduled", async (req, res) => {
  try {
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];

    // Fetch all leads where followUpDate == today
    const leads = await prisma.leadDetails.findMany({
      where: {
        followUpDate: {
          gte: new Date(`${dateString}T00:00:00.000Z`),
          lte: new Date(`${dateString}T23:59:59.999Z`),
        },
        result: "pending",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { followUpDate: "asc" },
    });

    res.json({
      success: true,
      total: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error("❌ Error fetching scheduled follow-ups:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching scheduled follow-ups",
      error: error.message,
    });
  }
});

/* ==========================================================
   📨 6️⃣ Get Inbox View — Today's Assigned Leads + Their Emails
   ========================================================== */
router.get("/inbox/today", async (req, res) => {
  try {
    const now = new Date();

    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );

    // ✅ Fetch leads with today's followUpDate
    const leads = await prisma.leadDetails.findMany({
      where: {
        result: "pending",
        followUpDate: {
          not: null,
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        messages: {
          include: {
            emailAccount: true,
          },
          orderBy: { sentAt: "desc" },
        },
      },
      orderBy: { followUpDate: "asc" },
    });

    // Flatten for easier inbox display
    const inboxItems = leads.map((lead) => ({
      leadId: lead.id,
      client: lead.client,
      email: lead.email,
      subject: lead.subject,
      followUpDate: lead.followUpDate,
      brand: lead.brand,
      country: lead.country,
      salesperson: lead.salesperson,
      messages: lead.messages,
    }));

    res.json({
      success: true,
      total: inboxItems.length,
      data: inboxItems,
    });
  } catch (error) {
    console.error("❌ Error fetching inbox data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inbox data",
      error: error.message,
    });
  }
});

/**
 * ✅ Get today's scheduled follow-ups (auto daily)
 */
router.get("/today", async (req, res) => {
  try {
    const now = new Date();

    // Start and end of current local day
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );

    // ✅ Fetch today's leads from LeadDetails
    const leads = await prisma.leadDetails.findMany({
      where: {
        result: "pending", // only pending follow-ups
        followUpDate: {
          not: null,
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        followUpDate: "asc",
      },
      select: {
        id: true,
        client: true,
        email: true,
        day: true,
        followUpDate: true,
      },
    });

    res.json({ success: true, data: leads });
  } catch (error) {
    console.error("❌ Error fetching today's leads:", error);
    res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
});

/* ==========================================================
   2️⃣ Fetch All Conversations (Inbox Left Side)
   ========================================================== */
router.get("/conversations", async (req, res) => {
  try {
    const messages = await prisma.emailMessage.findMany({
      include: {
        leadDetail: true,
        emailAccount: {
          select: { id: true, email: true, provider: true },
        },
      },
      orderBy: { sentAt: "desc" },
    });

    // Group by client email for left panel
    const grouped = {};
    messages.forEach((msg) => {
      const key = msg.toEmail || msg.fromEmail;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(msg);
    });

    res.json({
      success: true,
      total: Object.keys(grouped).length,
      data: grouped,
    });
  } catch (error) {
    console.error("❌ Error fetching conversations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching conversations",
      error: error.message,
    });
  }
});

/* ==========================================================
   3️⃣ Send New Email (SendGrid)
   ========================================================== */
router.post("/send", async (req, res) => {
  try {
    const {
      fromEmail,
      toEmail,
      subject,
      body,
      ccEmail,
      emailAccountId,
      leadDetailId,
    } = req.body;

    if (!fromEmail || !toEmail || !subject || !body) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required email fields." });
    }

    // ✅ Send Email using SendGrid
    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: subject,
      html: body,
    };

    if (ccEmail) msg.cc = ccEmail;

    await sendgrid.send(msg);

    // ✅ Save to DB as sent message
    const sentMessage = await prisma.emailMessage.create({
      data: {
        emailAccountId: Number(emailAccountId),
        leadDetailId: Number(leadDetailId),
        fromEmail,
        toEmail,
        ccEmail,
        subject,
        body,
        direction: "sent",
        sentAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Email sent successfully!",
      data: sentMessage,
    });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({
      success: false,
      message: "Error sending email",
      error: error.message,
    });
  }
});

/* ==========================================================
   4️⃣ Get Conversation by Client Email (For Inbox Chat View)
   ========================================================== */
router.get("/conversation/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const conversation = await prisma.emailMessage.findMany({
      where: {
        OR: [{ toEmail: email }, { fromEmail: email }],
      },
      include: {
        leadDetail: true,
        emailAccount: true,
      },
      orderBy: { sentAt: "asc" },
    });

    res.json({
      success: true,
      total: conversation.length,
      data: conversation,
    });
  } catch (error) {
    console.error("❌ Error fetching conversation:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching conversation",
      error: error.message,
    });
  }
});

/* ==========================================================
   5️⃣ Create New Email Account (Optional - For "Accounts" Tab)
   ========================================================== */
router.post("/account", async (req, res) => {
  try {
    const { userId, email, provider, apiKey, smtpHost, smtpPort, isPrimary } =
      req.body;

    const account = await prisma.emailAccount.create({
      data: {
        userId: Number(userId),
        email,
        provider,
        apiKey,
        smtpHost,
        smtpPort,
        verified: false,
        isPrimary: !!isPrimary,
      },
    });

    res.json({
      success: true,
      message: "Email account added successfully.",
      data: account,
    });
  } catch (error) {
    console.error("❌ Error adding account:", error);
    res.status(500).json({
      success: false,
      message: "Error adding email account",
      error: error.message,
    });
  }
});

export default router;
