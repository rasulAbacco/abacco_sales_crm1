import React from "react";
import { Mail, User, Globe, Phone, X } from "lucide-react";

export default function EmailModal({
  isOpen,
  onClose,
  emailData,
  handleEmailChange,
  handleSendEmail,
  user,
  selectedEmailLead,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl border border-indigo-100 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* ======================= */}
        {/* HEADER SECTION */}
        {/* ======================= */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 text-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-bold">Compose Email</h2>
                <p className="text-indigo-200 text-xs sm:text-sm">
                  {selectedEmailLead
                    ? `To: ${selectedEmailLead.client}`
                    : "New Email"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-white hover:text-indigo-200 transition-colors p-1 rounded-full hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ======================= */}
        {/* SCROLLABLE BODY */}
        {/* ======================= */}
        <div className="overflow-y-auto flex-1">
          {/* Lead Info */}
          {selectedEmailLead && (
            <div className="p-4 bg-indigo-50 border-b border-indigo-100">
              <div className="flex items-center gap-2 text-indigo-800 text-sm font-medium mb-2">
                <User className="w-4 h-4" />
                Lead Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium truncate">
                    {selectedEmailLead.email || "-"}
                  </span>
                </div>
                {selectedEmailLead.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">
                      {selectedEmailLead.phone}
                    </span>
                  </div>
                )}
                {selectedEmailLead.country && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span className="text-gray-600">Country:</span>
                    <span className="font-medium">
                      {selectedEmailLead.country}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================= */}
          {/* EMAIL FIELDS */}
          {/* ======================= */}
          <div className="p-4 sm:p-6 space-y-5">
            
            {/* From Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Email
              </label>
              <select
                value={emailData.fromEmail}
                onChange={(e) => handleEmailChange("fromEmail", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">Select email</option>
                {emailData.emailAccounts?.map((acc) => (
                  <option key={acc.id} value={acc.email}>
                    {acc.email} ({acc.provider || "Custom"})
                  </option>
                ))}
                <option value="new">➕ Add New Email</option>
              </select>

              {emailData.fromEmail === "new" && (
                <div className="mt-3 space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your new email address"
                    value={emailData.newEmail}
                    onChange={(e) =>
                      handleEmailChange("newEmail", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500"
                  />

                  <input
                    type="text"
                    placeholder="Enter SendGrid API Key (SG.xxxxx...)"
                    value={emailData.sendGridApiKey}
                    onChange={(e) =>
                      handleEmailChange("sendGridApiKey", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>
              <input
                type="email"
                value={emailData.to}
                onChange={(e) => handleEmailChange("to", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Recipient email address"
              />
            </div>

            {/* CC */}
            {selectedEmailLead?.cc && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CC
                </label>
                <input
                  type="email"
                  value={emailData.cc}
                  onChange={(e) => handleEmailChange("cc", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="CC recipients (optional)"
                />
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => handleEmailChange("subject", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Email subject"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                rows={6}
                value={emailData.body}
                onChange={(e) => handleEmailChange("body", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                placeholder="Write your message here..."
              />
            </div>

            {/* Regards */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="addRegards"
                checked={emailData.addRegards}
                onChange={(e) =>
                  handleEmailChange("addRegards", e.target.checked)
                }
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label
                htmlFor="addRegards"
                className="text-sm text-gray-700 cursor-pointer leading-snug"
              >
                Automatically add “Regards” with your name
                <span className="font-medium text-indigo-600 ml-1">
                  ({user?.name || "Your Name"})
                </span>
              </label>
            </div>

            {/* Send using */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <label className="text-sm text-gray-700">Send using:</label>
              <select
                value={emailData.mode}
                onChange={(e) => handleEmailChange("mode", e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="gmail">Gmail</option>
                <option value="sendgrid">SendGrid</option>
              </select>
            </div>
          </div>
        </div>

        {/* ======================= */}
        {/* FOOTER BUTTONS */}
        {/* ======================= */}
        <div className="bg-gray-50 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={handleSendEmail}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center gap-2 shadow-md"
          >
            <Mail className="w-4 h-4" />
            {emailData.mode === "sendgrid" ? "Send" : "Open in Gmail"}
          </button>
        </div>
      </div>
    </div>
  );
}
