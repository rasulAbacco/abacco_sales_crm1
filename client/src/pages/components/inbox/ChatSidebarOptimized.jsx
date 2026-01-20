"use client"

// Optimized ChatSidebar with Search, Filtering, and Virtual Scrolling
import { useState, useEffect, useMemo, useCallback } from "react"
import { Search } from "lucide-react"
import { FixedSizeList as List } from "react-window"
import { api, API_BASE_URL } from "../../../pages/api.js";

const ConversationRow = ({ index, style, data }) => {
  const conv = data.conversations[index]
  const handleChatClick = data.handleChatClick

  if (!conv) return null

  return (
    <div
      style={style}
      onClick={() => handleChatClick(conv.email)}
      className={`px-3 py-2 cursor-pointer hover:bg-blue-50 transition border-b border-gray-100 ${
        data.activeEmail === conv.email ? "bg-blue-100 border-l-4 border-blue-500" : ""
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          {/* From / Subject */}
          <p className="font-semibold text-sm text-gray-900 truncate">{conv.email}</p>
          <p className="text-xs text-gray-500 truncate">{conv.subject || "No subject"}</p>
        </div>
        {conv.unreadCount > 0 && (
          <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
            {conv.unreadCount}
          </span>
        )}
      </div>
    </div>
  )
}

export default function ChatSidebarOptimized({
  selectedAccount,
  onSelectChat,
  onConversationsLoaded,
  selectedTab = "inbox",
  onTabChange,
}) {
  const [conversations, setConversations] = useState([])
  const [filteredConversations, setFilteredConversations] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [loading, setLoading] = useState(false)
  const [activeEmail, setActiveEmail] = useState(null)

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!selectedAccount?.id) return

    setLoading(true)
    try {
      const res = await api.get(`${API_BASE_URL}/api/inbox/conversations/${selectedAccount.id}`, {
        params: { accountEmail: selectedAccount.email, folder: selectedTab },
      })

      const convList = (res.data?.data || []).map((conv) => ({
        ...conv,
        email: conv.email || conv.fromEmail || "Unknown",
        subject: conv.subject || "No subject",
        unreadCount: conv.unreadCount || 0,
        lastDate: conv.lastDate || new Date(),
      }))

      setConversations(convList)
      onConversationsLoaded?.(convList)
    } catch (err) {
      console.error("Error fetching conversations:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedAccount, selectedTab, onConversationsLoaded])

  // Initial load and tab change
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Filter and search
  const filtered = useMemo(() => {
    let result = conversations

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((conv) => conv.email.toLowerCase().includes(q) || conv.subject.toLowerCase().includes(q))
    }

    // Status filter
    if (statusFilter !== "All") {
      result = result.filter((conv) => {
        // You can add more status logic here
        return true
      })
    }

    return result
  }, [conversations, searchQuery, statusFilter])

  useEffect(() => {
    setFilteredConversations(filtered)
  }, [filtered])

  const handleChatClick = (email) => {
    setActiveEmail(email)
    onSelectChat(email)
  }

  const itemData = useMemo(
    () => ({
      conversations: filteredConversations,
      handleChatClick,
      activeEmail,
    }),
    [filteredConversations, activeEmail],
  )

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Messages</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Unread">Unread</option>
            <option value="Active">Active Client</option>
            <option value="Pending">Pending</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {["inbox", "sent", "spam", "trash"].map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange?.(tab)}
            className={`flex-1 px-2 py-2 text-xs font-medium transition ${
              selectedTab === tab ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-xs">Loading...</p>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-xs">No conversations found</p>
          </div>
        ) : (
          <List height={500} itemCount={filteredConversations.length} itemSize={60} width="100%" itemData={itemData}>
            {ConversationRow}
          </List>
        )}
      </div>
    </div>
  )
}
