"use client";

import { useState, useCallback } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatView from "./ChatView";
import { MailOpen } from "lucide-react"; // Declared the MailOpen variable

/**
 * OUTLOOK-STYLE INBOX LAYOUT
 *
 * Architecture:
 * ┌─────────────────────────────────────┐
 * │         InboxLayout                  │
 * │   (manages selectedChat state)       │
 * ├──────────────┬──────────────────────┤
 * │              │                       │
 * │  ChatSidebar │    ChatView           │
 * │              │                       │
 * │ - Shows list │ - Shows messages      │
 * │   of 100+    │   in chunks (20 at    │
 * │   convos     │   a time)             │
 * │ - Virtualized│ - Virtualized         │
 * │ - Search &   │   message list        │
 * │   filter     │ - Threading support   │
 * │              │                       │
 * └──────────────┴──────────────────────┘
 */

export default function InboxLayout({ selectedAccount, currentUser }) {
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedTab, setSelectedTab] = useState("inbox");
  const [conversations, setConversations] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const handleSelectChat = useCallback((email) => {
    setSelectedChat(email);
  }, []);

  const handleConversationsLoaded = useCallback((convos, unread) => {
    setConversations(convos);
    setUnreadTotal(unread);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setSelectedTab(tab);
    setSelectedChat(null);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 bg-white">
        <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
        {unreadTotal > 0 && (
          <p className="text-sm text-gray-600">{unreadTotal} unread messages</p>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - 1/3 width */}
        <div className="w-1/3 border-r border-gray-200 overflow-hidden">
          <ChatSidebar
            selectedAccount={selectedAccount}
            onSelectChat={handleSelectChat}
            onConversationsLoaded={handleConversationsLoaded}
            selectedTab={selectedTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Chat view - 2/3 width */}
        <div className="flex-1 overflow-hidden">
          {selectedChat ? (
            <ChatView
              selectedAccount={selectedAccount}
              clientEmail={selectedChat}
              onBack={() => setSelectedChat(null)}
              selectedTab={selectedTab}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
              <MailOpen className="w-12 h-12" />
              <p className="text-lg font-medium">
                Select a conversation to start
              </p>
              <p className="text-sm">
                Search or click on any conversation in the list
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
