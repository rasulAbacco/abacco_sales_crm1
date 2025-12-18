import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, Send, Loader2, FileText } from "lucide-react";
import { api } from "../../api";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ScheduleModal({ onClose, account, composeData }) {
  const [form, setForm] = useState({
    fromEmail: "",
    toEmail: "",
    subject: "",
    bodyHtml: "",
    sendAt: "",
  });
  const [clientResponse, setClientResponse] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    if (composeData) {
      setForm({
        fromEmail: composeData.from || account?.email || "",
        toEmail: composeData.to || "",
        subject: composeData.subject || "",
        bodyHtml: "",
        sendAt: "",
      });

      const cleanResponse = (
        composeData.clientResponse ||
        composeData.body ||
        ""
      )
        .replace(/src=["']\/uploads\//g, `src='${API_BASE_URL}/uploads/`)
        .replace(/style="[^"]*"/g, "")
        .trim();

      setClientResponse(cleanResponse);
    }
  }, [composeData, account]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSchedule = async () => {
    if (!form.toEmail || !form.subject || !form.sendAt) {
      alert("Please fill all required fields (To, Subject, Date/Time)");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        accountId: account?.id,
        fromEmail: form.fromEmail,
        toEmail: form.toEmail,
        subject: form.subject,
        bodyHtml: form.bodyHtml,
        sendAt: form.sendAt,
      };

      const res = await api.post(
        `${API_BASE_URL}/api/scheduled-messages`,
        payload
      );
      if (res.data?.success) {
        alert(res.data.message || "✅ Email scheduled successfully!");
        onClose();
      } else {
        alert("⚠️ Schedule update failed. Try again.");
      }
    } catch (err) {
      console.error("❌ Scheduling error:", err);
      alert("Failed to schedule email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200 my-4 max-h-[95vh] flex flex-col animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 px-4 sm:px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Schedule Message
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* From */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              From Email
            </label>
            <input
              type="email"
              value={form.fromEmail}
              readOnly
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 bg-gray-50 text-gray-600"
            />
          </div>

          {/* To */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              To Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.toEmail}
              readOnly
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 bg-gray-50 text-gray-600"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 sm:py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Message Body
            </label>
            <textarea
              name="bodyHtml"
              rows={5}
              value={form.bodyHtml}
              onChange={handleChange}
              placeholder="Type your follow-up or scheduling message here..."
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 resize-y"
            ></textarea>
          </div>

          {/* Client Response */}
          {clientResponse && (
            <div className="border-2 border-gray-200 rounded-xl bg-gray-50 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-gray-100 to-blue-50 border-b border-gray-200 text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-600" />
                Client Response (read-only)
              </div>
              <div
                className="p-4 prose prose-sm max-w-none text-gray-800 bg-white overflow-x-auto"
                style={{ maxHeight: "300px", overflowY: "auto" }}
                dangerouslySetInnerHTML={{ __html: clientResponse }}
              ></div>
            </div>
          )}

          {/* Schedule Time */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Schedule Date & Time{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              name="sendAt"
              value={form.sendAt}
              onChange={handleChange}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 sm:py-3 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-5 border-t border-gray-200 bg-gray-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Schedule</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
