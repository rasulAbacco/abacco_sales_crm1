"use client";

// ChatView with Real-time Updates
// Handles incoming messages and updates without full re-render
// Uses optimistic updates for better UX

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Send, Paperclip } from "lucide-react";
import { api, API_BASE_URL } from "../../../pages/api.js";
import { useInboxRealtime } from "../../../hooks/useInboxRealtime";

export default function ChatViewWithRealtime({
  selectedAccount,
  clientEmail,
  onBack,
  selectedTab,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messageMapRef = useRef(new Map()); // Quick lookup for message updates

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!selectedAccount?.id || !clientEmail) return;

    try {
      setLoading(true);
      const res = await api.get(
        `${API_BASE_URL}/api/inbox/conversation/${clientEmail}?mode=thread`,
        {
          params: { emailAccountId: selectedAccount.id },
        }
      );

      const msgs = (res.data.data || [])
        .map((msg) => ({
          ...msg,
          ccEmail: Array.isArray(msg.cc)
            ? msg.cc.join(", ")
            : msg.ccEmail || "",
        }))
        .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));

      setMessages(msgs);

      // Build quick lookup map
      const map = new Map();
      msgs.forEach((msg) => map.set(msg.id, msg));
      messageMapRef.current = map;

      setLoading(false);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setLoading(false);
    }
  }, [selectedAccount, clientEmail]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Handle new incoming message (append without re-rendering all)
  const handleNewMessage = useCallback((data) => {
    const { message } = data;

    // Check if message already exists
    if (messageMapRef.current.has(message.id)) {
      return; // Already have this message
    }

    // Add to messages and map
    setMessages((prev) => {
      const updated = [...prev, message];
      messageMapRef.current.set(message.id, message);
      return updated;
    });

    // Auto scroll to bottom
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  }, []);

  // Handle message read status update (update without full re-render)
  const handleMessageRead = useCallback((data) => {
    const { messageId, isRead } = data;

    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, isRead } : msg))
    );

    // Update map
    const cached = messageMapRef.current.get(messageId);
    if (cached) {
      cached.isRead = isRead;
    }
  }, []);

  // Set up real-time listeners
  useInboxRealtime({
    accountId: selectedAccount?.id,
    onNewMessage: handleNewMessage,
    onMessageRead: handleMessageRead,
  });

  // Group messages by sender for display
  const threadedMessages = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((msg) => {
      if (!currentGroup || currentGroup.senderEmail !== msg.fromEmail) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { senderEmail: msg.fromEmail, messages: [msg] };
      } else {
        currentGroup.messages.push(msg);
      }
    });

    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [messages]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !messages.length) return;

    setIsSending(true);
    try {
      // Optimistic update: add message locally before server confirms
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        fromEmail: selectedAccount.email,
        body: replyText,
        subject: messages[0]?.subject,
        sentAt: new Date().toISOString(),
        attachments: [],
        isRead: true,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      messageMapRef.current.set(optimisticMessage.id, optimisticMessage);

      // Send to server
      await api.post(`${API_BASE_URL}/api/inbox/reply`, {
        messageId: messages[messages.length - 1]?.id,
        body: replyText,
        accountId: selectedAccount.id,
        clientEmail,
      });

      setReplyText("");
    } catch (err) {
      console.error("Error sending reply:", err);
      // Remove optimistic update on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 text-sm truncate">
                {clientEmail}
              </h2>
              <p className="text-xs text-gray-500">
                {messages.length} messages
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">No messages</p>
          </div>
        ) : (
          <div className="space-y-4">
            {threadedMessages.map((group, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  className={`flex ${
                    group.senderEmail === selectedAccount?.email
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-lg px-4 py-3 rounded-lg ${
                      group.senderEmail === selectedAccount?.email
                        ? "bg-blue-50 border-2 border-blue-200"
                        : "bg-gray-100 border border-gray-300"
                    }`}
                  >
                    {group.messages.map((msg, midx) => (
                      <div
                        key={msg.id}
                        className={
                          midx > 0 ? "mt-3 pt-3 border-t border-gray-300" : ""
                        }
                      >
                        <p className="text-gray-800 text-sm">
                          {msg.body || msg.snippet || "No content"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(msg.sentAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Box */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <Paperclip className="w-5 h-5" />
          </button>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            rows={2}
          />
          <button
            onClick={handleSendReply}
            disabled={isSending || !replyText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
