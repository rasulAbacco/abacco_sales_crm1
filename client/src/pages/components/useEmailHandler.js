import { useState, useEffect } from "react";

export default function useEmailHandler(user) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedEmailLead, setSelectedEmailLead] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // 🧠 Store all email-related fields
  const [emailData, setEmailData] = useState({
    to: "",
    cc: "",
    subject: "",
    body: "",
    addRegards: true,
    mode: "smtp", // "gmail" or "smtp"
    fromEmail: "",
    newEmail: "",
    smtpPass: "",
    smtpHost: "",
    smtpPort: "",
    emailAccounts: [],
  });

  // =============================
  // 🔹 Fetch saved email accounts
  // =============================
  useEffect(() => {
    const fetchEmailAccounts = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/email/accounts/${user.id}`
        );
        const data = await res.json();
        if (data.success) {
          setEmailData((prev) => ({ ...prev, emailAccounts: data.accounts }));
        }
      } catch (err) {
        console.error("❌ Failed to load email accounts:", err);
      }
    };
    fetchEmailAccounts();
  }, [user?.id]);

  // =============================
  // 📬 Open / Close modal
  // =============================
  const openEmailModal = (lead) => {
    setSelectedEmailLead(lead);
    setEmailData((prev) => ({
      ...prev,
      to: lead.email || "",
      cc: lead.cc || "",
      subject: "",
      body: `\n\nRegards,\n${user?.name || "Your Name"}`,
      addRegards: true,
      mode: "smtp",
    }));
    setEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setEmailModalOpen(false);
    setSelectedEmailLead(null);
  };

  // =============================
  // ✏️ Handle input changes
  // =============================
  const handleEmailChange = (field, value) => {
    setEmailData((prev) => ({ ...prev, [field]: value }));
  };

  // =============================
  // 📤 Handle send email
  // =============================
  const handleSendEmail = async () => {
    const { to, cc, subject, body, mode, fromEmail } = emailData;

    if (mode === "sendgrid") {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/email/send`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              fromEmail,
              to,
              cc,
              subject,
              body,
            }),
          }
        );

        const data = await res.json();
        if (data.success) alert("✅ Email sent via SendGrid!");
        else alert("❌ Failed: " + data.error);
      } catch (err) {
        alert("❌ Error sending with SendGrid");
        console.error(err);
      } finally {
        closeEmailModal();
      }
      return;
    }

    // ... keep Gmail / SMTP logic for other modes
  };

  // =============================
  // 🎯 Return all handlers
  // =============================
  return {
    emailModalOpen,
    selectedEmailLead,
    emailData,
    openEmailModal,
    handleEmailChange,
    handleSendEmail,
    closeEmailModal,
  };
}
