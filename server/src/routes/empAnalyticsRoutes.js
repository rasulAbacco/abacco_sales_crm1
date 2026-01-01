// empAnalytics.route.js
import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

/* -----------------------
   Date helpers
------------------------*/
function parseDateSafe(d) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function buildRangeFromQuery({ period, year, month, from, to }) {
  const now = new Date();
  let start = null;
  let end = null;

  const fd = parseDateSafe(from);
  const td = parseDateSafe(to);

  if (fd && td) {
    start = new Date(fd);
    start.setHours(0, 0, 0, 0);
    end = new Date(td);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const y = Number(year) || now.getFullYear();

  if (period === "daily") {
    start = new Date();
    start.setHours(0, 0, 0, 0);
    end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === "weekly") {
    end = new Date();
    end.setHours(23, 59, 59, 999);
    start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (period === "lastMonth") {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const m = d.getMonth();
    const yy = d.getFullYear();
    start = new Date(yy, m, 1);
    end = new Date(yy, m + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (period === "monthly" && month) {
    const m = Number(month) - 1;
    start = new Date(y, m, 1);
    end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  return {
    start: new Date(y, 0, 1),
    end: new Date(y, 11, 31, 23, 59, 59, 999),
  };
}

/* ------------------------------------------------------
   IMPORTANT:
   NEW employeeWhere() — USE USER RELATIONS ONLY
-------------------------------------------------------*/
// function employeeWhere(userId, extra = {}) {
//   const cleaned = {};
//   Object.keys(extra).forEach((k) => {
//     if (extra[k] !== undefined) cleaned[k] = extra[k];
//   });

//   return {
//     ...cleaned,
//     OR: [
//       { userId: userId }, // LeadDetails belongs to this user
//       { salesLead: { userId: userId } }, // Lead belongs to SalesLead by this user
//     ],
//   };
// }
function employeeWhere(userId, extra = {}) {
  const cleaned = {};
  Object.keys(extra).forEach((k) => {
    if (extra[k] !== undefined) cleaned[k] = extra[k];
  });

  return {
    ...cleaned,
    OR: [
      { userId: userId },
      { SalesLead: { some: { userId: userId } } }, // ✅ Capitalized and added 'some' for array relation
    ],
  };
}
/* ------------------------------------------------------
   Dashboard
-------------------------------------------------------*/
router.get("/dashboard", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const userId = req.user.id;
    const { period, year, month, from, to, leadType } = req.query;

    const { start, end } = buildRangeFromQuery({
      period,
      year,
      month,
      from,
      to,
    });

    const where = employeeWhere(userId, {
      leadType: leadType && leadType !== "all" ? leadType : undefined,
      lastUpdated: start ? { gte: start, lte: end } : undefined,
    });

    const totalLeads = await prisma.leadDetails.count({ where });

    const dealSum = await prisma.leadDetails.aggregate({
      _sum: { dealValue: true },
      where,
    });

    const statusGroups = await prisma.leadDetails.groupBy({
      by: ["leadStatus"],
      where,
      _count: { id: true },
    });

    const closed = statusGroups
      .filter((s) => ["Deal", "Active Client"].includes(s.leadStatus))
      .reduce((sum, s) => sum + s._count.id, 0);

    const pending = statusGroups
      .filter((s) => s.leadStatus.includes("Pending"))
      .reduce((sum, s) => sum + s._count.id, 0);

    const countryGroups = await prisma.leadDetails.groupBy({
      by: ["country"],
      where,
      _count: { id: true },
      _sum: { dealValue: true },
    });

    res.json({
      success: true,
      dashboard: {
        totalLeads,
        totalDealValue: Number(dealSum._sum.dealValue ?? 0),
        closed,
        pending,
        topCountries: countryGroups,
      },
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------
   Leads by Status
------------------------*/
router.get("/leads/status", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const userId = req.user.id;
    const { period, year, month, from, to, leadType } = req.query;

    const { start, end } = buildRangeFromQuery({
      period,
      year,
      month,
      from,
      to,
    });

    const where = employeeWhere(userId, {
      leadType: leadType && leadType !== "all" ? leadType : undefined,
      lastUpdated: start ? { gte: start, lte: end } : undefined,
    });

    const data = await prisma.leadDetails.groupBy({
      by: ["leadStatus"],
      where,
      _count: { id: true },
    });

    res.json({
      success: true,
      statusCounts: data.map((s) => ({
        leadStatus: s.leadStatus,
        count: s._count.id,
      })),
    });
  } catch (err) {
    console.error("Status API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------
   Leads by Type
------------------------*/
router.get("/leads/type", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const userId = req.user.id;
    const { period, year, month, from, to } = req.query;
    const { start, end } = buildRangeFromQuery({
      period,
      year,
      month,
      from,
      to,
    });

    const where = employeeWhere(userId, {
      date: start ? { gte: start, lte: end } : undefined,
      active: true,
    });

    const data = await prisma.leadDetails.groupBy({
      by: ["leadType"],
      where,
      _count: { id: true },
    });

    res.json({
      success: true,
      typeCounts: data.map((d) => ({
        leadType: d.leadType,
        count: d._count.id,
      })),
    });
  } catch (err) {
    console.error("Type Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------
   Leads Monthly
------------------------*/
router.get("/leads/monthly", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const userId = req.user.id;
    const { period, year, month, from, to } = req.query;

    const { start, end } = buildRangeFromQuery({
      period,
      year,
      month,
      from,
      to,
    });

    const where = employeeWhere(userId, {
      lastUpdated: start ? { gte: start, lte: end } : undefined,
    });

    const rows = await prisma.leadDetails.findMany({
      where,
      select: { lastUpdated: true },
    });

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const counts = new Array(12).fill(0);

    rows.forEach((r) => {
      if (!r.lastUpdated) return;
      const m = new Date(r.lastUpdated).getMonth();
      counts[m]++;
    });

    res.json({
      success: true,
      monthly: monthNames.map((m, i) => ({
        month: m,
        totalLeads: counts[i],
      })),
    });
  } catch (err) {
    console.error("Monthly Trend Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------
   Leads by Country
------------------------*/
router.get("/leads/country", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const userId = req.user.id;
    const { period, year, month, from, to } = req.query;
    const { start, end } = buildRangeFromQuery({
      period,
      year,
      month,
      from,
      to,
    });

    const where = employeeWhere(userId, {
      date: start ? { gte: start, lte: end } : undefined,
      active: true,
    });

    const totals = await prisma.leadDetails.groupBy({
      by: ["country"],
      where,
      _count: { id: true },
      _sum: { dealValue: true },
    });

    res.json({
      success: true,
      countries: totals.map((c) => ({
        country: c.country ?? "Unknown",
        count: c._count.id,
        dealValue: Number(c._sum.dealValue ?? 0),
      })),
    });
  } catch (err) {
    console.error("Country Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
