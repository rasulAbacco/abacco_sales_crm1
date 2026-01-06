import express from "express";
import prisma from "../prismaClient.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ============================================================
   📬 POST /scheduled-messages → SINGLE SCHEDULE (REPLY)
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

    if (!accountId || !toEmail || !sendAt) {
      return res.status(400).json({
        success: false,
        message: "accountId, toEmail and sendAt are required",
      });
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "conversationId is required for reply scheduling",
      });
    }

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

    // 🔁 Check existing scheduled reply
    const existing = await prisma.scheduledMessage.findFirst({
      where: {
        userId: req.user.id,
        accountId: account.id,
        conversationId, // ✅ STRING
        toEmail,
      },
    });

    if (existing) {
      const finalBody =
        bodyHtml && bodyHtml.trim() !== "" ? bodyHtml : existing.bodyHtml;

      const updated = await prisma.scheduledMessage.update({
        where: { id: existing.id },
        data: {
          subject: subject || existing.subject,
          bodyHtml: finalBody,
          sendAt: new Date(sendAt),
          attachments: attachments ?? existing.attachments,
          status: "pending",
          isFollowedUp: false,
        },
      });

      return res.json({
        success: true,
        message: "Scheduled reply updated",
        data: updated,
      });
    }

    const created = await prisma.scheduledMessage.create({
      data: {
        userId: req.user.id,
        accountId: account.id,
        conversationId, // ✅ STRING
        toEmail,
        subject,
        bodyHtml,
        sendAt: new Date(sendAt),
        attachments: attachments || null,
        status: "pending",
        isFollowedUp: false,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Reply scheduled successfully",
      data: created,
    });
  } catch (err) {
    console.error("❌ Single schedule error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to schedule reply",
    });
  }
});

/* ============================================================
   📦 POST /scheduled-messages/bulk → BULK SCHEDULE (REPLY)
   ============================================================ */
router.post("/bulk", protect, async (req, res) => {
  try {
    const { accountId, sendAt, messages } = req.body;

    if (!accountId || !sendAt || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: "accountId, sendAt and messages[] are required",
      });
    }

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

    const results = [];

    for (const msg of messages) {
      const { conversationId, toEmail, subject, bodyHtml, attachments } = msg;

      if (!conversationId || !toEmail) continue;

      const existing = await prisma.scheduledMessage.findFirst({
        where: {
          userId: req.user.id,
          accountId: account.id,
          conversationId, // ✅ STRING
          toEmail,
        },
      });

      let row;

      if (existing) {
        const finalBody =
          bodyHtml && bodyHtml.trim() !== "" ? bodyHtml : existing.bodyHtml;

        row = await prisma.scheduledMessage.update({
          where: { id: existing.id },
          data: {
            subject: subject || existing.subject,
            bodyHtml: finalBody,
            sendAt: new Date(sendAt),
            attachments: attachments ?? existing.attachments,
            status: "pending",
            isFollowedUp: false,
          },
        });
      } else {
        row = await prisma.scheduledMessage.create({
          data: {
            userId: req.user.id,
            accountId: account.id,
            conversationId, // ✅ STRING
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

      results.push(row);
    }

    return res.json({
      success: true,
      message: `${results.length} reply(ies) scheduled`,
      count: results.length,
      data: results,
    });
  } catch (err) {
    console.error("❌ Bulk schedule error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to schedule bulk replies",
    });
  }
});

/* ============================================================
   📅 GET /scheduled-messages → ALL PENDING
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
  } catch (err) {
    console.error("❌ Fetch scheduled messages error:", err);
    res.status(500).json({ error: "Failed to fetch scheduled messages" });
  }
});

/* ============================================================
   🕒 GET /scheduled-messages/today → TODAY FOLLOW-UPS
   ============================================================ */
router.get("/today", protect, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const messages = await prisma.scheduledMessage.findMany({
      where: {
        userId: req.user.id,
        status: "pending",
        sendAt: { gte: start, lte: end },
        OR: [{ isFollowedUp: false }, { isFollowedUp: null }],
      },
      orderBy: { sendAt: "asc" },
    });

    res.json(messages);
  } catch (err) {
    console.error("❌ Fetch today follow-ups error:", err);
    res.status(500).json({
      error: "Failed to fetch today's scheduled messages",
    });
  }
});


/* ============================================================
   📧 GET /scheduled-messages/:id/conversation → GET FULL CONVERSATION
   ============================================================ */
router.get("/:id/conversation", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Get scheduled message
    const scheduled = await prisma.scheduledMessage.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
      },
    });

    if (!scheduled) {
      return res.status(404).json({
        success: false,
        message: "Scheduled message not found",
      });
    }

    // Fetch FULL conversation history
    const messages = await prisma.emailMessage.findMany({
      where: {
        conversationId: scheduled.conversationId,
        emailAccountId: scheduled.accountId,
      },
      orderBy: { sentAt: "asc" },
      include: {
        attachments: true,
        tags: { include: { Tag: true } },
      },
    });

    return res.json({
      success: true,
      scheduledMessage: scheduled, // The draft
      conversationMessages: messages, // Full history
    });
  } catch (err) {
    console.error("❌ Error fetching scheduled conversation:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversation",
    });
  }
});

/* ============================================================
   ✏️ PATCH /scheduled-messages/:id → UPDATE SCHEDULED MESSAGE
   ============================================================ */
router.patch("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, bodyHtml, toEmail, ccEmail, sendAt, attachments } =
      req.body;

    // 🔥 Verify ownership and pending status
    const existing = await prisma.scheduledMessage.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
        status: "pending", // Only allow editing pending messages
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Scheduled message not found or already sent",
      });
    }

    // 🔥 Update only provided fields
    const updateData = {};
    if (subject !== undefined) updateData.subject = subject;
    if (bodyHtml !== undefined) updateData.bodyHtml = bodyHtml;
    if (toEmail !== undefined) updateData.toEmail = toEmail;
    if (ccEmail !== undefined) updateData.ccEmail = ccEmail;
    if (sendAt !== undefined) updateData.sendAt = new Date(sendAt);
    if (attachments !== undefined) updateData.attachments = attachments;

    // Always update timestamp
    updateData.updatedAt = new Date();

    const updated = await prisma.scheduledMessage.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return res.json({
      success: true,
      message: "Scheduled message updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("❌ Update scheduled message error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update scheduled message",
      error: err.message,
    });
  }
});

/* ============================================================
   🗑️ DELETE /scheduled-messages/:id → CANCEL SCHEDULED MESSAGE
   ============================================================ */
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 Verify ownership and pending status
    const existing = await prisma.scheduledMessage.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
        status: "pending", // Only allow deleting pending messages
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Scheduled message not found or already sent",
      });
    }

    await prisma.scheduledMessage.delete({
      where: { id: parseInt(id) },
    });

    return res.json({
      success: true,
      message: "Scheduled message canceled successfully",
    });
  } catch (err) {
    console.error("❌ Delete scheduled message error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to cancel scheduled message",
      error: err.message,
    });
  }
});

export default router;
