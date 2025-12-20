// src/routes/scheduledMessages.js
import express from "express";
import prisma from "../prismaClient.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ============================================================
   📬 POST /scheduled-messages → Create or Update
   ============================================================ */
router.post("/", protect, async (req, res) => {
  try {
    const {
      accountId,
      conversationId,
      toEmail,
      subject,
      bodyHtml,
      sendAt,
      attachments,
    } = req.body;

    const account = await prisma.emailAccount.findFirst({
      where: { id: Number(accountId), userId: req.user.id },
    });
    if (!account) return res.status(404).json({ error: "Account not found" });

    const existing = await prisma.scheduledMessage.findFirst({
      where: {
        userId: req.user.id,
        accountId: account.id,
        conversationId: conversationId ? Number(conversationId) : null,
        toEmail,
      },
    });

    if (existing) {
      const updated = await prisma.scheduledMessage.update({
        where: { id: existing.id },
        data: {
          subject,
          bodyHtml,
          sendAt: new Date(sendAt),
          attachments: attachments || null,
          status: "pending",
          isFollowedUp: existing.isFollowedUp ? false : existing.isFollowedUp,
        },
      });

      return res.json({
        success: true,
        message: "Scheduled email updated successfully (follow-up handled)",
        data: updated,
      });
    }

    const row = await prisma.scheduledMessage.create({
      data: {
        userId: req.user.id,
        accountId: account.id,
        conversationId: conversationId ? Number(conversationId) : null,
        toEmail,
        subject,
        bodyHtml,
        sendAt: new Date(sendAt),
        attachments: attachments || null,
        status: "pending",
        isFollowedUp: false,
      },
    });

    res.status(201).json({
      success: true,
      message: "Email scheduled successfully",
      data: row,
    });
  } catch (error) {
    console.error("❌ Error scheduling message:", error);
    res
      .status(500)
      .json({ error: "Failed to schedule or update scheduled email" });
  }
});

/* ============================================================
   📦 POST /scheduled-messages/bulk
   ============================================================ */
router.post("/bulk", protect, async (req, res) => {
  try {
    const { accountId, sendAt, messages } = req.body;

    // 1️⃣ Basic validation
    if (!accountId || !sendAt || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: "accountId, sendAt, and messages[] are required",
      });
    }

    if (messages.length < 1) {
      return res.status(400).json({
        success: false,
        message: "At least one message is required",
      });
    }

    // 2️⃣ Verify account ownership
    const account = await prisma.emailAccount.findFirst({
      where: {
        id: Number(accountId),
        userId: req.user.id,
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Email account not found",
      });
    }

    const scheduledResults = [];

    // 3️⃣ Loop through messages (works for 1 or many)
    for (const msg of messages) {
      const { conversationId, toEmail, subject, bodyHtml, attachments } = msg;

      if (!toEmail || !subject) continue;

      // 🔁 Check existing schedule
      const existing = await prisma.scheduledMessage.findFirst({
        where: {
          userId: req.user.id,
          accountId: account.id,
          conversationId: conversationId ? Number(conversationId) : null,
          toEmail,
        },
      });

      let row;

      if (existing) {
        // ✅ Update existing
        row = await prisma.scheduledMessage.update({
          where: { id: existing.id },
          data: {
            subject,
            bodyHtml,
            sendAt: new Date(sendAt),
            attachments: attachments || null,
            status: "pending",
            isFollowedUp: false, // 🔥 reset follow-up
          },
        });
      } else {
        // ✅ Create new
        row = await prisma.scheduledMessage.create({
          data: {
            userId: req.user.id,
            accountId: account.id,
            conversationId: conversationId ? Number(conversationId) : null,
            toEmail,
            subject,
            bodyHtml,
            sendAt: new Date(sendAt),
            attachments: attachments || null,
            status: "pending",
            isFollowedUp: false,
          },
        });
      }

      scheduledResults.push(row);
    }

    // 4️⃣ Response
    return res.json({
      success: true,
      message:
        scheduledResults.length === 1
          ? "Email scheduled successfully"
          : `${scheduledResults.length} emails scheduled successfully`,
      count: scheduledResults.length,
      data: scheduledResults,
    });
  } catch (error) {
    console.error("❌ Bulk scheduling error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to schedule bulk messages",
      error: error.message,
    });
  }
});

/* ============================================================
   📅 GET /scheduled-messages → All Pending
   ============================================================ */
router.get("/", protect, async (req, res) => {
  try {
    const messages = await prisma.scheduledMessage.findMany({
      where: {
        userId: req.user.id,
        status: "pending",
        OR: [{ isFollowedUp: false }, { isFollowedUp: null }],
      },
      orderBy: { sendAt: "asc" },
    });

    res.json(messages);
  } catch (error) {
    console.error("❌ Error fetching scheduled messages:", error);
    res.status(500).json({ error: "Failed to fetch scheduled messages" });
  }
});

/* ============================================================
   🕒 GET /scheduled-messages/today → Today’s Follow-ups
   ============================================================ */
router.get("/today", protect, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const today = await prisma.scheduledMessage.findMany({
      where: {
        userId: req.user.id,
        status: "pending",
        sendAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { sendAt: "asc" },
    });

    res.json(today);
  } catch (error) {
    console.error("❌ Error fetching today’s scheduled messages:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch today’s scheduled messages" });
  }
});

/* ============================================================
   🔁 PATCH /scheduled-messages/:id → Toggle Follow-up
   ============================================================ */
