// src/utils/emailService.js
import nodemailer from "nodemailer";

/**
 * Send an email using SMTP
 * Supports Gmail, Outlook, Zoho, or any custom SMTP
 */
export const sendSMTPMail = async ({ to, cc, subject, body, from }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      // secure: true, // SSL
      secure: false, 
      auth: {
        user: process.env.SMTP_USER, // ✅ your .env variable
        pass: process.env.SMTP_PASS, // ✅ your .env variable
      },
      tls: {
        rejectUnauthorized: false, // ✅ Fixes self-signed cert issue
      },
    });

    const mailOptions = {
      from: from || `"CRM Mailer" <${process.env.SMTP_USER}>`,
      to,
      cc,
      subject,
      html: body,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully: ${info.response}`);

    return { success: true };
  } catch (error) {
    console.error("❌ Email send failed:", error);
    return { success: false, error: error.message };
  }
};
