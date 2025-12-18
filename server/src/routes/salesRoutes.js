import express from "express";
import prisma from "../prismaClient.js";

const router = express.Router();

/**
 * ✅ Receive a single lead (from Leads CRM)
 * URL: POST http://localhost:4002/api/sales/leads
 */
router.post("/leads", async (req, res) => {
  const lead = req.body;

  try {
    console.log("📩 Incoming lead from Leads CRM:", lead);

    // ✅ Create a SalesLead record in DB
    const newLead = await prisma.salesLead.create({
      data: {
        client: lead.clientEmail || lead.client || "",
        email: lead.leadEmail || lead.email || "",
        cc: lead.ccEmail || lead.cc || "", // ✅ included — no removals
        phone: lead.phone || "",
        country: lead.country || "",
        subject: lead.subjectLine || lead.subject || "",
        body: lead.emailPitch || lead.body || "",
        response: lead.emailResponce || lead.response || "",
        leadType: lead.leadType || "",
        createdAt: new Date(lead.createdAt || Date.now()),
        leadStatus: "New",
        empId: lead.empId || null,
        Result: lead.Result || null, // ✅ keep it safe for later use
      },
    });

    console.log("✅ SalesLead created successfully:", newLead.id);
    res.status(201).json({
      success: true,
      message: "Lead saved successfully with all fields intact",
      data: newLead,
    });
  } catch (err) {
    console.error("❌ Error saving lead:", err);
    res.status(500).json({
      success: false,
      message: "Error saving SalesLead",
      error: err.message,
    });
  }
});

/**
 * ✅ Receive multiple leads (bulk)
 */
router.post("/leads/bulk", async (req, res) => {
  try {
    const leads = req.body;

    // 🧩 Debug 1: check if data actually came in
    console.log("🔥 Received bulk leads request");

    if (!Array.isArray(leads) || leads.length === 0) {
      console.log("❌ Invalid or empty leads array:", leads);
      return res.status(400).json({ message: "Invalid or empty lead array" });
    }

    console.log("🟢 Leads count received:", leads.length);

    // 🧩 Debug 2: log first lead to confirm structure
    console.log("🧩 First lead sample:", leads[0]);

    const formattedLeads = leads.map((lead) => ({
      client: lead.clientEmail || lead.client || "Unknown Client",
      email: lead.leadEmail || lead.email || "unknown@example.com",
      cc: lead.ccEmail || lead.cc || "",
      phone: lead.phone || "",
      country: lead.country || "",
      subject: lead.subjectLine || lead.subject || "No Subject",
      body: lead.emailPitch || lead.body || "",
      response: lead.emailResponce || lead.response || "",
      leadType: lead.leadType || "General Lead",
      createdAt: lead.createdAt ? new Date(lead.createdAt) : new Date(),
      leadStatus: "New",
    }));

    console.log("🟢 Mapped leads ready for insert:", formattedLeads.length);

    // 🧩 Debug 3: ensure no undefined values (Prisma will reject)
    formattedLeads.forEach((l, i) => {
      Object.entries(l).forEach(([key, val]) => {
        if (val === undefined) console.log(`⚠️ lead[${i}].${key} is undefined`);
      });
    });

    // ✅ Insert leads safely
    await prisma.salesLead.createMany({
      data: formattedLeads,
      skipDuplicates: true,
    });

    console.log("✅ Bulk leads inserted successfully!");
    res.json({ success: true, message: "All leads saved successfully" });
  } catch (err) {
    console.error("❌ Error saving bulk leads:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ✅ Get all leads (for frontend)
 */
// router.get("/leads", async (req, res) => {
//   try {
//     const leads = await prisma.salesLead.findMany({
//       orderBy: { createdAt: "desc" },
//     });
//     res.json(leads);
//   } catch (err) {
//     console.error("❌ Error fetching leads:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });
// router.get("/leads", async (req, res) => {
//     try {
//         // 1️⃣ Calculate the time 24 hours ago from now
//         const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

//         // 2️⃣ Fetch all leads created in the last 24 hours
//         const leads = await prisma.salesLead.findMany({
//             where: {
//                 createdAt: {
//                     gte: last24Hours,
//                 },
//             },
//             orderBy: {
//                 createdAt: "desc",
//             },
//         });

//         // 3️⃣ Remove full-row duplicates (entire row matches)
//         // Convert each row into a JSON string for easy comparison
//         const uniqueLeadsMap = new Map();
//         const uniqueLeads = [];

//         for (const lead of leads) {
//             const rowSignature = JSON.stringify(lead);
//             if (!uniqueLeadsMap.has(rowSignature)) {
//                 uniqueLeadsMap.set(rowSignature, true);
//                 uniqueLeads.push(lead);
//             }
//         }

//         // 4️⃣ Return clean, sorted, unique, 24-hour filtered results
//         res.json({
//             success: true,
//             total: uniqueLeads.length,
//             data: uniqueLeads,
//         });
//     } catch (err) {
//         console.error("❌ Error fetching leads:", err);
//         res.status(500).json({
//             success: false,
//             message: "Error fetching leads",
//             error: err.message,
//         });
//     }
// });
// router.get("/leads", async (req, res) => {
//   try {
//     const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
//     const leads = await prisma.salesLead.findMany({
//       where: {
//         createdAt: { gte: last24Hours },
//         leadStatus: "New", // 👈 only show new/unforwarded leads
//       },
//       orderBy: { createdAt: "desc" },
//     });
//     res.json({ success: true, total: leads.length, data: leads });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });
// inside src/routes/salesRoutes.js
router.get("/leads", async (req, res) => {
  try {
    // const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const leads = await prisma.salesLead.findMany({
      where: {
        // createdAt: { gte: last24Hours },
        leadStatus: "New",
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, total: leads.length, data: leads });
  } catch (err) {
    console.error("🔥 Prisma error in GET /sales/leads:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
      error: err.message,
    });
  }
});

export default router;
