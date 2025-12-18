// src/routes/leads.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

// ✅ Fetch leads for a specific employee email (follow-ups)
router.get("/followups", protect, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Missing employee email" });

    const leads = await prisma.leadDetails.findMany({
      where: { salesperson: email },
      orderBy: { followUpDate: "desc" },
    });

    res.json(leads);
  } catch (err) {
    console.error("Error fetching follow-ups:", err);
    res.status(500).json({ error: "Failed to fetch follow-ups" });
  }
});

export default router;
