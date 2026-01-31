// server/services/emailSender.js

import nodemailer from "nodemailer";
import prisma from "../prismaClient.js";


/**
 * Replace template placeholders with actual values
 */
function replacePlaceholders(template, data = {}) {
  if (!template) return "";

  let result = template;

  // Sender name (from email account)
  if (data.senderName) {
    result = result.replace(/\{sender_name\}/gi, data.senderName);
  }

  // Client/Recipient name
  if (data.clientName) {
    result = result.replace(/\{client_name\}/gi, data.clientName);
  }

  // Company name
  if (data.company) {
    result = result.replace(/\{company\}/gi, data.company);
  }

  // Email address
  if (data.email) {
    result = result.replace(/\{email\}/gi, data.email);
  }

  // Date (current date)
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  result = result.replace(/\{date\}/gi, currentDate);

  // Time (current time)
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  result = result.replace(/\{time\}/gi, currentTime);

  return result;
}

/**
 * Extract client details from email or conversation
 */
async function getClientDetails(toEmail, conversationId) {
  try {
    // Try to get lead details
    const lead = await prisma.leadDetails.findFirst({
      where: {
        OR: [
          { email: { equals: toEmail, mode: "insensitive" } },
          { email: { contains: toEmail, mode: "insensitive" } },
        ],
      },
    });

    if (lead) {
      return {
        clientName: lead.client || lead.companyName || null,
        company: lead.companyName || null,
        email: lead.email,
      };
    }

    // Fallback: extract name from email
    const namePart = toEmail.split("@")[0];
    const clientName = namePart
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return {
      clientName,
      company: null,
      email: toEmail,
    };
  } catch (error) {
    console.error("Error getting client details:", error);
    return {
      clientName: null,
      company: null,
      email: toEmail,
    };
  }
}

/**
 * Send scheduled email with placeholder replacement
 */
export async function sendScheduledEmail(scheduledMessage) {
  try {
    const { accountId, toEmail, subject, bodyHtml, conversationId } =
      scheduledMessage;

    // Fetch email account with sender name
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
      include: {
        User: { select: { name: true } },
      },
    });

    if (!account) {
      throw new Error("Email account not found");
    }

    // Get client details
    const clientDetails = await getClientDetails(toEmail, conversationId);

    // Prepare replacement data
    const replacementData = {
      senderName: account.senderName || account.User?.name || "Team",
      clientName: clientDetails.clientName,
      company: clientDetails.company,
      email: clientDetails.email,
    };

    // Replace placeholders in subject and body
    const finalSubject = replacePlaceholders(subject, replacementData);
    const finalBody = replacePlaceholders(bodyHtml, replacementData);

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort || 465,
      secure: (account.smtpPort || 465) === 465,
      auth: {
        user: account.smtpUser || account.email,
        pass: account.encryptedPass,
      },
    });

    // Generate Message-ID
    const messageId = `<${Date.now()}.${Math.random()
      .toString(36)
      .substring(2)}@${account.email.split("@")[1]}>`;

    // Get threading info
    let inReplyTo = null;
    let references = null;

    if (conversationId) {
      const lastMessage = await prisma.emailMessage.findFirst({
        where: {
          conversationId,
          emailAccountId: accountId,
        },
        orderBy: { sentAt: "desc" },
      });

      if (lastMessage) {
        inReplyTo = lastMessage.messageId;
        references = lastMessage.references
          ? `${lastMessage.references} ${lastMessage.messageId}`
          : lastMessage.messageId;
      }
    }

    // Send email
    await transporter.sendMail({
      from: account.senderName
        ? `"${account.senderName}" <${account.email}>`
        : account.email,
      to: toEmail,
      subject: finalSubject,
      html: finalBody,
      messageId,
      headers: inReplyTo
        ? {
            "In-Reply-To": inReplyTo,
            References: references,
          }
        : {},
    });

    // Save sent message to database
    await prisma.emailMessage.create({
      data: {
        emailAccountId: accountId,
        conversationId,
        messageId,
        fromEmail: account.email,
        fromName: account.senderName || null,
        toEmail,
        subject: finalSubject,
        body: finalBody,
        direction: "sent",
        sentAt: new Date(),
        folder: "sent",
        isRead: true,
        inReplyTo,
        references,
      },
    });

    // Update scheduled message status
    await prisma.scheduledMessage.update({
      where: { id: scheduledMessage.id },
      data: {
        status: "sent",
        isFollowedUp: true,
      },
    });

    // Update conversation
    if (conversationId) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          messageCount: { increment: 1 },
        },
      });
    }

    return { success: true, messageId };
  } catch (error) {
    console.error("Error sending scheduled email:", error);

    // Update scheduled message with error
    await prisma.scheduledMessage.update({
      where: { id: scheduledMessage.id },
      data: {
        status: "failed",
        errorMessage: error.message,
        retryCount: { increment: 1 },
      },
    });

    throw error;
  }
}

/**
 * Preview email with replaced placeholders (for UI preview)
 */
export async function previewEmailWithPlaceholders(
  template,
  accountId,
  toEmail
) {
  try {
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
      include: {
        User: { select: { name: true } },
      },
    });

    const clientDetails = await getClientDetails(toEmail, null);

    const replacementData = {
      senderName: account?.senderName || account?.User?.name || "Team",
      clientName: clientDetails.clientName,
      company: clientDetails.company,
      email: clientDetails.email,
    };

    return replacePlaceholders(template, replacementData);
  } catch (error) {
    console.error("Error previewing email:", error);
    return template;
  }
}

export default {
  sendScheduledEmail,
  previewEmailWithPlaceholders,
  replacePlaceholders,
};
