// server.js
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import prisma from "./src/prismaClient.js";
import fs from "fs";

/* ==========================================================
   🛡️ GLOBAL ERROR GUARD - Prevent App Crashing
   Add this at the top to catch errors before they kill the process
========================================================== */
process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 UNHANDLED REJECTION:", reason);
  // This prevents the "Unhandled 'error' event" crash
});

process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err.message);
  // Keeps server online during Socket timeouts
});

import { initSocket } from "./socket.js";
import { runSync, runSyncForAccount } from "./src/services/imapSync.js";
import { protect } from "./src/middlewares/authMiddleware.js";

const app = express();
const server = http.createServer(app);

/* ==========================================================
   🌍 CORS CONFIG
========================================================== */
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
  : [
      "http://localhost:5175",
      "https://abaccosales.onrender.com",
      "https://sales.clienthubsolutions.com",
    ];

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

console.log("🌍 Allowed CORS Origins:", CLIENT_ORIGIN);

/* ==========================================================
   📦 Body parsing (increased limits for IMAP / uploads)
========================================================== */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* ==========================================================
   📡 SOCKET.IO INIT
========================================================== */
const io = initSocket(server, CLIENT_ORIGIN);
global.io = io;

/* ==========================================================
   📁 Static Files & Uploads
========================================================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log("🗂 Created uploads directory:", UPLOAD_DIR);
  } catch (err) {
    console.error("❌ Failed to create uploads dir:", err.message);
  }
}

app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    extensions: ["jpg", "png", "jpeg", "gif", "pdf", "svg", "webp"],
    index: false,
  }),
);

/* ==========================================================
   📚 API ROUTES
========================================================== */
import authRoutes from "./src/routes/authRoutes.js";
import { notifyNewEmail } from "./src/services/notification.service.js";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import employeeRoutes from "./src/routes/employeeRoutes.js";
import leadRoutes from "./src/routes/leadRoutes.js";
import salesRoutes from "./src/routes/salesRoutes.js";
import salespersonsRoute from "./src/routes/salespersons.js";
import emailRoutes from "./src/routes/emailRoutes.js";
import forwardedLeadsRoutes from "./src/routes/forwardedLeadsRoutes.js";
import leadDetailsRoutes from "./src/routes/leadDetailsRoutes.js";
import pendingLeadsRouter from "./src/routes/pendingLeads.js";
import inboxRoutes from "./src/routes/inboxRoutes.js";
import sendgridRoutes from "./src/routes/sendgridRoutes.js";
import accountsRoutes from "./src/routes/accounts.js";
import accountsAuth from "./src/routes/accountsAuth.js";
import conversationsRoutes from "./src/routes/conversations.js";
import messagesRoutes from "./src/routes/messages.js";
import tagsRoutes from "./src/routes/tags.js";
import scheduledMessagesRoutes from "./src/routes/scheduledMessages.js";
import leadsRoute from "./src/routes/leads.js";
import inboxRoute from "./src/routes/inbox.js";
import fileUploadRoutes from "./src/routes/fileUpload.js";
import smtpMailerRoutes from "./src/routes/smtpMailerRoutes.js";
import globalMailerRoutes from "./src/routes/globalMailer.js";
import externalEmployeeRoutes from "./src/routes/externalEmployees.js";
import empAnalyticsRoutes from "./src/routes/empAnalyticsRoutes.js";
import cleanupAccountRoutes from "./src/routes/cleanupAccount.js";
import imapDownload from "./src/routes/imapDownload.js";
import leadEmailMetaRoutes from "./src/routes/leadEmailMeta.js";
import customStatusRoutes from "./src/routes/customStatusRoutes.js";
import emailTemplatesRoutes from "./src/routes/Emailtemplatesroutes.js";
import adminBackfill from "./src/routes/adminBackfill.js";
import { sendScheduledEmail } from "./src/services/scheduledEmail.service.js";



app.get("/", (req, res) => {
  res.send("🚀 Sales CRM Backend API (IMAP + Real-time Inbox)");
});

