"use client"

// Optimized ChatView with Message Virtualization (Outlook-style)
// Loads messages in chunks to prevent rendering 100+ messages at once

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import { FixedSizeList as List } from "react-window"
import { ChevronLeft, Send, Paperclip, MoreVertical, Archive, Flag } from "lucide-react"
import { api, API_BASE_URL } from "../../../pages/api.js";

const MESSAGES_PER_PAGE = 20 // Load 20 messages at a time
const MESSAGE_ROW_HEIGHT = 120 // Approximate height for each message row

const MessageRow = ({ index, style, data }) => {
  const msg = data[index]
  if (!msg) return null

  const isMine = msg.fromEmail === data.senderEmail

  return (
    <div style={style} className="px-4 py-1">
      <MessageBubble msg={msg} isMine={isMine} senderEmail={data.senderEmail} />
    </div>
  )
}

const MessageBubble = ({ msg, isMine, senderEmail }) => {
  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex mb-2 ${isMine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-md px-4 py-2 rounded-lg text-sm ${
          isMine ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-100 text-gray-900 rounded-bl-none"
        }`}
      >
        {/* Sender info for received messages */}
        {!isMine && (
          <div className="text-xs font-semibold text-gray-600 mb-1">{msg.fromEmail.split("@")[0].toUpperCase()}</div>
        )}

        {/* Message body */}
        <p className="leading-relaxed">{msg.subject || msg.snippet || "No content"}</p>

        {/* Attachments */}
        {msg.attachments?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-opacity-30 border-current text-xs">
            📎 {msg.attachments.length} file(s)
          </div>
        )}

        {/* Time */}
        <div className={`text-xs mt-1 ${isMine ? "text-blue-100" : "text-gray-500"}`}>{formatTime(msg.sentAt)}</div>
      </div>
    </motion.div>
  )
}

export default function ChatViewOptimized({ selectedAccount, clientEmail, onBack, selectedTab }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [replyText, setReplyText] = useState("")
  const listRef = useRef(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Fetch messages with pagination
  const fetchMessages = useCallback(
    async (pageNum = 0) => {
      if (!selectedAccount?.id || !clientEmail) return

      try {
        setIsLoadingMore(pageNum > 0)
        const res = await api.get(
          `${API_BASE_URL}/api/inbox/conversation/${clientEmail}?mode=thread&page=${pageNum}&limit=${MESSAGES_PER_PAGE}`,
          { params: { emailAccountId: selectedAccount.id } },
        )

        const msgs = (res.data.data || []).map((msg) => ({
          ...msg,
          ccEmail: Array.isArray(msg.cc) ? msg.cc.join(", ") : msg.ccEmail || msg.cc || "",
          attachments: (msg.attachments || []).map((att) => ({
            id: att.id,
            filename: att.filename || "file",
            mimeType: att.mimeType || "application/octet-stream",
            url: att.url || att.storageUrl || "",
          })),
        }))

        msgs.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))

        if (pageNum === 0) {
          setMessages(msgs)
        } else {
          setMessages((prev) => [...prev, ...msgs])
        }

        setHasMore(msgs.length === MESSAGES_PER_PAGE)
        setPage(pageNum)
        setLoading(false)
        setIsLoadingMore(false)
      } catch (err) {
        console.error("Error fetching messages:", err)
        setLoading(false)
        setIsLoadingMore(false)
      }
    },
    [selectedAccount, clientEmail],
  )

  // Initial load
  useEffect(() => {
    setMessages([])
    setPage(0)
    setLoading(true)
    fetchMessages(0)
  }, [selectedAccount?.id, clientEmail, fetchMessages])

  // Load more messages when scrolling
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchMessages(page + 1)
    }
  }, [page, hasMore, isLoadingMore, fetchMessages])

  // Prepare data for virtualized list
  const itemData = useMemo(
    () => ({
      ...messages,
      senderEmail: selectedAccount?.email,
    }),
    [messages, selectedAccount?.email],
  )

  const handleSendReply = async () => {
    if (!replyText.trim()) return

    try {
      await api.post(`${API_BASE_URL}/api/inbox/reply`, {
        messageId: messages[messages.length - 1]?.id,
        body: replyText,
        accountId: selectedAccount.id,
      })

      setReplyText("")
      // Refresh messages
      fetchMessages(0)
    } catch (err) {
      console.error("Error sending reply:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-lg transition">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{clientEmail}</h2>
            <p className="text-xs text-gray-500">{messages.length} messages</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-200 rounded-lg transition">
            <Flag className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-lg transition">
            <Archive className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-lg transition">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages (Virtualized) */}
      <div className="flex-1 overflow-y-auto bg-white">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages in this conversation</p>
          </div>
        ) : (
          <List
            ref={listRef}
            height={500}
            itemCount={messages.length}
            itemSize={MESSAGE_ROW_HEIGHT}
            width="100%"
            itemData={itemData}
            onItemsRendered={({ visibleStopIndex }) => {
              if (visibleStopIndex >= messages.length - 5) {
                handleLoadMore()
              }
            }}
          >
            {MessageRow}
          </List>
        )}

        {isLoadingMore && <div className="p-4 text-center text-gray-500 text-sm">Loading more messages...</div>}
      </div>

      {/* Compose Reply */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex gap-2">
          <button className="p-2 hover:bg-gray-200 rounded-lg transition">
            <Paperclip className="w-5 h-5 text-gray-600" />
          </button>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply to this message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            rows={2}
          />
          <button
            onClick={handleSendReply}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
