// server/src/services/mail/sendEmailService.js
// Service for sending emails and creating conversations

import nodemailer from "nodemailer";
import prisma from "../prismaClient.js";
import { createOAuthManager } from "../oauth/oauthManager.js";
import { createConversationFromOutbound } from "../conversation/conversationService.js";
import { v4 as uuidv4 } from "uuid";


/**
 * Send an email and create a conversation
 * This is the PRIMARY way conversations are created
 */
export async function sendEmail(emailData) {
  const {
    accountId,
    to, // Required: primary recipient(s)
    cc,
    bcc,
    subject,
    html,
    text,
    attachments = [],
    inReplyTo, // If this is a reply
    references, // If this is a reply
  } = emailData;

  // Get account details
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  // Generate Message-ID (this will be the conversationId for new threads)
  const messageId = `<${uuidv4()}@${account.email.split("@")[1]}>`;
  const sentAt = new Date();

  // Create SMTP transport
  let transporter;

  if (account.authType === "oauth2") {
    // OAuth2 SMTP
    const oauth = await createOAuthManager(accountId);
    const accessToken = await oauth.getAccessToken();

    transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort || 587,
      secure: account.smtpSecure || false,
      auth: {
        type: "OAuth2",
        user: account.email,
        accessToken,
      },
    });
  } else {
    // Password-based SMTP
    transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort || 587,
      secure: account.smtpSecure || false,
      auth: {
        user: account.smtpUser || account.email,
        pass: account.encryptedPass,
      },
    });
  }

  // Build email headers
  const mailOptions = {
    from: account.email,
    to,
    cc,
    bcc,
    subject: subject || "(No Subject)",
    html: html || text,
    text: text || html?.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    attachments,
    messageId, // Set our generated Message-ID
    headers: {},
  };

  // If this is a reply, add threading headers
  if (inReplyTo) {
    mailOptions.headers["In-Reply-To"] = inReplyTo;
    mailOptions.headers["References"] = references || inReplyTo;
  }

  // Send the email
  let sendResult;
  try {
    sendResult = await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  // ====================================================================
  // CREATE CONVERSATION (only for NEW outbound emails, not replies)
  // ====================================================================
  let conversationId = null;

  if (!inReplyTo && !references) {
    // This is a NEW OUTBOUND EMAIL - create a conversation
    try {
      const conversation = await createConversationFromOutbound({
        accountId,
        messageId,
        toEmail: to,
        ccEmail: cc || null,
        subject: subject || "(No Subject)",
        fromEmail: account.email,
        sentAt,
      });

      conversationId = conversation.id;
      console.log(
        `✅ Created conversation ${conversationId} for new outbound email`
      );
    } catch (err) {
      console.error("Error creating conversation:", err);
      // Continue even if conversation creation fails
    }
  } else {
    // This is a REPLY - find the conversation
    const { findConversationByHeaders } = await import(
      "../conversation/conversationService.js"
    );
    const conversation = await findConversationByHeaders(inReplyTo, references);
    conversationId = conversation?.id || null;
  }

  // Save to database
  const savedMessage = await prisma.emailMessage.create({
    data: {
      emailAccountId: accountId,
      messageId,
      fromEmail: account.email,
      toEmail: to,
      ccEmail: cc || null,
      subject: subject || "(No Subject)",
      body: html || text || "",
      bodyHtml: html || null,
      direction: "sent",
      sentAt,
      isRead: true, // Sent emails are always read
      isStarred: false,
      folder: "sent",
      conversationId, // Link to conversation
      inReplyTo,
      references,
    },
  });

  // Update conversation metadata
  if (conversationId) {
    const { updateConversationMetadata } = await import(
      "../conversation/conversationService.js"
    );
    await updateConversationMetadata(conversationId, savedMessage);
  }

  return {
    success: true,
    messageId: savedMessage.id,
    conversationId,
    smtpResponse: sendResult,
  };
}

/**
 * Send a reply to an existing conversation
 */
export async function sendReply(accountId, originalMessageId, replyData) {
  // Get the original message to extract threading info
  const originalMessage = await prisma.emailMessage.findUnique({
    where: { id: originalMessageId },
  });

  if (!originalMessage) {
    throw new Error("Original message not found");
  }

  // Build reply headers
  const inReplyTo = originalMessage.messageId;
  const references = originalMessage.references
    ? `${originalMessage.references} ${originalMessage.messageId}`
    : originalMessage.messageId;

  // Send the reply
  return sendEmail({
    accountId,
    to: replyData.to || originalMessage.fromEmail,
    cc: replyData.cc,
    subject: replyData.subject || `Re: ${originalMessage.subject}`,
    html: replyData.html,
    text: replyData.text,
    attachments: replyData.attachments,
    inReplyTo,
    references,
  });
}
