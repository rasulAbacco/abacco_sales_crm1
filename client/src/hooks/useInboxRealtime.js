"use client"

// Real-time inbox hook using Socket.IO
// Handles incoming messages, read/unread updates, and conversation changes
// WITHOUT triggering full component re-renders

import { useEffect, useRef } from "react"
import { getSocket } from "../sockets"

export function useInboxRealtime({
  accountId,
  onNewMessage,
  onMessageRead,
  onConversationUpdate,
  onUnreadCountChange,
}) {
  const socketRef = useRef(null)
  const listenersRef = useRef({})

  // Add event listeners for real-time updates
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socketRef.current = socket

    // Listen for new incoming messages
    const handleNewMessage = (data) => {
      if (data.accountId === accountId) {
        onNewMessage?.(data)
      }
    }

    // Listen for message read status change
    const handleMessageRead = (data) => {
      if (data.accountId === accountId) {
        onMessageRead?.(data)
      }
    }

    // Listen for conversation updates (subject change, archived, etc.)
    const handleConversationUpdate = (data) => {
      if (data.accountId === accountId) {
        onConversationUpdate?.(data)
      }
    }

    // Listen for unread count changes
    const handleUnreadUpdate = (data) => {
      if (data.accountId === accountId) {
        onUnreadCountChange?.(data)
      }
    }

    // Attach listeners
    socket.on("new_message", handleNewMessage)
    socket.on("message_read", handleMessageRead)
    socket.on("conversation_updated", handleConversationUpdate)
    socket.on("unread_update", handleUnreadUpdate)

    // Store references for cleanup
    listenersRef.current = {
      handleNewMessage,
      handleMessageRead,
      handleConversationUpdate,
      handleUnreadUpdate,
    }

    return () => {
      socket.off("new_message", handleNewMessage)
      socket.off("message_read", handleMessageRead)
      socket.off("conversation_updated", handleConversationUpdate)
      socket.off("unread_update", handleUnreadUpdate)
    }
  }, [accountId, onNewMessage, onMessageRead, onConversationUpdate, onUnreadCountChange])

  return socketRef.current
}

export default useInboxRealtime
