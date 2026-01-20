import jwt from "jsonwebtoken";
import prisma from "../prismaClient.js";

/**
 * Middleware: Full user authentication using JWT and DB check
 * - Ensures Authorization header exists
 * - Validates and decodes JWT
 * - Confirms user still exists in DB
 */
// export const protect = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;
//     console.log("[protect] Auth Header:", authHeader);

//     // Step 1: Validate presence of Authorization header
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       console.warn("[protect] ❌ Missing or malformed Bearer token");
//       return res.status(401).json({ message: "Not authorized, no Bearer token" });
//     }

//     // Step 2: Extract token
//     const token = authHeader.split(" ")[1];
//     if (!token) {
//       console.warn("[protect] ❌ No token found after 'Bearer'");
//       return res.status(401).json({ message: "Token missing from header" });
//     }

//     // Step 3: Verify JWT validity
//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (err) {
//       console.error("[protect] ❌ Token verification failed:", err.message);
//       if (err.name === "TokenExpiredError")
//         return res.status(401).json({ message: "Token expired" });
//       if (err.name === "JsonWebTokenError")
//         return res.status(401).json({ message: "Invalid token format" });

//       return res.status(401).json({ message: "Token verification failed" });
//     }

//     console.log("[protect] ✅ Token decoded:", decoded);

//     // Step 4: Fetch user from DB to confirm existence
//     const user = await prisma.user.findUnique({
//       where: { id: parseInt(decoded.id, 10) },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         role: true,
//         createdAt: true,
//       },
//     });

//     if (!user) {
//       console.warn("[protect] ❌ User not found in DB:", decoded.id);
//       return res.status(401).json({ message: "User not found" });
//     }

//     // Step 5: Attach user info to request
//     req.user = user;
//     console.log("[protect] ✅ User authenticated:", user.email);
//     next();
//   } catch (err) {
//     console.error("[protect] ❌ Unexpected error:", err);
//     return res.status(500).json({ message: "Internal server error in protect middleware" });
//   }
// };

export const protect = (req, res, next) => {
  let token;

  // 1️⃣ First try Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // 2️⃣ Then try cookies (if using cookies)
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized — No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized — Invalid token" });
  }
};

/**
 * Middleware: Lightweight JWT check only (no DB query)
 * Useful for quick verification routes or socket auth
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("[verifyToken] Auth Header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[verifyToken] ❌ Missing Bearer token");
      return res
        .status(401)
        .json({ message: "Authorization token missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    console.log("[verifyToken] ✅ Token verified for user ID:", decoded.id);
    next();
  } catch (err) {
    console.error("[verifyToken] ❌ JWT verification error:", err.message);

    if (err.name === "TokenExpiredError")
      return res.status(401).json({ message: "Token expired" });
    if (err.name === "JsonWebTokenError")
      return res.status(401).json({ message: "Invalid token format" });

    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * Logout handler: deletes session from DB
 * (optional feature if you track sessions)
 */
export const logoutSession = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - user not found" });
    }

    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID required" });
    }

    await prisma.session.delete({
      where: { id: parseInt(sessionId, 10) },
    });

    return res
      .status(200)
      .json({ success: true, message: "Session logged out successfully" });
  } catch (err) {
    console.error("[logoutSession] ❌ Error logging out session:", err);

    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