app.use("/api/auth", authRoutes);
// 🧪 TEMP TEST ROUTE: Trigger OS Notification manually
app.get("/api/test-push/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    console.log(`🧪 Triggering test push for User: ${userId}`);

    await notifyNewEmail({
      userId: userId,
      accountId: 1, // Dummy ID
      conversationId: "test-conv-123",
      fromEmail: "test-sender@crm.com",
      subject: "Verification: OS Notifications are Active!",
    });

    res.json({
      success: true,
      message: "Push triggered. Check your OS notifications!",
    });
  } catch (err) {
    console.error("❌ Test push failed:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
// server.js
// app.post("/api/notifications/subscribe", async (req, res) => {
//   try {
//     const { userId, subscription } = req.body;

//     // Save or update the subscription for this specific browser/device
//     await prisma.pushSubscription.upsert({
//       where: { endpoint: subscription.endpoint },
//       update: { userId: Number(userId) },
//       create: {
//         userId: Number(userId),
//         endpoint: subscription.endpoint,
//         p256dh: subscription.keys.p256dh,
//         auth: subscription.keys.auth,
//       },
//     });

//     res.status(201).json({ success: true });
//   } catch (err) {
//     console.error("❌ Subscription save failed:", err.message);
//     res.status(500).json({ error: "Failed to save subscription" });
//   }
// });
app.post("/api/notifications/subscribe", async (req, res) => {
  try {
    const { userId, subscription, endpoint, keys } = req.body;

    // ✅ Accept BOTH payload formats
    const sub = subscription || (endpoint && keys ? { endpoint, keys } : null);

    if (!userId || !sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return res.status(400).json({
        error: "Invalid push subscription payload",
      });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: {
        userId: Number(userId),
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      create: {
        userId: Number(userId),
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("❌ Subscription save failed:", err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

app.use("/api/analytics", analyticsRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/customStatus", customStatusRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/salespersons", salespersonsRoute);
app.use("/api/email", emailRoutes);
app.use("/api/forwardedLeads", forwardedLeadsRoutes);
app.use("/api/leadDetails", leadDetailsRoutes);
app.use("/api/pendingLeads", pendingLeadsRouter);
app.use("/api/inboxs", inboxRoutes);
app.use("/api/sendgrid", sendgridRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/auth", accountsAuth);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/scheduled-messages", scheduledMessagesRoutes);
app.use("/api/lead", leadsRoute);
app.use("/api/inbox", inboxRoute);
app.use("/api/inbox", imapDownload);
app.use("/api/uploads", fileUploadRoutes);
app.use("/api/smtp", smtpMailerRoutes);
app.use("/api/mail", globalMailerRoutes);
app.use("/api/external", externalEmployeeRoutes);
app.use("/api/empAnalytics", protect, empAnalyticsRoutes);
app.use("/api/cleanup-account", cleanupAccountRoutes);
app.use("/api/lead-email-meta", leadEmailMetaRoutes);
app.use("/api/email-templates", emailTemplatesRoutes);
app.use("/api/admin", adminBackfill);

/* ==========================================================
   🧪 Manual IMAP Sync Endpoint
========================================================== */
app.get("/api/sync/:email", async (req, res) => {
  const email = req.params.email;
  console.log(`🧩 Manual IMAP sync triggered for: ${email}`);

  try {
    await runSyncForAccount(prisma, email);
    res.json({ success: true, message: `Synced inbox for ${email}` });
  } catch (err) {
    console.error("❌ Manual sync error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
let isImapSyncRunning = false;
/* ==========================================================
   🕒 CRON JOB — Every 1 minute
========================================================== */
cron.schedule("*/1 * * * *", async () => {
  // ✅ Prevent overlapping IMAP syncs
  if (isImapSyncRunning) {
    console.log("⏭ IMAP sync skipped (already running)");
    return;
  }

  isImapSyncRunning = true;

  console.log("🔄 CRON: Running IMAP sync...");

  try {
    await runSync(prisma);
    console.log("✅ IMAP sync finished.");
  } catch (err) {
    console.error("❌ IMAP Sync Error:", err.message);
  } finally {
    // ✅ Always release lock
    isImapSyncRunning = false;
  }
});

cron.schedule("*/1 * * * *", async () => {
  console.log("📨 CRON: Checking scheduled emails...");
  await processScheduledEmails();
});
/* ==========================================================
   🕒 AUTOMATED NOTIFICATION CLEANUP (Every Hour)
   Deletes notifications older than 24 hours automatically.
========================================================== */
cron.schedule("0 * * * *", async () => {
  console.log("🧹 Background Process: Checking for expired notifications...");
  try {
    // 1. Calculate the time exactly 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // 2. Delete all records where 'createdAt' is older than that time
    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: twentyFourHoursAgo, // "lt" stands for "Less Than"
        },
      },
    });

    if (result.count > 0) {
      console.log(
        `✅ Automated Cleanup: Successfully deleted ${result.count} expired notifications.`,
      );
    }
  } catch (err) {
    console.error("❌ Background Cleanup Error:", err.message);
  }
});

// cron.schedule("*/1 * * * *", async () => {
//   console.log("📨 CRON: Checking scheduled emails...");

//   try {
//     const now = new Date();

//     const pendingMessages = await prisma.scheduledMessage.findMany({
//       where: {
//         status: "pending",
//         sendAt: { lte: now },
//       },
//       include: {
//         emailAccount: true,
//       },
//     });

//     for (const msg of pendingMessages) {
//       try {
//         // 1️⃣ Send Email using your SMTP logic
//         await sendScheduledEmail(msg); // create this function

//         // 2️⃣ Update status
//         await prisma.scheduledMessage.update({
//           where: { id: msg.id },
//           data: {
//             status: "sent",
//             isFollowedUp: true,
//           },
//         });

//         console.log(`✅ Scheduled email sent: ${msg.id}`);
//       } catch (error) {
//         console.error(`❌ Failed sending scheduled email ${msg.id}`, error);

//         await prisma.scheduledMessage.update({
//           where: { id: msg.id },
//           data: {
//             status: "failed",
//             retryCount: { increment: 1 },
//             errorMessage: error.message,
//           },
//         });
//       }
//     }
//   } catch (err) {
//     console.error("❌ Scheduled cron error:", err.message);
//   }
// });
/* ==========================================================
   🚀 START SERVER
========================================================== */
const PORT = process.env.PORT || 4002;

async function processScheduledEmails() {
  try {
    const now = new Date();

    // ✅ Recover stuck jobs
    await prisma.scheduledMessage.updateMany({
      where: {
        processing: true,
        lastAttemptAt: {
          lt: new Date(Date.now() - 1000 * 60 * 5),
        },
      },
      data: {
        processing: false,
      },
    });

    // ✅ Get pending + retry failed
    const pendingMessages = await prisma.scheduledMessage.findMany({
      where: {
        processing: false,

        OR: [
          {
            status: "pending",
            sendAt: {
              lte: now,
            },
          },
        {
          status: "failed",

          retryCount: {
            lt: 5,
          },

          sendAt: {
            lte: now,
          },
        },
        ],
      },

      include: {
        emailAccount: true,
      },

      orderBy: {
        sendAt: "asc",
      },

      take: 20,
    });

    for (const msg of pendingMessages) {
      // ✅ Atomic lock
      const locked = await prisma.scheduledMessage.updateMany({
        where: {
          id: msg.id,
          processing: false,
        },
        data: {
          processing: true,
          lastAttemptAt: new Date(),
        },
      });

      if (!locked.count) continue;

      try {
        await sendScheduledEmail(msg);

        await prisma.scheduledMessage.update({
          where: {
            id: msg.id,
          },
          data: {
            status: "sent",
            processing: false,
            isFollowedUp: true,
            sentAtActual: new Date(),
          },
        });

        console.log(`✅ Scheduled email sent: ${msg.id}`);
      } catch (error) {
        console.error(`❌ Failed sending scheduled email ${msg.id}`, error);

        await prisma.scheduledMessage.update({
          where: {
            id: msg.id,
          },
          data: {
            status: "failed",
            processing: false,

            retryCount: {
              increment: 1,
            },

            errorMessage: error.message,
          },
        });
      }
    }
  } catch (err) {
    console.error("❌ Scheduled processor error:", err);
  }
}
server.listen(PORT, async () => {
  console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
  console.log(`🌍 Client Origins: ${CLIENT_ORIGIN.join(", ")}`);

  // ✅ Recover missed emails after restart
  console.log("📨 Recovering missed scheduled emails...");

  try {
    await processScheduledEmails();
    console.log("✅ Recovery completed");
  } catch (err) {
    console.error("❌ Recovery failed:", err);
  }
});
