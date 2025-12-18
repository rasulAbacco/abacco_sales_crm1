// server/src/routes/webhooks/gmailWebhook.js
// Webhook endpoint for Gmail Pub/Sub push notifications

import express from "express"
import { handleGmailPushNotification } from "../../services/push/gmailPush.js"

const router = express.Router()

// POST /webhooks/gmail - Receive Gmail push notifications
router.post("/gmail", async (req, res) => {
  try {
    const message = req.body.message

    if (!message?.data) {
      return res.status(400).json({ error: "Invalid message format" })
    }

    // Process asynchronously to respond quickly
    setImmediate(() => {
      handleGmailPushNotification(message.data).catch((err) => {
        console.error("Gmail push handler error:", err)
      })
    })

    // Acknowledge receipt immediately
    res.status(200).send("OK")
  } catch (err) {
    console.error("Gmail webhook error:", err)
    res.status(500).json({ error: err.message })
  }
})

export default router
