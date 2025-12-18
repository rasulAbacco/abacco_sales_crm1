// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

import { initSocket } from "./socket.js";
import { runSync, runSyncForAccount } from "./src/services/imapSync.js";
import { protect } from "./src/middlewares/authMiddleware.js";

dotenv.config();
const prisma = new PrismaClient();

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
  })
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
   📁 Static Files (Attachments from IMAP / uploads)
   NOTE: Ensure this path matches imapSync.js & fileUpload routes
========================================================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use project root "uploads" directory (same as imapSync and file upload route)
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
console.log("🗂 Serving uploads from:", UPLOAD_DIR);

// Ensure folder exists (best-effort)
import fs from "fs";
if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log("🗂 Created uploads directory:", UPLOAD_DIR);
  } catch (err) {
    console.error("❌ Failed to create uploads dir:", err.message);
  }
}

// Expose uploads as /uploads so client can load files at `${API_BASE_URL}/uploads/<file>`
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    extensions: ["jpg", "png", "jpeg", "gif", "pdf", "svg", "webp"],
    index: false,
  })
);

/* ==========================================================
   📚 API ROUTES
========================================================== */
import authRoutes from "./src/routes/authRoutes.js";
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
app.get("/", (req, res) => {
  res.send("🚀 Sales CRM Backend API (IMAP + Real-time Inbox)");
});

app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/leads", leadRoutes);
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
app.use("/api/uploads", fileUploadRoutes); // fileUpload should save into same UPLOAD_DIR
app.use("/api/smtp", smtpMailerRoutes);
app.use("/api/mail", globalMailerRoutes);
app.use("/api/external", externalEmployeeRoutes);
app.use("/api/empAnalytics", protect, empAnalyticsRoutes);
app.use("/api/cleanup-account", cleanupAccountRoutes);
app.use("/api/lead-email-meta", leadEmailMetaRoutes);


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

/* ==========================================================
   🕒 CRON JOB — Every 5 minutes
========================================================== */
cron.schedule("*/1 * * * *", async () => {
  console.log("🔄 CRON: Running IMAP sync...");
  try {
    await runSync(prisma);
    console.log("✅ IMAP sync finished.");
  } catch (err) {
    console.error("❌ IMAP Sync Error:", err.message);
  }
});

/* ==========================================================
   🚀 START SERVER
========================================================== */
const PORT = process.env.PORT || 4002;

server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
  console.log(`🌍 Client Origins: ${CLIENT_ORIGIN.join(", ")}`);
});

// // server.js
// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import http from "http";
// import path from "path";
// import { fileURLToPath } from "url";
// import cron from "node-cron";
// import { PrismaClient } from "@prisma/client";

// import { initSocket } from "./socket.js";
// import { runSync, runSyncForAccount } from "./src/services/imapSync.js";
// import { protect } from "./src/middlewares/authMiddleware.js";

// /* ==========================================================
//    ✅ Initialize App and Environment
//    ========================================================== */
// dotenv.config();
// const prisma = new PrismaClient();
// const app = express();
// const server = http.createServer(app);

// /* 🚀 Regular CORS */
// const allowedOrigins = [
//   "http://localhost:5175",
//   "https://abaccosales.onrender.com",
//   "https://sales.clienthubsolutions.com",
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin) return callback(null, true);
//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       }
//       return callback(new Error("Not allowed by CORS"));
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

// /* ==========================================================
//    🚀 FIX 2 — REMOVE DUPLICATE JSON PARSING
//    ========================================================== */
// app.use(express.json({ limit: "10mb", strict: false }));
// app.use(express.urlencoded({ extended: true }));

// /* ==========================================================
//    ✅ SOCKET.IO INITIALIZATION (Unified)
//    ========================================================== */
// const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN
//   ? process.env.CLIENT_ORIGIN.split(",").map((url) => url.trim())
//   : ["http://localhost:5175"];

// const io = initSocket(server, CLIENT_ORIGIN);

// io.on("connection", (socket) => {
//   console.log("✅ Socket connected:", socket.id);
//   socket.emit("connected", { message: "Socket connection established" });
// });

// /* ==========================================================
//    ✅ Static folder for uploads (UNCHANGED)
//    ========================================================== */
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// /* ==========================================================
//    ✅ ROUTE IMPORTS (UNCHANGED)
//    ========================================================== */
// import authRoutes from "./src/routes/authRoutes.js";
// import analyticsRoutes from "./src/routes/analyticsRoutes.js";
// import employeeRoutes from "./src/routes/employeeRoutes.js";
// import leadRoutes from "./src/routes/leadRoutes.js";
// import salesRoutes from "./src/routes/salesRoutes.js";
// import salespersonsRoute from "./src/routes/salespersons.js";
// import emailRoutes from "./src/routes/emailRoutes.js";
// import forwardedLeadsRoutes from "./src/routes/forwardedLeadsRoutes.js";
// import leadDetailsRoutes from "./src/routes/leadDetailsRoutes.js";
// import pendingLeadsRouter from "./src/routes/pendingLeads.js";
// import inboxRoutes from "./src/routes/inboxRoutes.js";
// import sendgridRoutes from "./src/routes/sendgridRoutes.js";
// import accountsRoutes from "./src/routes/accounts.js";
// import accountsAuth from "./src/routes/accountsAuth.js";
// import conversationsRoutes from "./src/routes/conversations.js";
// import messagesRoutes from "./src/routes/messages.js";
// import tagsRoutes from "./src/routes/tags.js";
// import scheduledMessagesRoutes from "./src/routes/scheduledMessages.js";
// import leadsRoute from "./src/routes/leads.js";
// import inboxRoute from "./src/routes/inbox.js";
// import fileUploadRoutes from "./src/routes/fileUpload.js";
// import smtpMailerRoutes from "./src/routes/smtpMailerRoutes.js";
// import globalMailerRoutes from "./src/routes/globalMailer.js";
// import externalEmployeeRoutes from "./src/routes/externalEmployees.js";
// import empAnalyticsRoutes from "./src/routes/empAnalyticsRoutes.js";

