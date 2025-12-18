// src/components/FollowUpEditModal.jsx
import React from "react";
import FloatingEditWindow from "./FloatingEditWindow";

export default function FollowUpEditModal({
  editForm,
  onChange,
  onSave,
  onClose,
}) {
  return (
    <FloatingEditWindow onClose={onClose}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(); // ✅ call prop passed from ChatView
        }}
      >
        {/* Contact Info */}
        <div>
          <h3 className="text-sm font-semibold text-indigo-900 border-b border-indigo-200 pb-2 mb-3">
            Contact Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client Email
              </label>
              <input
                type="email"
                value={editForm.email || ""}
                onChange={(e) => onChange("email", e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                CC Email
              </label>
              <input
                type="text"
                value={editForm.cc || ""}
                onChange={(e) => onChange("cc", e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phone
            </label>
            <input
              type="text"
              value={editForm.phone || ""}
              onChange={(e) => onChange("phone", e.target.value)}
              className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Communication */}
        <div>
          <h3 className="text-sm font-semibold text-purple-900 border-b border-purple-200 pb-2 mb-3">
            Communication
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={editForm.subject || ""}
                onChange={(e) => onChange("subject", e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Body / Pitch
              </label>
              <textarea
                rows="3"
                value={editForm.body || ""}
                onChange={(e) => onChange("body", e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Response
              </label>
              <textarea
                rows="2"
                value={editForm.response || ""}
                onChange={(e) => onChange("response", e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Lead Info */}
        <div>
          <h3 className="text-sm font-semibold text-pink-900 border-b border-pink-200 pb-2 mb-3">
            Lead Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Lead Status
              </label>
              <select
                value={editForm.leadStatus || ""}
                onChange={(e) => onChange("leadStatus", e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Select Status</option>
                {[
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
                ].map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Result
              </label>
              <select
                value={editForm.result || ""}
                onChange={(e) => onChange("result", e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sales Info */}
        <div>
          <h3 className="text-sm font-semibold text-emerald-900 border-b border-emerald-200 pb-2 mb-3">
            Sales Info
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Salesperson
              </label>
              <input
                type="text"
                value={editForm.salesperson || ""}
                onChange={(e) => onChange("salesperson", e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={editForm.companyName || ""}
                onChange={(e) => onChange("companyName", e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Brand
              </label>
              <input
                type="text"
                value={editForm.brand || ""}
                onChange={(e) => onChange("brand", e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Deal Value
              </label>
              <input
                type="number"
                value={editForm.dealValue || ""}
                onChange={(e) => onChange("dealValue", e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Follow-up */}
        <div>
          <h3 className="text-sm font-semibold text-indigo-900 border-b border-indigo-200 pb-2 mb-3">
            Follow-Up
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Follow-Up Date
              </label>
              <input
                type="date"
                value={editForm.followUpDate || ""}
                onChange={(e) => onChange("followUpDate", e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Day
              </label>
              <input
                type="text"
                value={editForm.day || ""}
                readOnly
                className="w-full border px-3 py-2 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg"
          >
            Save Changes
          </button>
        </div>
      </form>
    </FloatingEditWindow>
  );
}
