import React, { useState, useEffect } from "react";
import {
  Loader2,
  Mail,
  Calendar,
  Plus,
  Clock,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AccountManager from "./AccountManager";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Sidebar({
  accounts,
  scheduledLeads,
  scheduledEmails,
  loadingAccounts,
  loadingScheduled,
  loadingScheduledEmails,
  selectedAccount,
  selectedLead,
  onAccountClick,
  onScheduledClick,
  onAddAccount,
  onScheduledEmailClick,
  isMobileOpen,
  onClose,
  onWidthChange,
  onCollapse,
  isCollapsed: externalCollapsed,
  collapseTrigger,
}) {
  const [expandedSection, setExpandedSection] = useState({
    accounts: true,
    followups: true,
    scheduled: true,
  });
  const [isCollapsed, setIsCollapsed] = useState(externalCollapsed || false);
  const [sidebarWidth, setSidebarWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchPopup, setShowSearchPopup] = useState(false);

  const toggleSection = (section) =>
    setExpandedSection((prev) => ({ ...prev, [section]: !prev[section] }));

  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleSearch = async (value) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setShowSearchPopup(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/inbox/search?query=${value}`
      );
      const data = await res.json();

      if (data.success && data.data.length > 0) {
        setSearchResults(data.data);

        // Find unique account IDs from the results
        const uniqueAccounts = [
          ...new Set(data.data.map((m) => m.emailAccountId)),
        ];

        // --- 1. Single Account Logic ---
        if (uniqueAccounts.length === 1) {
          const matchedAcc = accounts.find((a) => a.id === uniqueAccounts[0]);

          if (matchedAcc) {
            // 1. Select the account
            onAccountClick(matchedAcc);
            setShowSearchPopup(false); // Hide popup if single result opens automatically

            // 2. Wait for account to be selected, then fire event to open chat
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("openSearchResult", {
                  detail: {
                    accountId: matchedAcc.id,
                    searchEmail: value.trim().toLowerCase(), // Use the raw query/email for matching
                  },
                })
              );
            }, 300);
          }
        } else {
          // --- 2. Multiple Accounts Logic ---
          setShowSearchPopup(true);
        }
      } else {
        setSearchResults([]);
        setShowSearchPopup(false);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
      setShowSearchPopup(false);
    }
  };

  // Resize handling
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 180 && newWidth <= 500) {
        setSidebarWidth(newWidth);
        if (typeof onWidthChange === "function") {
          onWidthChange(newWidth);
        }
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  useEffect(() => {
    const handler = (e) => {
      const { accountId, unreadCount, hasUnread } = e.detail;

      // ⭐ Correctly update unread count in parent (Inbox.jsx)
      if (typeof onAccountUnreadUpdate === "function") {
        onAccountUnreadUpdate(accountId, unreadCount, hasUnread);
      }
    };

    window.addEventListener("updateUnreadCount", handler);
    return () => window.removeEventListener("updateUnreadCount", handler);
  }, []);

  // Collapse whenever trigger changes
  useEffect(() => {
    if (collapseTrigger > 0) {
      setIsCollapsed(true);
      console.log("🟢 Sidebar collapsed (trigger)", collapseTrigger);
    }
  }, [collapseTrigger]);

  // Sync with external collapsed state
  useEffect(() => {
    if (externalCollapsed !== undefined) {
      setIsCollapsed(externalCollapsed);
    }
  }, [externalCollapsed]);

  // Toggle collapse state
  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    if (newCollapsedState && typeof onCollapse === "function") {
      onCollapse();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          width:
            window.innerWidth >= 1024 && !isCollapsed
              ? `${sidebarWidth}px`
              : undefined,
        }}
        className={`fixed lg:static inset-y-0 left-0 bg-gradient-to-b from-white to-gray-50/50
        border-r border-gray-200/80 flex flex-col shadow-2xl lg:shadow-none
        transition-all duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isCollapsed ? "lg:w-16" : "w-80 sm:w-96 lg:w-80 xl:w-96"}
        ${isResizing ? "select-none" : ""}`}
      >
        {/* Mobile Header */}
        <div
          className={`lg:hidden px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center ${
            isCollapsed ? "hidden" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Inbox Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div
            className={`flex items-center gap-2 transition-all duration-300 ${
              isCollapsed ? "opacity-0 w-0" : "opacity-100"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-800 whitespace-nowrap">
              Inbox Manager
            </h2>
          </div>

          {/* Collapse/Expand Button */}
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className={`flex-1 overflow-y-auto custom-scrollbar ${
            isCollapsed ? "hidden lg:block" : ""
          }`}
        >
          {isCollapsed ? (
            /* Collapsed View - Icons Only */
            <div className="hidden lg:flex flex-col items-center gap-4 py-4">
              <button
                onClick={() => setShowAccountManager(true)}
                className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center shadow-md transition-all"
                title="Add Account"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>

              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                <Mail className="w-5 h-5 text-white" />
              </div>
              {Array.isArray(accounts) && accounts.length > 0 && (
                <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded-full font-bold">
                  {accounts.length}
                </span>
              )}

              <div className="w-full border-t border-gray-200 my-2"></div>

              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              {Array.isArray(scheduledLeads) && scheduledLeads.length > 0 && (
                <span className="text-xs px-2 py-1 bg-green-500 text-white rounded-full font-bold">
                  {scheduledLeads.length}
                </span>
              )}

              <div className="w-full border-t border-gray-200 my-2"></div>

              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                <Clock className="w-5 h-5 text-white" />
              </div>
              {Array.isArray(scheduledEmails) && scheduledEmails.length > 0 && (
                <span className="text-xs px-2 py-1 bg-purple-500 text-white rounded-full font-bold">
                  {scheduledEmails.length}
                </span>
              )}
            </div>
          ) : (
            <>
              {/* GLOBAL SEARCH BAR */}
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search email / subject / cc..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-4 py-2.5 pl-10 border-2 border-gray-200 rounded-xl bg-white 
                             focus:border-blue-400 focus:ring-2 focus:ring-blue-100 
                             transition-all outline-none text-sm placeholder:text-gray-400"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* ================= EMAIL ACCOUNTS ================= */}
              <div className="w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-cyan-50/30 border-b border-gray-100">
                  <div className="flex items-center gap-2 mb-2 sm:mb-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-800">
                      Email Accounts
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAccountManager(true)}
                      className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold w-8 h-8 sm:w-9 sm:h-9 rounded-lg shadow-md transition-all"
                      title="Add Account"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      onClick={() => toggleSection("accounts")}
                      className="p-1 sm:p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                      title={expandedSection.accounts ? "Minimize" : "Expand"}
                    >
                      <ChevronDown
                        className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 transition-transform ${
                          expandedSection.accounts ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Account List */}
                {expandedSection.accounts && (
                  <div className="bg-white w-full">
                    {loadingAccounts ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Loader2 className="animate-spin w-6 h-6 mb-3" />
                        <span className="text-sm sm:text-base">
                          Loading accounts...
                        </span>
                      </div>
                    ) : Array.isArray(accounts) && accounts.length > 0 ? (
                      <ul className="p-3 sm:p-4 space-y-2 max-h-[60vh] sm:max-h-96 overflow-y-auto">
                        {accounts.map((acc) => (
                          <li
                            key={acc.id}
                            onClick={() => {
                              onAccountClick(acc);
                              setTimeout(() => {
                                if (onCollapse) onCollapse();
                                onClose();
                              }, 80);
                            }}
                            className={`
                              group relative p-3 sm:p-4 rounded-xl cursor-pointer border-2 transition-all
                              hover:bg-blue-50 hover:border-blue-200 hover:shadow-md
                              ${
                                selectedAccount?.id === acc.id
                                  ? "bg-blue-50 border-blue-300"
                                  : "bg-white border-gray-100"
                              }
                              ${acc.shake ? "shake glow" : ""}
                            `}
                          >
                            <div className="flex items-center gap-3 sm:gap-4 w-full">
                              <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-md">
                                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />

                                {/* 🔵 Unread dot */}
                                {acc.hasUnread && (
                                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                              </div>

                              <div className="flex flex-col w-[calc(100%-3rem)] sm:w-[calc(100%-3.5rem)] overflow-hidden">
                                <p className="font-semibold text-gray-800 text-sm sm:text-base truncate break-all">
                                  {acc.email}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-500 capitalize truncate">
                                  {acc.provider || "Custom"}
                                </p>
                              </div>
                            </div>

                            {/* 🔴 Numeric Unread Badge */}
                            {acc.unreadCount > 0 && (
                              <div className="absolute top-2 right-3 bg-red-500 text-white text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center shadow">
                                {acc.unreadCount > 99 ? "99+" : acc.unreadCount}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <Mail className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="text-sm sm:text-base text-gray-500">
                          No email accounts added
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ================= FOLLOW UPS & SCHEDULED ================= */}

              {/* ================= TODAY'S FOLLOW-UPS ================= */}
              <div>
                <div className="flex items-center justify-between w-full px-6 py-4 bg-gradient-to-r from-green-50 via-emerald-50/50 to-teal-50/30 border-b border-gray-100">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-gray-800">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    Today's Follow-ups
                  </h3>
                  <div className="flex items-center gap-2">
                    {Array.isArray(scheduledLeads) &&
                      scheduledLeads.length > 0 && (
                        <span className="text-xs px-2.5 py-1 bg-green-500 text-white rounded-full font-bold shadow-md">
                          {scheduledLeads.length}
                        </span>
                      )}
                    <button
                      onClick={() => toggleSection("followups")}
                      className="p-1.5 hover:bg-green-100 rounded-lg transition-colors"
                      title={expandedSection.followups ? "Minimize" : "Expand"}
                    >
                      <ChevronDown
                        className={`w-4 h-4 text-gray-600 transition-transform ${
                          expandedSection.followups ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {expandedSection.followups && (
                  <div className="bg-white">
                    {loadingScheduled ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Loader2 className="animate-spin w-6 h-6 mb-3" />
                        <span className="text-sm">Loading follow-ups...</span>
                      </div>
                    ) : Array.isArray(scheduledLeads) &&
                      scheduledLeads.length > 0 ? (
                      <ul className="p-3 space-y-2 max-h-96 overflow-y-auto">
                        {scheduledLeads.map((lead) => (
                          <li
                            key={lead.id}
                            onClick={() => {
                              onScheduledClick(lead);
                              setTimeout(() => {
                                if (onCollapse) onCollapse();
                                onClose();
                              }, 80);
                            }}
                            className="group p-4 rounded-xl hover:bg-green-50 cursor-pointer border-2 border-gray-100 hover:border-green-200 transition-all hover:shadow-md bg-white"
                          >
                            <div>
                              <p className="font-semibold text-gray-800 truncate">
                                {lead.subject || "Follow-up"}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                To: {lead.toEmail}
                              </p>
                              {lead.sendAt && (
                                <p className="text-xs text-gray-400">
                                  {new Date(lead.sendAt).toLocaleString(
                                    "en-US",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <Calendar className="w-8 h-8 mb-3 text-gray-400" />
                        <p>No follow-ups for today</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ================= SCHEDULED EMAILS ================= */}
              <div>
                <button
                  onClick={() => toggleSection("scheduled")}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-50 via-pink-50/50 to-rose-50/30 flex justify-between items-center hover:from-purple-100 hover:via-pink-100/50 hover:to-rose-100/30 transition-all"
                >
                  <h3 className="text-sm font-bold flex items-center gap-2 text-gray-800">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    Scheduled Emails
                  </h3>
                  <div className="flex items-center gap-2">
                    {Array.isArray(scheduledEmails) &&
                      scheduledEmails.length > 0 && (
                        <span className="text-xs px-2.5 py-1 bg-purple-500 text-white rounded-full font-bold shadow-md">
                          {scheduledEmails.length}
                        </span>
                      )}
                    <ChevronDown
                      className={`w-4 h-4 text-gray-600 transition-transform ${
                        expandedSection.scheduled ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {expandedSection.scheduled && (
                  <div className="bg-white">
                    {loadingScheduledEmails ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Loader2 className="animate-spin w-6 h-6 mb-3" />
                        <span className="text-sm">
                          Loading scheduled emails...
                        </span>
                      </div>
                    ) : Array.isArray(scheduledEmails) &&
                      scheduledEmails.length > 0 ? (
                      <ul className="p-3 space-y-2 max-h-96 overflow-y-auto">
                        {scheduledEmails.map((email) => {
                          // Check if this email is scheduled for today
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const sendDate = new Date(email.sendAt);
                          sendDate.setHours(0, 0, 0, 0);
                          const isToday =
                            sendDate.getTime() === today.getTime();

                          return (
                            <li
                              key={email.id}
                              onClick={() => {
                                console.log(
                                  "🟢 Scheduled email item clicked:",
                                  email
                                );

                                const emailAddress =
                                  email.toEmail || email.email;

                                const account = accounts.find(
                                  (acc) =>
                                    acc.id === email.emailAccountId ||
                                    acc.id === email.accountId
                                );

                                console.log(
                                  "🟢 Found account:",
                                  account,
                                  "for email:",
                                  emailAddress
                                );

                                if (!account) {
                                  console.warn(
                                    "❌ No matching account found for scheduled email:",
                                    email
                                  );
                                  alert(
                                    "No linked email account found. Please add or link the correct email account first."
                                  );
                                  return;
                                }

                                if (!emailAddress) {
                                  console.warn(
                                    "❌ Scheduled email has no valid 'to' email:",
                                    email
                                  );
                                  alert(
                                    "This scheduled email has no 'To' email address."
                                  );
                                  return;
                                }

                                // SAFE — account exists
                                onAccountClick(account);

                                onScheduledEmailClick({
                                  ...email,
                                  toEmail: emailAddress,
                                  emailAccountId: account.id,
                                });

                                setTimeout(() => {
                                  if (onCollapse) onCollapse();
                                  onClose();
                                }, 80);
                              }}
                              className={`group p-4 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 cursor-pointer border-2 transition-all hover:shadow-md bg-white ${
                                isToday
                                  ? "border-purple-300 bg-purple-50"
                                  : "border-gray-100 hover:border-purple-200"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md ${
                                    isToday
                                      ? "bg-gradient-to-br from-purple-500 to-pink-600"
                                      : "bg-gradient-to-br from-purple-100 to-pink-100"
                                  }`}
                                >
                                  <Mail
                                    className={`w-5 h-5 ${
                                      isToday ? "text-white" : "text-purple-600"
                                    }`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800 truncate mb-1">
                                    {email.subject || "(No Subject)"}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate mb-2">
                                    To: {email.toEmail}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <Clock
                                      className={`w-3 h-3 ${
                                        isToday
                                          ? "text-purple-600"
                                          : "text-purple-500"
                                      }`}
                                    />
                                    <span
                                      className={`text-xs font-medium ${
                                        isToday
                                          ? "text-purple-700 font-bold"
                                          : "text-purple-600"
                                      }`}
                                    >
                                      {email.sendAt
                                        ? new Date(email.sendAt).toLocaleString(
                                            "en-US",
                                            {
                                              month: "short",
                                              day: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            }
                                          )
                                        : "No Date"}
                                      {isToday && (
                                        <span className="ml-1 text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
                                          Today
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="text-center py-8 px-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                          <Clock className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">
                          No emails scheduled
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        {showSearchPopup && (
          <div
            className="absolute z-50 bg-white border-2 border-gray-200 shadow-2xl rounded-2xl left-4 right-4 top-[4.5rem] 
       max-h-[65vh] overflow-hidden flex flex-col"
          >
            {/* Popup Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-cyan-50/30 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-800">
                  Found in multiple accounts
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowSearchPopup(false);
                  setSearchQuery("");
                }}
                className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Results List */}
            <div className="overflow-y-auto custom-scrollbar flex-1 p-3">
              <div className="space-y-2">
                {searchResults.map((msg, i) => {
                  const matchedAccount = accounts.find(
                    (a) => a.id === msg.emailAccountId
                  );
                  return (
                    <div
                      key={i}
                      className="group p-3 rounded-xl cursor-pointer border-2 border-gray-100 
                       hover:border-blue-200 hover:bg-blue-50 transition-all hover:shadow-md bg-white"
                      onClick={() => {
                        const acc = accounts.find(
                          (a) => a.id === msg.emailAccountId
                        );

                        if (!acc) {
                          console.warn(
                            "❌ Account not found for search result:",
                            msg
                          );
                          return;
                        }

                        // 1. Select the account (which triggers ChatSidebar to load conversations)
                        onAccountClick(acc);

                        // 2. Wait for the account selection/chat sidebar load, then open the chat.
                        setTimeout(() => {
                          window.dispatchEvent(
                            new CustomEvent("openSearchResult", {
                              detail: {
                                accountId: acc.id,
                                // Pass the original search query for matching in ChatSidebar
                                searchEmail: searchQuery.trim().toLowerCase(),
                              },
                            })
                          );
                        }, 300); // 300ms delay to allow state changes to propagate

                        setShowSearchPopup(false);
                        setSearchQuery("");
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Mail className="w-4 h-4 text-blue-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate mb-1">
                            {msg.fromEmail}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Account:
                            </span>
                            <span className="text-xs font-medium text-gray-700 truncate">
                              {matchedAccount?.email || "Unknown"}
                            </span>
                          </div>
                          {msg.subject && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {msg.subject}
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Info */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Click any result to open the conversation
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        {/* {!isCollapsed && (
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="text-xs text-center text-gray-500">
              <p className="font-medium">Inbox Manager</p>
            </div>
          </div>
        )} */}

        {/* Resize Handle - Desktop Only */}
        {!isCollapsed && (
          <div
            className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1 h-12 bg-gray-300 group-hover:bg-blue-500 transition-colors rounded-full" />
          </div>
        )}
      </div>

      {/* ===== AccountManager Modal ===== */}
      {showAccountManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[90]">
          <div className="bg-gray-900 rounded-2xl shadow-xl w-[90vw] max-w-4xl overflow-y-auto max-h-[90vh] p-4 relative">
            <button
              onClick={() => setShowAccountManager(false)}
              className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
            >
              Close
            </button>
            <AccountManager
              onAccountSelected={(acc) => {
                onAccountClick(acc);
              }}
            />
          </div>
        </div>
      )}

      {/* Custom Scrollbar & Resize Cursor */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        ${
          isResizing
            ? `
          * {
            cursor: col-resize !important;
            user-select: none !important;
          }
        `
            : ""
        }
      `}</style>
      <style>
        {`
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          50% { transform: translateX(2px); }
          75% { transform: translateX(-2px); }
          100% { transform: translateX(0); }
        }

        .shake {
          animation: shake 0.35s ease-in-out;
        }

        .glow {
          box-shadow: 0 0 8px rgba(0, 150, 255, 0.5);
        }
        `}
      </style>
    </>
  );
}

// import React, { useState, useEffect } from "react";
// import {
//   Loader2,
//   Mail,
//   Calendar,
//   Plus,
//   Clock,
//   X,
//   ChevronDown,
//   ChevronLeft,
//   ChevronRight,
// } from "lucide-react";
// import AccountManager from "./AccountManager";
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// export default function Sidebar({
//   accounts,
//   scheduledLeads,
//   scheduledEmails,
//   loadingAccounts,
//   loadingScheduled,
//   loadingScheduledEmails,
//   selectedAccount,
//   selectedLead,
//   onAccountClick,
//   onScheduledClick,
//   onAddAccount,
//   onScheduledEmailClick,
//   isMobileOpen,
//   onClose,
//   onWidthChange,
//   onCollapse,
//   isCollapsed: externalCollapsed,
//   collapseTrigger,
// }) {
//   const [expandedSection, setExpandedSection] = useState({
//     accounts: true,
//     followups: true,
//     scheduled: true,
//   });
//   const [isCollapsed, setIsCollapsed] = useState(false);
//   const [sidebarWidth, setSidebarWidth] = useState(384);
//   const [isResizing, setIsResizing] = useState(false);
//   const [showAccountManager, setShowAccountManager] = useState(false);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [searchResults, setSearchResults] = useState([]);
//   const [showSearchPopup, setShowSearchPopup] = useState(false);

//   const toggleSection = (section) =>
//     setExpandedSection((prev) => ({ ...prev, [section]: !prev[section] }));

//   const handleMouseDown = (e) => {
//     setIsResizing(true);
//     e.preventDefault();
//   };
//   const handleSearch = async (value) => {
//     setSearchQuery(value);
//     if (!value.trim()) {
//       setShowSearchPopup(false);
//       return;
//     }

//     try {
//       const res = await fetch(
//         `${API_BASE_URL}/api/inbox/search?query=${value}`
//       );
//       const data = await res.json();

//       if (data.success && data.data.length > 0) {
//         setSearchResults(data.data);

//         // Find unique account IDs from the results
//         const uniqueAccounts = [
//           ...new Set(data.data.map((m) => m.emailAccountId)),
//         ];

//         // --- 1. Single Account Logic ---
//         if (uniqueAccounts.length === 1) {
//           const matchedAcc = accounts.find((a) => a.id === uniqueAccounts[0]);

//           if (matchedAcc) {
//             // 1. Select the account
//             onAccountClick(matchedAcc);
//             setShowSearchPopup(false); // Hide popup if single result opens automatically

//             // 2. Wait for account to be selected, then fire event to open chat
//             setTimeout(() => {
//               window.dispatchEvent(
//                 new CustomEvent("openSearchResult", {
//                   detail: {
//                     accountId: matchedAcc.id,
//                     searchEmail: value.trim().toLowerCase(), // Use the raw query/email for matching
//                   },
//                 })
//               );
//             }, 300);
//           }
//         } else {
//           // --- 2. Multiple Accounts Logic ---
//           setShowSearchPopup(true);
//         }
//       } else {
//         setSearchResults([]);
//         setShowSearchPopup(false);
//       }
//     } catch (err) {
//       console.error("Search failed:", err);
//       setSearchResults([]);
//       setShowSearchPopup(false);
//     }
//   };

//   // Resize handling
//   useEffect(() => {
//     const handleMouseMove = (e) => {
//       if (!isResizing) return;
//       const newWidth = e.clientX;
//       if (newWidth >= 180 && newWidth <= 500) {
//         setSidebarWidth(newWidth);
//         if (typeof onWidthChange === "function") {
//           onWidthChange(newWidth);
//         }
//       }
//     };
//     const handleMouseUp = () => setIsResizing(false);
//     if (isResizing) {
//       document.addEventListener("mousemove", handleMouseMove);
//       document.addEventListener("mouseup", handleMouseUp);
//     }
//     return () => {
//       document.removeEventListener("mousemove", handleMouseMove);
//       document.removeEventListener("mouseup", handleMouseUp);
//     };
//   }, [isResizing, onWidthChange]);
//   useEffect(() => {
//     const handler = (e) => {
//       const { accountId, unreadCount, hasUnread } = e.detail;

//       // ⭐ Correctly update unread count in parent (Inbox.jsx)
//       if (typeof onAccountUnreadUpdate === "function") {
//         onAccountUnreadUpdate(accountId, unreadCount, hasUnread);
//       }
//     };

//     window.addEventListener("updateUnreadCount", handler);
//     return () => window.removeEventListener("updateUnreadCount", handler);
//   }, []);

//   // Collapse whenever trigger changes
//   useEffect(() => {
//     if (collapseTrigger > 0) {
//       setIsCollapsed(true);
//       console.log("🟢 Sidebar collapsed (trigger)", collapseTrigger);
//     }
//   }, [collapseTrigger]);

//   return (
//     <>
//       {/* Mobile Overlay */}
//       {isMobileOpen && (
//         <div
//           className="fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden"
//           onClick={onClose}
//         />
//       )}

//       {/* Sidebar */}
//       <div
//         onMouseEnter={() => {
//           if (!externalCollapsed) setIsCollapsed(false);
//         }}
//         onMouseLeave={() => {
//           if (!externalCollapsed) setIsCollapsed(true);
//         }}
//         style={{
//           width:
//             window.innerWidth >= 1024 && !isCollapsed
//               ? `${sidebarWidth}px`
//               : undefined,
//         }}
//         className={`fixed lg:static inset-y-0 left-0 bg-gradient-to-b from-white to-gray-50/50
//         border-r border-gray-200/80 flex flex-col shadow-2xl lg:shadow-none
//         transition-all duration-300 ease-in-out
//         ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
//         ${isCollapsed ? "lg:w-16" : "w-80 sm:w-96 lg:w-80 xl:w-96"}
//         ${isResizing ? "select-none" : ""}`}
//       >
//         {/* Mobile Header */}
//         <div
//           className={`lg:hidden px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center ${
//             isCollapsed ? "hidden" : ""
//           }`}
//         >
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
//               <Mail className="w-5 h-5 text-white" />
//             </div>
//             <h2 className="text-lg font-bold text-gray-800">Inbox Manager</h2>
//           </div>
//           <button
//             onClick={onClose}
//             className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
//           >
//             <X className="w-5 h-5 text-gray-600" />
//           </button>
//         </div>

//         {/* Desktop Header */}
//         <div className="hidden lg:flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
//           <div
//             className={`flex items-center gap-2 transition-all duration-300 ${
//               isCollapsed ? "opacity-0 w-0" : "opacity-100"
//             }`}
//           >
//             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
//               <Mail className="w-4 h-4 text-white" />
//             </div>
//             <h2 className="text-sm font-bold text-gray-800 whitespace-nowrap">
//               Inbox Manager
//             </h2>
//           </div>

//           {/* Collapsed Icon */}
//           <div
//             className={`transition-all duration-300 ${
//               isCollapsed ? "opacity-100 mx-auto" : "opacity-0 w-0"
//             }`}
//           >
//             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
//               <Mail className="w-4 h-4 text-white" />
//             </div>
//           </div>
//         </div>

//         {/* Scrollable Content */}
//         <div
//           className={`flex-1 overflow-y-auto custom-scrollbar ${
//             isCollapsed ? "hidden lg:block" : ""
//           }`}
//         >
//           {isCollapsed ? (
//             /* Collapsed View - Icons Only */
//             <div className="hidden lg:flex flex-col items-center gap-4 py-4">
//               <button
//                 onClick={() => setShowAccountManager(true)}
//                 className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center shadow-md transition-all"
//                 title="Add Account"
//               >
//                 <Plus className="w-5 h-5 text-white" />
//               </button>

//               <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
//                 <Mail className="w-5 h-5 text-white" />
//               </div>
//               {Array.isArray(accounts) && accounts.length > 0 && (
//                 <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded-full font-bold">
//                   {accounts.length}
//                 </span>
//               )}

//               <div className="w-full border-t border-gray-200 my-2"></div>

//               <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
//                 <Calendar className="w-5 h-5 text-white" />
//               </div>
//               {Array.isArray(scheduledLeads) && scheduledLeads.length > 0 && (
//                 <span className="text-xs px-2 py-1 bg-green-500 text-white rounded-full font-bold">
//                   {scheduledLeads.length}
//                 </span>
//               )}

//               <div className="w-full border-t border-gray-200 my-2"></div>

//               <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
//                 <Clock className="w-5 h-5 text-white" />
//               </div>
//               {Array.isArray(scheduledEmails) && scheduledEmails.length > 0 && (
//                 <span className="text-xs px-2 py-1 bg-purple-500 text-white rounded-full font-bold">
//                   {scheduledEmails.length}
//                 </span>
//               )}
//             </div>
//           ) : (
//             <>
//               {/* GLOBAL SEARCH BAR */}
//               <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
//                 <div className="relative">
//                   <input
//                     type="text"
//                     placeholder="Search email / subject / cc..."
//                     value={searchQuery}
//                     onChange={(e) => handleSearch(e.target.value)}
//                     className="w-full px-4 py-2.5 pl-10 border-2 border-gray-200 rounded-xl bg-white
//                              focus:border-blue-400 focus:ring-2 focus:ring-blue-100
//                              transition-all outline-none text-sm placeholder:text-gray-400"
//                   />
//                   <svg
//                     className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
//                     fill="none"
//                     stroke="currentColor"
//                     viewBox="0 0 24 24"
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
//                     />
//                   </svg>
//                 </div>
//               </div>

//               {/* ================= EMAIL ACCOUNTS ================= */}
//               <div className="w-full">
//                 {/* Header */}

//                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-cyan-50/30 border-b border-gray-100">
//                   <div className="flex items-center gap-2 mb-2 sm:mb-0">
//                     <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
//                       <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
//                     </div>
//                     <h3 className="text-sm sm:text-base font-bold text-gray-800">
//                       Email Accounts
//                     </h3>
//                   </div>

//                   <div className="flex items-center gap-2">
//                     <button
//                       onClick={() => setShowAccountManager(true)}
//                       className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold w-8 h-8 sm:w-9 sm:h-9 rounded-lg shadow-md transition-all"
//                       title="Add Account"
//                     >
//                       <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
//                     </button>

//                     <button
//                       onClick={() => toggleSection("accounts")}
//                       className="p-1 sm:p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
//                       title={expandedSection.accounts ? "Minimize" : "Expand"}
//                     >
//                       <ChevronDown
//                         className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 transition-transform ${
//                           expandedSection.accounts ? "rotate-180" : ""
//                         }`}
//                       />
//                     </button>
//                   </div>
//                 </div>

//                 {/* Account List */}
//                 {expandedSection.accounts && (
//                   <div className="bg-white w-full">
//                     {loadingAccounts ? (
//                       <div className="flex flex-col items-center justify-center py-8 text-gray-400">
//                         <Loader2 className="animate-spin w-6 h-6 mb-3" />
//                         <span className="text-sm sm:text-base">
//                           Loading accounts...
//                         </span>
//                       </div>
//                     ) : Array.isArray(accounts) && accounts.length > 0 ? (
//                       <ul className="p-3 sm:p-4 space-y-2 max-h-[60vh] sm:max-h-96 overflow-y-auto">
//                         {accounts.map((acc) => (
//                           <li
//                             key={acc.id}
//                             onClick={() => {
//                               onAccountClick(acc);
//                               setTimeout(() => {
//                                 if (onCollapse) onCollapse();
//                                 onClose();
//                               }, 80);
//                             }}
//                             className={`
//                               group relative p-3 sm:p-4 rounded-xl cursor-pointer border-2 transition-all
//                               hover:bg-blue-50 hover:border-blue-200 hover:shadow-md
//                               ${
//                                 selectedAccount?.id === acc.id
//                                   ? "bg-blue-50 border-blue-300"
//                                   : "bg-white border-gray-100"
//                               }
//                               ${acc.shake ? "shake glow" : ""}
//                             `}
//                           >
//                             <div className="flex items-center gap-3 sm:gap-4 w-full">
//                               <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-md">
//                                 <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />

//                                 {/* 🔵 Unread dot */}
//                                 {acc.hasUnread && (
//                                   <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
//                                 )}
//                               </div>

//                               <div className="flex flex-col w-[calc(100%-3rem)] sm:w-[calc(100%-3.5rem)] overflow-hidden">
//                                 <p className="font-semibold text-gray-800 text-sm sm:text-base truncate break-all">
//                                   {acc.email}
//                                 </p>
//                                 <p className="text-xs sm:text-sm text-gray-500 capitalize truncate">
//                                   {acc.provider || "Custom"}
//                                 </p>
//                               </div>
//                             </div>

//                             {/* 🔴 Numeric Unread Badge */}
//                             {acc.unreadCount > 0 && (
//                               <div className="absolute top-2 right-3 bg-red-500 text-white text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center shadow">
//                                 {acc.unreadCount > 99 ? "99+" : acc.unreadCount}
//                               </div>
//                             )}
//                           </li>
//                         ))}
//                       </ul>
//                     ) : (
//                       <div className="flex flex-col items-center justify-center py-10 text-gray-400">
//                         <Mail className="w-8 h-8 mb-3 text-gray-400" />
//                         <p className="text-sm sm:text-base text-gray-500">
//                           No email accounts added
//                         </p>
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>

//               {/* ================= FOLLOW UPS & SCHEDULED ================= */}

//               {/* ================= TODAY'S FOLLOW-UPS ================= */}
//               <div>
//                 <div className="flex items-center justify-between w-full px-6 py-4 bg-gradient-to-r from-green-50 via-emerald-50/50 to-teal-50/30 border-b border-gray-100">
//                   <h3 className="text-sm font-bold flex items-center gap-2 text-gray-800">
//                     <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
//                       <Calendar className="w-4 h-4 text-white" />
//                     </div>
//                     Today's Follow-ups
//                   </h3>
//                   <div className="flex items-center gap-2">
//                     {Array.isArray(scheduledLeads) &&
//                       scheduledLeads.length > 0 && (
//                         <span className="text-xs px-2.5 py-1 bg-green-500 text-white rounded-full font-bold shadow-md">
//                           {scheduledLeads.length}
//                         </span>
//                       )}
//                     <button
//                       onClick={() => toggleSection("followups")}
//                       className="p-1.5 hover:bg-green-100 rounded-lg transition-colors"
//                       title={expandedSection.followups ? "Minimize" : "Expand"}
//                     >
//                       <ChevronDown
//                         className={`w-4 h-4 text-gray-600 transition-transform ${
//                           expandedSection.followups ? "rotate-180" : ""
//                         }`}
//                       />
//                     </button>
//                   </div>
//                 </div>

//                 {expandedSection.followups && (
//                   <div className="bg-white">
//                     {loadingScheduled ? (
//                       <div className="flex flex-col items-center justify-center py-8 text-gray-400">
//                         <Loader2 className="animate-spin w-6 h-6 mb-3" />
//                         <span className="text-sm">Loading follow-ups...</span>
//                       </div>
//                     ) : Array.isArray(scheduledLeads) &&
//                       scheduledLeads.length > 0 ? (
//                       <ul className="p-3 space-y-2 max-h-96 overflow-y-auto">
//                         {scheduledLeads.map((lead) => (
//                           <li
//                             key={lead.id}
//                             onClick={() => {
//                               onScheduledClick(lead);
//                               setTimeout(() => {
//                                 if (onCollapse) onCollapse();
//                                 onClose();
//                               }, 80);
//                             }}
//                             className="group p-4 rounded-xl hover:bg-green-50 cursor-pointer border-2 border-gray-100 hover:border-green-200 transition-all hover:shadow-md bg-white"
//                           >
//                             <div>
//                               <p className="font-semibold text-gray-800 truncate">
//                                 {lead.subject || "Follow-up"}
//                               </p>
//                               <p className="text-xs text-gray-500 truncate">
//                                 To: {lead.toEmail}
//                               </p>
//                               {lead.sendAt && (
//                                 <p className="text-xs text-gray-400">
//                                   {new Date(lead.sendAt).toLocaleString(
//                                     "en-US",
//                                     {
//                                       hour: "2-digit",
//                                       minute: "2-digit",
//                                       month: "short",
//                                       day: "numeric",
//                                     }
//                                   )}
//                                 </p>
//                               )}
//                             </div>
//                           </li>
//                         ))}
//                       </ul>
//                     ) : (
//                       <div className="flex flex-col items-center justify-center py-10 text-gray-400">
//                         <Calendar className="w-8 h-8 mb-3 text-gray-400" />
//                         <p>No follow-ups for today</p>
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>

//               {/* ================= SCHEDULED EMAILS ================= */}
//               <div>
//                 <button
//                   onClick={() => toggleSection("scheduled")}
//                   className="w-full px-6 py-4 bg-gradient-to-r from-purple-50 via-pink-50/50 to-rose-50/30 flex justify-between items-center hover:from-purple-100 hover:via-pink-100/50 hover:to-rose-100/30 transition-all"
//                 >
//                   <h3 className="text-sm font-bold flex items-center gap-2 text-gray-800">
//                     <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
//                       <Clock className="w-4 h-4 text-white" />
//                     </div>
//                     Scheduled Emails
//                   </h3>
//                   <div className="flex items-center gap-2">
//                     {Array.isArray(scheduledEmails) &&
//                       scheduledEmails.length > 0 && (
//                         <span className="text-xs px-2.5 py-1 bg-purple-500 text-white rounded-full font-bold shadow-md">
//                           {scheduledEmails.length}
//                         </span>
//                       )}
//                     <ChevronDown
//                       className={`w-4 h-4 text-gray-600 transition-transform ${
//                         expandedSection.scheduled ? "rotate-180" : ""
//                       }`}
//                     />
//                   </div>
//                 </button>

//                 {expandedSection.scheduled && (
//                   <div className="bg-white">
//                     {loadingScheduledEmails ? (
//                       <div className="flex flex-col items-center justify-center py-8 text-gray-400">
//                         <Loader2 className="animate-spin w-6 h-6 mb-3" />
//                         <span className="text-sm">
//                           Loading scheduled emails...
//                         </span>
//                       </div>
//                     ) : Array.isArray(scheduledEmails) &&
//                       scheduledEmails.length > 0 ? (
//                       <ul className="p-3 space-y-2 max-h-96 overflow-y-auto">
//                         {scheduledEmails.map((email) => {
//                           // Check if this email is scheduled for today
//                           const today = new Date();
//                           today.setHours(0, 0, 0, 0);
//                           const sendDate = new Date(email.sendAt);
//                           sendDate.setHours(0, 0, 0, 0);
//                           const isToday =
//                             sendDate.getTime() === today.getTime();

//                           return (
//                             <li
//                               key={email.id}
//                               onClick={() => {
//                                 console.log(
//                                   "🟢 Scheduled email item clicked:",
//                                   email
//                                 );

//                                 const emailAddress =
//                                   email.toEmail || email.email;

//                                 const account = accounts.find(
//                                   (acc) =>
//                                     acc.id === email.emailAccountId ||
//                                     acc.id === email.accountId
//                                 );

//                                 console.log(
//                                   "🟢 Found account:",
//                                   account,
//                                   "for email:",
//                                   emailAddress
//                                 );

//                                 // if (account && emailAddress) {
//                                 //   onAccountClick(account);

//                                 //   onScheduledEmailClick({
//                                 //     ...email,
//                                 //     toEmail: emailAddress,
//                                 //     emailAccountId: account.id,
//                                 //   });

//                                 //   setTimeout(() => {
//                                 //     if (onCollapse) onCollapse();
//                                 //     onClose();
//                                 //   }, 80);
//                                 // }
//                                 if (!account) {
//                                   console.warn(
//                                     "❌ No matching account found for scheduled email:",
//                                     email
//                                   );
//                                   alert(
//                                     "No linked email account found. Please add or link the correct email account first."
//                                   );
//                                   return;
//                                 }

//                                 if (!emailAddress) {
//                                   console.warn(
//                                     "❌ Scheduled email has no valid 'to' email:",
//                                     email
//                                   );
//                                   alert(
//                                     "This scheduled email has no 'To' email address."
//                                   );
//                                   return;
//                                 }

//                                 // SAFE — account exists
//                                 onAccountClick(account);

//                                 onScheduledEmailClick({
//                                   ...email,
//                                   toEmail: emailAddress,
//                                   emailAccountId: account.id,
//                                 });

//                                 setTimeout(() => {
//                                   if (onCollapse) onCollapse();
//                                   onClose();
//                                 }, 80);
//                               }}
//                               className={`group p-4 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 cursor-pointer border-2 transition-all hover:shadow-md bg-white ${
//                                 isToday
//                                   ? "border-purple-300 bg-purple-50"
//                                   : "border-gray-100 hover:border-purple-200"
//                               }`}
//                             >
//                               <div className="flex items-start gap-3">
//                                 <div
//                                   className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md ${
//                                     isToday
//                                       ? "bg-gradient-to-br from-purple-500 to-pink-600"
//                                       : "bg-gradient-to-br from-purple-100 to-pink-100"
//                                   }`}
//                                 >
//                                   <Mail
//                                     className={`w-5 h-5 ${
//                                       isToday ? "text-white" : "text-purple-600"
//                                     }`}
//                                   />
//                                 </div>
//                                 <div className="flex-1 min-w-0">
//                                   <p className="text-sm font-semibold text-gray-800 truncate mb-1">
//                                     {email.subject || "(No Subject)"}
//                                   </p>
//                                   <p className="text-xs text-gray-500 truncate mb-2">
//                                     To: {email.toEmail}
//                                   </p>
//                                   <div className="flex items-center gap-1">
//                                     <Clock
//                                       className={`w-3 h-3 ${
//                                         isToday
//                                           ? "text-purple-600"
//                                           : "text-purple-500"
//                                       }`}
//                                     />
//                                     <span
//                                       className={`text-xs font-medium ${
//                                         isToday
//                                           ? "text-purple-700 font-bold"
//                                           : "text-purple-600"
//                                       }`}
//                                     >
//                                       {email.sendAt
//                                         ? new Date(email.sendAt).toLocaleString(
//                                             "en-US",
//                                             {
//                                               month: "short",
//                                               day: "numeric",
//                                               hour: "2-digit",
//                                               minute: "2-digit",
//                                             }
//                                           )
//                                         : "No Date"}
//                                       {isToday && (
//                                         <span className="ml-1 text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
//                                           Today
//                                         </span>
//                                       )}
//                                     </span>
//                                   </div>
//                                 </div>
//                               </div>
//                             </li>
//                           );
//                         })}
//                       </ul>
//                     ) : (
//                       <div className="text-center py-8 px-4">
//                         <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
//                           <Clock className="w-6 h-6 text-gray-400" />
//                         </div>
//                         <p className="text-sm text-gray-500">
//                           No emails scheduled
//                         </p>
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>
//             </>
//           )}
//         </div>
//         {showSearchPopup && (
//           <div
//             className="absolute z-50 bg-white border-2 border-gray-200 shadow-2xl rounded-2xl left-4 right-4 top-[4.5rem]
//        max-h-[65vh] overflow-hidden flex flex-col"
//           >
//             {/* Popup Header */}
//             <div className="px-4 py-3 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-cyan-50/30 border-b border-gray-200 flex items-center justify-between">
//               <div className="flex items-center gap-2">
//                 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
//                   <svg
//                     className="w-4 h-4 text-white"
//                     fill="none"
//                     stroke="currentColor"
//                     viewBox="0 0 24 24"
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
//                     />
//                   </svg>
//                 </div>
//                 <h3 className="text-sm font-bold text-gray-800">
//                   Found in multiple accounts
//                 </h3>
//               </div>
//               <button
//                 onClick={() => {
//                   setShowSearchPopup(false);
//                   setSearchQuery("");
//                 }}
//                 className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
//               >
//                 <X className="w-4 h-4 text-gray-600" />
//               </button>
//             </div>

//             {/* Results List */}
//             <div className="overflow-y-auto custom-scrollbar flex-1 p-3">
//               <div className="space-y-2">
//                 {searchResults.map((msg, i) => {
//                   const matchedAccount = accounts.find(
//                     (a) => a.id === msg.emailAccountId
//                   );
//                   return (
//                     <div
//                       key={i}
//                       className="group p-3 rounded-xl cursor-pointer border-2 border-gray-100
//                        hover:border-blue-200 hover:bg-blue-50 transition-all hover:shadow-md bg-white"
//                       onClick={() => {
//                         const acc = accounts.find(
//                           (a) => a.id === msg.emailAccountId
//                         );

//                         if (!acc) {
//                           console.warn(
//                             "❌ Account not found for search result:",
//                             msg
//                           );
//                           return;
//                         }

//                         // 1. Select the account (which triggers ChatSidebar to load conversations)
//                         onAccountClick(acc);

//                         // 2. Wait for the account selection/chat sidebar load, then open the chat.
//                         setTimeout(() => {
//                           window.dispatchEvent(
//                             new CustomEvent("openSearchResult", {
//                               detail: {
//                                 accountId: acc.id,
//                                 // Pass the original search query for matching in ChatSidebar
//                                 searchEmail: searchQuery.trim().toLowerCase(),
//                               },
//                             })
//                           );
//                         }, 300); // 300ms delay to allow state changes to propagate

//                         setShowSearchPopup(false);
//                         setSearchQuery("");
//                       }}
//                     >
//                       <div className="flex items-start gap-3">
//                         <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 shadow-sm">
//                           <Mail className="w-4 h-4 text-blue-600" />
//                         </div>

//                         <div className="flex-1 min-w-0">
//                           <p className="font-semibold text-sm text-gray-800 truncate mb-1">
//                             {msg.fromEmail}
//                           </p>
//                           <div className="flex items-center gap-2">
//                             <span className="text-xs text-gray-500">
//                               Account:
//                             </span>
//                             <span className="text-xs font-medium text-gray-700 truncate">
//                               {matchedAccount?.email || "Unknown"}
//                             </span>
//                           </div>
//                           {msg.subject && (
//                             <p className="text-xs text-gray-500 truncate mt-1">
//                               {msg.subject}
//                             </p>
//                           )}
//                         </div>

//                         <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
//                           <ChevronRight className="w-5 h-5 text-blue-600" />
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>

//             {/* Footer Info */}
//             <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
//               <p className="text-xs text-gray-500 text-center">
//                 Click any result to open the conversation
//               </p>
//             </div>
//           </div>
//         )}

//         {/* Footer */}
//         {/* {!isCollapsed && (
//           <div className="border-t border-gray-200 p-4 bg-white">
//             <div className="text-xs text-center text-gray-500">
//               <p className="font-medium">Inbox Manager</p>
//             </div>
//           </div>
//         )} */}

//         {/* Resize Handle - Desktop Only */}
//         {!isCollapsed && (
//           <div
//             className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors group"
//             onMouseDown={handleMouseDown}
//           >
//             <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1 h-12 bg-gray-300 group-hover:bg-blue-500 transition-colors rounded-full" />
//           </div>
//         )}
//       </div>

//       {/* ===== AccountManager Modal ===== */}
//       {showAccountManager && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[90]">
//           <div className="bg-gray-900 rounded-2xl shadow-xl w-[90vw] max-w-4xl overflow-y-auto max-h-[90vh] p-4 relative">
//             <button
//               onClick={() => setShowAccountManager(false)}
//               className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
//             >
//               Close
//             </button>
//             <AccountManager
//               onAccountSelected={(acc) => {
//                 onAccountClick(acc);
//               }}
//             />
//           </div>
//         </div>
//       )}

//       {/* Custom Scrollbar & Resize Cursor */}
//       <style>{`
//         .custom-scrollbar::-webkit-scrollbar {
//           width: 6px;
//         }
//         .custom-scrollbar::-webkit-scrollbar-track {
//           background: transparent;
//         }
//         .custom-scrollbar::-webkit-scrollbar-thumb {
//           background: #cbd5e1;
//           border-radius: 3px;
//         }
//         .custom-scrollbar::-webkit-scrollbar-thumb:hover {
//           background: #94a3b8;
//         }

//         ${
//           isResizing
//             ? `
//           * {
//             cursor: col-resize !important;
//             user-select: none !important;
//           }
//         `
//             : ""
//         }
//       `}</style>
//       <style>
//         {`
//         @keyframes shake {
//           0% { transform: translateX(0); }
//           25% { transform: translateX(-2px); }
//           50% { transform: translateX(2px); }
//           75% { transform: translateX(-2px); }
//           100% { transform: translateX(0); }
//         }

//         .shake {
//           animation: shake 0.35s ease-in-out;
//         }

//         .glow {
//           box-shadow: 0 0 8px rgba(0, 150, 255, 0.5);
//         }
//         `}
//       </style>
//     </>
//   );
// }
