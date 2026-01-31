import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { cleanupEmailAccount } from "../services/cleanupAccount.js";
import prisma from "../prismaClient.js";

const router = express.Router();

router.post("/clear", protect, async (req, res) => {
  try {
    const { emailAccountId } = req.body;
    if (!emailAccountId) {
      return res
        .status(400)
        .json({ success: false, message: "emailAccountId required" });
    }

    const accountId = Number(emailAccountId);

    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    if (account.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // 1️⃣ FILE CLEANUP (R2 + local)
    await cleanupEmailAccount(accountId);

    // 2️⃣ FETCH IDS (NO RELATIONS USED)
    const messages = await prisma.emailMessage.findMany({
      where: { emailAccountId: accountId },
      select: { id: true, conversationId: true },
    });

    const messageIds = messages.map((m) => m.id);
    const conversationIds = [
      ...new Set(messages.map((m) => m.conversationId).filter(Boolean)),
    ];

    // 3️⃣ BREAK FK LOOP
    await prisma.scheduledMessage.updateMany({
      where: { accountId },
      data: { conversationId: null },
    });

    // 4️⃣ DELETE IN SAFE ORDER
    await prisma.$transaction([
      // ---------- MESSAGE CHILDREN ----------
      prisma.attachment.deleteMany({
        where: { messageId: { in: messageIds } },
      }),

      prisma.messageTag.deleteMany({
        where: { messageId: { in: messageIds } },
      }),

      prisma.trackingEvent.deleteMany({
        where: { messageId: { in: messageIds } },
      }),

      prisma.emailComment.deleteMany({
        where: { messageId: { in: messageIds } },
      }),

      // ---------- CONVERSATION CHILDREN ----------
      prisma.emailComment.deleteMany({
        where: { conversationId: { in: conversationIds } },
      }),

      prisma.conversationTag.deleteMany({
        where: { conversationId: { in: conversationIds } },
      }),

      prisma.scheduledMessage.deleteMany({
        where: { accountId },
      }),

      // ---------- MESSAGES ----------
      prisma.emailMessage.deleteMany({
        where: { id: { in: messageIds } },
      }),

      // ---------- CONVERSATIONS ----------
      prisma.conversation.deleteMany({
        where: { id: { in: conversationIds } },
      }),

      // ---------- SYNC / FOLDERS ----------
      prisma.syncState.deleteMany({ where: { accountId } }),
      prisma.emailFolder.deleteMany({ where: { accountId } }),

      // ---------- EMAIL ACCOUNT ----------
      prisma.emailAccount.delete({
        where: { id: accountId },
      }),
    ]);

    console.log("✅ FULL EMAIL ACCOUNT DELETED:", accountId);
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ ACCOUNT CLEANUP FAILED:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
