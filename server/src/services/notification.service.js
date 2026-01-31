import prisma from "../prismaClient.js";
import { emitToUser } from "../../socket.js";
import { sendPushToUser } from "./push.service.js";


export async function notifyNewEmail({
  userId,
  accountId,
  conversationId,
  fromEmail,
  subject,
}) {
  // 1️⃣ Save notification in DB (source of truth)
  const notification = await prisma.notification.create({
    data: {
      userId,
      type: "email_received",
      title: "New Email Received",
      message: `From ${fromEmail}${subject ? ` — ${subject}` : ""}`,
      accountId,
      conversationId,
    },
  });

  // 2️⃣ In-app realtime notification (Socket.IO)
  try {
    emitToUser(userId, "notification:new", notification);
  } catch (err) {
    console.error("⚠️ Socket emit failed:", err.message);
  }

  // 3️⃣ System / OS notification (Web Push)
  try {
    await sendPushToUser(userId, {
      title: notification.title,
      message: notification.message,
      url: `/inbox?conversationId=${conversationId}`,
    });
  } catch (err) {
    console.error("⚠️ Push notification failed:", err.message);
  }
}

export async function notifyLeadForwarded({
  employeeUserId,
  leadId,
  leadClient,
  adminName,
}) {
  // 1️⃣ Save notification in DB
  const notification = await prisma.notification.create({
    data: {
      userId: employeeUserId,
      type: "lead_forwarded",
      title: "New Lead Assigned",
      message: `Lead "${leadClient}" was forwarded by ${adminName}`,
    },
  });

  // 2️⃣ In-app realtime notification (Socket)
  try {
    emitToUser(employeeUserId, "notification:new", notification);
  } catch (err) {
    console.error("Socket emit failed:", err.message);
  }

  // 3️⃣ PC / Browser Push Notification
  // 🔴 VERY IMPORTANT: url MUST be STRING ONLY
  try {
    await sendPushToUser(employeeUserId, {
      title: notification.title,
      message: notification.message,
      url: "/api/forwardedLeads", // ✅ STRING (matches sw.js)
    });
  } catch (err) {
    console.error("Push failed:", err.message);
  }
}
