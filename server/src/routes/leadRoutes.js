import express from "express";
import prisma from "../prismaClient.js";

const router = express.Router();

/* ==========================================================
   ✅ 1️⃣ Forward Lead
   ========================================================== */
router.post("/forward", async (req, res) => {
  try {
    const {
      id,
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
      userId,
    } = req.body;

    if (!userId || !client || !email) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    // ✅ Create new LeadDetails record
    const newLeadDetail = await prisma.leadDetails.create({
      data: {
        date: new Date(date),
        client,
        email,
        cc,
        phone,
        subject,
        body,
        response,
        leadType,
        leadStatus: "New",
        brand,
        country,
        user: { connect: { id: Number(userId) } },
      },
    });

    // ✅ Optionally update SalesLead as forwarded
    await prisma.salesLead.update({
      where: { id: Number(id) },
      data: { leadStatus: "Forwarded" },
    });

    res.json({
      success: true,
      message: "Lead forwarded successfully.",
      data: newLeadDetail,
    });
  } catch (error) {
    console.error("❌ Error in /leads/forward:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while forwarding lead.",
    });
  }
});

/* ==========================================================
   ✅ 2️⃣ Get all leads (with user info)
   ========================================================== */
router.get("/all", async (req, res) => {
  try {
    const leads = await prisma.leadDetails.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { date: "desc" },
    });

    res.json({ success: true, total: leads.length, data: leads });
  } catch (error) {
    console.error("❌ Error fetching leads:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leads",
      error: error.message,
    });
  }
});

/* ==========================================================
   ✅ 3️⃣ Fetch only leads where result = "pending"
   ========================================================== */
router.get("/pending", async (req, res) => {
  try {
    console.log("📡 Fetching pending leads...");
    const pendingLeads = await prisma.leadDetails.findMany({
      where: { result: "pending" },
      include: { user: true },
      orderBy: { date: "desc" },
    });

    res.json({
      success: true,
      total: pendingLeads.length,
      data: pendingLeads,
    });
  } catch (error) {
    console.error("❌ Error fetching pending leads:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending leads",
      error: error.message,
    });
  }
});

// ==========================================================
// 🔥 NEW ROUTE: Get SalesLead subject & body by email
// ==========================================================
router.get("/saleslead-by-email/:email", async (req, res) => {
  try {
    const email = req.params.email.trim().toLowerCase();

    // Get the latest SalesLead for this email
    const sales = await prisma.salesLead.findFirst({
      where: {
        email: email,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        subject: true,
        body: true,
        leadDetailsId: true,
        createdAt: true,
      },
    });

    if (!sales) {
      return res.json({
        success: true,
        message: "No sales lead found for this email",
        data: null,
      });
    }

    return res.json({
      success: true,
      message: "SalesLead fetched successfully",
      data: sales,
    });
  } catch (err) {
    console.error("❌ Error in /saleslead-by-email:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching SalesLead",
      error: err.message,
    });
  }
});

/* ==========================================================
   ✅ UPDATED ROUTE — Fetch Lead Details by Client Email
   ========================================================== */
router.get("/followups", async (req, res) => {
  try {
    const { email } = req.query;

    // ✅ Step 1: Validate email parameter
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email query parameter is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    console.log(
      `📩 Fetching lead details for client email: ${normalizedEmail}`
    );

    // ✅ Step 2: Fetch leads from LeadDetails table
    const leads = await prisma.leadDetails.findMany({
      where: {
        email: normalizedEmail,
      },
      orderBy: {
        date: "desc",
      },
    });

    // ✅ Step 3: Handle no record found
    if (!leads || leads.length === 0) {
      console.warn(`⚠️ No leads found for ${normalizedEmail}`);
      return res.status(200).json({
        success: true,
        message: "No leads found for this client email.",
        total: 0,
        data: [],
      });
    }

    // ✅ Step 4: Return formatted response
    return res.status(200).json({
      success: true,
      message: "Lead details fetched successfully.",
      total: leads.length,
      data: leads,
    });
  } catch (error) {
    // ✅ Step 5: Error handling
    console.error("❌ Error fetching follow-up details:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching follow-up details.",
      error: error.message,
    });
  }
});

