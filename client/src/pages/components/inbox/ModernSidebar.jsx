import React, { useState, useEffect } from "react";
import {
  Mail,
  Inbox,
  Send,
  AlertOctagon,
  Trash2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  Settings,
} from "lucide-react";

export default function ModernSidebar({
  accounts = [],
  selectedAccount,
  selectedFolder,
  onAccountSelect,
  onFolderSelect,
  onAddAccount,
  isCollapsed: externalCollapsed,
  onToggleCollapse,
}) {
  const [isCollapsed, setIsCollapsed] = useState(externalCollapsed || false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAccounts, setExpandedAccounts] = useState({});

  useEffect(() => {
    if (externalCollapsed !== undefined) {
      setIsCollapsed(externalCollapsed);
    }
  }, [externalCollapsed]);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onToggleCollapse) {
      onToggleCollapse(newState);
    }
  };

  const toggleAccountExpanded = (accountId) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  const folders = [
    { id: "inbox", label: "Inbox", icon: Inbox, color: "text-blue-600" },
    { id: "sent", label: "Sent", icon: Send, color: "text-green-600" },
    { id: "spam", label: "Spam", icon: AlertOctagon, color: "text-orange-600" },
    { id: "trash", label: "Trash", icon: Trash2, color: "text-red-600" },
  ];

  const filteredAccounts = accounts.filter((acc) =>
    acc.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-80"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Mail</span>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Search Box */}
          {/* <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search mail and people"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div> */}

          {/* Accounts & Folders */}
          <div className="flex-1 overflow-y-auto">
            {filteredAccounts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No accounts found
              </div>
            ) : (
              <div className="py-2">
                {filteredAccounts.map((account) => (
                  <div key={account.id} className="mb-1">
                    {/* Account Header */}
                    <button
                      onClick={() => toggleAccountExpanded(account.id)}
                      className={`w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        selectedAccount?.id === account.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {account.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {account.email}
                          </p>
                          {account.unreadCount > 0 && (
                            <p className="text-xs text-blue-600 font-semibold">
                              {account.unreadCount} unread
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedAccounts[account.id] ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Folders for this account */}
                    {expandedAccounts[account.id] && (
                      <div className="ml-4 mt-1 space-y-1">
                        {folders.map((folder) => {
                          const Icon = folder.icon;
                          const isSelected =
                            selectedAccount?.id === account.id &&
                            selectedFolder === folder.id;
                          return (
                            <button
                              key={folder.id}
                              onClick={() => {
                                onAccountSelect(account);
                                onFolderSelect(folder.id);
                              }}
                              className={`w-full px-4 py-2 flex items-center gap-3 rounded-lg transition-colors ${
                                isSelected
                                  ? "bg-blue-50 border-l-4 border-blue-600"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              <Icon
                                className={`w-4 h-4 ${
                                  isSelected ? "text-blue-600" : folder.color
                                }`}
                              />
                              <span
                                className={`text-sm ${
                                  isSelected
                                    ? "text-blue-600 font-semibold"
                                    : "text-gray-700"
                                }`}
                              >
                                {folder.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Account Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onAddAccount}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          </div>
        </>
      )}

      {/* Collapsed View - Just Icons */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center py-4 space-y-4">
          {accounts.slice(0, 5).map((account) => (
            <button
              key={account.id}
              onClick={() => {
                onAccountSelect(account);
                setIsCollapsed(false);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-all relative ${
                selectedAccount?.id === account.id
                  ? "ring-2 ring-blue-600 ring-offset-2"
                  : "hover:ring-2 hover:ring-gray-300"
              }`}
              style={{
                background: `linear-gradient(135deg, ${
                  selectedAccount?.id === account.id ? "#3b82f6" : "#6b7280"
                }, ${
                  selectedAccount?.id === account.id ? "#1e40af" : "#4b5563"
                })`,
              }}
              title={account.email}
            >
              {account.email.charAt(0).toUpperCase()}
              {account.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                  {account.unreadCount > 9 ? "9+" : account.unreadCount}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={onAddAccount}
            className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
            title="Add Account"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
}
