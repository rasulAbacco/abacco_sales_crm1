import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Calendar,
  Clock,
  Mail,
  Send,
  Loader2,
  FileText,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  List,
  Link as LinkIcon,
} from "lucide-react";
import { api } from "../../../pages/api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function EnhancedScheduleModal({
  isOpen,
  onClose,
  selectedConversations,
  selectedAccount,
  onScheduleSuccess,
}) {
  const [sendAt, setSendAt] = useState("");
  const [sendTime, setSendTime] = useState("10:00");
  const [customStatuses, setCustomStatuses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedLeadStatus, setSelectedLeadStatus] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [loading, setLoading] = useState(false);

  const editorRef = useRef(null);

  // Hardcoded default lead statuses
  const defaultStatuses = [
    "Invoice Pending",
    "Invoice Cancel",
    "Deal",
    "Active Client",
    "No Response",
    "1 Reply",
    "1 Follow Up",
    "2 Follow Up",
    "3 Follow Up",
    "Call",
    "Sample Pending",
  ];

  // Combined status options
  const allStatuses = [
    ...defaultStatuses,
    ...customStatuses.map((s) => s.name),
  ];

  useEffect(() => {
    if (isOpen) {
      fetchCustomStatuses();
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSendAt(tomorrow.toISOString().split("T")[0]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedLeadStatus) {
      fetchTemplatesByStatus(selectedLeadStatus);
    } else {
      setTemplates([]);
      setSelectedTemplate("");
    }
  }, [selectedLeadStatus]);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(
        (t) => t.id === parseInt(selectedTemplate)
      );
      if (template) {
        setSubject(template.subject || "");
        setBodyHtml(template.bodyHtml);
        if (editorRef.current) {
          editorRef.current.innerHTML = template.bodyHtml;
        }
      }
    }
  }, [selectedTemplate, templates]);

  const fetchCustomStatuses = async () => {
    try {
      const response = await api.get(`${API_BASE_URL}/api/customStatus`);
      if (response.data.success) {
        setCustomStatuses(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching custom statuses:", error);
    }
  };

  const fetchTemplatesByStatus = async (status) => {
    try {
      const response = await api.get(
        `${API_BASE_URL}/api/email-templates/by-status/${encodeURIComponent(
          status
        )}`
      );
      if (response.data.success) {
        setTemplates(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      setTemplates([]);
    }
  };

  const formatText = (command) => {
    document.execCommand(command, false, null);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      document.execCommand("createLink", false, url);
    }
    editorRef.current?.focus();
  };

  const handleSchedule = async () => {
    if (!sendAt || !sendTime) {
      alert("Please select date and time");
      return;
    }

    if (!selectedLeadStatus) {
      alert("Please select a lead status");
      return;
    }

    const bodyContent = editorRef.current?.innerHTML || bodyHtml;
    if (!bodyContent.trim()) {
      alert("Please enter message content");
      return;
    }

    const dateTimeString = `${sendAt}T${sendTime}:00`;

    setLoading(true);
    try {
      const messages = selectedConversations.map((conv) => ({
        conversationId: conv.conversationId || null,

        toEmail: conv.clientEmail || conv.email,
        subject: subject || conv.subject || "(No Subject)",
        bodyHtml: bodyContent,
      }));

      const response = await api.post(
        `${API_BASE_URL}/api/scheduled-messages/bulk`,
        {
          accountId: selectedAccount.id,
          sendAt: dateTimeString,
          messages,
        }
      );

      if (response.data.success) {
        // Increment template use count if template was used
        if (selectedTemplate) {
          await api.patch(
            `${API_BASE_URL}/api/email-templates/${selectedTemplate}/use`
          );
        }

        alert(response.data.message || "Emails scheduled successfully!");
        onScheduleSuccess?.();
        handleClose();
      }
    } catch (error) {
      console.error("❌ Scheduling error:", error);
      alert("Failed to schedule emails");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSendAt("");
    setSendTime("10:00");
    setSelectedLeadStatus("");
    setSelectedTemplate("");
    setSubject("");
    setBodyHtml("");
    setTemplates([]);
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Schedule Follow-up Emails
              </h3>
              <p className="text-sm text-gray-500">
                {selectedConversations.length} conversation(s) selected
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          <div className="space-y-6">
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={sendAt}
                    onChange={(e) => setSendAt(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send Time *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="time"
                    value={sendTime}
                    onChange={(e) => setSendTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Lead Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Status *
              </label>
              <div className="relative">
                <select
                  value={selectedLeadStatus}
                  onChange={(e) => setSelectedLeadStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="">Select Lead Status</option>
                  {allStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Template Selection (appears after lead status is selected) */}
            {selectedLeadStatus && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Template (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  >
                    <option value="">
                      {templates.length > 0
                        ? "Select a template or write custom message"
                        : "No templates found for this status"}
                    </option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                        {template.useCount > 0 &&
                          ` (used ${template.useCount}x)`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {templates.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    You can create templates in the Message Templates tab
                  </p>
                )}
              </div>
            )}

            {/* Subject Line */}
            {selectedLeadStatus && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Line
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Message Body Editor */}
            {selectedLeadStatus && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Body *
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-300">
                    <button
                      onClick={() => formatText("bold")}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Bold"
                    >
                      <Bold className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => formatText("italic")}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Italic"
                    >
                      <Italic className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => formatText("underline")}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Underline"
                    >
                      <Underline className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <button
                      onClick={() => formatText("insertUnorderedList")}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Bullet List"
                    >
                      <List className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={insertLink}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Insert Link"
                    >
                      <LinkIcon className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <div
                    ref={editorRef}
                    contentEditable
                    className="min-h-[300px] max-h-[400px] overflow-y-auto p-4 focus:outline-none"
                    style={{
                      fontFamily: "Calibri, sans-serif",
                      fontSize: "11pt",
                      lineHeight: "1.35",
                    }}
                    placeholder="Type your message here..."
                  />
                </div>
              </div>
            )}

            {/* Preview Section */}
            {selectedLeadStatus && selectedConversations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  📧 Will send to:
                </h4>
                <div className="space-y-1">
                  {selectedConversations.slice(0, 5).map((conv, idx) => (
                    <p key={idx} className="text-sm text-blue-700">
                      • {conv.clientEmail || conv.email}
                    </p>
                  ))}
                  {selectedConversations.length > 5 && (
                    <p className="text-sm text-blue-600 font-medium">
                      ... and {selectedConversations.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={loading || !selectedLeadStatus}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Schedule Emails
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
