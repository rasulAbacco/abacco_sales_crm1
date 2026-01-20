import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "thepramodbijakal@gmail.com",
    pass: "syrgdktpeariulaa", // 🔑 paste your 16-character Gmail App Password here
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP login failed:", error);
  } else {
    console.log("✅ SMTP login success!");
  }
});
