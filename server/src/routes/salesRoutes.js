import express from "express";
import prisma from "../prismaClient.js";
import prismaExternalCRM from "../../prisma/externalCRM.js";

const router = express.Router();

/**
 * ============================================================
 * CREATE SINGLE SALES LEAD (from Lead CRM)
 * POST /api/sales/leads
 * ============================================================
 */
router.post("/leads", async (req, res) => {
  try {
    const lead = req.body;

    console.log("📩 Incoming Lead CRM payload:", lead);
    const newLead = await prisma.salesLead.create({
      data: {
        client: lead.clientEmail ?? lead.client ?? "Unknown Client",
        email: lead.leadEmail ?? lead.email ?? null,
        cc: lead.ccEmail ?? lead.cc ?? null,
        empId: lead.empId ?? lead.employeeId ?? null,

        agentName: lead.agentName ?? null, // ✅ ADD
        website: lead.website ?? null, // ✅ ADD
        link: lead.link ?? null, // ✅ ADD

        phone: lead.phone ?? null,
        country: lead.country ?? null,

        subject: lead.subjectLine ?? lead.subject ?? null,
        body: lead.emailPitch ?? lead.body ?? null,
        response: lead.emailResponce ?? lead.response ?? null,

        leadType: lead.leadType ?? null,
        Result: lead.Result ?? null,

        date: lead.date ? new Date(lead.date) : null, // ✅ ADD
        createdAt: lead.createdAt ? new Date(lead.createdAt) : new Date(),

        leadStatus: "New",
      },
    });

    console.log("✅ SalesLead created:", newLead.id);

    return res.status(201).json({
      success: true,
      message: "Lead ingested successfully",
      data: newLead,
    });
  } catch (error) {
    console.error("❌ Error creating SalesLead:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to ingest lead",
      error: error.message,
    });
  }
});

/**
 * ============================================================
 * CREATE BULK SALES LEADS
 * POST /api/sales/leads/bulk
 * ============================================================
 */
router.post("/leads/bulk", async (req, res) => {
  try {
    const leads = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or empty leads array",
      });
    }

    console.log(`📦 Bulk ingest: ${leads.length} leads`);

    const formattedLeads = leads.map((lead) => ({
      client: lead.clientEmail ?? lead.client ?? "Unknown Client",
      email: lead.leadEmail ?? lead.email ?? null,
      cc: lead.ccEmail ?? lead.cc ?? null,
      empId: lead.empId ?? lead.employeeId ?? null,

      agentName: lead.agentName ?? null, // ✅ ADD
      website: lead.website ?? null,
      link: lead.link ?? null, // ✅ ADD

      phone: lead.phone ?? null,
      country: lead.country ?? null,

      subject: lead.subjectLine ?? lead.subject ?? null,
      body: lead.emailPitch ?? lead.body ?? null,
      response: lead.emailResponce ?? lead.response ?? null,

      leadType: lead.leadType ?? null,
      Result: lead.Result ?? null,

      date: lead.date ? new Date(lead.date) : null, // ✅ ADD
      createdAt: lead.createdAt ? new Date(lead.createdAt) : new Date(),

      leadStatus: "New",
    }));

    await prisma.salesLead.createMany({
      data: formattedLeads,
      skipDuplicates: true,
    });

    console.log("✅ Bulk SalesLeads ingested");

    return res.json({
      success: true,
      message: "Bulk leads ingested successfully",
      count: formattedLeads.length,
    });
  } catch (error) {
    console.error("❌ Bulk ingest error:", error);
    return res.status(500).json({
      success: false,
      message: "Bulk lead ingestion failed",
      error: error.message,
    });
  }
});

/**
 * ============================================================
 * GET NEW SALES LEADS
 * GET /api/sales/leads
 * ============================================================
 */

router.get("/leads", async (req, res) => {
  try {
    // ✅ Pagination params
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    // ✅ Calculate skip
    const skip = (page - 1) * limit;

    // ✅ Total count
    const total = await prisma.salesLead.count({
      where: {
        leadStatus: "New",
      },
    });

    // ✅ Paginated fetch
    // const leads = await prisma.salesLead.findMany({
    //   where: {
    //     leadStatus: "New",
    //   },
    //   orderBy: {
    //     createdAt: "desc",
    //   },

    //   skip,
    //   take: limit,
    // });
    // ✅ Fetch Sales CRM leads
const salesLeads = await prisma.salesLead.findMany({
  where: {
    leadStatus: "New",
  },
  orderBy: {
    createdAt: "desc",
  },

  skip,
  take: limit,
});

// ✅ Extract emails from Sales CRM
const emails = salesLeads
  .map((lead) => lead.client?.toLowerCase()?.trim())
  .filter(Boolean);

// ✅ Fetch matching leads from Lead CRM DB
// ✅ Fetch matching leads from Lead CRM DB using RAW SQL
const formattedEmails = emails
  .map((email) => `'${email}'`)
  .join(",");

const leadCRMLeads =
  await prismaExternalCRM.$queryRawUnsafe(`
    SELECT
      "clientEmail",
      "salesEmployeeName",
      "salesEmployeeEmail"
    FROM "Lead"
    WHERE LOWER("clientEmail") IN (${formattedEmails})
  `);

    // ✅ Create email → employee map
    const employeeMap = {};

    for (const item of leadCRMLeads) {
      const email = item.clientEmail?.toLowerCase()?.trim();

      if (!email) continue;

      employeeMap[email] = {
        name: item.salesEmployeeName,
        email: item.salesEmployeeEmail,
      };
    }

    // ✅ Merge Lead CRM handler into Sales CRM leads
    const leads = salesLeads.map((lead) => {
      const matched =
        employeeMap[lead.client?.toLowerCase()?.trim()] || {};

      return {
        ...lead,

        referenceEmployeeName: matched.name || null,
        referenceEmployeeEmail: matched.email || null,
      };
    });

    return res.json({
      success: true,

      // ✅ Pagination info
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),

      // ✅ Actual data
      data: leads,
    });
  } catch (error) {
    console.error("❌ Fetch SalesLeads error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales leads",
      error: error.message,
    });
  }
});

export default router;