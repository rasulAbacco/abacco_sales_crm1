"use client";

// Advanced ChatSidebar with Search, Filtering, and Sorting
// Like Outlook/Gmail - search by name, filter by status, sort by date

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, ChevronDown, AlertCircle } from "lucide-react";
import { api, API_BASE_URL } from "../../../pages/api.js";
import { Flag } from "lucide-react";
// Import Flag component

export default function ChatSidebarAdvanced({
  selectedAccount,
  onSelectChat,
  onConversationsLoaded,
  selectedTab = "inbox",
  onTabChange,
}) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent"); // recent, unread, sender
  const [statusFilter, setStatusFilter] = useState("all"); // all, unread, flagged, has-attachments
  const [loading, setLoading] = useState(false);
  const [activeEmail, setActiveEmail] = useState(null);
  const [expandedFilters, setExpandedFilters] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!selectedAccount?.id) return;

    setLoading(true);
    try {
      const res = await api.get(
        `${API_BASE_URL}/api/inbox/conversations/${selectedAccount.id}`,
        {
          params: { accountEmail: selectedAccount.email, folder: selectedTab },
        }
      );

      const convList = (res.data?.data || []).map((conv) => ({
        ...conv,
        email: conv.email || conv.fromEmail || "Unknown",
        subject: conv.subject || "No subject",
        unreadCount: conv.unreadCount || 0,
        lastDate: conv.lastDate || new Date(),
        snippet: conv.snippet || conv.lastBody || "",
        hasAttachment: conv.hasAttachment || false,
        isSpam: conv.isSpam || false,
        isBlocked: conv.isBlocked || false,
      }));

      setConversations(convList);
      onConversationsLoaded?.(convList);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, selectedTab, onConversationsLoaded]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Filter and search
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Search filter - by email or subject
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (conv) =>
          conv.email.toLowerCase().includes(q) ||
          conv.subject.toLowerCase().includes(q) ||
          conv.snippet.toLowerCase().includes(q)
      );
    }

    // Status filter
    switch (statusFilter) {
      case "unread":
        result = result.filter((conv) => conv.unreadCount > 0);
        break;
      case "flagged":
        result = result.filter((conv) => conv.isFlagged);
        break;
      case "has-attachments":
        result = result.filter((conv) => conv.hasAttachment);
        break;
      default:
        break;
    }

    // Sorting
    switch (sortBy) {
      case "recent":
        result.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
        break;
      case "unread":
        result.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
        break;
      case "sender":
        result.sort((a, b) => a.email.localeCompare(b.email));
        break;
      default:
        break;
    }

    return result;
  }, [conversations, searchQuery, statusFilter, sortBy]);

  const handleChatClick = (email) => {
    setActiveEmail(email);
    onSelectChat(email);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffMinutes < 1) return "now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const statusCounts = useMemo(
    () => ({
      unread: conversations.filter((c) => c.unreadCount > 0).length,
      flagged: conversations.filter((c) => c.isFlagged).length,
      attachments: conversations.filter((c) => c.hasAttachment).length,
    }),
    [conversations]
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-3 bg-gray-50">
        <h2 className="text-sm font-bold text-gray-900 mb-3">
          {selectedTab.toUpperCase()}
        </h2>

        {/* Search Bar */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setExpandedFilters(!expandedFilters)}
          className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded transition"
        >
          <span className="font-medium">Filters & Sort</span>
          <ChevronDown
            className={`w-3 h-3 transition ${
              expandedFilters ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Expanded Filters Panel */}
      {expandedFilters && (
        <div className="border-b border-gray-200 bg-gray-50 p-3 space-y-2">
          {/* Sort By */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Most Recent</option>
              <option value="unread">Unread First</option>
              <option value="sender">Sender Name</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Filter By
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Conversations</option>
              <option value="unread">Unread ({statusCounts.unread})</option>
              <option value="flagged">Flagged ({statusCounts.flagged})</option>
              <option value="has-attachments">
                Has Attachments ({statusCounts.attachments})
              </option>
            </select>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
        {["inbox", "sent", "spam", "trash"].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              onTabChange?.(tab);
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition ${
              selectedTab === tab
                ? "text-blue-600 border-blue-600 bg-blue-50"
                : "text-gray-600 border-transparent hover:text-gray-900"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-xs">Loading conversations...</p>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 p-4 text-center">
            <div>
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No conversations found</p>
              <p className="text-xs opacity-70 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={`${conv.email}-${conv.lastDate}`}
              onClick={() => handleChatClick(conv.email)}
              className={`w-full px-3 py-2.5 text-left hover:bg-blue-50 transition ${
                activeEmail === conv.email
                  ? "bg-blue-100 border-l-4 border-blue-500"
                  : "border-l-4 border-transparent"
              }`}
            >
              {/* Row 1: Email + Time + Unread Badge */}
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Sender Name */}
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {conv.email.split("@")[0]}
                  </p>

                  {/* Status Icons */}
                  {conv.unreadCount > 0 && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                  )}
                  {conv.hasAttachment && (
                    <span className="text-xs text-gray-500">📎</span>
                  )}
                  {conv.isFlagged && (
                    <Flag className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                </div>

                {/* Time */}
                <span className="text-xs text-gray-400 whitespace-nowrap ml-1">
                  {formatDate(conv.lastDate)}
                </span>
              </div>

              {/* Row 2: Subject */}
              <p className="text-xs text-gray-700 truncate mb-1 font-medium">
                {conv.subject}
              </p>

              {/* Row 3: Preview + Unread Badge */}
              <div className="flex justify-between items-start">
                <p className="text-xs text-gray-500 truncate flex-1">
                  {conv.snippet}
                </p>
                {conv.unreadCount > 0 && (
                  <span className="ml-2 flex-shrink-0 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full min-w-fit">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-gray-200 p-2 bg-gray-50 text-xs text-gray-600 text-center">
        <p>
          Showing {filteredConversations.length} of {conversations.length}{" "}
          conversations
        </p>
      </div>
    </div>
  );
}
