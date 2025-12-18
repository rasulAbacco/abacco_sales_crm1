import bcrypt from "bcryptjs";
import prisma from "../prismaClient.js";
import { generateToken } from "../utils/generateToken.js";

/* ============================================================
   ✅ SIGNUP CONTROLLER — Auto or Manual empId & Role Assignment
   ============================================================ */
export const signup = async (req, res) => {
  try {
    const { name, email, password, empId, isAlive } = req.body;

    // ✅ Validate required fields including empId
    if (!name || !email || !password || !empId) {
      return res
        .status(400)
        .json({ error: "Name, email, password, and Employee ID are required" });
    }

    // ✅ Check if empId is not just whitespace
    if (empId.trim() === "") {
      return res.status(400).json({ error: "Employee ID cannot be empty" });
    }

    // 🔍 Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // ✅ Check if empId already exists
    const existingEmpId = await prisma.user.findUnique({ where: { empId } });
    if (existingEmpId) {
      return res.status(400).json({ error: "Employee ID already exists" });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 👑 First user = admin, others = employee
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "admin" : "employee";

    // 🆕 Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        empId: empId.trim(), // ✅ Use manually entered empId
        role,
        isAlive: typeof isAlive !== "undefined" ? isAlive : true,
      },
    });

    // 🎟️ JWT Token
    // const token = generateToken(user.id);
    const token = generateToken(user);

    // 🎯 Response
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        empId: user.empId,
        name: user.name,
        email: user.email,
        role: user.role,
        isAlive: user.isAlive,
      },
    });
  } catch (err) {
    console.error("❌ Signup Error:", err);
    res.status(500).json({ error: "Signup failed", details: err.message });
  }
};

/* ============================================================
   ✅ LOGIN CONTROLLER — Validate credentials & return token
   ============================================================ */
// export const login = async (req, res) => {
//   try {
//     console.log("🟢 Login API hit with body:", req.body);
//     const { email, password } = req.body;

//     if (!email || !password) {
//       console.warn("⚠️ Missing email or password in request body:", req.body);
//       return res.status(400).json({ error: "Email and password are required" });
//     }

//     // 🔍 Find user by email
//     const user = await prisma.user.findUnique({
//       where: { email },
//       select: {
//         id: true,
//         empId: true,
//         name: true,
//         email: true,
//         password: true,
//         role: true,
//       },
//     });

//     if (!user) {
//       console.log("❌ No user found for:", email);
//       return res.status(400).json({ error: "Invalid email or password" });
//     }

//     // 🔑 Compare password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       console.log("❌ Password mismatch for:", email);
//       return res.status(400).json({ error: "Invalid email or password" });
//     }

//     // 🎟️ Generate token
//     const token = generateToken(user.id);
//     console.log("✅ Login success:", user.email, "| role:", user.role);

//     // 🎯 Response
//     res.json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         id: user.id,
//         empId: user.empId,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//       },
//     });
//   } catch (err) {
//     console.error("🔥 Login Error:", err);
//     res.status(500).json({ error: "Login failed" });
//   }
// };
export const login = async (req, res) => {
  try {
    console.log("🟢 Login API hit with body:", req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      console.warn("⚠️ Missing email or password in request body:", req.body);
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 🔍 Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        empId: true,
        name: true,
        email: true,
        password: true,
        role: true,
        isAlive: true, // ✅ include active status
      },
    });

    if (!user) {
      console.log("❌ No user found for:", email);
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // 🚫 Check if user is inactive
    if (user.isAlive === false) {
      console.log("⛔ Inactive user tried to login:", email);
      return res.status(403).json({
        error:
          "Your account is inactive. Please contact the administrator to activate your access.",
      });
    }

    // 🔑 Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Password mismatch for:", email);
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // 🎟️ Generate token
    // const token = generateToken(user.id);
    const token = generateToken(user);
    console.log("✅ Login success:", user.email, "| role:", user.role);

    // 🎯 Response
    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        empId: user.empId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("🔥 Login Error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};
