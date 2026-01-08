// Example: How to integrate placeholder replacement into EnhancedScheduleModal.jsx

import React, { useState, useEffect } from "react";
import { replacePlaceholders } from "../../../utils/templateReplacer";
import { api } from "../../api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function EnhancedScheduleModalExample() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [messageBody, setMessageBody] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [selectedConversations, setSelectedConversations] = useState([]);

  // 🔥 STEP 1: Fetch accounts with sender names
  useEffect(() => {
    fetchAccounts();
    fetchTemplates();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get(`${API_BASE_URL}/api/accounts`);
      if (response.data.success) {
        setAccounts(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get(`${API_BASE_URL}/api/email-templates`);
      if (response.data.success) {
        setTemplates(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  // 🔥 STEP 2: When account changes, update preview
  const handleAccountChange = (accountId) => {
    setSelectedAccountId(accountId);

    // If a template is already selected, re-preview with new account
    if (selectedTemplate && messageBody) {
      previewTemplateWithAccount(selectedTemplate, accountId);
    }
  };

  // 🔥 STEP 3: When template is selected, replace placeholders
  const handleTemplateSelect = async (template) => {
    setSelectedTemplate(template);
    setMessageSubject(template.subject || "");

    if (selectedAccountId) {
      previewTemplateWithAccount(template, selectedAccountId);
    } else {
      // No account selected yet, show template with placeholders
      setMessageBody(template.bodyHtml);
    }
  };

  // 🔥 STEP 4: Preview template with placeholders replaced
  const previewTemplateWithAccount = (template, accountId) => {
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      setMessageBody(template.bodyHtml);
      return;
    }

    // Get first conversation details for preview
    const firstConv = selectedConversations[0];
    const clientEmail = firstConv?.clientEmail || "";
    const clientName =
      firstConv?.clientEmail?.split("@")[0]?.replace(/[._-]/g, " ") || "Client";

    // Replace placeholders
    const previewBody = replacePlaceholders(template.bodyHtml, {
      senderName: account.senderName || account.email.split("@")[0],
      clientName: clientName,
      company: "", // You can fetch from lead details
      email: clientEmail,
    });

    setMessageBody(previewBody);
  };

  // 🔥 STEP 5: When scheduling, body already has placeholders replaced
  const handleSchedule = async () => {
    if (!selectedAccountId) {
      alert("Please select an email account");
      return;
    }

    if (!messageBody) {
      alert("Please enter a message");
      return;
    }

    try {
      // Schedule messages (placeholders already replaced in messageBody)
      const response = await api.post(
        `${API_BASE_URL}/api/scheduled-messages/bulk`,
        {
          accountId: selectedAccountId,
          sendAt: scheduledTime,
          messages: selectedConversations.map((conv) => ({
            conversationId: conv.conversationId,
            subject: messageSubject,
            bodyHtml: messageBody, // ✅ Already has placeholders replaced
          })),
        }
      );

      if (response.data.success) {
        alert("Messages scheduled successfully!");
        onClose();
      }
    } catch (error) {
      console.error("Error scheduling messages:", error);
      alert("Failed to schedule messages");
    }
  };

  // 🔥 STEP 6: Show sender name in account dropdown
  const renderAccountOption = (account) => {
    return (
      <div className="flex items-center justify-between">
        <span>{account.email}</span>
        {account.senderName && (
          <span className="text-xs text-gray-500 ml-2">
            ({account.senderName})
          </span>
        )}
      </div>
    );
  };

  // 🔥 STEP 7: Show placeholder info in UI
  const renderPlaceholderInfo = () => {
    const account = accounts.find((a) => a.id === selectedAccountId);

    if (!account?.senderName) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
          <p className="text-yellow-800">
            💡 <strong>Tip:</strong> Set a sender name in Account Settings to
            use{" "}
            <code className="bg-yellow-100 px-1 rounded">
              {"{sender_name}"}
            </code>{" "}
            placeholder
          </p>
        </div>
      );
    }

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <p className="text-blue-800">✅ Placeholders will be replaced:</p>
        <ul className="mt-2 space-y-1 text-blue-700">
          <li>
            <code className="bg-blue-100 px-1 rounded">{"{sender_name}"}</code>{" "}
            → <strong>{account.senderName}</strong>
          </li>
          <li>
            <code className="bg-blue-100 px-1 rounded">{"{date}"}</code> →{" "}
            {new Date().toLocaleDateString()}
          </li>
          <li>
            <code className="bg-blue-100 px-1 rounded">{"{time}"}</code> →{" "}
            {new Date().toLocaleTimeString()}
          </li>
        </ul>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <h2 className="text-lg font-bold text-white">Schedule Follow-ups</h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Account Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              From Email Account *
            </label>
            <select
              value={selectedAccountId || ""}
              onChange={(e) => handleAccountChange(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Email Account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email}
                  {account.senderName ? ` (${account.senderName})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Template (Optional)
            </label>
            <select
              value={selectedTemplate?.id || ""}
              onChange={(e) => {
                const template = templates.find(
                  (t) => t.id === Number(e.target.value)
                );
                handleTemplateSelect(template);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Placeholder Info */}
          {renderPlaceholderInfo()}

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={10}
              placeholder="Type your message here..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Preview with placeholders replaced for{" "}
              {accounts.find((a) => a.id === selectedAccountId)?.senderName ||
                "your account"}
            </p>
          </div>

          {/* Date/Time Selection */}
          {/* ... your existing date/time picker ... */}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Schedule Messages
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   💡 KEY POINTS FOR INTEGRATION:
   ============================================================

   1. FETCH ACCOUNTS WITH SENDER NAMES:
      - Use GET /api/accounts to get senderName field
      - Show sender name in dropdown for clarity

   2. TEMPLATE PREVIEW:
      - When template selected + account selected → replace placeholders
      - Show preview immediately in UI
      - User sees final result before scheduling

   3. PLACEHOLDER REPLACEMENT HAPPENS IN FRONTEND:
      - Replace placeholders in preview
      - Schedule with already-replaced text
      - Backend just sends what it receives

   4. ALTERNATIVE: BACKEND REPLACEMENT:
      - Store template with placeholders in database
      - Replace placeholders in backend when sending
      - Use emailSender.js service

   5. UI INDICATORS:
      - Show which placeholders are available
      - Show what they'll be replaced with
      - Warn if sender name not set

   ============================================================ */
