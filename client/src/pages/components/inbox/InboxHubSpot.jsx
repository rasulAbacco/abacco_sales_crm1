"use client";

// HubSpot-style Inbox Layout with Account Sidebar
// Features: Left sidebar for accounts, conversation list, message view, and contact details panel

import { useState, useEffect } from "react";
import { Mail, Phone, Clock, Tag, Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import ChatSidebarAdvanced from "./ChatSidebarAdvanced";
import ChatViewThreaded from "./ChatViewThreaded";
import AddAccountModal from "./AddAccountModal";
import { api } from "../../api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ContactPanel = ({ email, conversation, selectedAccount }) => {
  const [contactInfo, setContactInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) return;

    const fetchContactInfo = async () => {
      setLoading(true);
      try {
        setContactInfo({
          email,
          name: email.split("@")[0],
          company: "Company Inc",
          status: "Active Client",
          lastActivity: new Date(Date.now() - 3600000).toLocaleString(),
          tags: ["VIP", "Sales Qualified"],
          activities: [
            {
              type: "email_sent",
              description: "Email sent",
              time: "2 hours ago",
            },
            {
              type: "email_received",
              description: "Email received",
              time: "5 hours ago",
            },
            { type: "call", description: "Call completed", time: "1 day ago" },
          ],
        });
      } catch (err) {
        console.error("Error fetching contact info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContactInfo();
  }, [email, selectedAccount]);

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p className="text-sm">Select a conversation to view contact details</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 text-sm mb-1">
          {contactInfo?.name}
        </h3>
        <p className="text-xs text-gray-500 break-all">{email}</p>
      </div>

      {/* Contact Info */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : contactInfo ? (
        <div className="flex-1 p-4 space-y-4">
          {/* Status Badge */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2">
              Status
            </label>
            <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              {contactInfo.status}
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Company
            </label>
            <p className="text-sm text-gray-600">{contactInfo.company}</p>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {contactInfo.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Contact Methods */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2">
              Contact
            </label>
            <div className="space-y-1">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition">
                <Mail className="w-4 h-4" />
                <span className="text-xs break-all text-left">{email}</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition">
                <Phone className="w-4 h-4" />
                <span className="text-xs">(555) 123-4567</span>
              </button>
            </div>
          </div>

          {/* Last Activity */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Last Activity
            </label>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {contactInfo.lastActivity}
            </p>
          </div>

          {/* Activity Timeline */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2">
              Recent Activity
            </label>
            <div className="space-y-2">
              {contactInfo.activities.map((activity, idx) => (
                <div key={idx} className="flex gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-gray-700">{activity.description}</p>
                    <p className="text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
              Call Contact
            </button>
            <button className="w-full px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition">
              Create Task
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default function InboxHubSpot() {
  const [accounts, setAccounts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showContactPanel, setShowContactPanel] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [collapseTrigger, setCollapseTrigger] = useState(0);
  const [selectedTab, setSelectedTab] = useState("inbox");

  // Follow-ups and scheduled emails state
  const [followUps, setFollowUps] = useState([]);
  const [scheduledLeads, setScheduledLeads] = useState([]);
  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [loadingScheduledEmails, setLoadingScheduledEmails] = useState(false);

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await api.get(`${API_BASE_URL}/api/accounts`);
      setAccounts(response.data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAccountClick = (account) => {
    setSelectedAccount(account);
    setActiveChat(null);
    setConversations([]);
  };

  const handleAddAccount = () => {
    setShowAddAccountModal(true);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 p-3 bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all z-40"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Left Sidebar - Account Selection */}
      <Sidebar
        accounts={accounts}
        scheduledLeads={scheduledLeads}
        scheduledEmails={scheduledEmails}
        loadingAccounts={loadingAccounts}
        loadingScheduled={loadingScheduled}
        loadingScheduledEmails={loadingScheduledEmails}
        selectedAccount={selectedAccount}
        onAccountClick={handleAccountClick}
        onAddAccount={handleAddAccount}
        isMobileOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onCollapse={() => {
          setCollapseTrigger((prev) => prev + 1);
          setIsMobileSidebarOpen(false);
        }}
        collapseTrigger={collapseTrigger}
      />

      {/* Center Left - Conversation List */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white hidden md:flex">
        {selectedAccount ? (
          <ChatSidebarAdvanced
            selectedAccount={selectedAccount}
            onSelectChat={(email) => {
              setActiveChat(email);
              setShowContactPanel(true);
            }}
            onConversationsLoaded={setConversations}
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">Select an account to view conversations</p>
          </div>
        )}
      </div>

      {/* Center Panel - Message View */}
      <div className="flex-1 flex flex-col bg-white">
        {!selectedAccount ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Mail className="w-12 h-12 opacity-20 mx-auto mb-4" />
              <p className="text-sm">Select an email account to get started</p>
            </div>
          </div>
        ) : !activeChat ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Mail className="w-12 h-12 opacity-20 mx-auto mb-4" />
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          </div>
        ) : (
          <ChatViewThreaded
            selectedAccount={selectedAccount}
            clientEmail={activeChat}
            onBack={() => setActiveChat(null)}
          />
        )}
      </div>

      {/* Right Panel - Contact Details & Actions (HubSpot-style) */}
      {showContactPanel && activeChat && (
        <div className="w-80 hidden lg:flex flex-col bg-white border-l border-gray-200">
          <ContactPanel
            email={activeChat}
            selectedAccount={selectedAccount}
            conversation={conversations}
          />
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <AddAccountModal
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
