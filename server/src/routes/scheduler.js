// src/jobs/scheduler.js
import cron from "node-cron";
import prisma from "../prismaClient.js";
import { sendViaSendGrid } from "../services/mailer.js";
import { io } from "../socket.js"; // optional; see socket.js

const AUTO_SEND = false; // set true if you want immediate auto-send

export function startScheduler() {
  cron.schedule("*/1 * * * *", async () => {
    const now = new Date();
    const due = await prisma.scheduledMessage.findMany({
      where: {
        status: "pending",
        sendAt: { lte: now }
      },
      include: {
        emailAccount: true
      }
    });

    for (const job of due) {
      try {
        if (AUTO_SEND) {
          await sendViaSendGrid({
            from: job.emailAccount.email,
            to: job.toEmail,
            subject: job.subject || "",
            html: job.bodyHtml || ""
          });
          await prisma.scheduledMessage.update({
            where: { id: job.id },
            data: { status: "sent" }
          });
        } else {
          await prisma.scheduledMessage.update({
            where: { id: job.id },
            data: { status: "due" }
          });
          // Notify user via socket (optional)
          try {
            io.to(`user:${job.userId}`).emit("scheduled_message_due", {
              id: job.id,
              toEmail: job.toEmail,
              subject: job.subject,
              bodyHtml: job.bodyHtml
            });
          } catch {}
        }
      } catch (e) {
        console.error("[scheduler] send error:", e.message);
      }
    }
  });

  console.log("✅ Scheduler started (every 1 min)");
}
