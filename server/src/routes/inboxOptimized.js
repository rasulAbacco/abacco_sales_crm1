// Optimized inbox routes with cursor-based pagination
// Handles efficient loading of messages and conversations at scale

import express from "express"
import prisma from "../prismaClient.js";

const router = express.Router()

/**
 * GET /api/inbox/conversations-paginated/:accountId
 * Cursor-based pagination for conversation list
 * Returns: { data: conversations[], nextCursor, hasMore }
 */
router.get("/conversations-paginated/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params
    const { cursor, limit = 50, folder = "inbox", search = "", sortBy = "recent" } = req.query
    const pageLimit = Math.min(Number.parseInt(limit), 100) // Max 100 per page

    // Build WHERE clause
    const whereClause = {
      emailAccountId: accountId,
      folder: folder || "inbox",
    }

    // Add search filter
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { lastBody: { contains: search, mode: "insensitive" } },
      ]
    }

    // Build ORDER BY clause
    let orderBy = { sentAt: "desc" } // Default: most recent
    if (sortBy === "sender") {
      orderBy = { email: "asc" }
    } else if (sortBy === "unread") {
      orderBy = [{ unreadCount: "desc" }, { sentAt: "desc" }]
    }

    // Prepare cursor config
    const cursorConfig = cursor ? { id: cursor } : undefined

    // Fetch one extra to detect if there are more results
    const conversations = await prisma.emailMessage.findMany({
      where: whereClause,
      orderBy,
      take: pageLimit + 1,
      ...(cursor && { skip: 1, cursor: cursorConfig }),
      select: {
        id: true,
        email: true,
        subject: true,
        lastBody: true,
        unreadCount: true,
        hasAttachment: true,
        isSpam: true,
        isBlocked: true,
        sentAt: true,
      },
      distinct: ["email"], // Get one conversation per email
    })

    const hasMore = conversations.length > pageLimit
    const data = hasMore ? conversations.slice(0, -1) : conversations
    const nextCursor = hasMore ? data[data.length - 1]?.id : null

    return res.json({
      success: true,
      data,
      nextCursor,
      hasMore,
      count: data.length,
    })
  } catch (err) {
    console.error("Error fetching paginated conversations:", err)
    return res.status(500).json({
      success: false,
      message: "Error fetching conversations",
      error: err.message,
    })
  }
})

/**
 * GET /api/inbox/messages-paginated/:accountId/:clientEmail
 * Cursor-based pagination for messages in a conversation
 * Returns: { data: messages[], nextCursor, hasMore }
 */
router.get("/messages-paginated/:accountId/:clientEmail", async (req, res) => {
  try {
    const { accountId, clientEmail } = req.params
    const { cursor, limit = 30 } = req.query
    const pageLimit = Math.min(Number.parseInt(limit), 100)

    // Get account email
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
      select: { email: true },
    })

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" })
    }

    // Build WHERE clause for conversation
    const whereClause = {
      emailAccountId: accountId,
      OR: [
        { email: clientEmail },
        { fromEmail: clientEmail },
        { toEmail: clientEmail },
        { ccEmail: { contains: clientEmail } },
      ],
    }

    // Prepare cursor config
    const cursorConfig = cursor ? { id: cursor } : undefined

    // Fetch messages with cursor pagination
    const messages = await prisma.emailMessage.findMany({
      where: whereClause,
      orderBy: { sentAt: "asc" },
      take: pageLimit + 1,
      ...(cursor && { skip: 1, cursor: cursorConfig }),
      select: {
        id: true,
        email: true,
        subject: true,
        body: true,
        snippet: true,
        fromEmail: true,
        toEmail: true,
        ccEmail: true,
        sentAt: true,
        isRead: true,
        unreadCount: true,
        direction: true,
        folder: true,
        attachments: true,
      },
    })

    const hasMore = messages.length > pageLimit
    const data = hasMore ? messages.slice(0, -1) : messages
    const nextCursor = hasMore ? data[data.length - 1]?.id : null

    return res.json({
      success: true,
      data,
      nextCursor,
      hasMore,
      count: data.length,
    })
  } catch (err) {
    console.error("Error fetching paginated messages:", err)
    return res.status(500).json({
      success: false,
      message: "Error fetching messages",
      error: err.message,
    })
  }
})

/**
 * GET /api/inbox/search
 * Full-text search with pagination
 * Searches across all message fields
 */
router.get("/search", async (req, res) => {
  try {
    const { accountId, q, cursor, limit = 20, type = "all" } = req.query
    const pageLimit = Math.min(Number.parseInt(limit), 50)

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [], nextCursor: null, hasMore: false })
    }

    const whereClause = {
      emailAccountId: accountId,
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
        { fromEmail: { contains: q, mode: "insensitive" } },
      ],
    }

    // Filter by type if specified
    if (type === "unread") {
      whereClause.isRead = false
    } else if (type === "attachments") {
      whereClause.attachments = { not: { equals: [] } }
    }

    const cursorConfig = cursor ? { id: cursor } : undefined

    const results = await prisma.emailMessage.findMany({
      where: whereClause,
      orderBy: { sentAt: "desc" },
      take: pageLimit + 1,
      ...(cursor && { skip: 1, cursor: cursorConfig }),
      select: {
        id: true,
        email: true,
        subject: true,
        snippet: true,
        sentAt: true,
        folder: true,
      },
    })

    const hasMore = results.length > pageLimit
    const data = hasMore ? results.slice(0, -1) : results
    const nextCursor = hasMore ? data[data.length - 1]?.id : null

    return res.json({
      success: true,
      data,
      nextCursor,
      hasMore,
      count: data.length,
    })
  } catch (err) {
    console.error("Error searching messages:", err)
    return res.status(500).json({
      success: false,
      message: "Error searching messages",
      error: err.message,
    })
  }
})

/**
 * POST /api/inbox/bulk-read
 * Mark multiple messages as read efficiently
 */
router.post("/bulk-read", async (req, res) => {
  try {
    const { messageIds, isRead = true } = req.body

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid messageIds" })
    }

    const result = await prisma.emailMessage.updateMany({
      where: { id: { in: messageIds } },
      data: { isRead },
    })

    return res.json({
      success: true,
      updated: result.count,
    })
  } catch (err) {
    console.error("Error bulk reading messages:", err)
    return res.status(500).json({
      success: false,
      message: "Error updating messages",
      error: err.message,
    })
  }
})

/**
 * GET /api/inbox/stats/:accountId
 * Get quick stats for inbox (unread count, total, etc.)
 */
router.get("/stats/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params

    const [inboxCount, unreadCount, spamCount, attachmentCount] = await Promise.all([
      prisma.emailMessage.count({
        where: { emailAccountId: accountId, folder: "inbox", isSpam: false },
      }),
      prisma.emailMessage.count({
        where: { emailAccountId: accountId, folder: "inbox", isRead: false },
      }),
      prisma.emailMessage.count({
        where: { emailAccountId: accountId, folder: "spam" },
      }),
      prisma.emailMessage.count({
        where: {
          emailAccountId: accountId,
          folder: "inbox",
          attachments: { not: { equals: [] } },
        },
      }),
    ])

    return res.json({
      success: true,
      stats: {
        total: inboxCount,
        unread: unreadCount,
        spam: spamCount,
        withAttachments: attachmentCount,
      },
    })
  } catch (err) {
    console.error("Error fetching inbox stats:", err)
    return res.status(500).json({
      success: false,
      message: "Error fetching stats",
      error: err.message,
    })
  }
})

export default router
