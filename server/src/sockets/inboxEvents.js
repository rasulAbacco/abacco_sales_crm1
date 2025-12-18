// Socket.IO event handlers for real-time inbox updates
// Handles message notifications, read status, and conversation updates

export function setupInboxEvents(io) {
  io.on("connection", (socket) => {
    // User joins a conversation room
    socket.on("join_conversation", (data) => {
      const { accountId, clientEmail } = data
      const roomName = `inbox:${accountId}:${clientEmail}`

      socket.join(roomName)
      console.log(`User joined room: ${roomName}`)
    })

    // Leave conversation room
    socket.on("leave_conversation", (data) => {
      const { accountId, clientEmail } = data
      const roomName = `inbox:${accountId}:${clientEmail}`

      socket.leave(roomName)
      console.log(`User left room: ${roomName}`)
    })

    // Broadcast new incoming message to room
    socket.on("message_received", (data) => {
      const { accountId, clientEmail, message } = data
      const roomName = `inbox:${accountId}:${clientEmail}`

      // Broadcast to all users in that conversation
      io.to(roomName).emit("new_message", {
        accountId,
        clientEmail,
        message,
      })
    })

    // Broadcast message read status change
    socket.on("mark_message_read", (data) => {
      const { accountId, messageId, isRead } = data

      io.to(`inbox:${accountId}`).emit("message_read", {
        accountId,
        messageId,
        isRead,
      })
    })

    // Broadcast conversation update
    socket.on("conversation_changed", (data) => {
      const { accountId, clientEmail, change } = data
      const roomName = `inbox:${accountId}:${clientEmail}`

      io.to(roomName).emit("conversation_updated", {
        accountId,
        clientEmail,
        ...change,
      })
    })

    // Broadcast unread count update
    socket.on("unread_count_changed", (data) => {
      const { accountId, unreadCount } = data

      io.to(`inbox:${accountId}`).emit("unread_update", {
        accountId,
        unreadCount,
      })
    })
  })
}

export default setupInboxEvents
