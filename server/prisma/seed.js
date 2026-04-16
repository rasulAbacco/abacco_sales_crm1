import bcrypt from "bcryptjs";
import prisma from "./prismaClient.js"; // adjust path if needed

async function main() {
  try {
    const email = "admin@gmail.com";

    // 🔍 Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      return;
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash("123456", 10);

    // 🆕 Create admin user
    const admin = await prisma.user.create({
      data: {
        name: "Admin",
        email: email,
        password: hashedPassword,
        empId: "EMP001", // change if needed
        role: "admin",
        isAlive: true,
      },
    });

    console.log("✅ Admin created successfully:");
    console.log(admin);
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();