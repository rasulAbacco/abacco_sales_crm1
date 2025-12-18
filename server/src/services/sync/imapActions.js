// server/src/services/sync/imapActions.js
// Two-way sync operations: read/unread, archive, delete, star, move, drafts

import { ImapFlow } from "imapflow"
import { PrismaClient } from "@prisma/client"
import { createOAuthManager } from "../oauth/oauthManager.js"
import { getIO } from "../../../socket.js"

const prisma = new PrismaClient()

// Get IMAP client for account
async function getImapClient(account) {
  let auth
  if (account.authType === "oauth2") {
    const oauth = await createOAuthManager(account.id)
    auth = await oauth.getImapAuth()
  } else {
    auth = {
      user: account.imapUser || account.email,
      pass: account.encryptedPass,
    }
  }

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort || 993,
    secure: account.imapSecure !== false,
    auth,
    tls: { rejectUnauthorized: false },
    logger: false,
  })

  await client.connect()
  return client
}

// ===============================
// 1. MARK AS READ / UNREAD
// ===============================
export async function markAsRead(accountId, messageIds, isRead = true) {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  const messages = await prisma.emailMessage.findMany({
    where: { id: { in: messageIds }, emailAccountId: accountId },
  })

  const client = await getImapClient(account)

  try {
    // Group by folder
    const byFolder = {}
    for (const msg of messages) {
      const folder = msg.folder || "INBOX"
      if (!byFolder[folder]) byFolder[folder] = []
      byFolder[folder].push(msg.uid)
    }

    for (const [folder, uids] of Object.entries(byFolder)) {
      const lock = await client.getMailboxLock(folder)
      try {
        if (isRead) {
          await client.messageFlagsAdd(uids.join(","), ["\\Seen"], { uid: true })
        } else {
          await client.messageFlagsRemove(uids.join(","), ["\\Seen"], { uid: true })
        }
      } finally {
        lock.release()
      }
    }

    // Update database
    await prisma.emailMessage.updateMany({
      where: { id: { in: messageIds } },
      data: { isRead },
    })

    // Emit socket update
    emitUpdate(account.userId, "messages_updated", { messageIds, isRead })

    return { success: true, count: messageIds.length }
  } finally {
    await client.logout().catch(() => {})
  }
}

// ===============================
// 2. STAR / UNSTAR (FLAG)
// ===============================
export async function toggleStar(accountId, messageIds, isStarred = true) {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  const messages = await prisma.emailMessage.findMany({
    where: { id: { in: messageIds }, emailAccountId: accountId },
  })

  const client = await getImapClient(account)

  try {
    const byFolder = {}
    for (const msg of messages) {
      const folder = msg.folder || "INBOX"
      if (!byFolder[folder]) byFolder[folder] = []
      byFolder[folder].push(msg.uid)
    }

    for (const [folder, uids] of Object.entries(byFolder)) {
      const lock = await client.getMailboxLock(folder)
      try {
        if (isStarred) {
          await client.messageFlagsAdd(uids.join(","), ["\\Flagged"], { uid: true })
        } else {
          await client.messageFlagsRemove(uids.join(","), ["\\Flagged"], { uid: true })
        }
      } finally {
        lock.release()
      }
    }

    await prisma.emailMessage.updateMany({
      where: { id: { in: messageIds } },
      data: { isStarred },
    })

    emitUpdate(account.userId, "messages_updated", { messageIds, isStarred })
    return { success: true }
  } finally {
    await client.logout().catch(() => {})
  }
}

// ===============================
// 3. ARCHIVE
// ===============================
export async function archiveMessages(accountId, messageIds) {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  const messages = await prisma.emailMessage.findMany({
    where: { id: { in: messageIds }, emailAccountId: accountId },
  })

  const client = await getImapClient(account)

  try {
    // Detect archive folder
    const mailboxes = await client.list()
    const archiveBox = mailboxes.find(
      (b) => b.specialUse === "\\Archive" || b.path.toLowerCase().includes("archive") || b.path === "[Gmail]/All Mail",
    )
    const archiveFolder = archiveBox?.path || "Archive"

    const byFolder = {}
    for (const msg of messages) {
      const folder = msg.folder || "INBOX"
      if (!byFolder[folder]) byFolder[folder] = []
      byFolder[folder].push(msg.uid)
    }

    for (const [folder, uids] of Object.entries(byFolder)) {
      if (folder.toLowerCase() === archiveFolder.toLowerCase()) continue

      const lock = await client.getMailboxLock(folder)
      try {
        await client.messageMove(uids.join(","), archiveFolder, { uid: true })
      } finally {
        lock.release()
      }
    }

    await prisma.emailMessage.updateMany({
      where: { id: { in: messageIds } },
      data: { folder: archiveFolder.toLowerCase(), isArchived: true },
    })

    emitUpdate(account.userId, "messages_archived", { messageIds })
    return { success: true, archiveFolder }
  } finally {
    await client.logout().catch(() => {})
  }
}

