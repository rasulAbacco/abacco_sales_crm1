"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatSidebar from "./ChatSidebar";
import ChatView from "./ChatView";
import { Loader2, Calendar, Inbox } from "lucide-react";
import ComposeForm from "./ComposeForm";

export default function CenterPanel({
  selectedAccount,
  composeData,
  setComposeData,
  loadingFollowUps,
  handleSendEmail,
  isSending,
  showScheduleModal,
  accounts = [],
  onBack,
  selectedTab,
  setSelectedTab,
  conversations = [],
  setConversations = () => {},
  isScheduleModalOpen = false,
}) {
  const [activeChat, setActiveChat] = useState(null);

  // ⭐ Restore last opened chat after refresh ONLY after conversations load
  useEffect(() => {
    if (!selectedAccount) return;

    const savedChat = localStorage.getItem("activeChat");
    const savedAccountId = localStorage.getItem("activeAccountId");

    // Must match account AND conversations must be loaded
    if (
      savedChat &&
      savedAccountId == selectedAccount.id &&
      conversations.length > 0
    ) {
      setActiveChat(savedChat);
    }
  }, [selectedAccount, conversations]);
  useEffect(() => {
    const handler = (e) => {
      const email = e.detail;
      setActiveChat(email);

      localStorage.setItem("activeChat", email);
      localStorage.setItem("activeAccountId", selectedAccount?.id);
    };

    window.addEventListener("openChatFromSearch", handler);
    return () => window.removeEventListener("openChatFromSearch", handler);
  }, [selectedAccount]);

  return (
    <div className="flex flex-1 flex-col bg-white overflow-hidden h-full relative pb-0">
      {/* ===== HEADER ===== */}
      <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-2 border-b border-gray-200/80 bg-gradient-to-r from-white via-blue-50/30 to-indigo-50/20 backdrop-blur-sm flex justify-between items-center shadow-sm flex-shrink-0 pl-16 lg:pl-8">
        <h1 className="text-lg sm:text-xl lg:text-xl font-semibold text-gray-800 flex items-center gap-2 sm:gap-3">
          {selectedAccount ? (
            <>
              <div className="w-2 h-7 sm:w-12 text-mb sm:h-6 rounded-sm sm:rounded-md bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-lg shrink-0">
                {selectedAccount?.email?.charAt(0).toUpperCase() || "?"}
              </div>
              <span className="hidden sm:inline truncate max-w-xs lg:max-w-md">
                {selectedAccount.email}
              </span>
              <span className="sm:hidden text-sm truncate max-w-[150px]">
                {selectedAccount.email}
              </span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shrink-0">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-base sm:text-xl">Follow-ups</span>
            </>
          )}
        </h1>
      </div>
      {/* ===== MAIN BODY ===== */}
      <div className="flex flex-1 h-full overflow-hidden bg-white relative min-h-0">
        {/* ===== LEFT PANEL (Desktop Sidebar - Always visible on desktop when account selected) ===== */}
        {selectedAccount && !activeChat && (
          <div className="hidden lg:block border-r border-gray-200 bg-white w-[260px] lg:w-[300px] xl:w-[340px] flex-shrink-0 h-full">
            <ChatSidebar
              selectedAccount={selectedAccount}
              onSelectChat={(email) => {
                console.log("[v0] ChatSidebar selected email:", email);
                setActiveChat(email);

                localStorage.setItem("activeChat", email);
                localStorage.setItem("activeAccountId", selectedAccount?.id);

                setComposeData(null);
              }}
              onConversationsLoaded={(convs, unreadCount) => {
                console.log(
                  "[v0] Conversations loaded:",
                  convs.length,
                  "unread:",
                  unreadCount
                );
                setConversations(convs);
              }}
              onSetActiveChat={setActiveChat}
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
            />
          </div>
        )}

        {/* ===== RIGHT PANEL (Chat View / No Selection) ===== */}
        <div className="flex-1 bg-gradient-to-br from-gray-50/50 via-blue-50/20 to-indigo-50/10 min-w-0 h-full relative">
          {/* ===== MOBILE/TABLET CHAT LIST OVERLAY ===== */}
          {/* Shows on mobile/tablet when account selected but no chat/compose/modal open */}
          {selectedAccount &&
            !activeChat &&
            !composeData &&
            !isScheduleModalOpen && (
              <div className="lg:hidden absolute inset-0 bg-white flex flex-col h-full">
                <ChatSidebar
                  selectedAccount={selectedAccount}
                  onSelectChat={(email) => {
                    setActiveChat(email);
                    setComposeData(null);
                    localStorage.setItem("activeChat", email); // <-- Save
                  }}
                  onConversationsLoaded={setConversations}
                  onSetActiveChat={setActiveChat}
                  selectedTab={selectedTab}
                  onTabChange={setSelectedTab}
                />
              </div>
            )}

          <AnimatePresence mode="wait">
            {/* 1. Compose Form */}
            {composeData ? (
              <motion.div
                key="compose"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                <ComposeForm
                  composeData={composeData}
                  setComposeData={setComposeData}
                  handleSendEmail={handleSendEmail}
                  isSending={isSending}
                  accounts={accounts}
                />
              </motion.div>
            ) : !selectedAccount ? (
              /* 2. No Account Selected */
              <motion.div
                key="no-account"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full flex items-center justify-center p-4"
              >
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Inbox className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    No Account Selected
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Please select an email account from the sidebar to view
                    messages.
                  </p>
                </div>
              </motion.div>
            ) : loadingFollowUps ? (
              /* 3. Loading State */
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full text-gray-400"
              >
                <Loader2 className="animate-spin w-10 h-10 mb-4" />
                <p className="text-sm">Loading messages...</p>
              </motion.div>
            ) : activeChat ? (
              /* 4. Active Chat View */
              <motion.div
                key="chatview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full absolute inset-0 bg-white"
              >
                <ChatView
                  selectedAccount={selectedAccount}
                  clientEmail={activeChat}
                  onBack={() => {
                    setActiveChat(null);
                    localStorage.removeItem("activeChat"); // <-- IMPORTANT FIX
                  }}
                  selectedTab={selectedTab}
                />
              </motion.div>
            ) : (
              /* 5. No Chat Selected (Desktop Only - Mobile shows sidebar overlay above) */
              <motion.div
                key="nochat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hidden lg:flex flex-col items-center justify-center h-full text-gray-400"
              >
                <Inbox className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm">
                  Select a conversation to start chatting
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