// /* ==========================================================
//    ✅ ROUTE MOUNTING (UNCHANGED)
//    ========================================================== */
// app.get("/", (req, res) => {
//   res.send("🚀 Sales CRM Backend API running successfully");
// });

// app.use("/api/auth", authRoutes);
// app.use("/api/analytics", analyticsRoutes);
// app.use("/api/employees", employeeRoutes);
// app.use("/api/leads", leadRoutes);
// app.use("/api/sales", salesRoutes);
// app.use("/api/salespersons", salespersonsRoute);
// app.use("/api/email", emailRoutes);
// app.use("/api/forwardedLeads", forwardedLeadsRoutes);
// app.use("/api/leadDetails", leadDetailsRoutes);
// app.use("/api/pendingLeads", pendingLeadsRouter);
// app.use("/api/inboxs", inboxRoutes);
// app.use("/api/sendgrid", sendgridRoutes);
// app.use("/api/accounts", accountsRoutes);
// app.use("/auth", accountsAuth);
// app.use("/api/conversations", conversationsRoutes);
// app.use("/api/messages", messagesRoutes);
// app.use("/api/tags", tagsRoutes);
// app.use("/api/scheduled-messages", scheduledMessagesRoutes);
// app.use("/api/lead", leadsRoute);
// app.use("/api/inbox", inboxRoute);
// app.use("/api/uploads", fileUploadRoutes);
// app.use("/api/smtp", smtpMailerRoutes);
// app.use("/api/mail", globalMailerRoutes);
// app.use("/api/external", externalEmployeeRoutes);
// app.use("/api/empAnalytics", protect, empAnalyticsRoutes);

// /* ==========================================================
//    🧪 Manual Sync Endpoint (UNCHANGED)
//    ========================================================== */
// app.get("/api/sync/:email", async (req, res) => {
//   const email = req.params.email;
//   console.log(`🧩 Manual IMAP sync triggered for: ${email}`);

//   try {
//     await runSyncForAccount(prisma, email);
//     res.json({ success: true, message: `✅ Synced inbox for ${email}` });
//   } catch (err) {
//     console.error("❌ Manual sync error:", err.message);
//     res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// });

// /* ==========================================================
//    GLOBAL ERROR HANDLER (UNCHANGED)
//    ========================================================== */
// app.use((err, req, res, next) => {
//   console.error("🔥 Global Error Handler:", err.message);
//   res.status(500).json({
//     error: "Internal Server Error",
//     details: err.message,
//   });
// });

// /* ==========================================================
//    ATTACHMENT DOWNLOAD (UNCHANGED)
//    ========================================================== */
// app.get("/api/attachments/:id", async (req, res) => {
//   try {
//     let { id } = req.params;
//     let query = {};

//     if (id.startsWith("cid-")) {
//       query = { cid: id.replace("cid-", "") };
//     } else {
//       id = Number(id);
//       if (isNaN(id)) return res.status(400).send("Invalid attachment ID");
//       query = { id };
//     }

//     const attachment = await prisma.attachment.findFirst({ where: query });

//     if (!attachment) return res.status(404).send("Attachment not found");
//     if (!attachment.data) return res.status(404).send("Attachment has no data");

//     const typeMap = {
//       pdf: "application/pdf",
//       jpg: "image/jpeg",
//       jpeg: "image/jpeg",
//       png: "image/png",
//       gif: "image/gif",
//       json: "application/json",
//       txt: "text/plain",
//       html: "text/html",
//     };

//     const ext = attachment.filename?.split(".").pop()?.toLowerCase();
//     const mime =
//       attachment.mimeType || typeMap[ext] || "application/octet-stream";

//     const buffer =
//       attachment.data instanceof Buffer
//         ? attachment.data
//         : Buffer.from(attachment.data, "base64");

//     res.setHeader("Access-Control-Allow-Origin", "*");
//     res.setHeader("Content-Type", mime);
//     res.setHeader(
//       "Content-Disposition",
//       `inline; filename="${attachment.filename || "file"}"`
//     );
//     res.setHeader("Content-Length", buffer.length);
//     res.send(buffer);
//   } catch (err) {
//     console.error("❌ Attachment fetch error:", err);
//     res.status(500).send("Server error while fetching attachment");
//   }
// });

// /* ==========================================================
//    CRON JOB — IMAP SYNC EVERY 1 MINUTE (UNCHANGED)
//    ========================================================== */
// cron.schedule("*/1 * * * *", async () => {
//   console.log("🔄 Running scheduled IMAP sync...");
//   const startTime = Date.now();
//   try {
//     await runSync(prisma);
//     const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
//     console.log(`✅ IMAP sync complete in ${elapsed}s`);
//   } catch (err) {
//     console.error("❌ IMAP sync failed:", err.message);
//   }
// });

// /* ==========================================================
//    START SERVER (UNCHANGED)
//    ========================================================== */
// const PORT = process.env.PORT || 4002;
// server.listen(PORT, () => {
//   console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
//   console.log(`🌍 Client Origin(s): ${CLIENT_ORIGIN.join(", ")}`);
//   console.log(`🌐 API Base URL: ${process.env.API_BASE_URL}`);
// });
