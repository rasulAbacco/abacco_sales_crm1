// src/routes/employeeRoutes.js
import express from "express";
import prisma from "../prismaClient.js";
import bcrypt from "bcryptjs";

const router = express.Router();


/* ==========================================================
   📋 GET – Fetch All Employees
   ========================================================== */
router.get("/", async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        empId: true,
        name: true,
        email: true,
        role: true,
        isAlive: true,
        password: true, // ✅ still included
        createdAt: true,
      },
    });

    if (!employees || employees.length === 0) {
      return res.json([]); // ✅ Safe fallback
    }

    res.json(employees);
  } catch (err) {
    console.error("❌ Error fetching employees:", err);
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message,
    });
  }
});

/* ==========================================================
   ✏️ PUT – Update Employee
   ========================================================== */
router.put("/:id", async (req, res) => {
  try {
    const { name, email, password, isAlive } = req.body;
    const data = { name, email };

    // ✅ Handle password update
    if (password && password.trim() !== "") {
      data.password = await bcrypt.hash(password, 10);
    }

    // ✅ Handle isAlive status update
    if (typeof isAlive !== "undefined") {
      data.isAlive = isAlive;
    }

    const updated = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data,
    });

    res.json({ message: "✅ Employee updated successfully", updated });
  } catch (err) {
    console.error("❌ Error updating employee:", err);
    res.status(500).json({ error: "Failed to update employee" });
  }
});

/* ==========================================================
   🗑️ DELETE – Delete Employee
   ========================================================== */
router.delete("/:id", async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ message: "✅ Employee deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting employee:", err);
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

export default router;