router.patch("/:id", protect, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const existing = await prisma.scheduledMessage.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Scheduled email not found" });
    }

    const updated = await prisma.scheduledMessage.update({
      where: { id },
      data: {
        status:
          status ||
          (existing.status === "pending"
            ? "completed"
            : existing.status === "completed"
            ? "pending"
            : "completed"),
        isFollowedUp: existing.isFollowedUp ? false : true,
      },
    });

    res.json({
      success: true,
      message: "Scheduled email status toggled successfully",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Error toggling scheduled email:", error);
    res.status(500).json({
      error: "Failed to toggle scheduled email",
      details: error.message,
    });
  }
});

// ✅ POST /api/scheduled-messages/cleanup
router.post("/cleanup", async (req, res) => {
  try {
    const { currentDate } = req.body;
    if (!currentDate) {
      return res
        .status(400)
        .json({ success: false, message: "currentDate is required" });
    }

    const now = new Date(currentDate);

    // 🧹 Update expired scheduled emails
    const expired = await prisma.scheduledMessage.updateMany({
      where: {
        sendAt: { lt: now },
        status: { not: "sent" },
      },
      data: { status: "expired" },
    });

    res.json({
      success: true,
      message: `✅ ${expired.count} scheduled messages marked as expired.`,
      data: expired,
    });
  } catch (err) {
    console.error("❌ Cleanup error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to cleanup scheduled messages",
      details: err.message,
    });
  }
});

export default router;

// // src/routes/scheduledMessages.js
// import express from "express";
// import prisma from "../prismaClient.js";
// import { protect } from "../middlewares/authMiddleware.js";

// const router = express.Router();

// // POST /scheduled-messages
// router.post("/", protect, async (req, res) => {
//   try {
//     const { accountId, conversationId, toEmail, subject, bodyHtml, sendAt, attachments } = req.body;

//     const account = await prisma.emailAccount.findFirst({
//       where: { id: Number(accountId), userId: req.user.id },
//     });
//     if (!account) return res.status(404).json({ error: "Account not found" });

//     // ✅ Check if there's already a scheduled email for the same conversation
//     const existing = await prisma.scheduledMessage.findFirst({
//       where: {
//         userId: req.user.id,
//         accountId: account.id,
//         conversationId: conversationId ? Number(conversationId) : null,
//         toEmail,
//       },
//     });

//     if (existing) {
//       // ✅ Only update existing and apply your rule:
//       // if isFollowedUp = true → set to false
//       // if isFollowedUp = false → keep as it is
//       const updated = await prisma.scheduledMessage.update({
//         where: { id: existing.id },
//         data: {
//           subject,
//           bodyHtml,
//           sendAt: new Date(sendAt),
//           attachments: attachments || null,
//           status: "pending",
//           isFollowedUp: existing.isFollowedUp ? false : existing.isFollowedUp, // ✅ your logic
//         },
//       });

//       return res.json({
//         success: true,
//         message: "Scheduled email updated successfully (follow-up handled)",
//         data: updated,
//       });
//     }

//     // ✅ Otherwise, create a new one (first time scheduling)
//     const row = await prisma.scheduledMessage.create({
//       data: {
//         userId: req.user.id,
//         accountId: account.id,
//         conversationId: conversationId ? Number(conversationId) : null,
//         toEmail,
//         subject,
//         bodyHtml,
//         sendAt: new Date(sendAt),
//         attachments: attachments || null,
//         status: "pending",
//         isFollowedUp: false,
//       },
//     });

//     res.status(201).json({
//       success: true,
//       message: "Email scheduled successfully",
//       data: row,
//     });
//   } catch (error) {
//     console.error("❌ Error scheduling message:", error);
//     res.status(500).json({ error: "Failed to schedule or update scheduled email" });
//   }
// });

// // GET /scheduled-messages
// router.get("/", protect, async (req, res) => {
//   try {
//     const messages = await prisma.scheduledMessage.findMany({
//       where: {
//         userId: req.user.id,
//         status: "pending",
//         OR: [
//           { isFollowedUp: false },
//           { isFollowedUp: null },
//         ],
//       },
//       orderBy: {
//         sendAt: "asc",
//       },
//     });

//     res.json(messages);
//   } catch (error) {
//     console.error("❌ Error fetching scheduled messages:", error);
//     res.status(500).json({ error: "Failed to fetch scheduled messages" });
//   }
// });

// // PATCH /scheduled-messages/:id
// // PATCH /scheduled-messages/:id  → Toggle follow-up instead of adding new row
// router.patch("/:id", protect, async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     const { status } = req.body;

//     const existing = await prisma.scheduledMessage.findFirst({
//       where: { id, userId: req.user.id },
//     });

//     if (!existing) {
//       return res.status(404).json({ error: "Scheduled email not found" });
//     }

//     // ✅ If already sent or canceled, toggle back to pending only if needed
//     // ✅ Otherwise, mark as completed (isFollowedUp = true)
//     const updated = await prisma.scheduledMessage.update({
//       where: { id },
//       data: {
//         status:
//           status ||
//           (existing.status === "pending"
//             ? "completed"
//             : existing.status === "completed"
//             ? "pending"
//             : "completed"),
//         isFollowedUp: existing.isFollowedUp ? false : true, // ✅ toggle instead of insert
//       },
//     });

//     res.json({
//       success: true,
//       message: "Scheduled email status toggled successfully",
//       data: updated,
//     });
//   } catch (error) {
//     console.error("❌ Error toggling scheduled email:", error);
//     res
//       .status(500)
//       .json({ error: "Failed to toggle scheduled email", details: error.message });
//   }
// });

// export default router;
