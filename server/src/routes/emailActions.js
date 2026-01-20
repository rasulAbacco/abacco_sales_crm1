// server/src/routes/emailActions.js
// API routes for all email actions

import express from "express"
import {
  markAsRead,
  toggleStar,
  archiveMessages,
  moveToFolder,
  deleteMessages,
  saveDraft,
  snoozeEmail,
} from "../services/sync/imapActions.js"

const router = express.Router()

// Mark as read/unread
router.post("/mark-read", async (req, res) => {
  try {
    const { accountId, messageIds, isRead } = req.body
    const result = await markAsRead(accountId, messageIds, isRead)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Star/unstar
router.post("/star", async (req, res) => {
  try {
    const { accountId, messageIds, isStarred } = req.body
    const result = await toggleStar(accountId, messageIds, isStarred)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Archive
router.post("/archive", async (req, res) => {
  try {
    const { accountId, messageIds } = req.body
    const result = await archiveMessages(accountId, messageIds)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Move to folder
router.post("/move", async (req, res) => {
  try {
    const { accountId, messageIds, targetFolder } = req.body
    const result = await moveToFolder(accountId, messageIds, targetFolder)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete
router.post("/delete", async (req, res) => {
  try {
    const { accountId, messageIds, permanent } = req.body
    const result = await deleteMessages(accountId, messageIds, permanent)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Save draft
router.post("/draft", async (req, res) => {
  try {
    const { accountId, ...draftData } = req.body
    const result = await saveDraft(accountId, draftData)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Snooze
router.post("/snooze", async (req, res) => {
  try {
    const { messageId, snoozeUntil } = req.body
    const result = await snoozeEmail(messageId, snoozeUntil)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
