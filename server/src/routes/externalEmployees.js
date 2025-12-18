import express from "express";
import prismaExternalCRM from "../../prisma/externalCRM.js";

const router = express.Router();

/**
 * @route GET /api/external/employees
 * @desc Fetch employee data from external website DB
 */
// router.get("/employees", async (req, res) => {
//   try {
//     const { employeeId } = req.query;

//     if (employeeId) {
//       const employee = await prismaExternalCRM.employee.findUnique({
//         where: { employeeId },
//       });

//       if (!employee)
//         return res.status(404).json({ success: false, message: "Employee not found" });

//       return res.json({ success: true, data: employee });
//     }

//     const employees = await prismaExternalCRM.employee.findMany({
//       orderBy: { id: "asc" },
//     });

//     res.json({ success: true, count: employees.length, data: employees });
//   } catch (error) {
//     console.error("❌ Error fetching external employees:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error fetching external DB",
//       error: error.message,
//     });
//   }
// });
router.get("/employees", async (req, res) => {
  try {
    const employees = await prismaExternalCRM.$queryRaw`
      SELECT  "employeeId", "fullName", email, role
      FROM "Employee"
    `;

    res.json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (err) {
    console.error("❌ Error fetching external employees:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
});


export default router;
