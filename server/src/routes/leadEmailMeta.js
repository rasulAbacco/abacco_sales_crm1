import express from "express";
import prisma from "../prismaClient.js";

const router = express.Router();


// CREATE or UPDATE LeadEmailMeta
// ALSO sync country to SalesLead & LeadDetails
router.post("/:leadDetailId", async (req, res) => {
  const leadDetailId = Number(req.params.leadDetailId);
  const { email, cc, country } = req.body;

  try {
    const result = await prisma.$transaction([
      // 1️⃣ LeadEmailMeta
      prisma.leadEmailMeta.upsert({
        where: { leadDetailId },
        update: { email, cc, country },
        create: { leadDetailId, email, cc, country },
      }),

      // 2️⃣ SalesLead (FIXED)
      prisma.salesLead.updateMany({
        where: {
          OR: [{ leadDetailsId: leadDetailId }, { email: email }],
        },
        data: { country },
      }),

      // 3️⃣ LeadDetails
      prisma.leadDetails.update({
        where: { id: leadDetailId },
        data: { country },
      }),
    ]);

    res.json({
      success: true,
      salesLeadsUpdated: result[1].count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

export default router;