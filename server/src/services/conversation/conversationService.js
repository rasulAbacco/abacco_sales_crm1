// server/src/services/conversation/conversationService.js
// Outlook-style conversation management
// Rule: One outbound email = One conversation

import prisma from "../prismaClient.js";
import { v4 as uuidv4 } from "uuid";


/**
 * Create a new conversation when sending an outbound email
 * This is the ONLY way conversations are created
 */
export async function createConversationFromOutbound(emailData) {
  const {
    accountId,
    messageId, // The Message-ID header from sent email
    toEmail, // Primary recipient(s) - this defines the conversation
    ccEmail,
    subject,
    fromEmail,
    sentAt,
  } = emailData;

  // Parse TO recipients (this defines the conversation)
  const toRecipients = toEmail.split(",").map((e) => e.trim().toLowerCase());
  const ccRecipients = ccEmail
    ? ccEmail.split(",").map((e) => e.trim().toLowerCase())
    : [];

  // Create conversation with the Message-ID as the conversationId
  // This will be used to match replies via In-Reply-To/References
  const conversation = await prisma.conversation.create({
    data: {
      id: messageId, // Use Message-ID as conversationId
      emailAccountId: accountId,
      subject: subject || "(No Subject)",
      participants: [...toRecipients, ...ccRecipients].join(","),
      toRecipients: toRecipients.join(","), // Store TO separately (conversation owner)
      ccRecipients: ccRecipients.join(","),
      lastMessageAt: sentAt || new Date(),
      messageCount: 1,
      unreadCount: 0,
      initiatorEmail: fromEmail,
    },
  });

  return conversation;
}

/**
 * Find conversation by checking In-Reply-To or References headers
 * This is how we thread replies to the original conversation
 */
export async function findConversationByHeaders(inReplyTo, references) {
  if (!inReplyTo && !references) return null;

  // Try In-Reply-To first (direct reply)
  if (inReplyTo) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: inReplyTo },
    });
    if (conversation) return conversation;
  }

  // Try References (reply in a thread)
  if (references) {
    // References can be multiple Message-IDs separated by space
    const messageIds = references
      .split(/\s+/)
      .map((id) => id.trim())
      .filter(Boolean);

    for (const msgId of messageIds.reverse()) {
      // Check newest first
      const conversation = await prisma.conversation.findUnique({
        where: { id: msgId },
      });
      if (conversation) return conversation;
    }
  }

  return null;
}

/**
 * Update conversation metadata when a new message arrives
 */
export async function updateConversationMetadata(conversationId, message) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        where: { isRead: false },
      },
    },
  });

  if (!conversation) return null;

  // Update last message time and unread count
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: message.sentAt || new Date(),
      messageCount: { increment: 1 },
      unreadCount: message.isRead ? conversation.unreadCount : { increment: 1 },
    },
  });
}

/**
 * Get all conversations for an account, grouped properly
 */
export async function getAccountConversations(accountId, folder = "inbox") {
  // Get conversations with their latest message
  const conversations = await prisma.conversation.findMany({
    where: {
      emailAccountId: accountId,
      messages: {
        some: {
          folder: folder.toLowerCase(),
        },
      },
    },
    include: {
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1, // Get latest message for preview
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return conversations.map((conv) => ({
    conversationId: conv.id,
    subject: conv.subject,
    toRecipients: conv.toRecipients.split(","),
    participants: conv.participants.split(","),
    lastMessage: conv.messages[0],
    lastMessageAt: conv.lastMessageAt,
    messageCount: conv.messageCount,
    unreadCount: conv.unreadCount,
    initiatorEmail: conv.initiatorEmail,
  }));
}

/**
 * Get all messages in a specific conversation
 */
export async function getConversationMessages(conversationId) {
  const messages = await prisma.emailMessage.findMany({
    where: { conversationId },
    orderBy: { sentAt: "asc" },
  });

  return messages;
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(conversationId) {
  // Update all messages in conversation
  await prisma.emailMessage.updateMany({
    where: { conversationId },
    data: { isRead: true },
  });

  // Update conversation unread count
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { unreadCount: 0 },
  });
}
