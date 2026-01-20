// src/routes/tags.js
import express from "express";
import prisma from "../prismaClient.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /tags
router.get("/", protect, async (req, res) => {
  const tags = await prisma.tag.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" }
  });
  res.json(tags);
});

// POST /tags
router.post("/", protect, async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const tag = await prisma.tag.create({
    data: { name, color: color || "#00bfff", userId: req.user.id }
  });
  res.status(201).json(tag);
});

// POST /conversations/:id/tags  { tagIds: number[] }
router.post("/conversations/:id/tags", protect, async (req, res) => {
  const convId = Number(req.params.id);
  const { tagIds = [] } = req.body;

  const conv = await prisma.conversation.findFirst({
    where: { id: convId, EmailAccount: { userId: req.user.id } }
  });
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  // reset and set
  await prisma.conversationTag.deleteMany({ where: { conversationId: convId } });
  await prisma.conversationTag.createMany({
    data: tagIds.map((tagId) => ({ conversationId: convId, tagId: Number(tagId) })),
    skipDuplicates: true
  });

  res.json({ success: true });
});

export default router;
