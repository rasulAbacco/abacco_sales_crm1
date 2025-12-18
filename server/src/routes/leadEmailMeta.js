import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// CREATE or UPDATE LeadEmailMeta by leadDetailId
router.post("/:leadDetailId", async (req, res) => {
  const leadDetailId = Number(req.params.leadDetailId);
  const { email, cc, country } = req.body;

  try {
    const meta = await prisma.leadEmailMeta.upsert({
      where: { leadDetailId },
      update: { email, cc, country },
      create: {
        leadDetailId,
        email,
        cc,
        country,
      },
    });

    res.json({ success: true, data: meta });
  } catch (err) {
    console.error("LeadEmailMeta error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to save metadata" });
  }
});

export default router;
