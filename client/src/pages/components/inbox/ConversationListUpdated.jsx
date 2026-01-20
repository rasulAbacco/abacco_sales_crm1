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

export default function ConversationListUpdated({
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
        folder: selectedFolder.toLowerCase(),
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

      // Use the new conversations endpoint
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
    const nextOrder = sortBy === field && sortOrder === "asc" ? "desc" : "asc";

    setSortBy(field);
    setSortOrder(nextOrder);

    setConversations((prev) =>
      [...prev].sort((a, b) => {
        let compareA, compareB;

        switch (field) {
          case "date":
            compareA = new Date(a.lastDate || 0);
            compareB = new Date(b.lastDate || 0);
            break;

          case "sender":
            compareA = (a.lastSenderEmail || "").toLowerCase();
            compareB = (b.lastSenderEmail || "").toLowerCase();
            break;

          case "subject":
            compareA = (a.subject || "").toLowerCase();
            compareB = (b.subject || "").toLowerCase();
            break;

          default:
            return 0;
        }

        return nextOrder === "asc"
          ? compareA > compareB
            ? 1
            : -1
          : compareA < compareB
          ? 1
          : -1;
      })
    );
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
            // Use conversationId for comparison
            const conversationId = conversation.conversationId;
            const selectedId = selectedConversation?.conversationId;
            const isSelected = selectedId === conversationId;

            const displayName =
              conversation.lastSenderEmail || "(Unknown sender)";
            const hasMultipleParticipants = false;

            return (
              <div
                key={conversationId}
                onClick={() => onConversationSelect(conversation)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors ${
                  isSelected
                    ? "bg-blue-50 border-l-4 border-l-blue-600"
                    : "hover:bg-gray-50"
                } ${conversation.unreadCount > 0 ? "bg-blue-50/30" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {/* <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {hasMultipleParticipants ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </div> */}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className={`text-sm truncate ${
                            conversation.unreadCount > 0
                              ? "font-semibold text-gray-900"
                              : "font-medium text-gray-700"
                          }`}
                        >
                          {/* {hasMultipleParticipants ? (
                            <span>
                              {conversation.participants.slice(0, 2).join(", ")}
                              {conversation.participants.length > 2 && (
                                <span className="text-gray-500">
                                  {" "}
                                  +{conversation.participants.length - 2} more
                                </span>
                              )}
                            </span>
                          ) : (
                            displayName
                          )} */}
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
                          className={`text-sm mb-1 truncate ${
                            conversation.unreadCount > 0
                              ? "font-medium text-gray-900"
                              : "text-gray-600"
                          }`}
                        >
                          {conversation.subject || "(No subject)"}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {conversation.subject || ""}
                        </p>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      {conversation.unreadCount > 0 && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                          {conversation.unreadCount} unread
                        </span>
                      )}
                      {/* {conversation.messageCount > 1 && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {conversation.messageCount} messages
                        </span>
                      )} */}
                      {hasMultipleParticipants && (
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {conversation.participants.length} people
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
