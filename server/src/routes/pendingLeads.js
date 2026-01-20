import express from "express";
 import prisma from "../prismaClient.js";  // adjust path if needed

const router = express.Router();


/**
 * ✅ Update Pending Lead
 * Endpoint: PUT /api/pendingLeads/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { leadStatus, salesperson, brand, result } = req.body;

    // Validate ID
    const leadId = parseInt(id);
    if (isNaN(leadId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID format",
      });
    }

    // Check if lead exists
    const existingLead = await prisma.leadDetails.findUnique({
      where: { id: leadId },
    });

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // ✅ Update the lead
    const updatedLead = await prisma.leadDetails.update({
      where: { id: leadId },
      data: {
        leadStatus: leadStatus?.trim() || existingLead.leadStatus,
        salesperson: salesperson?.trim() || existingLead.salesperson,
        brand: brand?.trim() || existingLead.brand,
        result: result?.trim()?.toLowerCase() || existingLead.result,
        lastUpdated: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Lead updated successfully",
      updatedLead,
    });
  } catch (error) {
    console.error("❌ Error updating pending lead:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating lead",
      error: error.message,
    });
  }
});

export default router;
