import express from "express";
// import prisma from "../prisma/client.js";
 import prisma from "../prismaClient.js"; 

const router = express.Router();

// ✅ GET all salespersons (role = "employee")
// router.get("/", async (req, res) => {
//   try {
//     const salespersons = await prisma.user.findMany({
//       where: { role: "employee" },
//       select: { id: true, name: true, empId: true },
//     });

//     res.json(salespersons);
//     console.log(res)
//   } catch (error) {
//     console.error("❌ Error fetching salespersons:", error);
//     res.status(500).json({ message: "Error fetching salespersons" });
//   }
// });
router.get("/", async (req, res) => {
  try {
    const salespersons = await prisma.user.findMany({
      where: {
        role: "employee", // Ensure this matches your DB values exactly
        isAlive: true, // Recommended: only fetch active employees
      },
      select: {
        id: true,
        name: true,
        empId: true,
      },
    });

    // Log the data for debugging, not the response object
    console.log(`Retrieved ${salespersons.length} salespersons`);

    res.json(salespersons);
  } catch (error) {
    console.error("❌ Error fetching salespersons:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
