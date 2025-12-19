// FIXED: ConversationList.jsx - Outlook-style conversation display
// 🔒 HARD RULE: Group ONLY by conversationId
// ❌ NO participant logic on frontend

import React, { useState, useEffect } from "react";
import {
  Mail,
  Paperclip,
  Loader2,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import { api } from "../../../pages/api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ConversationList({
  selectedAccount,
  selectedFolder,
  onConversationSelect,
  selectedConversation,
  filters = {},
  searchEmail = "",
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    if (selectedAccount && selectedFolder) {
      fetchConversations();
    }
  }, [selectedAccount, selectedFolder, filters, searchEmail]);

  const fetchConversations = async () => {
    if (!selectedAccount) return;

    setLoading(true);
    try {
      const params = {
        accountEmail: selectedAccount.email,
        folder: selectedFolder,
      };

      // Add filters
      if (filters.sender) params.sender = filters.sender;
      if (filters.recipient) params.recipient = filters.recipient;
      if (filters.subject) params.subject = filters.subject;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.hasAttachment) params.hasAttachment = filters.hasAttachment;
      if (filters.isUnread) params.isUnread = filters.isUnread;
      if (filters.isStarred) params.isStarred = filters.isStarred;
      if (filters.country) params.country = filters.country;
      if (searchEmail) params.searchEmail = searchEmail;

      const response = await api.get(
        `${API_BASE_URL}/api/inbox/conversations/${selectedAccount.id}`,
        { params }
      );

      if (response.data.success) {
        setConversations(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }

    const sorted = [...conversations].sort((a, b) => {
      let compareA, compareB;

      switch (field) {
        case "date":
          compareA = new Date(a.lastDate);
          compareB = new Date(b.lastDate);
          break;
        case "sender":
          compareA = (
            a.primaryRecipient ||
            a.initiatorEmail ||
            ""
          ).toLowerCase();
          compareB = (
            b.primaryRecipient ||
            b.initiatorEmail ||
            ""
          ).toLowerCase();
          break;
        case "subject":
          compareA = (a.subject || "").toLowerCase();
          compareB = (b.subject || "").toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });

    setConversations(sorted);
  };

  const formatDate = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now - messageDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: "short" });
    } else {
      return messageDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  };

  const truncateText = (text, maxLength = 80) => {
    if (!text) return "";
    const cleanText = text.replace(/<[^>]*>/g, "").trim();
    return cleanText.length > maxLength
      ? cleanText.substring(0, maxLength) + "..."
      : cleanText;
  };
  // Inside ConversationList.jsx
  const handleConversationSelect = async (conversation) => {
    // 1. Immediately show the MessageView
    onConversationSelect(conversation);

    try {
      // 2. Tell the Backend to update DB
      await api.post(`${API_BASE_URL}/api/inbox/mark-read-conversation`, {
        conversationId: conversation.conversationId,
        accountId: selectedAccount.id,
      });

      // 3. 🔥 FIX: Update the LOCAL LIST so the badge disappears NOW
      setConversations((prevConversations) =>
        prevConversations.map((conv) =>
          conv.conversationId === conversation.conversationId
            ? { ...conv, unreadCount: 0 } // Force count to 0 locally
            : conv
        )
      );

      // 4. Update the Sidebar Count (see Step 2)
      if (onRefreshStats) onRefreshStats();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };
  if (!selectedAccount || !selectedFolder) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p className="text-sm">Select an account and folder to view messages</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Sort Header */}
      <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">
          {conversations.length} Conversation
          {conversations.length !== 1 ? "s" : ""}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSort("date")}
            className={`text-xs px-3 py-1 rounded ${
              sortBy === "date"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            } flex items-center gap-1`}
          >
            Date
            {sortBy === "date" &&
              (sortOrder === "desc" ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              ))}
          </button>
          <button
            onClick={() => handleSort("sender")}
            className={`text-xs px-3 py-1 rounded ${
              sortBy === "sender"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            } flex items-center gap-1`}
          >
            {selectedFolder === "sent" ? "Recipient" : "Sender"}
            {sortBy === "sender" &&
              (sortOrder === "desc" ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              ))}
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <Mail className="w-12 h-12 opacity-20 mb-4" />
            <p className="text-sm">No conversations found</p>
            {(searchEmail ||
              Object.values(filters).some((v) => v && v !== "all")) && (
              <p className="text-xs mt-2">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          conversations.map((conversation) => {
            // 🔥 FIX: Use conversationId as the unique key
            const conversationId = conversation.conversationId;
            const isSelected =
              selectedConversation?.conversationId === conversationId;

            // 🎯 LOGIC: Identify the Client/Prospect (Peer)
            // We filter out the currently selected employee account to find the client
            const myEmail = selectedAccount.email.toLowerCase();

            // Find the first participant that is NOT you
            const clientEmail =
              conversation.participants.find(
                (p) => p.toLowerCase() !== myEmail
              ) || conversation.initiatorEmail; // Fallback to initiator if you are the only participant

            // Check if there are more people than just you and the primary client
            const hasMultipleParticipants =
              conversation.participants.length > 2;

            return (
              <div
                key={conversationId} // 🔥 Use conversationId as key
                onClick={() => onConversationSelect(conversation)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors ${
                  isSelected
                    ? "bg-blue-50 border-l-4 border-l-blue-600"
                    : "hover:bg-gray-50"
                } ${conversation.unreadCount > 0 ? "bg-blue-50/30" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {/* 👤 Avatar: Displays the Client's Initial */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm">
                    {hasMultipleParticipants ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      clientEmail.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* 📝 Content Section */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className={`text-sm truncate ${
                            conversation.unreadCount > 0
                              ? "font-bold text-gray-900"
                              : "font-semibold text-gray-700"
                          }`}
                        >
                          {/* 🔥 DISPLAY CLIENT EMAIL INSTEAD OF EMPLOYEE EMAIL */}
                          {clientEmail}

                          {hasMultipleParticipants && (
                            <span className="text-gray-400 text-[10px] ml-1 font-normal">
                              +{conversation.participants.length - 1} more
                            </span>
                          )}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatDate(conversation.lastDate)}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm mb-0.5 truncate ${
                            conversation.unreadCount > 0
                              ? "font-medium text-gray-800"
                              : "text-gray-600"
                          }`}
                        >
                          {conversation.subject || "(No subject)"}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-1 italic">
                          {truncateText(conversation.lastBody)}
                        </p>
                      </div>
                    </div>

                    {/* 🏷️ Metadata Badges */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {conversation.unreadCount > 0 && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase">
                          {conversation.unreadCount} New
                        </span>
                      )}
                      {conversation.messageCount > 1 && (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {conversation.messageCount} msgs
                        </span>
                      )}
                      {conversation.country && (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" />
                          {conversation.country}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