/* ==========================================================
   ✳️ NEW: Get Single Lead by Email (for Edit Modal)
   ========================================================== */
// router.get("/by-email/:email", async (req, res) => {
//   try {
//     const { email } = req.params;

//     if (!email || !email.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: "Email parameter is required.",
//       });
//     }

//     const normalizedEmail = email.trim().toLowerCase();

//     const lead = await prisma.leadDetails.findFirst({
//       where: { email: normalizedEmail },
//       orderBy: { date: "desc" },
//     });

//     if (!lead) {
//       return res.status(404).json({
//         success: false,
//         message: `No lead found for ${normalizedEmail}`,
//       });
//     }

//     res.json({
//       success: true,
//       message: "Lead fetched successfully.",
//       data: lead,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching lead by email:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error while fetching lead by email.",
//       error: error.message,
//     });
//   }
// });
/* ==========================================================
   ✳️ 6️⃣ NEW: Get Single Lead by Email (Used by Edit Modal)
   ========================================================== */
router.get("/by-email/:email", async (req, res) => {
  try {
    const { email } = req.params;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email parameter is required.",
      });
    }

    const emailStr = email.trim();
    console.log(`🔎 Searching for lead with email: ${emailStr}`);

    // 🔥 CRITICAL FIX:
    // We search in the 'client' column first because that is where the Lead's email is stored.
    // We also search 'email' column as a backup.
    const lead = await prisma.leadDetails.findFirst({
      where: {
        OR: [
          { client: { equals: emailStr, mode: "insensitive" } }, // ✅ Correct column
          { email: { equals: emailStr, mode: "insensitive" } }, // ⚠️ Fallback
        ],
      },
      orderBy: { date: "desc" },
    });

    if (!lead) {
      console.warn(`⚠️ Lead not found for: ${emailStr}`);
      return res.status(404).json({
        success: false,
        message: `No lead found for ${emailStr}`,
      });
    }

    res.json({
      success: true,
      message: "Lead fetched successfully.",
      data: lead,
    });
  } catch (error) {
    console.error("❌ Error fetching lead by email:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching lead by email.",
      error: error.message,
    });
  }
});
/* ==========================================================
   ✳️ NEW: Update Lead by ID (used in Edit Modal)
   ========================================================== */
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client,
      email,
      cc,
      phone,
      subject,
      body,
      response,
      leadStatus,
      salesperson,
      brand,
      companyName,
      dealValue,
      result,
      day,
      followUpDate,
      website,
      link,
      agentName,
      country,
    } = req.body;

    // ✅ Validate ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Missing lead ID.",
      });
    }

    // ✅ Find existing lead
    const lead = await prisma.leadDetails.findUnique({
      where: { id: Number(id) },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    // ✅ Safely parse existing follow-up history
    let history = [];
    try {
      history = lead.followUpHistory ? JSON.parse(lead.followUpHistory) : [];
    } catch {
      history = [];
    }

    // ✅ Add new follow-up record if provided
    if (day && followUpDate) {
      history.push({ day, date: followUpDate });
    }

    // ✅ Determine if isFollowedUp should reset
    const shouldUnsetFollowUp = lead.isFollowedUp ? false : lead.isFollowedUp;

    // ✅ Perform update
    const updated = await prisma.leadDetails.update({
      where: { id: Number(id) },
      data: {
        client,
        email,
        cc,
        phone,
        subject,
        body,
        response,
        leadStatus,
        salesperson,
        brand,
        companyName,
        dealValue: dealValue ? parseFloat(dealValue) : null,
        result,
        day,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        followUpHistory: history,
        isFollowedUp: shouldUnsetFollowUp,
        website,
        link,
        agentName,
        country,
      },
    });

    // ✅ Return success
    res.json({
      success: true,
      message: "Lead updated successfully (follow-up history tracked)",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Error updating lead:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating lead.",
      error: error.message,
    });
  }
});

