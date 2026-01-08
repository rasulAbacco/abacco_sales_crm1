import React, { useState, useEffect } from "react";
import { X, User, Mail, Check, AlertCircle } from "lucide-react";
import { api } from "../../pages/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function SenderNameModal({ account, onClose, onSaved }) {
  const [senderName, setSenderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (account?.senderName) {
      setSenderName(account.senderName);
    }
  }, [account]);

  const handleSave = async () => {
    if (!senderName.trim()) {
      setError("Sender name cannot be empty");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.patch(
        `${API_BASE_URL}/api/accounts/${account.id}/sender-name`,
        { senderName: senderName.trim() }
      );

      onSaved?.(senderName.trim());
      onClose();
    } catch (err) {
      console.error("Error updating sender name:", err);
      setError("Failed to update sender name. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">Set Sender Name</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Account Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
            <Mail className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {account?.email}
              </p>
              <p className="text-xs text-gray-500">
                This name will appear in your email signatures
              </p>
            </div>
          </div>

          {/* Sender Name Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => {
                setSenderName(e.target.value);
                setError("");
              }}
              placeholder="e.g., John Smith, Sales Team"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              This will replace{" "}
              <code className="bg-gray-100 px-1 rounded">
                {""}sender_name{""}
              </code>{" "}
              in your templates
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Preview */}
          {senderName.trim() && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                Preview
              </p>
              <div className="text-sm text-gray-700 space-y-1">
                <p>Hi,</p>
                <p>Could you please get back with an update?</p>
                <p className="mt-3">
                  <span className="font-medium">Regards</span>
                  <br />
                  <span className="text-blue-600 font-medium">
                    {senderName}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !senderName.trim()}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Name
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
