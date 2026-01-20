"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import { Search, X, Mail, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ConversationRow = ({ index, style, data }) => {
  const conversation = data.conversations[index];
  const isSelected = data.selectedChat === conversation.email;
  const { handleChatClick, formatDate } = data;
  const unread = conversation.unreadCount > 0;

  return (
    <div style={style}>
      <button
        onClick={() => handleChatClick(conversation.email)}
        className={`w-full px-3 py-2.5 text-left border-b border-gray-100 hover:bg-gray-50 transition-all flex items-center gap-3 group ${
          isSelected ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
        }`}
      >
        {/* Avatar with dynamic color */}
        <div
          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm transition-all ${
            unread
              ? "bg-gradient-to-br from-blue-600 to-blue-700 ring-2 ring-blue-200"
              : "bg-gradient-to-br from-gray-400 to-gray-500"
          }`}
        >
          {conversation.email?.charAt(0).toUpperCase()}
        </div>

        {/* Conversation info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-sm truncate ${
                unread
                  ? "font-semibold text-gray-900"
                  : "font-medium text-gray-800"
              }`}
            >
              {conversation.email}
            </p>
            <span className="text-xs text-gray-500 flex-shrink-0 group-hover:text-gray-600">
              {formatDate(conversation.lastDate)}
            </span>
          </div>

          <p
            className={`text-xs truncate ${
              unread ? "text-gray-700 font-medium" : "text-gray-600"
            }`}
          >
            {conversation.subject || "No Subject"}
          </p>

          <p className="text-xs text-gray-500 truncate line-clamp-1">
            {conversation.lastBody?.replace(/<[^>]*>/g, "").substring(0, 50) ||
              "No preview"}
          </p>
        </div>

        {/* Status indicators */}
        {unread && (
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 flex-shrink-0 shadow-md" />
        )}
      </button>
    </div>
  );
};