// ===============================
// 4. MOVE TO FOLDER
// ===============================
export async function moveToFolder(accountId, messageIds, targetFolder) {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  const messages = await prisma.emailMessage.findMany({
    where: { id: { in: messageIds }, emailAccountId: accountId },
  })

  const client = await getImapClient(account)

  try {
    const byFolder = {}
    for (const msg of messages) {
      const folder = msg.folder || "INBOX"
      if (!byFolder[folder]) byFolder[folder] = []
      byFolder[folder].push(msg.uid)
    }

    for (const [folder, uids] of Object.entries(byFolder)) {
      if (folder.toLowerCase() === targetFolder.toLowerCase()) continue

      const lock = await client.getMailboxLock(folder)
      try {
        await client.messageMove(uids.join(","), targetFolder, { uid: true })
      } finally {
        lock.release()
      }
    }

    const isTrash = targetFolder.toLowerCase().includes("trash") || targetFolder.toLowerCase().includes("deleted")
    const isSpam = targetFolder.toLowerCase().includes("spam") || targetFolder.toLowerCase().includes("junk")

    await prisma.emailMessage.updateMany({
      where: { id: { in: messageIds } },
      data: { folder: targetFolder.toLowerCase(), isTrash, isSpam },
    })

    emitUpdate(account.userId, "messages_moved", { messageIds, targetFolder })
    return { success: true }
  } finally {
    await client.logout().catch(() => {})
  }
}

// ===============================
// 5. DELETE (Move to Trash)
// ===============================
export async function deleteMessages(accountId, messageIds, permanent = false) {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  const messages = await prisma.emailMessage.findMany({
    where: { id: { in: messageIds }, emailAccountId: accountId },
  })

  const client = await getImapClient(account)

  try {
    // Detect trash folder
    const mailboxes = await client.list()
    const trashBox = mailboxes.find(
      (b) =>
        b.specialUse === "\\Trash" ||
        b.path.toLowerCase().includes("trash") ||
        b.path.toLowerCase().includes("deleted"),
    )
    const trashFolder = trashBox?.path || "Trash"

    const byFolder = {}
    for (const msg of messages) {
      const folder = msg.folder || "INBOX"
      if (!byFolder[folder]) byFolder[folder] = []
      byFolder[folder].push(msg.uid)
    }

    for (const [folder, uids] of Object.entries(byFolder)) {
      const lock = await client.getMailboxLock(folder)
      try {
        if (permanent || folder.toLowerCase() === trashFolder.toLowerCase()) {
          // Permanent delete
          await client.messageFlagsAdd(uids.join(","), ["\\Deleted"], { uid: true })
          await client.messageDelete(uids.join(","), { uid: true })
        } else {
          // Move to trash
          await client.messageMove(uids.join(","), trashFolder, { uid: true })
        }
      } finally {
        lock.release()
      }
    }

    if (permanent) {
      await prisma.emailMessage.deleteMany({
        where: { id: { in: messageIds } },
      })
    } else {
      await prisma.emailMessage.updateMany({
        where: { id: { in: messageIds } },
        data: { folder: trashFolder.toLowerCase(), isTrash: true },
      })
    }

    emitUpdate(account.userId, "messages_deleted", { messageIds, permanent })
    return { success: true }
  } finally {
    await client.logout().catch(() => {})
  }
}

// ===============================
// 6. SAVE DRAFT
// ===============================
export async function saveDraft(accountId, draftData) {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  const client = await getImapClient(account)

  try {
    // Build draft email
    const { to, cc, bcc, subject, body, attachments = [] } = draftData

    const mailContent = [
      `From: ${account.email}`,
      `To: ${to}`,
      cc ? `Cc: ${cc}` : null,
      bcc ? `Bcc: ${bcc}` : null,
      `Subject: ${subject || ""}`,
      `Date: ${new Date().toUTCString()}`,
      `Content-Type: text/html; charset=utf-8`,
      "",
      body || "",
    ]
      .filter(Boolean)
      .join("\r\n")

    // Detect drafts folder
    const mailboxes = await client.list()
    const draftsBox = mailboxes.find((b) => b.specialUse === "\\Drafts" || b.path.toLowerCase().includes("draft"))
    const draftsFolder = draftsBox?.path || "Drafts"

    // Append to drafts folder
    const result = await client.append(draftsFolder, mailContent, {
      flags: ["\\Draft", "\\Seen"],
    })

    // Save in database
    const savedDraft = await prisma.emailMessage.create({
      data: {
        emailAccountId: accountId,
        messageId: `draft-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        fromEmail: account.email,
        toEmail: to || "",
        ccEmail: cc || null,
        subject: subject || "",
        body: body || "",
        direction: "sent",
        isDraft: true,
        folder: "drafts",
        sentAt: new Date(),
      },
    })

    emitUpdate(account.userId, "draft_saved", { draftId: savedDraft.id })
    return { success: true, draft: savedDraft }
  } finally {
    await client.logout().catch(() => {})
  }
}

// ===============================
// 7. SNOOZE EMAIL
// ===============================
export async function snoozeEmail(messageId, snoozeUntil) {
  const message = await prisma.emailMessage.findUnique({
    where: { id: messageId },
    include: { emailAccount: true },
  })

  if (!message) throw new Error("Message not found")

  // Update message with snooze data
  const updated = await prisma.emailMessage.update({
    where: { id: messageId },
    data: {
      snoozedUntil: new Date(snoozeUntil),
      isSnoozed: true,
      originalFolder: message.folder,
    },
  })

  emitUpdate(message.emailAccount.userId, "message_snoozed", {
    messageId,
    snoozeUntil,
  })

  return { success: true, message: updated }
}

// ===============================
// HELPER: Emit Socket Update
// ===============================
function emitUpdate(userId, event, data) {
  try {
    const io = getIO()
    io.to(`user:${userId}`).emit(event, data)
  } catch (e) {
    // Socket not available
  }
}
