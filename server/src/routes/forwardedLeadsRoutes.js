import express from "express";
import prisma from "../prismaClient.js";



const router = express.Router();


/* ==========================================================
   ✅ 1️⃣  Forward Lead (Create new LeadDetails record)
   ========================================================== */
router.post("/forward", async (req, res) => {
  try {
    const {
      id, // original SalesLead ID
      date,
      client,
      email,
      cc,
      phone,
      subject,
      body,
      response,
      leadType,
      brand,
      country,
      userId, // salesperson id
    } = req.body;

    if (!userId || !client || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, client, or email.",
      });
    }

    // ✅ Create new LeadDetails entry linked to user
    const newLead = await prisma.leadDetails.create({
      data: {
        date: date ? new Date(date) : new Date(),
        client,
        email,
        cc,
        phone,
        subject,
        body,
        response,
        leadType,
        leadStatus: "New",
        brand: brand || "",
        country: country || "",
        result: "", // ✅ use lowercase result field
        user: { connect: { id: Number(userId) } },
      },
    });

    // ✅ (Optional) mark original SalesLead as forwarded
    if (id) {
      await prisma.salesLead.update({
        where: { id: Number(id) },
        data: { leadStatus: "Forwarded" },
      });
    }

    res.json({
      success: true,
      message: "Lead forwarded successfully.",
      data: newLead,
    });
  } catch (error) {
    console.error("❌ Error forwarding lead:", error);
    res.status(500).json({
      success: false,
      message: "Error forwarding lead.",
      error: error.message,
    });
  }
});

/* ==========================================================
   ✅ 2️⃣  Get all leads assigned to a specific salesperson
   ========================================================== */
router.get("/assigned/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdNum = Number(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format.",
      });
    }

    const allLeads = await prisma.leadDetails.findMany({
      where: { userId: userIdNum },
      select: {
        id: true,
        date: true,
        client: true,
        email: true,
        cc: true,
        phone: true,
        subject: true,
        body: true,
        response: true,
        leadType: true,
        leadStatus: true,
        brand: true,
        country: true,
        result: true,
        agentName: true, // ✅ Add agentName
        website: true, // ✅ Add website
        SalesLead: {
          select: { link: true }, // ✅ Add link from SalesLead
        },
        user: {
          select: { name: true },
        },
      },
      orderBy: { date: "desc" },
    });

    // Filter leads (existing logic)
    const leadsToShow = allLeads.filter((lead) => {
      const hasAllThree =
        lead.leadStatus?.trim() &&
        lead.brand?.trim() &&
        lead.salesperson?.trim();

      const result = lead.result?.trim()?.toLowerCase() || "";
      if (result === "closed" || result === "pending") return false;

      return !hasAllThree || result === "";
    });

    // Map to include link (flatten SalesLead.link)
    const leadsWithLink = leadsToShow.map((lead) => ({
      ...lead,
      link: lead.SalesLead?.link || null,
    }));

    res.json({
      success: true,
      total: leadsWithLink.length,
      data: leadsWithLink,
    });
  } catch (error) {
    console.error("❌ Error fetching forwarded leads for user:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching forwarded leads",
      error: error.message,
    });
  }
});

/* ==========================================================
   ✅ 3️⃣  Update a forwarded lead (status, brand, salesperson, result)
   ========================================================== */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const leadId = Number(id);
    if (isNaN(leadId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Lead ID." });
    }

    const { leadStatus, salesperson, brand, result } = req.body;

    const updatedLead = await prisma.leadDetails.update({
      where: { id: leadId },
      data: {
        leadStatus: leadStatus || undefined,
        salesperson: salesperson || undefined,
        brand: brand || undefined,
        result: result || undefined,
        lastUpdated: new Date(),
      },
    });

    // Optional: if the lead is closed/pending, mark inactive or archived
    if (result === "closed" || result === "pending") {
      await prisma.leadDetails.update({
        where: { id: leadId },
        data: { active: false },
      });
    }

    res.json({
      success: true,
      message: "✅ Lead updated successfully",
      data: updatedLead,
    });
  } catch (error) {
    console.error("❌ Error updating forwarded lead:", error);
    res.status(500).json({
      success: false,
      message: "Error updating forwarded lead.",
      error: error.message,
    });
  }
});

export default router;