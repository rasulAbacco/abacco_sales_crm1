//server\src\services\scheduledEmail.service.js
import nodemailer from "nodemailer";
import prisma from "../prismaClient.js";
import { normalizeEmailHtml } from "../utils/normalizeEmailHtml.js";

export async function sendScheduledEmail(msg) {
  if (!msg.emailAccount) {
    throw new Error("Email account not found");
  }

  const { smtpHost, smtpPort, smtpUser, encryptedPass, email, senderName } =
    msg.emailAccount;

  const port = Number(smtpPort);
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure,
    auth: {
      user: smtpUser,
      pass: encryptedPass,
    },
    tls: { rejectUnauthorized: false },
  });

  /* ============================================================
     🔥 STEP 1: Fetch ENTIRE conversation
  ============================================================ */

  let conversationMessages = [];

  if (msg.conversationId) {
    conversationMessages = await prisma.emailMessage.findMany({
      where: {
        conversationId: msg.conversationId,
      },
      orderBy: {
        sentAt: "desc", // newest first (Outlook style)
      },
    });
  }

  const latestMessage = conversationMessages[0];

  /* ============================================================
     🔥 STEP 2: Subject Handling
  ============================================================ */

  let subject = (msg.subject || "(No Subject)").trim();

  if (!subject.toLowerCase().startsWith("re:")) {
    subject = `Re: ${subject}`;
  }

  /* ============================================================
     🔥 STEP 3: Build FULL Outlook-Style History
  ============================================================ */

  let fullHistoryHtml = "";

  for (const message of conversationMessages) {
    const formattedDate = new Date(message.sentAt).toLocaleString();

    fullHistoryHtml += `
      <br>
      <div style="font-family:Calibri, Arial, sans-serif; font-size:14px; color:#000;">
        <hr style="border:none;border-top:1px solid #ccc;">
        <b>From:</b> ${message.fromEmail || ""}<br>
        <b>Sent:</b> ${formattedDate}<br>
        <b>To:</b> ${message.toEmail || ""}<br>
        <b>Subject:</b> ${message.subject || ""}<br>
        <br>
       ${normalizeEmailHtml(message.bodyHtml || message.bodyText || "")}
      </div>
    `;
  }

  /* ============================================================
     🔥 STEP 4: Clean Body + Append History
  ============================================================ */

  // const cleanedBody = (msg.bodyHtml || "");
  const cleanedBody = normalizeEmailHtml(msg.bodyHtml || "");

  const fullHtmlBody = cleanedBody + fullHistoryHtml;

  /* ============================================================
     🔥 STEP 5: Threading Headers
  ============================================================ */

  const mailOptions = {
    from: `"${senderName || smtpUser}" <${email}>`,
    to: msg.toEmail,
    cc: msg.ccEmail || undefined,
    subject,
    html: fullHtmlBody,
  };

  if (latestMessage?.messageId) {
    mailOptions.inReplyTo = latestMessage.messageId;

    mailOptions.references = latestMessage.references
      ? `${latestMessage.references} ${latestMessage.messageId}`
      : latestMessage.messageId;
  }

  /* ============================================================
     🔥 STEP 6: Send
  ============================================================ */

  const info = await transporter.sendMail(mailOptions);

  console.log("✅ Full thread reply sent:", info.messageId);
}
