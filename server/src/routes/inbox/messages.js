//server/src/routes/inbox/messages.js
import express from "express";
import prisma from "../prismaClient.js";

const router = express.Router();


/**
 * GET messages in a conversation
 */
router.get("/:threadKey", async (req, res) => {
  try {
    const { threadKey } = req.params;
    const { accountId } = req.query;

    const messages = await prisma.emailMessage.findMany({
      where: {
        emailAccountId: Number(accountId),
        threadKey,
        isTrash: false,
        isSpam: false,
      },
      orderBy: { sentAt: "asc" },
      include: { attachments: true },
    });

    res.json({ success: true, data: messages });
  } catch (err) {
    console.error("Conversation messages error:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
