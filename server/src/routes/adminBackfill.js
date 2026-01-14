import express from "express";
import prisma from "../../prisma/prismaClient.js"; // Sales CRM
import prismaLeadCRM from "../../prisma/externalCRM.js"; // Lead CRM (external)

const router = express.Router();

/**
 * ============================================================
 * 🔧 BACKFILL SalesLead website & link FROM Lead CRM
 * (RAW QUERY ONLY – NO STORING)
 * ============================================================
 */
router.patch("/backfill-salesleads", async (req, res) => {
  try {
    // 1️⃣ Fetch SalesLeads with missing website/link
    const salesLeads = await prisma.salesLead.findMany({
      where: {
        OR: [{ website: null }, { link: null }, { website: "" }, { link: "" }],
      },
      select: {
        id: true,
        email: true,
        client: true,
        website: true,
        link: true,
      },
    });

    console.log(`🔍 Found ${salesLeads.length} SalesLeads to check`);

    let updated = 0;

    for (const sl of salesLeads) {
      const email = sl.email || sl.client;
      if (!email) continue;

      // 2️⃣ Fetch from Lead CRM (RAW QUERY – reference style)
      const rows = await prismaLeadCRM.$queryRawUnsafe(`
        SELECT "website", "link"
        FROM "Lead"
        WHERE "clientEmail" = '${email}'
           OR "leadEmail" = '${email}'
        LIMIT 1;
      `);

      if (!rows || rows.length === 0) continue;

      const lead = rows[0];
      const updateData = {};

      // 3️⃣ Update ONLY missing fields
      if ((!sl.website || sl.website === "") && lead.website) {
        updateData.website = lead.website;
      }

      if ((!sl.link || sl.link === "") && lead.link) {
        updateData.link = lead.link;
      }

      if (Object.keys(updateData).length === 0) continue;

      // 4️⃣ Update Sales CRM
      await prisma.salesLead.update({
        where: { id: sl.id },
        data: updateData,
      });

      updated++;
    }

    return res.json({
      success: true,
      totalChecked: salesLeads.length,
      updated,
    });
  } catch (error) {
    console.error("❌ Backfill failed:", error);
    return res.status(500).json({
      success: false,
      message: "Backfill failed",
      error: error.message,
    });
  }
});

export default router;
