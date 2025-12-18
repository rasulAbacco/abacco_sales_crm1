import express from "express";
// import prisma from "../prisma/client.js";
 import prisma from "../prismaClient.js"; 

const router = express.Router();

// ✅ GET all salespersons (role = "employee")
router.get("/", async (req, res) => {
  try {
    const salespersons = await prisma.user.findMany({
      where: { role: "employee" },
      select: { id: true, name: true, empId: true },
    });

    res.json(salespersons);
    console.log(res)
  } catch (error) {
    console.error("❌ Error fetching salespersons:", error);
    res.status(500).json({ message: "Error fetching salespersons" });
  }
});

export default router;
