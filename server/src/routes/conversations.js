// src/routes/conversations.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { protect } from "../middlewares/authMiddleware.js";

const prisma = new PrismaClient();
const router = express.Router();

// ✅ Get all conversations (by account)
router.get("/scheduled", protect, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const leads = await prisma.leadDetails.findMany({
      where: {
        followUpDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        isFollowedUp: false, // ✅ fixed
      },
      orderBy: {
        followUpDate: "asc",
      },
    });

    res.json(leads);
  } catch (error) {
    console.error("❌ Error fetching scheduled follow-ups:", error);
    res.status(500).json({ error: "Failed to fetch scheduled leads" });
  }
});

// ✅ Get conversation thread (with messages)
router.get("/:id/thread", protect, async (req, res) => {
  try {
    const convId = parseInt(req.params.id, 10);

    const messages = await prisma.emailMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
      include: { attachments: true },
    });

    res.json(messages);
  } catch (err) {
    console.error("❌ Error fetching conversation thread:", err);
    res.status(500).json({ error: "Failed to fetch conversation thread" });
  }
});

// ✅ Get scheduled follow-ups (today)
// router.get("/scheduled", protect, async (req, res) => {
//   try {
//     const today = new Date();
//     const startOfDay = new Date(today.setHours(0, 0, 0, 0));
//     const endOfDay = new Date(today.setHours(23, 59, 59, 999));

//     const leads = await prisma.leadDetails.findMany({
//       where: {
//         followUpDate: {
//           gte: startOfDay,
//           lte: endOfDay,
//         },
//         isFollowedUp: false,  // only show pending follow-ups
//       },
//       orderBy: { followUpDate: "asc" },
//     });

//     res.json(leads);
//   } catch (err) {
//     console.error("Error fetching scheduled follow-ups:", err);
//     res.status(500).json({ error: "Failed to fetch scheduled leads" });
//   }
// });
// ✅ Get scheduled follow-ups (today)
// ✅ Fetch today's pending follow-ups
router.get("/scheduled", protect, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const leads = await prisma.leadDetails.findMany({
      where: {
        followUpDate: { gte: startOfDay, lte: endOfDay },
        OR: [{ isFollowedUp: false }, { isFollowedUp: null }],
      },
      orderBy: { followUpDate: "asc" },
    });

    console.log(`📅 Found ${leads.length} pending follow-ups`);
    res.json(leads);
  } catch (err) {
    console.error("❌ Error fetching scheduled follow-ups:", err);
    res.status(500).json({ error: "Failed to fetch scheduled leads" });
  }
});

export default router;
