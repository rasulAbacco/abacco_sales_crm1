// analyticsRoutes.js
import express from "express";
import prisma from "../prismaClient.js";

const router = express.Router();

/* --------------------- Helpers --------------------- */

function parseDateSafe(d) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function buildRangeFromQuery({ period, year, month, from, to }) {
  const now = new Date();
  let start = null;
  let end = null;

  const fromDate = parseDateSafe(from);
  const toDate = parseDateSafe(to);
  if (fromDate && toDate) {
    start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const y = Number(year) || now.getFullYear();

  if (period === "daily") {
    start = new Date(y, now.getMonth(), now.getDate());
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
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
    start = new Date(yy, m, 1, 0, 0, 0, 0);
    end = new Date(yy, m + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (period === "monthly" && month) {
    const m = Number(month) - 1;
    start = new Date(y, m, 1, 0, 0, 0, 0);
    end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  // default yearly for provided year
  start = new Date(y, 0, 1, 0, 0, 0, 0);
  end = new Date(y, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Build Prisma where for LeadDetails that supports:
 * - leadType
 * - status
 * - employeeId (matches multiple possibilities):
 *    * leadDetails.salesperson (string empId)
 *    * leadDetails.user.empId
 *    * leadDetails.salesLead.user.empId
 *
 * Note: frontend likely sends employeeId as empId string (e.g. "AT127")
 */
function buildLeadWhere({ leadType, employeeId, status, start, end }) {
  const where = {};

  if (leadType && leadType !== "all") where.leadType = leadType;
  if (status && status !== "all") where.leadStatus = status;

  // date range
  if (start && end) where.date = { gte: start, lte: end };
  else if (start) where.date = { gte: start };
  else if (end) where.date = { lte: end };

  // employee filter: build OR condition matching multiple relations/fields
  if (employeeId && employeeId !== "all") {
    where.OR = [
      { salesperson: employeeId }, // plain string field
      { user: { empId: employeeId } }, // LeadDetails.user relation
      { salesLead: { user: { empId: employeeId } } }, // via SalesLead -> User
    ];
  }

  return where;
}

/* --------------------- Routes --------------------- */

/**
 * GET /api/analytics/leads/monthly
 * Returns month-wise aggregated leads for the chosen range/filters.
 */
router.get("/leads/monthly", async (req, res) => {
  try {
    const { period, year, month, from, to, leadType, employeeId, status } =
      req.query;

    const { start, end } = buildRangeFromQuery({
      period,
      year,
      month,
      from,
      to,
    });

    // Use parameterized raw SQL to GROUP BY month (works reliably)
    // We join to SalesLead and User to allow employee filters by empId (coalesce logic)
    const rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(MONTH FROM l."date")::int AS month,
        COUNT(*)::int AS totalLeads,
        COALESCE(SUM(l."dealValue")::numeric, 0) AS totalValue
      FROM "LeadDetails" l
      LEFT JOIN "SalesLead" s ON l."salesLeadId" = s."id"
      LEFT JOIN "User" u ON (l."userId" = u."id" OR s."userId" = u."id" OR l."salesperson" = u."empId")
      WHERE l."date" >= ${start} AND l."date" <= ${end}
      ${
        leadType && leadType !== "all"
          ? Prisma.sql`AND l."leadType" = ${leadType}`
          : Prisma.empty
      }
      ${
        status && status !== "all"
          ? Prisma.sql`AND l."leadStatus" = ${status}`
          : Prisma.empty
      }
      ${
        employeeId && employeeId !== "all"
          ? Prisma.sql`AND (u."empId" = ${employeeId} OR l."salesperson" = ${employeeId})`
          : Prisma.empty
      }
      GROUP BY month
      ORDER BY month;
    `;

    const months = [
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

    const formatted = months.map((m, i) => {
      const r = rows.find((row) => Number(row.month) === i + 1);
      return {
        month: m,
        totalLeads: r ? Number(r.totalleads ?? r.totalLeads ?? 0) : 0,
        totalValue: r ? Number(r.totalvalue ?? r.totalValue ?? 0) : 0,
      };
    });

    return res.json({
      success: true,
      year: Number(year) || new Date().getFullYear(),
      monthly: formatted,
    });
  } catch (err) {
    console.error("leads/monthly error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/leads/status
 * Returns grouped counts by leadStatus
 */
router.get("/leads/status", async (req, res) => {
  try {
    const { period, year, month, from, to, leadType, employeeId } = req.query;

    const { start, end } = buildRangeFromQuery({
      period,
      year,
      month,
      from,
      to,
    });

    const where = buildLeadWhere({ leadType, employeeId, start, end });

    const data = await prisma.leadDetails.groupBy({
      by: ["leadStatus"],
      where,
      _count: { id: true },
    });

    // 🔥 ZERO FIX — no data found
    if (!data || data.length === 0) {
      return res.json({
        success: true,
        statusCounts: [
          { leadStatus: "Closed", count: 0 },
          { leadStatus: "Pending", count: 0 },
          { leadStatus: "In Progress", count: 0 },
          { leadStatus: "New", count: 0 },
        ],
      });
    }

    const statusCounts = data.map((d) => ({
      leadStatus: d.leadStatus ?? "Unknown",
      count: d._count.id ?? 0,
    }));

    return res.json({ success: true, statusCounts });
  } catch (err) {
    console.error("leads/status error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/leads/type
 * Returns grouped counts by leadType
 */
router.get("/leads/type", async (req, res) => {
  try {
    const { period, year, month, from, to, leadType, employeeId } = req.query;

    const { start, end } = buildRangeFromQuery({
      period,
      year,
      month,
      from,
      to,
    });

    const where = buildLeadWhere({
      leadType: leadType === "all" ? undefined : leadType,
      employeeId,
      start,
      end,
    });

    const data = await prisma.leadDetails.groupBy({
      by: ["leadType"],
      where,
      _count: { id: true },
    });

    // 🔥 ZERO FIX — default types with count 0
    if (!data || data.length === 0) {
      return res.json({
        success: true,
        typeCounts: [
          { leadType: "Hot", count: 0 },
          { leadType: "Warm", count: 0 },
          { leadType: "Cold", count: 0 },
          { leadType: "Unknown", count: 0 },
        ],
      });
    }

    const typeCounts = data.map((d) => ({
      leadType: d.leadType ?? "Unknown",
      count: d._count.id ?? 0,
    }));

    return res.json({ success: true, typeCounts });
  } catch (err) {
    console.error("leads/type error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/leads/country
 * Returns countries with counts, dealValue, closed/pending breakdown
 */
router.get("/leads/country", async (req, res) => {
  try {
    const { period, year, month, from, to, leadType, employeeId } = req.query;
    const { start, end } = buildRangeFromQuery({
      period,
      year,
      month,
      from,
      to,
    });

    const where = buildLeadWhere({ leadType, employeeId, start, end });

    // totals by country
    const totals = await prisma.leadDetails.groupBy({
      by: ["country"],
      where,
      _count: { id: true },
      _sum: { dealValue: true },
    });

    // status grouped by country + status
    const statusData = await prisma.leadDetails.groupBy({
      by: ["country", "leadStatus"],
      where,
      _count: { id: true },
    });

    const enriched = totals.map((c) => {
      const country = c.country ?? "Unknown";
      const closedRow = statusData.find(
        (s) => (s.country ?? "Unknown") === country && s.leadStatus === "Closed"
      );
      const pendingRow = statusData.find(
        (s) =>
          (s.country ?? "Unknown") === country &&
          (s.leadStatus === "Pending" || s.leadStatus === "In Progress")
      );
      return {
        country,
        count: c._count.id ?? 0,
        dealValue: Number(c._sum.dealValue ?? 0),
        closed: closedRow ? closedRow._count.id ?? 0 : 0,
        pending: pendingRow ? pendingRow._count.id ?? 0 : 0,
      };
    });

    enriched.sort((a, b) => b.count - a.count);

    return res.json({ success: true, countries: enriched });
  } catch (err) {
    console.error("leads/country error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/team
 * Returns lead counts grouped by employee with name (tries multiple sources).
 *
 * This raw SQL coalesces:
 *  - LeadDetails.user -> User (user.empId + user.name)
 *  - SalesLead.user -> User (via salesLeadId -> SalesLead.userId)
 *  - LeadDetails.salesperson (string empId)
 *
 * That way frontend shows the proper employee name when available.
 */
router.get("/team", async (req, res) => {
  try {
    const { period, year, month, from, to, leadType, status } = req.query;

    const { start, end } = buildRangeFromQuery({
      period,
      year,
      month,
      from,
      to,
    });

    // WHERE filters
    let whereSql = Prisma.sql``;

    if (start && end) {
      whereSql = Prisma.sql`${whereSql} AND l."date" BETWEEN ${start} AND ${end}`;
    }
    if (leadType) {
      whereSql = Prisma.sql`${whereSql} AND l."leadType" = ${leadType}`;
    }
    if (status) {
      whereSql = Prisma.sql`${whereSql} AND l."leadStatus" = ${status}`;
    }

    // FIXED QUERY — join using userId, not salesperson
    const data = await prisma.$queryRaw`
      SELECT 
        u."empId",
        u."name" AS "empName",
        COUNT(l."id")::int AS "totalLeads"
      FROM "LeadDetails" l
      LEFT JOIN "User" u 
        ON l."userId" = u."id"
      WHERE l."userId" IS NOT NULL
      ${whereSql}
      GROUP BY u."empId", u."name"
      ORDER BY "totalLeads" DESC;
    `;

    return res.json({
      success: true,
      teamStats: data.length > 0 ? data : [],
    });
  } catch (err) {
    console.error("team error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* Email counts (simple) */
router.get("/email/sent", async (req, res) => {
  try {
    const count = await prisma.emailMessage.count({
      where: { direction: "sent" },
    });
    return res.json({ success: true, sent: count });
  } catch (err) {
    console.error("email/sent error:", err);
    return res.json({ success: false, sent: 0 });
  }
});

router.get("/email/received", async (req, res) => {
  try {
    const count = await prisma.emailMessage.count({
      where: { direction: "received" },
    });
    return res.json({ success: true, received: count });
  } catch (err) {
    console.error("email/received error:", err);
    return res.json({ success: false, received: 0 });
  }
});

/**
 * GET /api/analytics/dashboard
 * Returns summary numbers and top countries
 */
router.get("/dashboard", async (req, res) => {
  try {
    const { period, year, month, from, to, leadType, employeeId } = req.query;
    const { start, end } = buildRangeFromQuery({
      period,
      year,
      month,
      from,
      to,
    });

    const leadWhere = buildLeadWhere({
      leadType,
      employeeId,
      start,
      end,
    });

    // totals & deal sum
    const [totalLeadsCount, dealSum] = await Promise.all([
      prisma.leadDetails.count({ where: leadWhere }),
      prisma.leadDetails.aggregate({
        _sum: { dealValue: true },
        where: leadWhere,
      }),
    ]);

    // closed/pending counts
    const statusGroup = await prisma.leadDetails.groupBy({
      by: ["leadStatus"],
      where: leadWhere,
      _count: { id: true },
    });

    const closed =
      statusGroup.find((s) => s.leadStatus === "Closed")?._count.id ?? 0;
    const pending =
      statusGroup.find((s) => s.leadStatus === "Pending")?._count.id ?? 0;

    // total messages in range (if you track sentAt)
    const totalMessages = await prisma.emailMessage.count(
      start && end ? { where: { sentAt: { gte: start, lte: end } } } : {}
    );

    // active users (isAlive)
    const activeUsers = await prisma.user.count({ where: { isAlive: true } });

    // top countries (by lead count & sum)
    const topCountriesRaw = await prisma.leadDetails.groupBy({
      by: ["country"],
      where: leadWhere,
      _count: { id: true },
      _sum: { dealValue: true },
    });

    const topCountries = (topCountriesRaw || [])
      .map((c) => ({
        name: c.country ?? "Unknown",
        count: c._count.id ?? 0,
        value: Number(c._sum.dealValue ?? 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.json({
      success: true,
      dashboard: {
        totalLeads: totalLeadsCount,
        totalDealValue: Number(dealSum._sum.dealValue ?? 0),
        closed,
        pending,
        totalMessages,
        activeUsers,
        topCountries,
      },
    });
  } catch (err) {
    console.error("dashboard error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
