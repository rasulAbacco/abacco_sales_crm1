import React, { useState } from "react";
import { api } from "../../api";
import { X, Mail, Lock, Server } from "lucide-react";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AddAccountModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    email: "",
    provider: "",
    smtpHost: "",
    smtpPort: 587,
    imapHost: "",
    imapPort: 993,
    smtpUser: "",
    smtpPass: "",
    smtpSecure: false,
    imapSecure: true,
  });

  const [loading, setLoading] = useState(false);

  // ==========================================================
  // 🧠 Detect settings based on provider dropdown
  // ==========================================================
  const handleProviderChange = (e) => {
    const provider = e.target.value.toLowerCase();
    let newForm = { ...form, provider };

    switch (provider) {
      case "gmail":
        newForm = {
          ...newForm,
          smtpHost: "smtp.gmail.com",
          smtpPort: 465,
          imapHost: "imap.gmail.com",
          imapPort: 993,
          smtpSecure: true,
          imapSecure: true,
        };
        break;

      case "outlook":
      case "office365":
      case "hotmail":
        newForm = {
          ...newForm,
          smtpHost: "smtp.office365.com",
          smtpPort: 587,
          imapHost: "outlook.office365.com",
          imapPort: 993,
          smtpSecure: false,
          imapSecure: true,
        };
        break;

      case "yahoo":
        newForm = {
          ...newForm,
          smtpHost: "smtp.mail.yahoo.com",
          smtpPort: 465,
          imapHost: "imap.mail.yahoo.com",
          imapPort: 993,
          smtpSecure: true,
          imapSecure: true,
        };
        break;

      case "zoho":
        newForm = {
          ...newForm,
          smtpHost: "smtp.zoho.com",
          smtpPort: 465,
          imapHost: "imap.zoho.com",
          imapPort: 993,
          smtpSecure: true,
          imapSecure: true,
        };
        break;

      case "rediff":
        newForm = {
          ...newForm,
          smtpHost: "smtp.rediffmailpro.com",
          smtpPort: 587,
          imapHost: "imap.rediffmailpro.com",
          imapPort: 993,
          smtpSecure: false,
          imapSecure: true,
        };
        break;

      case "icloud":
        newForm = {
          ...newForm,
          smtpHost: "smtp.mail.me.com",
          smtpPort: 587,
          imapHost: "imap.mail.me.com",
          imapPort: 993,
          smtpSecure: false,
          imapSecure: true,
        };
        break;

      case "aol":
        newForm = {
          ...newForm,
          smtpHost: "smtp.aol.com",
          smtpPort: 465,
          imapHost: "imap.aol.com",
          imapPort: 993,
          smtpSecure: true,
          imapSecure: true,
        };
        break;

      case "protonmail":
        newForm = {
          ...newForm,
          smtpHost: "smtp.protonmail.com",
          smtpPort: 465,
          imapHost: "imap.protonmail.com",
          imapPort: 993,
          smtpSecure: true,
          imapSecure: true,
        };
        break;

      case "yandex":
        newForm = {
          ...newForm,
          smtpHost: "smtp.yandex.com",
          smtpPort: 465,
          imapHost: "imap.yandex.com",
          imapPort: 993,
          smtpSecure: true,
          imapSecure: true,
        };
        break;

      case "amazon":
        newForm = {
          ...newForm,
          smtpHost: "email-smtp.us-east-1.amazonaws.com",
          smtpPort: 465,
          imapHost: "imap.mail.us-east-1.awsapps.com",
          imapPort: 993,
          smtpSecure: true,
          imapSecure: true,
        };
        break;

      case "custom":
      default:
        newForm = {
          ...newForm,
          smtpHost: "",
          smtpPort: 587,
          imapHost: "",
          imapPort: 993,
          smtpSecure: false,
          imapSecure: true,
        };
        break;
    }

    // auto-fill username as email if already entered
    newForm.smtpUser = form.email;
    setForm(newForm);
  };

  // ==========================================================
  // 🧩 Input Handler
  // ==========================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // ==========================================================
  // 🚀 Form Submit
  // ==========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        email: form.email,
        password: form.smtpPass,
        provider: form.provider,
        smtpHost: form.smtpHost,
        smtpPort: form.smtpPort,
        smtpSecure: form.smtpSecure,
        imapHost: form.imapHost,
        imapPort: form.imapPort,
        imapSecure: form.imapSecure,
      };

      await api.post(`${API_BASE_URL}/api/accounts`, payload);
      alert("✅ Account added successfully!");
      onAdded?.(form.email);
      onClose();
    } catch (err) {
      console.error("❌ Error adding account:", err);
      alert("❌ Failed to add account");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // 🎨 UI
  // ==========================================================
  return (
   <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Add Email Account</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Provider Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Provider
            </label>
            <select
              name="provider"
              value={form.provider}
              onChange={handleProviderChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Provider</option>
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook / Office 365</option>
              <option value="yahoo">Yahoo Mail</option>
              <option value="zoho">Zoho Mail</option>
              <option value="rediff">Rediff Mail</option>
              <option value="icloud">iCloud</option>
              <option value="aol">AOL</option>
              <option value="protonmail">ProtonMail</option>
              <option value="yandex">Yandex</option>
              <option value="amazon">Amazon WorkMail</option>
              <option value="custom">Other / Custom</option>
            </select>
          </div>

          {/* SMTP & IMAP Fields (auto-filled) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              SMTP Host
            </label>
            <input
              type="text"
              name="smtpHost"
              value={form.smtpHost}
              onChange={handleChange}
              placeholder="smtp.example.com"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              SMTP Port
            </label>
            <input
              type="number"
              name="smtpPort"
              value={form.smtpPort}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              IMAP Host
            </label>
            <input
              type="text"
              name="imapHost"
              value={form.imapHost}
              onChange={handleChange}
              placeholder="imap.example.com"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              IMAP Port
            </label>
            <input
              type="number"
              name="imapPort"
              value={form.imapPort}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg"
            />
          </div>

          {/* SMTP Username */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              SMTP Username
            </label>
            <input
              type="text"
              name="smtpUser"
              value={form.smtpUser}
              onChange={handleChange}
              placeholder="Usually same as your email"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg"
            />
          </div>

          {/* App Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              App Password
            </label>
            <input
              type="password"
              name="smtpPass"
              value={form.smtpPass}
              onChange={handleChange}
              required
              placeholder="App or SMTP password"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Use an app-specific password for Gmail, Yahoo, Outlook, etc.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "Adding..." : "Add Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
