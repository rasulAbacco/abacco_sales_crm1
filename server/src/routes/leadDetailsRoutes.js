// src/routes/leadDetailsRoutes.js
import express from "express";
import prisma from "../prismaClient.js";

const router = express.Router();

/* ======================================================
   1️⃣  SPECIFIC ROUTES FIRST (to avoid :id conflicts)
====================================================== */

// ✅ Fetch only leads where result = "pending"
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
      message: "Error fetching lead details",
      error: error.message,
    });
  }
});

// ✅ Fetch only leads where result = "closed"
router.get("/closed", async (req, res) => {
  try {
    console.log("📡 Fetching closed leads...");
    const closedLeads = await prisma.leadDetails.findMany({
      where: { result: "closed" },
      include: { user: true },
      orderBy: { date: "desc" },
    });

    res.json({
      success: true,
      total: closedLeads.length,
      data: closedLeads,
    });
  } catch (error) {
    console.error("❌ Error fetching closed leads:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lead details",
      error: error.message,
    });
  }
});

/* ======================================================
   2️⃣  FILTER OR SEARCH ROUTE
====================================================== */

router.get("/", async (req, res) => {
  try {
    const { type, status, from, to, search } = req.query;

    const filters = {};

    if (type) filters.leadType = type;
    if (status) filters.leadStatus = status;
    if (from || to) {
      filters.date = {};
      if (from) filters.date.gte = new Date(from);
      if (to) filters.date.lte = new Date(to);
    }

    const leads = await prisma.leadDetails.findMany({
      where: {
        ...filters,
        OR: search
          ? [
              { client: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { brand: { contains: search, mode: "insensitive" } },
              { salesperson: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { date: "desc" },
    });

    res.json({
      success: true,
      total: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error("❌ Error filtering leads:", error);
    res.status(500).json({
      success: false,
      message: "Error filtering leads",
      error: error.message,
    });
  }
});

/* ======================================================
   3️⃣  GET A SINGLE LEAD BY ID (keep last)
====================================================== */

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.leadDetails.findUnique({
      where: { id: Number(id) },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!lead)
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });

    res.json({ success: true, data: lead });
  } catch (error) {
    console.error("❌ Error fetching lead details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lead details",
      error: error.message,
    });
  }
});

export default router;
