import React, { useState, useEffect } from "react";
import ModernSidebar from "./ModernSidebar";
import InboxHeader from "./Inboxheader.jsx";
import ConversationList from "./ConversationList";
import MessageView from "./MessageView.jsx";
import AddAccountManager from "./AccountManager.jsx";
import ScheduleModal from "./Enhancedschedulemodal.jsx";
import { api } from "../../../pages/api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function InboxMain() {
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  // Selection state
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [activeView, setActiveView] = useState("inbox");

  // Filter state
  const [filters, setFilters] = useState({
    leadStatus: "",
    sender: "",
    recipient: "",
    subject: "",
    tags: [],
    dateFrom: "",
    dateTo: "",
    hasAttachment: false,
    isUnread: false,
    isStarred: false,
    country: "",
  });

  // Search state
  const [searchEmail, setSearchEmail] = useState("");

  // Mobile state
  const [showMobileConversations, setShowMobileConversations] = useState(false);
  const [isScheduleMode, setIsScheduleMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  // // 🔥 FIX: Fetch conversations when account/folder changes
  // useEffect(() => {
  //   if (!selectedAccount || !selectedFolder) return;
  //   if (activeView === "today") return;

  //   fetchConversations();
  // }, [selectedAccount, selectedFolder, activeView, filters, searchEmail]);

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await api.get(`${API_BASE_URL}/api/accounts`);
      const accountsData = response.data || [];

      // Fetch unread counts for each account
      const accountsWithUnread = await Promise.all(
        accountsData.map(async (account) => {
          try {
            const unreadRes = await api.get(
              `${API_BASE_URL}/api/inbox/accounts/${account.id}/unread`
            );
            return {
              ...account,
              unreadCount: unreadRes.data?.data?.inboxUnread || 0,
            };
          } catch (error) {
            return { ...account, unreadCount: 0 };
          }
        })
      );

      setAccounts(accountsWithUnread);

      // Auto-select first account if none selected
      if (!selectedAccount && accountsWithUnread.length > 0) {
        setSelectedAccount(accountsWithUnread[0]);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 🔥 FIX: Proper conversation fetching function
  // const fetchConversations = async (customFilters = null) => {
  //   if (!selectedAccount || activeView === "today") return;

  //   try {
  //     setLoading(true);

  //     const appliedFilters = customFilters || filters;

  //     // 🔥 Only include non-empty filters
  //     const params = {
  //       folder: selectedFolder,
  //     };

  //     // Add search if present
  //     if (searchEmail) {
  //       params.search = searchEmail;
  //     }

  //     // 🔥 Only add filters that have values
  //     if (appliedFilters.leadStatus)
  //       params.leadStatus = appliedFilters.leadStatus;
  //     if (appliedFilters.country) params.country = appliedFilters.country;
  //     if (appliedFilters.sender) params.sender = appliedFilters.sender;
  //     if (appliedFilters.recipient) params.recipient = appliedFilters.recipient;
  //     if (appliedFilters.subject) params.subject = appliedFilters.subject;
  //     if (appliedFilters.dateFrom) params.dateFrom = appliedFilters.dateFrom;
  //     if (appliedFilters.dateTo) params.dateTo = appliedFilters.dateTo;
  //     if (appliedFilters.hasAttachment)
  //       params.hasAttachment = appliedFilters.hasAttachment;
  //     if (appliedFilters.isUnread) params.isUnread = appliedFilters.isUnread;
  //     if (appliedFilters.isStarred) params.isStarred = appliedFilters.isStarred;

  //     console.log("📥 Fetching conversations with params:", params);

  //     const res = await api.get(
  //       `${API_BASE_URL}/api/inbox/conversations/${selectedAccount.id}`,
  //       { params }
  //     );

  //     setConversations(res.data?.data || []);
  //   } catch (error) {
  //     console.error("Failed to fetch conversations:", error);
  //     setConversations([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  // =========================================================================
  // 1️⃣ NEW: Dedicated Function for Search Bar
  // Uses your specific backend route: /api/inbox/search
  // =========================================================================
  const fetchSearchResults = async () => {
    // If search is empty or we haven't selected an account, stop.
    if (!searchEmail || searchEmail.trim() === "" || !selectedAccount) return;

    try {
      setLoading(true);
      console.log("🔍 Executing Search Bar Logic for:", searchEmail);

      // 🔥 FIX: Pass accountId to backend
      const res = await api.get(`${API_BASE_URL}/api/inbox/search`, {
        params: {
          query: searchEmail,
          accountId: selectedAccount.id, // 🔥 ADD THIS
        },
      });

      const rawMessages = res.data?.data || [];

      // 🧠 TRANSFORMATION: Group messages by Conversation ID
      const uniqueConversations = new Map();

      rawMessages.forEach((msg) => {
        // 🔥 NO LONGER NEEDED - backend filters by account now
        // if (msg.emailAccountId !== selectedAccount.id) return;

        const convId = msg.conversationId;

        if (
          !uniqueConversations.has(convId) ||
          new Date(msg.sentAt) >
            new Date(uniqueConversations.get(convId).sentAt)
        ) {
          uniqueConversations.set(convId, msg);
        }
      });

      // Format the data so ConversationList.jsx can read it
      const formattedResults = Array.from(uniqueConversations.values()).map(
        (msg) => ({
          conversationId: msg.conversationId,
          subject: msg.subject || "(No Subject)",
          initiatorEmail: msg.fromEmail,
          lastSenderEmail: msg.fromEmail,
          displayEmail:
            msg.direction === "sent"
              ? `To: ${msg.toEmail?.split(",")[0]}`
              : msg.fromEmail,
          lastDate: msg.sentAt,
          lastBody: msg.body
            ? msg.body.replace(/<[^>]*>/g, "").substring(0, 100)
            : "",
          unreadCount: 0,
          messageCount: 1,
          isStarred: false,
        })
      );

      setConversations(formattedResults);
    } catch (error) {
      console.error("Search failed:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 2️⃣ EXISTING: Function for Filter Section
  // This logic is completely UNTOUCHED as requested.
  // =========================================================================
  const fetchConversations = async () => {
    if (!selectedAccount || activeView === "today") return;

    try {
      setLoading(true);

      const params = {
        folder: selectedFolder,
      };

      // Existing Filter Logic (Only runs when search bar is empty)
      if (filters.leadStatus) params.leadStatus = filters.leadStatus;
      if (filters.country) params.country = filters.country;
      if (filters.sender) params.sender = filters.sender;
      if (filters.recipient) params.recipient = filters.recipient;
      if (filters.subject) params.subject = filters.subject;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.hasAttachment) params.hasAttachment = true;
      if (filters.isUnread) params.isUnread = true;
      if (filters.isStarred) params.isStarred = true;

      console.log("📥 Fetching Standard Filters with params:", params);

      const res = await api.get(
        `${API_BASE_URL}/api/inbox/conversations/${selectedAccount.id}`,
        { params }
      );

      setConversations(res.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 3️⃣ UPDATED: useEffect to switch between Search Mode and Normal Mode
  // =========================================================================
  useEffect(() => {
    if (!selectedAccount || !selectedFolder) return;
    if (activeView === "today") return;

    // 🔥 DECISION LOGIC:
    // If there is text in the search bar -> Use fetchSearchResults (Filter 1)
    // If the search bar is empty       -> Use fetchConversations (Filter 2)
    if (searchEmail && searchEmail.trim() !== "") {
      fetchSearchResults();
    } else {
      fetchConversations();
    }
  }, [selectedAccount, selectedFolder, activeView, filters, searchEmail]);

  const handleAccountSelect = (account) => {
    setSelectedAccount(account);
    setSelectedConversation(null);
    setShowMobileConversations(true);
  };

  const handleFolderSelect = (folder) => {
    setSelectedFolder(folder);
    setSelectedConversation(null);
    setShowMobileConversations(true);
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
  };

  // 🔥 FIX: Proper filter application
  const handleFilterApply = (newFilters) => {
    console.log("📌 Applying filters:", newFilters);
    setActiveView("inbox"); // Force inbox view
    setFilters(newFilters); // Update state
  };

  const handleSearchEmail = (email) => {
    setSearchEmail(email); // useEffect will handle fetch
  };

  const handleAddAccount = () => {
    setShowAddAccountModal(true);
  };

  const handleTodayFollowUp = async () => {
    setActiveView("today");
    setFilters({
      leadStatus: "",
      sender: "",
      recipient: "",
      subject: "",
      tags: [],
      dateFrom: "",
      dateTo: "",
      hasAttachment: false,
      isUnread: false,
      isStarred: false,
      country: "",
    }); // Clear filters
    await fetchTodayFollowUps();
  };
  // const fetchTodayFollowUps = async () => {
  //   try {
  //     setLoading(true);

  //     const res = await api.get(`${API_BASE_URL}/api/scheduled-messages/today`);

  //     // ✅ Format for conversation list (NOT preview body)
  //     const formatted = res.data.map((msg) => ({
  //       conversationId: msg.conversationId,
  //       subject: msg.subject || "(No subject)",
  //       senderName: msg.toEmail?.split("@")[0] || "Follow-up",
  //       senderEmail: msg.toEmail,
  //       email: msg.toEmail,
  //       primaryRecipient: msg.toEmail,
  //       lastDate: msg.sendAt,

  //       // 🔥 KEY CHANGE: Don't use scheduled body as preview
  //       lastBody: "(Scheduled follow-up)", // Generic text

  //       unreadCount: 0,
  //       isScheduled: true,

  //       // ✅ Pass FULL scheduled data for later use
  //       scheduledMessageId: msg.id,
  //       scheduledMessageData: msg,
  //     }));

  //     setConversations(formatted);
  //   } catch (err) {
  //     console.error("❌ Failed to fetch today follow-ups", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const fetchTodayFollowUps = async () => {
    try {
      setLoading(true);

      const res = await api.get(`${API_BASE_URL}/api/scheduled-messages/today`);

      // ✅ Format for conversation list
      const formatted = res.data.map((msg) => ({
        conversationId: msg.conversationId,
        subject: msg.subject || "(No subject)",

        // 🔥 FIX: Map to 'displayName' and 'displayEmail' so ConversationList can read it
        displayName: msg.toEmail,
        displayEmail: msg.toEmail,

        primaryRecipient: msg.toEmail,
        lastDate: msg.sendAt,
        lastBody: "(Scheduled follow-up)",
        unreadCount: 0,
        isScheduled: true,
        scheduledMessageId: msg.id,
        scheduledMessageData: msg,
      }));

      setConversations(formatted);
    } catch (err) {
      console.error("❌ Failed to fetch today follow-ups", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = () => {
    setIsScheduleMode(true);
    setSelectedConversations([]);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left Sidebar - Accounts & Folders */}
      <ModernSidebar
        accounts={accounts}
        selectedAccount={selectedAccount}
        selectedFolder={selectedFolder}
        onAccountSelect={handleAccountSelect}
        onFolderSelect={handleFolderSelect}
        onAddAccount={handleAddAccount}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <InboxHeader
          selectedAccount={selectedAccount}
          selectedFolder={selectedFolder}
          onFilterApply={handleFilterApply}
          onSearchEmail={handleSearchEmail}
          onTodayFollowUpClick={handleTodayFollowUp}
          onScheduleClick={handleSchedule}
          activeView={activeView}
        />

        {isScheduleMode && (
          <div className="px-4 py-3 border-b bg-blue-50 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {selectedConversations.length} selected
            </span>

            <div className="flex gap-2">
              <button
                disabled={selectedConversations.length === 0}
                onClick={() => setShowScheduleModal(true)}
                className="px-4 py-1.5 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                Schedule
              </button>

              <button
                onClick={() => {
                  setIsScheduleMode(false);
                  setSelectedConversations([]);
                }}
                className="px-4 py-1.5 border rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Content Area - Conversations + Message View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Middle Panel - Conversation List */}
          <div
            className={`${
              selectedConversation ? "hidden lg:flex" : "flex"
            } w-full lg:w-96 flex-col`}
          >
            <ConversationList
              selectedAccount={selectedAccount}
              selectedFolder={selectedFolder}
              onConversationSelect={handleConversationSelect}
              selectedConversation={selectedConversation}
              filters={filters}
              searchEmail={searchEmail}
              isScheduleMode={isScheduleMode}
              selectedConversations={selectedConversations}
              setSelectedConversations={setSelectedConversations}
              conversations={conversations}
              setConversations={setConversations}
              activeView={activeView}
            />
          </div>

          {/* Right Panel - Message View */}
          <div
            className={`${
              selectedConversation ? "flex" : "hidden lg:flex"
            } flex-1 flex-col`}
          >
            <MessageView
              selectedAccount={selectedAccount}
              selectedConversation={selectedConversation}
              selectedFolder={selectedFolder}
              onBack={() => setSelectedConversation(null)}
            />
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <AddAccountManager
          onClose={() => {
            setShowAddAccountModal(false);
            fetchAccounts();
          }}
          onAccountAdded={fetchAccounts}
        />
      )}

      {/* {showScheduleModal && (
        <ScheduleModal
          onClose={() => {
            setShowScheduleModal(false);
            setIsScheduleMode(false);
            setSelectedConversations([]);
          }}
          account={selectedAccount}
          selectedConversations={selectedConversations}
        />
      )} */}
      {showScheduleModal && (
        <ScheduleModal
          isOpen={showScheduleModal}
          selectedAccount={selectedAccount}
          selectedConversations={selectedConversations}
          onClose={() => {
            setShowScheduleModal(false);
            setIsScheduleMode(false);
            setSelectedConversations([]);
          }}
        />
      )}
    </div>
  );
}
