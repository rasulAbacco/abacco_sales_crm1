import React, { useState } from "react";

const LEAD_STATUSES = [
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

export default function FollowupForm({ selected, onSave, onCancel }) {
  const [form, setForm] = useState(
    selected || {
      clientEmail: "",
      clientCC: "",
      phone: "",
      subject: "",
      pitch: "",
      response: "",
      leadStatus: "1 Follow Up",
      nextFollowUpDate: "",
      day: "Monday",
    }
  );

  const handleDateChange = (date) => {
    const d = new Date(date);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    setForm({
      ...form,
      nextFollowUpDate: date,
      day: days[d.getDay()],
    });
  };

  const handleSubmit = () => {
    if (form.clientEmail && form.nextFollowUpDate) onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Responsive modal container */}
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 w-full max-w-2xl border border-gray-200 
                      max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {selected ? "Edit Follow-Up" : "Schedule New Follow-Up"}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Responsive grid form */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Client Email"
              type="email"
              value={form.clientEmail}
              onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
            />
            <Input
              label="CC Email"
              type="email"
              value={form.clientCC}
              onChange={(e) => setForm({ ...form, clientCC: e.target.value })}
            />
            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Follow-Up Date"
              type="date"
              value={form.nextFollowUpDate}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            <Input
              label="Subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            <Select
              label="Lead Status"
              value={form.leadStatus}
              onChange={(e) => setForm({ ...form, leadStatus: e.target.value })}
              options={LEAD_STATUSES}
            />
          </div>

          {/* Textareas (stacked, full width) */}
          <Textarea
            label="Pitch"
            rows="4"
            value={form.pitch}
            onChange={(e) => setForm({ ...form, pitch: e.target.value })}
          />

          <Textarea
            label="Response"
            rows="4"
            value={form.response}
            onChange={(e) => setForm({ ...form, response: e.target.value })}
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6 border-t border-gray-200">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-all"
          >
            {selected ? "Update" : "Schedule"}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable components
function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        {...props}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 
                   focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 
                   focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function Textarea({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        {...props}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 
                   resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
