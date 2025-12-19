import React, { useState, useEffect } from "react";
import ModernSidebar from "./ModernSidebar";
import InboxHeader from "./Inboxheader.jsx";
import ConversationList from "./ConversationList";
import MessageView from "./MessageView.jsx";
// import MessageView from "./Messageviewrichtext.jsx";
import AddAccountManager from "./AccountManager.jsx";
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

  // Filter state
  const [filters, setFilters] = useState({});

  // Search state
  const [searchEmail, setSearchEmail] = useState("");

  // Mobile state
  const [showMobileConversations, setShowMobileConversations] = useState(false);

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "indent",
    "link",
    "color",
    "background",
    "style", // 🔥 ADD 'style' HERE
  ];

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

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

  const handleFilterApply = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSearchEmail = (email) => {
    setSearchEmail(email);
  };

  const handleAddAccount = () => {
    setShowAddAccountModal(true);
  };

  const handleTodayFollowUp = () => {
    // Implement today's follow-up logic
    console.log("Show today's follow-ups");
  };

  const handleSchedule = () => {
    // Implement schedule logic
    console.log("Show scheduled emails");
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
        />

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
              selectedFolder={selectedFolder} // 🔥 PASS THIS PROP
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
    </div>
  );
}
