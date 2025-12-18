// src/services/mailer.js
import sgMail from "@sendgrid/mail";

if (!process.env.SENDGRID_API_KEY) {
  console.warn("[mailer] SENDGRID_API_KEY is not set. Sending will fail.");
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

export async function sendViaSendGrid({ from, to, subject, html, attachments = [] }) {
  const msg = {
    to,
    from,           // must be a verified sender in SendGrid
    subject: subject || "",
    html: html || "",
    attachments: await Promise.all(
      (attachments || []).map(async (a) => {
        // a.buffer can be Buffer (from multer)
        const base64 =
          a.base64 || (a.buffer ? a.buffer.toString("base64") : undefined);
        return {
          content: base64,
          filename: a.filename || "file",
          type: a.mimeType || "application/octet-stream",
          disposition: "attachment"
        };
      })
    )
  };

  const [res] = await sgMail.send(msg);
  const messageId = res.headers["x-message-id"] || res.headers["x-message-id"];
  return { messageId: messageId || null };
}