export default function ChatSidebar({
  selectedAccount,
  onSelectChat,
  onConversationsLoaded,
  selectedTab,
  onTabChange,
  onSetActiveChat,
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedChat, setSelectedChat] = useState(null);
  const abortControllerRef = useRef(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(400);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      const height = container.clientHeight;
      if (height > 0) {
        setContainerHeight(height);
        console.log("[v0] Container height updated:", height);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const fetchConversations = async (isBackgroundUpdate = false) => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const newController = new AbortController();
      abortControllerRef.current = newController;

      if (!isBackgroundUpdate) {
        setLoading(true);
        setHasError(false);
        setErrorMessage("");
      }

      if (!selectedAccount?.id) {
        console.log("[v0] ℹ No account selected, clearing conversations");
        setConversations([]);
        setLoading(false);
        return;
      }

      const url = `${API_BASE_URL}/api/inbox/conversations/${selectedAccount.id}`;
      const params = {
        accountEmail: selectedAccount.email,
        folder: selectedTab || "inbox",
        limit: 100,
      };

      console.log("[v0] 📧 Fetching conversations:", { url, params });

      const res = await api.get(url, {
        params,
        signal: newController.signal,
      });

      console.log("[v0] ✅ API Response:", res?.data);

      let list = [];
      if (res?.data?.data && Array.isArray(res.data.data)) {
        list = res.data.data;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
      } else if (
        res?.data?.conversations &&
        Array.isArray(res.data.conversations)
      ) {
        list = res.data.conversations;
      }

      console.log("[v0] 📋 Conversations received:", list.length);

      const formattedList = list
        .map((conv) => ({
          ...conv,
          email: (
            conv.email ||
            conv.fromEmail ||
            conv.peer ||
            conv.from ||
            ""
          ).trim(),
          subject: (conv.subject || "No Subject").trim(),
          unreadCount: Number.parseInt(conv.unreadCount) || 0,
          lastBody: (conv.lastBody || conv.preview || "").toString(),
          lastDate: conv.lastDate || conv.sentAt || new Date().toISOString(),
        }))
        .filter((c) => c.email)
        .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));

      console.log("[v0] 📊 Formatted conversations:", formattedList.length);

      setConversations(formattedList);

      if (onConversationsLoaded) {
        const totalUnread = formattedList.reduce(
          (sum, c) => sum + (c.unreadCount || 0),
          0
        );
        console.log("[v0] 🔔 Total unread:", totalUnread);
        onConversationsLoaded(formattedList, totalUnread);
      }

      setLoading(false);
    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error("[v0] ❌ Fetch error:", {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });
        setHasError(true);
        setErrorMessage(
          err.response?.data?.message ||
            err.message ||
            "Failed to load conversations"
        );
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => fetchConversations(true), 30000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedAccount?.id, selectedTab]);

  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((conv) => {
        return (
          conv.email?.toLowerCase().includes(q) ||
          conv.subject?.toLowerCase().includes(q) ||
          conv.lastBody?.toLowerCase().includes(q)
        );
      });
    }

    if (sortBy === "recent") {
      filtered.sort(
        (a, b) => new Date(b.lastDate || 0) - new Date(a.lastDate || 0)
      );
    } else if (sortBy === "unread") {
      filtered.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
    }

    return filtered;
  }, [conversations, searchQuery, sortBy]);

  const handleChatClick = async (email) => {
    if (!email) {
      console.error("[v0] ❌ No email provided");
      return;
    }

    try {
      console.log("[v0] 💬 Clicking conversation:", email);

      await api.post(`${API_BASE_URL}/api/inbox/mark-read-conversation`, {
        emailAccountId: selectedAccount.id,
        peer: email,
      });

      setConversations((prev) =>
        prev.map((c) => (c.email === email ? { ...c, unreadCount: 0 } : c))
      );

      setSelectedChat(email);
      onSelectChat(email?.toLowerCase());
      console.log("[v0] ✅ Chat selected:", email);
    } catch (err) {
      console.error("[v0] ❌ Failed to mark as read:", err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7)
        return date.toLocaleDateString("en-US", { weekday: "short" });
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const unreadCount = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Header with search */}
      <div className="px-4 py-3 border-b border-gray-200 space-y-3 sticky top-0 bg-white z-20 flex-shrink-0">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client name..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort dropdown and unread badge */}
        <div className="flex gap-2 items-center">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white font-medium transition-all"
          >
            <option value="recent">Sort: Recent</option>
            <option value="unread">Sort: Unread</option>
          </select>

          {unreadCount > 0 && (
            <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg text-sm font-bold text-blue-700 shadow-sm">
              {unreadCount}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto flex-shrink-0">
        {["inbox", "sent", "spam", "trash"].map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
              selectedTab === tab
                ? "text-blue-600 border-b-blue-600 bg-white font-semibold"
                : "text-gray-600 border-b-transparent hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Conversations list container */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative">
        {hasError ? (
          <div className="flex flex-col items-center justify-center h-full text-red-500 gap-3 p-4">
            <AlertCircle className="w-10 h-10 opacity-50" />
            <p className="text-sm font-medium">Failed to load conversations</p>
            <p className="text-xs text-red-400 text-center">{errorMessage}</p>
            <button
              onClick={() => fetchConversations()}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 font-medium">
              Loading conversations...
            </p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <Mail className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">
              {searchQuery
                ? "No conversations match your search"
                : "No conversations yet"}
            </p>
            {!searchQuery && (
              <p className="text-xs text-gray-500">
                Check back when you have new messages
              </p>
            )}
          </div>
        ) : (
          <List
            height={containerHeight}
            itemCount={filteredConversations.length}
            itemSize={72}
            width="100%"
            itemData={{
              conversations: filteredConversations,
              selectedChat,
              handleChatClick,
              formatDate,
            }}
          >
            {ConversationRow}
          </List>
        )}
      </div>
    </div>
  );
}
