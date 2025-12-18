"use client";

// Outlook-style ChatView with Proper Message Threading
// Groups consecutive messages from same sender, shows clear conversation flow

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Send,
  Paperclip,
  MoreVertical,
  Archive,
  Flag,
  Reply,
  ReplyAll,
} from "lucide-react";
import DOMPurify from "dompurify";
import { api, API_BASE_URL } from "../../../pages/api.js";

// Collapse quoted/forwarded content into collapsible sections
function collapseQuotedContent(html) {
  if (!html) return html;

  // Collapse Gmail/HTML blockquotes
  html = html.replace(
    /<blockquote[^>]*?>([\s\S]*?)<\/blockquote>/gim,
    `
      <details style="margin-top:12px;">
        <summary style="cursor:pointer; color:#5f6368; font-size:13px;">
          ▼ Show previous message
        </summary>
        <div style="margin-top:8px; border-left:2px solid #dadce0; padding-left:10px;">
          $1
        </div>
      </details>
    `
  );

  // Collapse forwarded message styles
  html = html.replace(
    /([-]{2,}\s*Forwarded message\s*[-]{2,}|From:\s.*?Sent:\s.*?To:\s.*?Subject:)([\s\S]*)/gim,
    `
      <details style="margin-top:12px;">
        <summary style="cursor:pointer; color:#5f6368; font-size:13px;">
          ▼ Show forwarded content
        </summary>
        <div style="margin-top:8px; border-left:2px solid #dadce0; padding-left:10px;">
          $2
        </div>
      </details>
    `
  );

  return html;
}

