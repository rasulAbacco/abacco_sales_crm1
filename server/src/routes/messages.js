// src/routes/messages.js
import express from "express";
import multer from "multer";
import prisma from "../prismaClient.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();


// ✅ Multer setup for attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ✅ Send reply or forward
router.post("/:conversationId/reply", protect, upload.array("attachments"), async (req, res) => {
  try {
    const { body, fromEmail, toEmail, fromName, inReplyTo, isForward } = req.body;
    const conversationId = parseInt(req.params.conversationId, 10);

    if (!toEmail || !fromEmail || !body)
      return res.status(400).json({ error: "Missing required fields" });

    const newMessage = await prisma.emailMessage.create({
      data: {
        conversationId,
        from: fromEmail,
        to: toEmail,
        fromName,
        body,
        isForward: isForward === "true",
      },
    });

    if (req.files?.length) {
      await prisma.attachment.createMany({
        data: req.files.map((file) => ({
          messageId: newMessage.id,
          filename: file.originalname,
          path: file.path,
          size: file.size,
        })),
      });
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    res.json({ success: true, message: newMessage });
  } catch (err) {
    console.error("❌ Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
