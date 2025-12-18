// src/utils/generateToken.js
import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      empId: user.empId,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// import jwt from "jsonwebtoken";

// export const generateToken = (userId) => {
//   if (!process.env.JWT_SECRET) {
//     console.error("❌ JWT_SECRET is missing in .env file");
//     throw new Error("JWT_SECRET missing");
//   }

//   return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
//     expiresIn: "30d", // can adjust as needed
//   });
// };
