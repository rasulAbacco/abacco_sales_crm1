"use client";

// src/pages/components/inbox/Inbox.jsx
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import CenterPanel from "./CenterPanel";
import ScheduleModal from "./ScheduleModal";
import AddAccountModal from "./AddAccountModal";
import InboxDiagnostics from "./InboxDiagnostics.jsx"; // Add import for diagnostics
import { api } from "../../api";
import { Menu } from "lucide-react";
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import { getSocket } from "../../../sockets";

export default function Inbox() {
  const [accounts, setAccounts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [tags, setTags] = useState([]);
  const [scheduledLeads, setScheduledLeads] = useState([]);
  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [composeData, setComposeData] = useState(null);
  const [messages, setMessages] = useState([]);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [loadingScheduledEmails, setLoadingScheduledEmails] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedTab, setSelectedTab] = useState("inbox");

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  // const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collapseTrigger, setCollapseTrigger] = useState(0);

  // ✅ INIT SOCKET.IO CONNECTION HERE
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    import("../../../sockets").then(({ initSocket }) => {
      initSocket(user.id);
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const { accountId, unreadCount } = e.detail;

      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === accountId ? { ...acc, unreadCount } : acc
        )
      );
    };

    window.addEventListener("updateUnreadCount", handler);

    return () => window.removeEventListener("updateUnreadCount", handler);
  }, []);

  // Fetch all accounts
  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await api.get(`/api/accounts`);
      let list = res.data || [];

      // ⭐ Get unread count for each account
      list = await Promise.all(
        list.map(async (acc) => {
          try {
            const unreadRes = await api.get(
              `${API_BASE_URL}/api/inbox/accounts/${acc.id}/unread`
            );

            return {
              ...acc,
              unreadCount: unreadRes.data.data.unreadCount,
              hasUnread: unreadRes.data.data.unreadCount > 0,
            };
          } catch (err) {
            return { ...acc, unreadCount: 0, hasUnread: false };
          }
        })
      );

      setAccounts(list);
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Load messages for an account and tab
  const loadMessages = async (accountId, tab = "inbox") => {
    if (!accountId) return;
    setLoadingMessages(true);
    try {
      const endpoint =
        tab === "sent"
          ? `/api/inbox/messages/sent`
          : `/api/inbox/messages/inbox`;

      const res = await api.get(endpoint, {
        params: { emailAccountId: accountId },
      });
      setMessages(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch scheduled emails
  const fetchScheduledEmails = async () => {
    setLoadingScheduledEmails(true);
    try {
      const res = await api.get("/api/scheduled-messages");

      // 🔥 FIX: Safely detect if response is [ ... ] or { data: [ ... ] }
      const allScheduledEmails = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      if (!Array.isArray(allScheduledEmails)) {
        console.warn(
          "⚠️ Unexpected response format for scheduled emails:",
          res.data
        );
        setScheduledEmails([]);
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const upcomingEmails = allScheduledEmails.filter((email) => {
        if (!email.sendAt) return false;
        const sendDate = new Date(email.sendAt);
        return sendDate >= today;
      });

      setScheduledEmails(upcomingEmails);
    } catch (err) {
      console.error("Failed to fetch scheduled emails:", err);
      setScheduledEmails([]); // Prevent undefined state on error
    } finally {
      setLoadingScheduledEmails(false);
    }
  };

  // Add this function to clean up expired scheduled emails
  const cleanupExpiredScheduledEmails = async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      await api.post("/api/scheduled-messages/cleanup", {
        currentDate: today.toISOString(),
      }); // ✅ removed $ and newlines
    } catch (err) {
      console.error("Failed to cleanup expired scheduled emails:", err);
    }
  };

  // Update the useEffect to call this cleanup function
  useEffect(() => {
    fetchAccounts();
    fetchTags();
    fetchScheduledLeads();
    fetchScheduledEmails();
    cleanupExpiredScheduledEmails(); // Add this line
  }, []);

  // ⭐ Auto-restore selected account after page refresh
  useEffect(() => {
    const savedAccountId = localStorage.getItem("activeAccountId");

    if (!selectedAccount && savedAccountId && accounts.length > 0) {
      const acc = accounts.find((a) => a.id == savedAccountId);
      if (acc) {
        setSelectedAccount(acc);
      }
    }
  }, [accounts]);

  // Fetch tags
  const fetchTags = async () => {
    try {
      const res = await api.get("/api/tags"); // ✅ fixed
      setTags(res.data || []);
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  };
  // 🔥 Update unread count for a specific account
  const handleUnreadUpdate = (accountId, unreadCount, hasUnread) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, unreadCount, hasUnread } : acc
      )
    );
  };

  // Fetch today's follow-ups
  const fetchScheduledLeads = async () => {
    setLoadingScheduled(true);
    try {
      const res = await api.get("/api/scheduled-messages/today"); // ✅ fixed
      setScheduledLeads(res.data || []);
    } catch (err) {
      console.error("Failed to fetch today's scheduled leads:", err);
    } finally {
      setLoadingScheduled(false);
    }
  };

  // Fetch follow-ups
  const fetchFollowUps = async (email) => {
    if (!email) return;
    setLoadingFollowUps(true);
    try {
      const res = await api.get(`/api/lead/followups`, {
        params: { email },
      });
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];
      setFollowUps(data);
    } catch (err) {
      console.error("Failed to fetch follow-ups:", err);
      setFollowUps([]);
    } finally {
      setLoadingFollowUps(false);
    }
  };
  const refreshConversations = async () => {
    if (!selectedAccount) return;

    try {
      const res = await api.get(
        `/api/inbox/conversations/${selectedAccount.id}`,
        {
          params: { accountEmail: selectedAccount.email },
        }
      );
      setConversations(res.data?.data || []);
    } catch (err) {
      console.error("Failed to refresh conversations:", err);
    }
  };

  const handleAccountClick = async (account) => {
    if (!account || !account.id) {
      console.warn("handleAccountClick called with invalid account:", account);
      return;
    }

    setSelectedLead(null);
    setComposeData(null);
    setSelectedAccount({ ...account });
    setSelectedTab("inbox");
    // ⭐ Save last opened account for refresh restore
    localStorage.setItem("activeAccountId", account.id);

    try {
      console.log(`🔄 Running IMMEDIATE SYNC for: ${account.email}`);

      // 🔥 1) IMMEDIATELY SYNC & FETCH LATEST EMAILS
      const res = await api.get(`/api/accounts/sync/${account.email}`);

      // 🔥 2) Update conversations/messages instantly
      setConversations(res.data.messages || []);
      console.log("📨 Latest messages after sync:", res.data.messages?.length);

      // 🔥 3) Load message list (if your UI needs it)
      await loadMessages(account.id, "inbox");
    } catch (err) {
      console.error("❌ Sync + load failed:", err);
    }
  };

  // 🚀 Run IMAP sync immediately when a new account is added
  const syncAccountAndLoad = async (email) => {
    try {
      console.log("🔄 Syncing account:", email);

      // 1️⃣ Run backend IMAP sync
      await api.get(`/api/accounts/sync/${email}`);

      // 2️⃣ Refresh accounts
      await fetchAccounts();

      // 3️⃣ Get updated accounts
      const updatedAccounts = await api.get(`/api/accounts`);
      const newAcc = updatedAccounts.data.find((a) => a.email === email);

      if (newAcc) {
        console.log("📥 Selecting synced account:", newAcc);
        await handleAccountClick(newAcc);
      }
    } catch (err) {
      console.error("❌ syncAccountAndLoad failed:", err);
    }
  };

  // 🔥 REALTIME SOCKET LISTENERS (HubSpot-style live inbox)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    /* ================================
     1️⃣ WHEN A NEW EMAIL ARRIVES
  =================================*/
    const onNewEmail = async (data) => {
      if (selectedAccount && data.accountId === selectedAccount.id) {
        await loadMessages(selectedAccount.id);
        await refreshConversations();
      }
    };

    /* ================================
     2️⃣ CONVERSATION UPDATED
  =================================*/
    const onConversationUpdated = (conv) => {
      console.log("🟢 [RT] Conversation updated:", conv);

      setConversations((prev) => {
        const idx = prev.findIndex(
          (c) => c.email?.toLowerCase() === conv.participantEmail?.toLowerCase()
        );

        const newItem = {
          email: conv.participantEmail,
          subject: conv.subject,
          snippet: conv.snippet,
          lastMessageAt: conv.sentAt,
          accountId: conv.accountId,
        };

        if (idx >= 0) {
          // replace + move to top
          const updated = [...prev];
          updated.splice(idx, 1);
          return [newItem, ...updated];
        }

        return [newItem, ...prev];
      });
    };

    /* ================================
     3️⃣ UNREAD COUNTER UPDATE
  =================================*/
    const onUnreadUpdate = (data) => {
      console.log("🔔 [RT] Unread update:", data);

      setAccounts((prev) =>
        prev.map((a) =>
          a.id === data.accountId
            ? {
                ...a,
                unreadCount: data.unreadCount,
                hasUnread: data.unreadCount > 0,
              }
            : a
        )
      );
    };

    // Attach listeners
    socket.on("new_email", onNewEmail);
    socket.on("conversation_updated", onConversationUpdated);
    socket.on("unread_update", onUnreadUpdate);

    // Cleanup on unmount
    return () => {
      socket.off("new_email", onNewEmail);
      socket.off("conversation_updated", onConversationUpdated);
      socket.off("unread_update", onUnreadUpdate);
    };
  }, [selectedAccount]);

  // 🔁 Poll unread counts for each account every 30 seconds
  useEffect(() => {
    if (!accounts?.length) return;

    const loadUnreadCounts = async () => {
      try {
        const updated = await Promise.all(
          accounts.map(async (acc) => {
            const res = await api.get(
              `${API_BASE_URL}/api/inbox/accounts/${acc.id}/unread`
            );

            return {
              ...acc,
              unreadCount: res.data?.data?.unreadCount ?? 0, // ✅ CORRECT
              hasUnread: (res.data?.data?.unreadCount ?? 0) > 0,
            };
          })
        );

        setAccounts(updated);
      } catch (err) {
        console.error("Failed to refresh unread counts:", err);
      }
    };

    loadUnreadCounts();
    const timer = setInterval(loadUnreadCounts, 30000);
    return () => clearInterval(timer);
  }, [accounts.length]);

  // When selected account changes, check for stored openChatEmail
  useEffect(() => {
    const storedEmail = localStorage.getItem("openChatEmail");
    if (storedEmail) {
      setActiveChat(storedEmail);
      localStorage.removeItem("openChatEmail");
    }
  }, [selectedAccount]);

  const handleFollowUpClick = async (lead) => {
    console.log("🟢 Follow-up clicked:", lead);

    const clientEmail = lead.toEmail || lead.fromEmail || lead.email;
    if (!clientEmail) {
      alert("No client email found for this follow-up");
      return;
    }

    const matchingAccount = accounts.find(
      (acc) => acc.email === lead.fromEmail || acc.id === lead.accountId
    );

    if (matchingAccount) {
      setSelectedAccount(matchingAccount);

      try {
        const res = await api.get(
          `/api/inbox/conversations/${matchingAccount.id}`,
          {
            params: { accountEmail: matchingAccount.email },
          }
        );
        setConversations(res.data?.data || []);
        console.log("✅ Conversations preloaded:", res.data?.data?.length || 0);
      } catch (err) {
        console.error("❌ Failed to preload conversations:", err);
      }
    }

    setSelectedLead(lead);
    setComposeData(null);
    localStorage.setItem("openChatEmail", clientEmail);
  };
  const refreshAllUnreadCounts = async () => {
    const updated = await Promise.all(
      accounts.map(async (acc) => {
        const res = await api.get(
          `${API_BASE_URL}/api/inbox/accounts/${acc.id}/unread`
        );
        return {
          ...acc,
          unreadCount: res.data.data.unreadCount,
          hasUnread: res.data.data.unreadCount > 0,
        };
      })
    );

    setAccounts(updated); // <-- updates Sidebar immediately
  };

  // Scheduled Emails → open compose form
  const [pendingScheduledEmail, setPendingScheduledEmail] = useState(null);

  // Update the handleScheduledEmailClick function
  const handleScheduledEmailClick = (email) => {
    console.log("🟢 Scheduled email clicked:", email); // Add debugging

    // Try different possible property names for the account ID
    const accountId =
      email.accountId || email.emailAccountId || email.fromAccountId;

    // Find the account associated with this scheduled email
    const account = accounts.find((acc) => acc.id === accountId) || accounts[0];

    if (account) {
      // Extract the email address from the scheduled email
      const emailAddress = email.toEmail || email.email || email.recipientEmail;

      if (emailAddress) {
        console.log(
          "🟢 Opening chat for:",
          emailAddress,
          "with account:",
          account.email
        ); // Add debugging

        // Set the active chat directly
        setActiveChat(emailAddress);
        localStorage.setItem("activeChat", emailAddress);

        // Select the account if it's different
        if (selectedAccount?.id !== account.id) {
          setSelectedAccount(account);
        }

        // Clear compose data
        setComposeData(null);
        setSelectedLead(null);
      }
    }
  };

  // Add this useEffect to handle opening the chat after account switch
  // Replace the current useEffect with this:
  useEffect(() => {
    if (
      pendingScheduledEmail &&
      selectedAccount &&
      selectedAccount.id === pendingScheduledEmail.account.id
    ) {
      console.log("🟢 Opening pending scheduled email chat"); // Add this for debugging

      // Open the chat immediately (don't wait for conversations)
      setActiveChat(pendingScheduledEmail.emailAddress);
      localStorage.setItem("activeChat", pendingScheduledEmail.emailAddress);
      setComposeData(null);
      setSelectedLead(null);

      // Clear the pending scheduled email
      setPendingScheduledEmail(null);
    }
  }, [selectedAccount, pendingScheduledEmail]);

  // Schedule button (from Inbox message list) → open popup only
  const handleScheduleClick = (data) => {
    setComposeData(data);
    setShowScheduleModal(true);
  };

  const handleSendEmail = async (emailData) => {
    if (!emailData?.from) {
      alert("Please select a 'From' email address.");
      return;
    }

    const account = accounts.find((acc) => acc.email === emailData.from);
    if (!account) {
      alert("Selected 'From' account not found or unverified.");
      return;
    }

    setIsSending(true);
    try {
      // 🧩 Attach Lead ID or Scheduled Message ID if available
      const updatedEmailData = {
        ...emailData,
        leadId: selectedLead?.id || emailData.leadId || null,
        // scheduledId: emailData.scheduledMessageId || emailData.scheduledId || null, // ✅ fixed key name
        scheduledId: emailData.scheduledId ?? null, // ✅ backend expects scheduledId
      };

      const res = await fetch(`/api/smtp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEmailData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert("✅ Email sent successfully!");

        // Refresh everything
        await loadMessages(account.id);
        await Promise.all([fetchScheduledLeads(), fetchScheduledEmails()]);

        // Clear state
        setComposeData(null);
        setSelectedLead(null);
      } else {
        alert("❌ Failed to send: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Send error:", err);
      alert("❌ Failed to send email: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 p-3 bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      <Sidebar
        accounts={accounts}
        scheduledLeads={scheduledLeads}
        scheduledEmails={scheduledEmails}
        loadingAccounts={loadingAccounts}
        loadingScheduled={loadingScheduled}
        loadingScheduledEmails={loadingScheduledEmails}
        selectedAccount={selectedAccount}
        selectedLead={selectedLead}
        onAccountClick={handleAccountClick}
        onScheduledClick={handleFollowUpClick}
        onScheduledEmailClick={handleScheduledEmailClick}
        onAddAccount={() => setShowAddAccountModal(true)}
        isMobileOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onCollapse={() => {
          // ✅ Each click increases trigger count
          setCollapseTrigger((prev) => prev + 1);
          setIsMobileSidebarOpen(false);
        }}
        collapseTrigger={collapseTrigger} // ✅ pass to Sidebar
        onAccountUnreadUpdate={handleUnreadUpdate}
      />

      {/* Center Panel */}
      <CenterPanel
        key={selectedAccount?.id || "no-account"}
        handleSendEmail={handleSendEmail}
        selectedAccount={selectedAccount}
        composeData={showScheduleModal ? null : composeData}
        setComposeData={setComposeData}
        followUps={followUps}
        messages={messages}
        loadingFollowUps={loadingFollowUps}
        isSending={isSending}
        conversations={conversations}
        setConversations={setConversations}
        fetchMessages={(id) => loadMessages(id, selectedTab)}
        showScheduleModal={handleScheduleClick}
        onBack={() => setSelectedAccount(null)}
        accounts={accounts}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        // 🔥 ADD THIS PROP:
        isScheduleModalOpen={showScheduleModal}
      />

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <AddAccountModal
          onAdded={(email) => syncAccountAndLoad(email)}
          onClose={() => setShowAddAccountModal(false)}
        />
      )}

      {/* Schedule Popup */}
      {/* Schedule Popup */}
      {showScheduleModal && (
        <div className="fixed inset-0  ">
          <ScheduleModal
            account={selectedAccount}
            composeData={composeData}
            onClose={() => {
              setShowScheduleModal(false);
              fetchScheduledEmails();
              fetchScheduledLeads();
              setComposeData(null);
            }}
          />
        </div>
      )}

      <InboxDiagnostics />
    </div>
  );
}