const ThreadGroup = ({ messages, senderEmail, selectedAccountEmail }) => {
  const isMine = messages[0].fromEmail === selectedAccountEmail;
  const senderName = messages[0].fromEmail.split("@")[0].toUpperCase();
  const firstMsg = messages[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      {/* Thread Header */}
      <div
        className={`flex items-center gap-2 mb-2 ${
          isMine ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
            isMine ? "bg-blue-600" : "bg-gray-400"
          }`}
        >
          {senderName}
        </div>
        <span className="text-xs text-gray-600 font-semibold">
          {firstMsg.fromEmail}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(firstMsg.sentAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Messages in thread */}
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-lg px-4 py-3 rounded-lg ${
            isMine
              ? "bg-blue-50 border-2 border-blue-200"
              : "bg-gray-50 border border-gray-200"
          }`}
        >
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={idx > 0 ? "mt-3 pt-3 border-t border-gray-300" : ""}
            >
              {/* Subject (show only on first message) */}
              {idx === 0 && msg.subject && (
                <p className="font-semibold text-gray-900 mb-2 text-sm">
                  {msg.subject}
                </p>
              )}

              {/* Body - Now properly rendered as HTML */}
              <div
                className="prose prose-sm max-w-none text-gray-800 text-sm leading-relaxed break-words"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    collapseQuotedContent(
                      (msg.body || msg.snippet || "No content")
                        .replace(
                          /src=["']cid:([^"']+)["']/g,
                          `src='${API_BASE_URL}/api/attachments/cid-$1'`
                        )
                        .replace(
                          /src=["']\/uploads/g,
                          `src='${API_BASE_URL}/uploads`
                        )
                    )
                  ),
                }}
              />

              {/* Attachments */}
              {msg.attachments?.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1 mb-1">
                    <Paperclip className="w-3 h-3" />
                    {msg.attachments.length} attachment(s)
                  </div>
                  <div className="space-y-1">
                    {msg.attachments.slice(0, 3).map((att) => (
                      <div
                        key={att.id}
                        className="text-blue-600 hover:underline cursor-pointer"
                      >
                        📄 {att.filename}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CC Info */}
              {msg.ccEmail && (
                <p className="text-xs text-gray-500 mt-2">
                  <span className="font-semibold">CC:</span> {msg.ccEmail}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const ThreadedMessageRow = ({ index, style, data }) => {
  const threadGroup = data[index];
  if (!threadGroup) return null;

  return (
    <div style={style} className="px-4 py-2">
      <ThreadGroup
        messages={threadGroup.messages}
        senderEmail={threadGroup.senderEmail}
        selectedAccountEmail={data.selectedAccountEmail}
      />
    </div>
  );
};

export default function ChatViewThreaded({
  selectedAccount,
  clientEmail,
  onBack,
  selectedTab,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [replyMode, setReplyMode] = useState("reply"); // "reply" or "reply-all"
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef(null);
  const [conversationSubject, setConversationSubject] = useState("");
  const [isFlagged, setIsFlagged] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  // Fetch all messages for conversation
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
            : msg.ccEmail || msg.cc || "",
          attachments: (msg.attachments || []).map((att) => ({
            id: att.id,
            filename: att.filename || "file",
            mimeType: att.mimeType || "application/octet-stream",
            url: att.url || att.storageUrl || "",
          })),
          // Fix image paths in body
          body: (msg.body || "").replace(
            /src="\/uploads/g,
            `src='${API_BASE_URL}/uploads'`
          ),
        }))
        .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));

      if (msgs.length > 0) {
        setConversationSubject(msgs[0].subject || "No Subject");
      }

      setMessages(msgs);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setLoading(false);
    }
  }, [selectedAccount, clientEmail]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Group messages by consecutive sender
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
      const endpoint =
        replyMode === "reply-all" ? "/api/inbox/reply-all" : "/api/inbox/reply";
      await api.post(`${API_BASE_URL}${endpoint}`, {
        messageId: messages[messages.length - 1]?.id,
        body: replyText,
        accountId: selectedAccount.id,
        clientEmail,
      });

      setReplyText("");
      await fetchMessages(); // Refresh
    } catch (err) {
      console.error("Error sending reply:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleArchive = async () => {
    try {
      const messageId = messages[messages.length - 1]?.id;
      if (!messageId) return;

      console.log("[v0] Archiving message:", messageId);
      await api.post(`${API_BASE_URL}/api/inbox/archive`, {
        messageId,
        accountId: selectedAccount.id,
        clientEmail,
      });
      setIsArchived(true);
    } catch (err) {
      console.error("Error archiving message:", err);
    }
  };

  const handleFlag = async () => {
    try {
      const messageId = messages[messages.length - 1]?.id;
      if (!messageId) return;

      console.log("[v0] Flagging message:", messageId);
      await api.post(`${API_BASE_URL}/api/inbox/flag`, {
        messageId,
        accountId: selectedAccount.id,
        flag: !isFlagged,
      });
      setIsFlagged(!isFlagged);
    } catch (err) {
      console.error("Error flagging message:", err);
    }
  };

  const handleDelete = async () => {
    try {
      const messageId = messages[messages.length - 1]?.id;
      if (!messageId) return;

      console.log("[v0] Deleting message:", messageId);
      if (confirm("Delete this conversation?")) {
        await api.post(`${API_BASE_URL}/api/inbox/delete`, {
          messageId,
          accountId: selectedAccount.id,
        });
        onBack?.();
      }
    } catch (err) {
      console.error("Error deleting message:", err);
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
      {/* Header - Outlook style */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 px-4">
            <h2 className="font-semibold text-gray-900 text-sm">
              {conversationSubject}
            </h2>
            <p className="text-xs text-gray-500">{clientEmail}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleFlag}
              title={isFlagged ? "Unmark flag" : "Mark flag"}
              className={`p-1.5 hover:bg-gray-100 rounded-lg transition ${
                isFlagged ? "text-yellow-500" : "text-gray-600"
              }`}
            >
              <Flag className="w-4 h-4" />
            </button>
            <button
              onClick={handleArchive}
              title="Archive conversation"
              className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-600"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              title="Delete conversation"
              className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-red-600"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex items-center gap-4 text-xs text-gray-600 pl-12">
          <span>{messages.length} messages</span>
          <span>{threadedMessages.length} threads</span>
        </div>
      </div>

      {/* Messages - Threaded */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">No messages in this conversation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {threadedMessages.map((group, idx) => (
              <ThreadGroup
                key={idx}
                messages={group.messages}
                senderEmail={group.senderEmail}
                selectedAccountEmail={selectedAccount?.email}
              />
            ))}
          </div>
        )}
      </div>

      {/* Compose Reply - Outlook style */}
      <div className="border-t border-gray-200 bg-white p-4">
        {/* Reply Mode Toggle */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            onClick={() => setReplyMode("reply")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition ${
              replyMode === "reply"
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>
          <button
            onClick={() => setReplyMode("reply-all")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition ${
              replyMode === "reply-all"
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <ReplyAll className="w-3 h-3" />
            Reply All
          </button>
        </div>

        {/* Compose Box */}
        <div className="flex gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 flex-shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Send Button */}
        <div className="flex justify-end gap-2 mt-2">
          <button className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
            Cancel
          </button>
          <button
            onClick={handleSendReply}
            disabled={isSending || !replyText.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send {replyMode === "reply-all" ? "All" : ""}
          </button>
        </div>
      </div>

      <style>{`
        .prose p {
          margin: 0.5em 0;
        }
        .prose a {
          color: #1a73e8;
          text-decoration: underline;
        }
        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }
        
        /* Collapsible quoted content styling */
        details summary::-webkit-details-marker {
          display: none;
        }
        details summary {
          user-select: none;
          cursor: pointer;
        }
        details[open] summary {
          color: #1a73e8;
        }
      `}</style>
    </div>
  );
}
