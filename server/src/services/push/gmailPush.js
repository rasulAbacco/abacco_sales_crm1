// server/src/services/push/gmailPush.js
// Gmail Push Notifications via Google Cloud Pub/Sub

import { google } from "googleapis"
import { PrismaClient } from "@prisma/client"
import { createOAuthManager } from "../oauth/oauthManager.js"
import { deltaSyncAccount } from "../sync/deltaSync.js"

const prisma = new PrismaClient()

// Setup Gmail watch for push notifications
export async function setupGmailWatch(accountId) {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  })

  if (account.provider !== "gmail") {
    throw new Error("Gmail watch only works for Gmail accounts")
  }

  const oauth = await createOAuthManager(accountId)
  const accessToken = await oauth.getAccessToken()

  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: "v1", auth })

  // Watch for changes
  const watchResponse = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: process.env.GMAIL_PUBSUB_TOPIC, // e.g., projects/my-project/topics/gmail-push
      labelIds: ["INBOX"],
    },
  })

  // Store watch expiration
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: {
      watchExpiry: new Date(Number.parseInt(watchResponse.data.expiration)),
      historyId: watchResponse.data.historyId,
    },
  })

  console.log(`✅ Gmail watch setup for ${account.email}, expires: ${watchResponse.data.expiration}`)
  return watchResponse.data
}

// Handle incoming Pub/Sub notification
export async function handleGmailPushNotification(data) {
  // Decode base64 message
  const decoded = JSON.parse(Buffer.from(data, "base64").toString())
  const { emailAddress, historyId } = decoded

  console.log(`📬 Gmail push notification for ${emailAddress}, historyId: ${historyId}`)

  // Find account
  const account = await prisma.emailAccount.findUnique({
    where: { email: emailAddress },
  })

  if (!account) {
    console.warn(`Account not found for ${emailAddress}`)
    return
  }

  // Sync changes using history API for maximum speed
  await syncGmailHistory(account, historyId)
}

// Sync only the delta changes using Gmail History API
async function syncGmailHistory(account, newHistoryId) {
  const oauth = await createOAuthManager(account.id)
  const accessToken = await oauth.getAccessToken()

  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: "v1", auth })

  // Get changes since last historyId
  const startHistoryId = account.historyId || newHistoryId

  try {
    const historyResponse = await gmail.users.history.list({
      userId: "me",
      startHistoryId,
      historyTypes: ["messageAdded", "messageDeleted", "labelAdded", "labelRemoved"],
    })

    const history = historyResponse.data.history || []

    for (const record of history) {
      // Handle new messages
      if (record.messagesAdded) {
        for (const added of record.messagesAdded) {
          await fetchAndSaveGmailMessage(gmail, account, added.message.id)
        }
      }

      // Handle deleted messages
      if (record.messagesDeleted) {
        for (const deleted of record.messagesDeleted) {
          await prisma.emailMessage.updateMany({
            where: {
              emailAccountId: account.id,
              messageId: deleted.message.id,
            },
            data: { isTrash: true },
          })
        }
      }

      // Handle label changes (read/unread, starred, etc.)
      if (record.labelsAdded || record.labelsRemoved) {
        const messageId = record.labelsAdded?.[0]?.message?.id || record.labelsRemoved?.[0]?.message?.id
        if (messageId) {
          await updateMessageLabels(gmail, account, messageId)
        }
      }
    }

    // Update historyId
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: { historyId: newHistoryId },
    })
  } catch (err) {
    if (err.code === 404) {
      // History expired, do full sync
      console.log("History expired, doing full IMAP sync")
      await deltaSyncAccount(account, { fullSync: true })
    } else {
      throw err
    }
  }
}

// Fetch single Gmail message via API (faster than IMAP)
async function fetchAndSaveGmailMessage(gmail, account, gmailMessageId) {
  const message = await gmail.users.messages.get({
    userId: "me",
    id: gmailMessageId,
    format: "full",
  })

  // Extract headers
  const headers = {}
  message.data.payload.headers.forEach((h) => {
    headers[h.name.toLowerCase()] = h.value
  })

  // Get body
  let body = ""
  const getBody = (part) => {
    if (part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf-8")
    }
    if (part.parts) {
      for (const p of part.parts) {
        const result = getBody(p)
        if (result) return result
      }
    }
    return ""
  }
  body = getBody(message.data.payload)

  const labelIds = message.data.labelIds || []
  const isRead = !labelIds.includes("UNREAD")
  const isStarred = labelIds.includes("STARRED")
  const isSpam = labelIds.includes("SPAM")
  const isTrash = labelIds.includes("TRASH")

  // Upsert message
  await prisma.emailMessage.upsert({
    where: {
      emailAccountId_messageId: {
        emailAccountId: account.id,
        messageId: headers["message-id"] || gmailMessageId,
      },
    },
    create: {
      emailAccountId: account.id,
      messageId: headers["message-id"] || gmailMessageId,
      fromEmail: headers.from || "",
      toEmail: headers.to || "",
      ccEmail: headers.cc || null,
      subject: headers.subject || "(No Subject)",
      body,
      direction: headers.from?.includes(account.email) ? "sent" : "received",
      sentAt: new Date(Number.parseInt(message.data.internalDate)),
      isRead,
      isStarred,
      isSpam,
      isTrash,
      folder: labelIds.includes("SENT") ? "sent" : "inbox",
      gmailId: gmailMessageId,
      threadId: message.data.threadId,
      labelIds: JSON.stringify(labelIds),
    },
    update: {
      isRead,
      isStarred,
      isSpam,
      isTrash,
      labelIds: JSON.stringify(labelIds),
    },
  })
}

async function updateMessageLabels(gmail, account, gmailMessageId) {
  // Re-fetch and update the message
  await fetchAndSaveGmailMessage(gmail, account, gmailMessageId)
}
