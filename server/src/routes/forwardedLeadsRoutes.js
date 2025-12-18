import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

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
      include: { user: true },
      orderBy: { date: "desc" },
    });

    // ✅ Filter to exclude closed or pending results
    const leadsToShow = allLeads.filter((lead) => {
      const hasAllThree =
        lead.leadStatus?.trim() &&
        lead.brand?.trim() &&
        lead.salesperson?.trim();

      const result = lead.result?.trim()?.toLowerCase() || "";
      // Show only leads that are not closed or pending
      if (result === "closed" || result === "pending") return false;

      return !hasAllThree || result === "";
    });

    res.json({
      success: true,
      total: leadsToShow.length,
      data: leadsToShow,
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
// router.put("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const leadId = Number(id);
//     if (isNaN(leadId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Lead ID.",
//       });
//     }

//     const {
//       leadStatus,
//       salesperson,
//       brand,
//       result, // ✅ lowercase result field
//     } = req.body;

//     const updated = await prisma.leadDetails.update({
//       where: { id: leadId },
//       data: {
//         leadStatus: leadStatus || undefined,
//         salesperson: salesperson || undefined,
//         brand: brand || undefined,
//         result: result || undefined, // ✅ lowercase
//       },
//     });

//     res.json({
//       success: true,
//       message: "Lead updated successfully.",
//       data: updated,
//     });
//   } catch (error) {
//     console.error("❌ Error updating forwarded lead:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error updating forwarded lead.",
//       error: error.message,
//     });
//   }
// });

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

// // src/routes/forwardedLeadsRoutes.js
// import express from "express";
// import prisma from "../prismaClient.js";

// const router = express.Router();

// // ✅ Get all forwarded leads (for admin dashboard)
// router.get("/", async (req, res) => {
//   try {
//     const forwardedLeads = await prisma.salesLead.findMany({
//       where: { leadStatus: "Forwarded" },
//       include: {
//         employee: {
//           select: { id: true, name: true, email: true },
//         },
//       },
//       orderBy: { date: "desc" },
//     });

//     res.json({
//       success: true,
//       total: forwardedLeads.length,
//       data: forwardedLeads,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching forwarded leads:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching forwarded leads",
//       error: error.message,
//     });
//   }
// });

// router.get("/assigned/:userId", async (req, res) => {
//   const { userId } = req.params;
//   const leads = await prisma.leadDetails.findMany({
//     where: { userId: Number(userId) },
//     orderBy: { date: "desc" },
//   });

//   res.json({ success: true, data: leads });
// });

// // ✅ Update a single lead

// router.put("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       leadStatus,
//       salesperson,
//       brand,
//       result, // 👈 lowercase field name to match Prisma schema
//       companyName,
//       meetingNotes,
//       followUpDate,
//       dealValue,
//     } = req.body;

//     // ✅ Validate ID format
//     const leadId = parseInt(id);
//     if (isNaN(leadId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid lead ID format",
//       });
//     }

//     // ✅ Basic required field validation
//     if (!leadStatus || !salesperson || !brand) {
//       return res.status(400).json({
//         success: false,
//         message: "leadStatus, salesperson, and brand are required fields.",
//       });
//     }

//     // ✅ Update the lead (result is optional)
//     const updatedLead = await prisma.leadDetails.update({
//       where: { id: leadId },
//       data: {
//         leadStatus: leadStatus.trim(),
//         salesperson: salesperson.trim(),
//         brand: brand.trim(),
//         result: result ? result.trim() : null,  // 👈 lowercase matches Prisma
//         companyName: companyName?.trim() || null,
//         meetingNotes: meetingNotes?.trim() || null,
//         followUpDate: followUpDate ? new Date(followUpDate) : null,
//         dealValue: dealValue ? parseFloat(dealValue) : null,
//         lastUpdated: new Date(),
//       },
//     });

//     res.json({
//       success: true,
//       message: "✅ Lead updated successfully",
//       updatedLead,
//     });
//   } catch (error) {
//     console.error("❌ Error updating lead:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error updating lead",
//       error: error.message,
//     });
//   }
// });

// export default router;
