// server/src/routes/conversationRoutes.js
// API routes for Outlook-style conversations

import express from "express";
import prisma from "../prismaClient.js";
import {
  getAccountConversations,
  getConversationMessages,
  markConversationAsRead,
} from "../services/conversation/conversationService.js";

const router = express.Router();



/**
 * GET /api/inbox/conversations/:accountId
 * Get all conversations for an account
 */
router.get("/conversations/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params;
    const { folder = "inbox", sender, subject, dateFrom, dateTo } = req.query;

    // Get conversations
    let conversations = await getAccountConversations(accountId, folder);

    // Apply filters
    if (sender) {
      conversations = conversations.filter((c) =>
        c.participants.some((p) =>
          p.toLowerCase().includes(sender.toLowerCase())
        )
      );
    }

    if (subject) {
      conversations = conversations.filter((c) =>
        c.subject.toLowerCase().includes(subject.toLowerCase())
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      conversations = conversations.filter(
        (c) => new Date(c.lastMessageAt) >= from
      );
    }

    if (dateTo) {
      const to = new Date(dateTo);
      conversations = conversations.filter(
        (c) => new Date(c.lastMessageAt) <= to
      );
    }

    // Format for frontend
    const formatted = conversations.map((conv) => ({
      conversationId: conv.conversationId,
      subject: conv.subject,
      // Primary recipient (first TO recipient)
      primaryRecipient: conv.toRecipients[0] || "",
      // All participants for display
      participants: conv.participants,
      participantCount: conv.participants.length,
      lastBody: conv.lastMessage?.body || "",
      lastDate: conv.lastMessageAt,
      unreadCount: conv.unreadCount,
      messageCount: conv.messageCount,
      // For backward compatibility
      email: conv.toRecipients[0] || "", // Show primary recipient
      threadKey: conv.conversationId, // Use conversationId as threadKey
    }));

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/inbox/conversations/:conversationId/messages
 * Get all messages in a specific conversation
 */
router.get("/conversations/:conversationId/messages", async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await getConversationMessages(conversationId);

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/inbox/conversations/:conversationId/read
 * Mark entire conversation as read
 */
router.post("/conversations/:conversationId/read", async (req, res) => {
  try {
    const { conversationId } = req.params;

    await markConversationAsRead(conversationId);

    res.json({
      success: true,
      message: "Conversation marked as read",
    });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/inbox/conversations/thread/:messageId
 * Get conversation by any message ID in the thread
 */
router.get("/conversations/thread/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;

    // Find the message
    const message = await prisma.emailMessage.findFirst({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    });

    if (!message || !message.conversationId) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found for this message",
      });
    }

    // Get all messages in this conversation
    const messages = await getConversationMessages(message.conversationId);

    res.json({
      success: true,
      data: {
        conversationId: message.conversationId,
        conversation: message.conversation,
        messages,
      },
    });
  } catch (error) {
    console.error("Error fetching thread:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