//==========================================================
// ✅ 7️⃣ Update Lead Details (with Follow-Up History Handling)
// FIXED: Now includes website, link, agentName, country
//==========================================================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client,
      email,
      cc,
      phone,
      subject,
      body,
      response,
      leadStatus,
      salesperson,
      brand,
      companyName,
      dealValue,
      result,
      day,
      followUpDate,
      website, // ✅ Added
      link, // ✅ Added
      agentName, // ✅ Added
      country, // ✅ Added
    } = req.body;

    console.log("📝 Updating lead:", id, "with data:", {
      client,
      website,
      link,
      agentName,
      country,
    });

    const lead = await prisma.leadDetails.findUnique({
      where: { id: Number(id) },
    });

    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    // ✅ Handle follow-up history safely
    let history = [];
    try {
      history = lead.followUpHistory ? JSON.parse(lead.followUpHistory) : [];
    } catch {
      history = [];
    }

    // ✅ Add new follow-up entry if valid
    if (day && followUpDate) {
      history.push({ day, date: followUpDate });
    }

    // ✅ Flip isFollowedUp to false if currently true
    const shouldUnsetFollowUp = lead.isFollowedUp ? false : lead.isFollowedUp;

    const updatedLead = await prisma.leadDetails.update({
      where: { id: Number(id) },
      data: {
        client,
        email,
        cc,
        phone,
        subject,
        body,
        response,
        leadStatus,
        salesperson,
        brand,
        companyName,
        dealValue: dealValue ? parseFloat(dealValue) : null,
        result,
        day,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        followUpHistory: history,
        isFollowedUp: shouldUnsetFollowUp,
        website, // ✅ Added
        link, // ✅ Added
        agentName, // ✅ Added
        country, // ✅ Added
      },
    });

    console.log("✅ Lead updated successfully:", updatedLead.id);

    return res.json({
      success: true,
      message: "Lead updated successfully",
      data: updatedLead,
    });
  } catch (error) {
    console.error("❌ Error updating lead:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating lead",
      error: error.message,
    });
  }
});

/* ==========================================================
   ✅ NEW ROUTE: Fetch all emails by leadStatus (LeadDetails only)
   ========================================================== */
router.get("/by-status", async (req, res) => {
  try {
    const { status } = req.query;

    const leads = await prisma.leadDetails.findMany({
      where: { leadStatus: status },
      select: {
        email: true,
        cc: true,
      },
    });

    let emailList = [];

    for (const lead of leads) {
      if (lead.email) {
        emailList.push(lead.email.toLowerCase().trim());
      }

      // Split CC into multiple entries
      if (lead.cc) {
        const ccArr = String(lead.cc)
          .split(/[;,]/)
          .map((c) => c.toLowerCase().replace(/<|>|"/g, "").trim())
          .filter(Boolean);

        emailList.push(...ccArr);
      }
    }

    // Remove duplicates
    emailList = [...new Set(emailList)];

    res.json({
      success: true,
      total: emailList.length,
      data: emailList,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ==========================================================
   ✅ 5️⃣ Fetch leads assigned to specific employee by email
   (⚠️ Keep this LAST so it doesn't override PUT /:id)
   ========================================================== */
router.get("/employee/:email", async (req, res) => {
  const { email } = req.params;

  try {
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const leads = await prisma.leadDetails.findMany({
      where: {
        user: {
          email: email,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    if (!leads || leads.length === 0) {
      return res.json({
        success: true,
        message: "No leads found for this user.",
        total: 0,
        data: [],
      });
    }

    const sanitized = leads.map((lead) => ({
      ...lead,
      body: lead.body?.replace(/[^\x20-\x7E\n\r\t]/g, "") || "",
      response: lead.response?.replace(/[^\x20-\x7E\n\r\t]/g, "") || "",
      cc: lead.cc?.replace(/[^\x20-\x7E\n\r\t]/g, "") || "",
    }));

    res.json({
      success: true,
      total: sanitized.length,
      data: sanitized,
    });
  } catch (error) {
    console.error("❌ Error fetching leads by email:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leads",
      error: error.message,
    });
  }
});

export default router;
