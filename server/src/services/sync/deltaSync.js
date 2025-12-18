// server/src/services/sync/deltaSyncUpdated.js
// Updated delta sync with Outlook-style conversation threading

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { PrismaClient } from "@prisma/client";
import pLimit from "p-limit";
import { createOAuthManager } from "../oauth/oauthManager.js";
import { EMAIL_PROVIDERS } from "../../config/emailProviders.js";
import { getIO } from "../../../socket.js";
import {
  findConversationByHeaders,
  createConversationFromOutbound,
  updateConversationMetadata,
} from "../conversation/conversationService.js";

const prisma = new PrismaClient();

// ... keep existing getSyncState, updateSyncState, deltaSyncAccount, syncFolder, syncFlagChanges functions ...

// UPDATED: Save message with proper conversation threading
async function saveMessage(account, message, folderPath) {
  const parsed = await simpleParser(message.source);

  const messageId =
    parsed.messageId || message.envelope?.messageId || `uid-${message.uid}`;

  // Check for existing message
  const existing = await prisma.emailMessage.findUnique({
    where: {
      emailAccountId_messageId: {
        emailAccountId: account.id,
        messageId,
      },
    },
  });

  if (existing) {
    // Update flags only
    return prisma.emailMessage.update({
      where: { id: existing.id },
      data: {
        isRead: message.flags?.has("\\Seen") || false,
        isStarred: message.flags?.has("\\Flagged") || false,
        folder: folderPath.toLowerCase(),
      },
    });
  }

  // Extract email data
  const fromEmail = parsed.from?.value?.[0]?.address || "";
  const toEmail = parsed.to?.value?.map((v) => v.address).join(", ") || "";
  const ccEmail = parsed.cc?.value?.map((v) => v.address).join(", ") || null;
  const subject = parsed.subject || "(No Subject)";
  const body =
    parsed.html || parsed.textAsHtml || `<pre>${parsed.text || ""}</pre>`;
  const sentAt = parsed.date || message.internalDate || new Date();

  // Determine direction
  const accountEmail = account.email.toLowerCase();
  const direction =
    fromEmail.toLowerCase() === accountEmail ? "sent" : "received";

  // Extract threading headers
  const inReplyTo = parsed.headers.get("in-reply-to") || null;
  const references = parsed.headers.get("references") || null;

  // Determine folder type
  const folderLower = folderPath.toLowerCase();
  const isSpam = folderLower.includes("spam") || folderLower.includes("junk");
  const isTrash =
    folderLower.includes("trash") || folderLower.includes("deleted");
  const isDraft = folderLower.includes("draft");

  // ====================================================================
  // CONVERSATION THREADING LOGIC (Outlook-style)
  // ====================================================================
  let conversationId = null;

  if (direction === "sent" && !inReplyTo && !references) {
    // This is a NEW OUTBOUND EMAIL - Create a new conversation
    try {
      const conversation = await createConversationFromOutbound({
        accountId: account.id,
        messageId, // Use this email's Message-ID as conversationId
        toEmail,
        ccEmail,
        subject,
        fromEmail,
        sentAt,
      });
      conversationId = conversation.id;
      console.log(`✅ Created new conversation: ${conversationId}`);
    } catch (err) {
      // Conversation might already exist
      conversationId = messageId;
    }
  } else if (inReplyTo || references) {
    // This is a REPLY - Find the original conversation
    const conversation = await findConversationByHeaders(inReplyTo, references);

    if (conversation) {
      conversationId = conversation.id;
      console.log(`🔗 Threaded to conversation: ${conversationId}`);
    } else {
      // No conversation found - this shouldn't happen in proper email threads
      // Treat as standalone message
      console.warn(
        `⚠️ No conversation found for reply (In-Reply-To: ${inReplyTo})`
      );
    }
  }
  // If direction === "received" and no threading headers, it's a NEW INBOUND
  // We don't create conversations for inbound emails without context

  // Create message
  const savedMessage = await prisma.emailMessage.create({
    data: {
      emailAccountId: account.id,
      messageId,
      uid: message.uid,
      fromEmail,
      toEmail,
      ccEmail,
      subject,
      body,
      bodyHtml: parsed.html || null,
      direction,
      sentAt,
      isRead: message.flags?.has("\\Seen") || direction === "sent",
      isStarred: message.flags?.has("\\Flagged") || false,
      folder: folderPath.toLowerCase(),
      isSpam,
      isTrash,
      isDraft,
      conversationId, // Link to conversation
      inReplyTo,
      references,
    },
  });

  // Update conversation metadata if part of a conversation
  if (conversationId) {
    await updateConversationMetadata(conversationId, savedMessage);
  }

  // Emit real-time update
  try {
    const io = getIO();
    io.to(`user:${account.userId}`).emit("new_email", {
      accountId: account.id,
      messageId: savedMessage.id,
      conversationId,
      subject,
      fromEmail,
      folder: folderPath,
    });
  } catch (e) {
    // Socket not available
  }

  return savedMessage;
}

export { saveMessage };
