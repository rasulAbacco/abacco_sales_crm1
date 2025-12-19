import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  Phone,
  Globe,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Save,
  Send,
  User,
  Tag,
  MessageSquare,
} from "lucide-react";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Mock ComposeForm component for demonstration
const ComposeForm = ({
  composeData,
  setComposeData,
  handleSendEmail,
  isSending,
  accounts,
}) => (
  <div className="bg-gray-50 rounded-xl p-6 space-y-4 border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Compose Email</h3>
    <select
      value={composeData.from}
      onChange={(e) => {
        const selectedAccount = accounts.find(
          (acc) => acc.email === e.target.value
        );
        setComposeData({
          ...composeData,
          from: e.target.value,
          // FIX: Ensure emailAccountId is always set correctly
          emailAccountId: selectedAccount ? selectedAccount.id : null,
        });
      }}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="">Select From</option>
      {accounts.map((acc) => (
        <option key={acc.id} value={acc.email}>
          {acc.email}
        </option>
      ))}
    </select>
    <input
      type="text"
      placeholder="To"
      value={composeData.to}
      onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
    <input
      type="text"
      placeholder="CC (optional)"
      value={composeData.cc}
      onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
    <input
      type="text"
      placeholder="Subject"
      value={composeData.subject}
      onChange={(e) =>
        setComposeData({ ...composeData, subject: e.target.value })
      }
      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
    <textarea
      placeholder="Message"
      value={composeData.body}
      onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      rows={6}
    />
    <button
      onClick={() => handleSendEmail(composeData)}
      disabled={isSending}
      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
    >
      {isSending ? "Sending..." : "Send Email"}
    </button>
  </div>
);

export default function Forwardedlead() {
  const editorRef = useRef(null);
  const forwardedEditorRef = useRef(null);
  const composeBodyRef = useRef("");
  const [leads, setLeads] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [composeRow, setComposeRow] = useState(null);
  const [composeData, setComposeData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAddAccountPopup, setShowAddAccountPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [showComposePopup, setShowComposePopup] = useState(false);
  const [forwardedContent, setForwardedContent] = useState("");
  const [newMessage, setNewMessage] = useState("");

  // Fetch forwarded leads
  useEffect(() => {
    if (!user?.id) return;
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/forwardedLeads/assigned/${user.id}`
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setLeads(json.data);
        }
      } catch (err) {
        console.error("❌ Error fetching leads:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [user?.id]);

  // Fetch email accounts
  useEffect(() => {
    if (!user?.empId) return;

    const fetchAccounts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/accounts`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
        });

        // Check if the response is ok before parsing JSON
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        // /api/accounts returns a plain array
        if (!Array.isArray(data) || data.length === 0) {
          setAccounts([]);
          setPopupMessage(
            "No email account found. Please add an email account."
          );
          setShowAddAccountPopup(true);
          return;
        }

        setAccounts(data);
        setShowAddAccountPopup(false);
      } catch (err) {
        console.error("❌ Error fetching accounts by empId:", err);
        setPopupMessage("Unable to load accounts. Please try again.");
        setShowAddAccountPopup(true);
      }
    };

    fetchAccounts();
  }, [user?.empId]);

  const toggleRowExpansion = (index) =>
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));

  // Open Compose Inline
  const handleComposeClick = (lead, index) => {
    if (composeRow === index) {
      setComposeRow(null);
      setComposeData(null);
    } else {
      setComposeRow(index);
      setComposeData({
        from: accounts[0]?.email || "",
        emailAccountId: accounts[0]?.id || null,
        to: lead.email || "",
        cc: lead.cc || "",
        subject: `Follow-up: ${lead.subject || "Regarding our discussion"}`,
        body:
          lead.response && lead.response.trim().length > 0
            ? `Hi ${lead.email || "there"},\n\nThanks for your response:\n"${
                lead.response
              }"\n\nBest regards,\n`
            : `Hi ${
                lead.email || "there"
              },\n\nHope you're doing well.\nFollowing up regarding our previous message.\n\nBest regards,\n`,
      });
    }
  };

  // ✅ FIX: Simplified and corrected handleSendEmail function
  const handleSendEmail = async (payload) => {
    // Ensure emailAccountId is present
    if (!payload.emailAccountId) {
      alert(
        "⚠️ Email account is not selected. Please select a 'From' address."
      );
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/smtp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // FIX: Send the payload directly, as it already has the correct structure
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ Email sent successfully!");
        setShowComposePopup(false);
        setComposeData(null);
        setComposeRow(null);
        setNewMessage("");
        setForwardedContent("");
      } else {
        alert("❌ Failed to send email: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Send error:", err);
      alert("⚠️ Server error while sending email.");
    } finally {
      setIsSending(false);
    }
  };

  // FORWARDEDLEAD.JSX (Around line 301)

  // ONLY ONE forwarded header added by system
  // Remove any forwarded header inside the DB body

  function indentNestedGmailStyle(text) {
    // Escape emails inside <>
    text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const lines = text.split("\n");
    let html = "";
    let inQuoted = false;

    lines.forEach((line) => {
      if (/^On .* wrote:/.test(line)) {
        if (!inQuoted) {
          html += `
        <div style="
          border-left:1px solid #bcbcbc;
          padding-left:12px;
          margin-top:12px;
        ">
        `;
        }
        inQuoted = true;
        html += `${line}<br>`;
      } else if (inQuoted) {
        html += `${line}<br>`;
      } else {
        html += `${line}<br>`;
      }
    });

    if (inQuoted) html += "</div>";

    return html;
  }

  function buildForwardBlock(text) {
    text = text.replace(/\r\n/g, "\n");

    const headerRegex = /(From:.*\nDate:.*\nSubject:.*\nTo:.*(?:\n)?)/i;
    const match = text.match(headerRegex);

    const header = match ? match[1].trim() : "";
    const body = text.replace(match ? match[1] : "", "").trim();

    const safeHeader = header
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

    const safeBody = indentNestedGmailStyle(body);

    return `
    <div style="
      border-left:1px solid #dadce0;
      padding-left:12px;
      margin-top:12px;
      font-family:Calibri,Arial,sans-serif;
      font-size:11pt;
      line-height:1.6;
    ">
      ---------- Forwarded message ----------<br><br>
      ${safeHeader}<br><br>
      ${safeBody}
    </div>
  `;
  }

  // FORWARDEDLEAD.JSX (Around line 341)

  // FORWARDEDLEAD.JSX (Around line 341)

  const handleOpenComposePopup = (lead) => {
    // 1. CLEAN DB BODY: remove any existing forwarded headers
    let raw = lead.body || ""; // STEP 1: Remove ALL forwarded-message headers coming from DB
    raw = raw
      // remove: ---------- Forwarded message ----------
      .replace(/-{2,}\s*Forwarded message\s*-{2,}/gi, "")
      // remove: Forwarded message --------
      .replace(/Forwarded message\s*-{2,}/gi, "")
      // remove: any line starting with "Forwarded message"
      .replace(/^Forwarded message.*$/gim, "")
      // cleanup spacing
      .trim();

    // 2. STRUCTURE THE FORWARDED BODY LIKE GMAIL
    const structured = buildForwardBlock(raw);

    // 3. SET COMPOSE POPUP VALUES (Functionality is unchanged)
    const ccList =
      lead.cc && typeof lead.cc === "string"
        ? lead.cc
            .split(",")
            .map((c) => c.trim())
            .filter((c) => c !== "")
        : [];

    setComposeData({
      from: accounts[0]?.email || "",
      emailAccountId: accounts[0]?.id || null,
      to: lead.client || "",
      cc: "", // keep single cc for inline, ignore
      ccList: ccList, // <-- important
      subject: `Fwd: ${lead.subject || "No Subject"}`,
      body: "",
      attachments: [],
    });

    // 4. FIX: Store ONLY the structured forwarded content.
    // The primary editor (editorRef) will be initialized with an empty div,
    // and this content will be used to initialize the *second* editable div (forwardedEditorRef).
    setForwardedContent(structured);

    // 5. Open the modal (Functionality is unchanged)
    setShowComposePopup(true);
  };

  function preserveLineBreaks(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r\n/g, "\n")
      .replace(/\n/g, "<br>");
  }

  // FORWARDEDLEAD.JSX (Around line 400)

  const buildFinalEmailBody = () => {
    // 1. Get the HTML from the new message editor
    const userHtml = editorRef.current?.innerHTML || "";

    // 2. Get the HTML from the editable forwarded content block
    const forwardedHtml = forwardedEditorRef.current?.innerHTML || "";

    // 3. Combine them with a line break or separator
    return `
    <div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111;line-height:1.6;">
      ${userHtml}
      <br><br>
      ${forwardedHtml}
    </div>
  `;
  };
  const convertPlainTextToHtml = (text) => {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  };

  // ✅ MODIFIED: Auto-refresh after saving with lightning speed
  const handleUpdateResult = async (index) => {
    const lead = leads[index];

    try {
      // Update result
      await fetch(`${API_BASE_URL}/api/forwardedLeads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: lead.result }),
      });

      // Save metadata
      await fetch(`${API_BASE_URL}/api/lead-email-meta/${lead.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: lead.email,
          cc: lead.cc, // 👈 TAKES CC DIRECTLY FROM LeadDetails
          country: lead.country, // 👈 TAKES COUNTRY DIRECTLY FROM LeadDetails
        }),
      });

      // Show success message briefly
      setSuccessMessage("Saved successfully!");
      setShowSuccessMessage(true);
      
      // Auto-refresh leads after 500ms (lightning speed)
      setTimeout(() => {
        // Re-fetch leads to get updated data
        if (user?.id) {
          const fetchLeads = async () => {
            try {
              const res = await fetch(
                `${API_BASE_URL}/api/forwardedLeads/assigned/${user.id}`
              );
              const json = await res.json();
              if (json.success && Array.isArray(json.data)) {
                setLeads(json.data);
              }
            } catch (err) {
              console.error("❌ Error refreshing leads:", err);
            }
          };
          fetchLeads();
        }
        
        // Hide success message
        setShowSuccessMessage(false);
      }, 500); // 500ms delay for lightning speed refresh
    } catch (e) {
      console.error(e);
      alert("Error saving lead: " + e.message);
    }
  };

  const handleResultChange = (index, value) => {
    setLeads((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], result: value };
      return updated;
    });
  };

  const getLeadTypeColor = (type) => {
    switch (type) {
      case "Association Lead":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Attendees Lead":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Industry Lead":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Forwarded Leads
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage and respond to your assigned leads
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
                <div className="text-2xl font-bold">{leads.length}</div>
                <div className="text-sm opacity-90">Active Leads</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading leads...</p>
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No forwarded leads
            </h3>
            <p className="text-gray-500">
              You don't have any assigned leads at the moment
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {leads.map((lead, index) => (
              <div
                key={lead.id || index}
                className="group relative backdrop-blur-xl bg-white/60 border border-white/40
                 rounded-2xl shadow-sm hover:shadow-2xl hover:scale-[1.02]
                 transition-all duration-500 ease-out overflow-hidden transform"
              >
                {/* Subtle gradient overlay on hover */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-white/20 via-blue-50/10 to-purple-50/20 
                      group-hover:from-white/40 group-hover:via-blue-100/20 group-hover:to-purple-100/40 
                      transition-all duration-700 pointer-events-none"
                />

                {/* Glow border on hover */}
                <div className="absolute inset-0 rounded-2xl border border-white/20 group-hover:border-blue-200/50 transition-all duration-700 pointer-events-none" />

                {/* Card Content */}
                <div className="relative p-6 sm:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left Section — Lead Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500/90 to-indigo-500/90 text-white rounded-4xl flex items-center justify-center text-lg font-semibold shadow-md">
                        {(lead.email?.[0] || "U").toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <a
                            href={`mailto:${lead.client}`}
                            className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate"
                          >
                            {lead.client}
                          </a>
                        </div>

                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Phone className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                          <Globe className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <span>{lead.country || "Not specified"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section — Lead Meta */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-800 font-medium bg-white/40 border border-white/30 px-3 py-2 rounded-lg shadow-sm backdrop-blur-md">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>
                          {new Date(lead.date).toLocaleDateString("en-IN")}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border backdrop-blur-md bg-white/40 border-white/30 shadow-sm ${getLeadTypeColor(
                          lead.leadType
                        )}`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {lead.leadType || "N/A"}
                      </span>
                    </div>

                    {/* Right Section — Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Country"
                        value={
                          lead.country || lead.leadEmailMeta?.country || ""
                        }
                        onChange={(e) =>
                          setLeads((prev) => {
                            const updated = [...prev];
                            updated[index] = {
                              ...updated[index],
                              country: e.target.value,
                            };
                            return updated;
                          })
                        }
                        className="border border-purple-400/70 bg-white/50 backdrop-blur-md rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-purple-400 focus:border-purple-500 transition-colors w-28"
                      />

                      <select
                        value={lead.result || ""}
                        onChange={(e) =>
                          handleResultChange(index, e.target.value)
                        }
                        className="border border-blue-400/70 bg-white/50 backdrop-blur-md rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-colors"
                      >
                        <option value="">Status</option>
                        <option value="pending">Pending</option>
                        <option value="closed">Closed</option>
                      </select>

                      <button
                        onClick={() => handleUpdateResult(index)}
                        className="px-4 py-2 bg-green-500/80 backdrop-blur-md text-white font-semibold rounded-lg text-sm hover:bg-green-600/90 transition-colors flex items-center gap-2 shadow-sm"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>

                      <button
                        onClick={() => handleOpenComposePopup(lead)}
                        className="px-4 py-2 bg-blue-600/80 backdrop-blur-md text-white rounded-lg text-sm font-medium hover:bg-blue-700/90 transition-colors flex items-center gap-2 shadow-sm"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </button>

                      <button
                        onClick={() => toggleRowExpansion(index)}
                        className="px-4 py-2 bg-purple-600/80 backdrop-blur-md text-white rounded-lg text-sm font-medium hover:bg-purple-700/90 transition-colors flex items-center gap-2 shadow-sm"
                      >
                        {expandedRows[index] ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            More
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Compose Form */}
                {composeRow === index && (
                  <div className="px-6 sm:px-8 pb-6 bg-white/50 backdrop-blur-md border-t border-white/30">
                    <ComposeForm
                      composeData={composeData}
                      setComposeData={setComposeData}
                      handleSendEmail={handleSendEmail}
                      isSending={isSending}
                      accounts={accounts}
                    />
                  </div>
                )}

                {/* Expanded Details */}
                {expandedRows[index] && (
                  <div className="border-t border-white/30 bg-white/50 backdrop-blur-md p-6 sm:p-8 space-y-4">
                    {lead.subject && (
                      <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                          <h4 className="text-sm font-semibold text-gray-900">
                            Subject
                          </h4>
                        </div>
                        <p className="text-sm text-gray-700 ml-7">
                          {lead.subject}
                        </p>
                      </div>
                    )}

                    {lead.cc && (
                      <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-5 h-5 text-indigo-600" />
                          <h4 className="text-sm font-semibold text-gray-900">
                            CC Recipients
                          </h4>
                        </div>
                        <p className="text-sm text-gray-700 ml-7 break-all">
                          {lead.cc}
                        </p>
                      </div>
                    )}

                    {lead.body && (
                      <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40">
                        <div className="flex items-center gap-2 mb-3">
                          <Mail className="w-5 h-5 text-purple-600" />
                          <h4 className="text-sm font-semibold text-gray-900">
                            Message Content
                          </h4>
                        </div>

                        <div
                          className="text-sm text-gray-700 ml-7 border-l-2 border-gray-300 pl-4 whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html: lead.body || "",
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Compose Popup Modal */}
      {showComposePopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Compose Email</h2>
                <p className="text-sm text-blue-100 mt-1">
                  Reply to forwarded lead
                </p>
              </div>
              <button
                onClick={() => setShowComposePopup(false)}
                className="bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {/* FROM */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From
                  </label>
                  <select
                    value={composeData.from}
                    onChange={(e) => {
                      const selectedAccount = accounts.find(
                        (acc) => acc.email === e.target.value
                      );
                      setComposeData({
                        ...composeData,
                        from: e.target.value,
                        // FIX: Ensure emailAccountId is always set correctly
                        emailAccountId: selectedAccount
                          ? selectedAccount.id
                          : null,
                      });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select From</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.email}>
                        {acc.email}
                      </option>
                    ))}
                  </select>
                </div>
                {/* TO */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    To
                  </label>
                  <input
                    type="email"
                    placeholder="Recipient email"
                    value={composeData.to}
                    onChange={(e) =>
                      setComposeData({ ...composeData, to: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {/* CC Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    CC
                  </label>
                  {(composeData.ccList && composeData.ccList.length > 0
                    ? composeData.ccList
                    : composeData.cc
                    ? [composeData.cc]
                    : [""]
                  ).map((cc, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="email"
                        placeholder={`CC email ${idx + 1}`}
                        value={cc}
                        onChange={(e) => {
                          const newList = [
                            ...(composeData.ccList ||
                              (composeData.cc ? [composeData.cc] : [""])),
                          ];
                          newList[idx] = e.target.value;
                          setComposeData({ ...composeData, ccList: newList });
                        }}
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newList = (
                            composeData.ccList ||
                            (composeData.cc ? [composeData.cc] : [""])
                          ).filter((_, i) => i !== idx);
                          setComposeData({ ...composeData, ccList: newList });
                        }}
                        className="bg-red-100 text-red-600 rounded-lg px-3 py-3 text-sm hover:bg-red-200 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() =>
                      setComposeData({
                        ...composeData,
                        ccList: [
                          ...(composeData.ccList ||
                            (composeData.cc ? [composeData.cc] : [])),
                          "",
                        ],
                      })
                    }
                    className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add CC
                  </button>
                </div>
                {/* SUBJECT */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Subject"
                    value={composeData.subject}
                    onChange={(e) =>
                      setComposeData({
                        ...composeData,
                        subject: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {/* Message Editor */}
                {/* Message Editor */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    New Message Body
                  </label>
                  {/* ✏️ Editable area for new reply (Primary Editor) */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning={true}
                    className="border border-gray-300 rounded-lg px-4 py-4 bg-white text-sm text-gray-800 min-h-[150px] whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto"
                    // FIX: Initialize with only the empty placeholder
                    dangerouslySetInnerHTML={{
                      __html: `<div class="user-message" style="min-height:100px;font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1f1f1f;line-height:1.6;"></div>`,
                    }}
                  />

                  {/* 📩 Forwarded Content - Now Editable */}
                  {forwardedContent && (
                    <div className="mt-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Forwarded Message (Editable)
                      </label>
                      <div
                        // ✅ FIX 1: Attach the new ref
                        ref={forwardedEditorRef}
                        // ✅ FIX 2: Make it editable
                        contentEditable
                        suppressContentEditableWarning={true}
                        className="border border-gray-300 rounded-lg px-4 py-4 bg-gray-50 text-sm text-gray-800 shadow-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto"
                        style={{
                          fontFamily: "Calibri, Arial, sans-serif",
                          fontSize: "11pt",
                          color: "#1f1f1f",
                          lineHeight: "1.6",
                        }}
                        // ✅ FIX 3: Initialize with the forwarded content
                        dangerouslySetInnerHTML={{ __html: forwardedContent }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => setShowComposePopup(false)}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                // ✅ FIX: Correctly prepare the payload before sending
                onClick={() => {
                  const ccString = (
                    composeData.ccList || [composeData.cc || ""]
                  )
                    .filter((c) => c.trim() !== "")
                    .join(", ");

                  const finalPayload = {
                    ...composeData,
                    cc: ccString,
                    body: buildFinalEmailBody(), // Correctly combines new message and formatted forwarded content
                    // ✅ CRITICAL FIX: Explicitly include 'attachments' array (even if empty)
                    attachments: composeData.attachments || [],
                  };

                  handleSendEmail(finalPayload);
                }}
                disabled={isSending}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}








// import React, { useState, useEffect, useRef } from "react";
// import {
//   Mail,
//   Phone,
//   Globe,
//   Calendar,
//   ChevronDown,
//   ChevronUp,
//   Plus,
//   X,
//   Save,
//   Send,
//   User,
//   Tag,
//   MessageSquare,
// } from "lucide-react";
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// // Mock ComposeForm component for demonstration
// const ComposeForm = ({
//   composeData,
//   setComposeData,
//   handleSendEmail,
//   isSending,
//   accounts,
// }) => (
//   <div className="bg-gray-50 rounded-xl p-6 space-y-4 border border-gray-200">
//     <h3 className="text-lg font-semibold text-gray-800 mb-4">Compose Email</h3>
//     <select
//       value={composeData.from}
//       onChange={(e) => {
//         const selectedAccount = accounts.find(
//           (acc) => acc.email === e.target.value
//         );
//         setComposeData({
//           ...composeData,
//           from: e.target.value,
//           // FIX: Ensure emailAccountId is always set correctly
//           emailAccountId: selectedAccount ? selectedAccount.id : null,
//         });
//       }}
//       className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//     >
//       <option value="">Select From</option>
//       {accounts.map((acc) => (
//         <option key={acc.id} value={acc.email}>
//           {acc.email}
//         </option>
//       ))}
//     </select>
//     <input
//       type="text"
//       placeholder="To"
//       value={composeData.to}
//       onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
//       className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//     />
//     <input
//       type="text"
//       placeholder="CC (optional)"
//       value={composeData.cc}
//       onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
//       className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//     />
//     <input
//       type="text"
//       placeholder="Subject"
//       value={composeData.subject}
//       onChange={(e) =>
//         setComposeData({ ...composeData, subject: e.target.value })
//       }
//       className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//     />
//     <textarea
//       placeholder="Message"
//       value={composeData.body}
//       onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
//       className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//       rows={6}
//     />
//     <button
//       onClick={() => handleSendEmail(composeData)}
//       disabled={isSending}
//       className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
//     >
//       {isSending ? "Sending..." : "Send Email"}
//     </button>
//   </div>
// );

// export default function Forwardedlead() {
//   const editorRef = useRef(null);
//   const forwardedEditorRef = useRef(null);
//   const composeBodyRef = useRef("");
//   const [leads, setLeads] = useState([]);
//   const [expandedRows, setExpandedRows] = useState({});
//   const [composeRow, setComposeRow] = useState(null);
//   const [composeData, setComposeData] = useState(null);
//   const [accounts, setAccounts] = useState([]);
//   const [isSending, setIsSending] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [showAddAccountPopup, setShowAddAccountPopup] = useState(false);
//   const [popupMessage, setPopupMessage] = useState("");

//   const user = JSON.parse(localStorage.getItem("user") || "{}");
//   const [showComposePopup, setShowComposePopup] = useState(false);
//   const [forwardedContent, setForwardedContent] = useState("");
//   const [newMessage, setNewMessage] = useState("");

//   // Fetch forwarded leads
//   useEffect(() => {
//     if (!user?.id) return;
//     const fetchLeads = async () => {
//       setLoading(true);
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/api/forwardedLeads/assigned/${user.id}`
//         );
//         const json = await res.json();
//         if (json.success && Array.isArray(json.data)) {
//           setLeads(json.data);
//         }
//       } catch (err) {
//         console.error("❌ Error fetching leads:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchLeads();
//   }, [user?.id]);

//   // Fetch email accounts
//   useEffect(() => {
//     if (!user?.empId) return;

//     const fetchAccounts = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/api/accounts`, {
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${localStorage.getItem("token")}`,
//           },
//           credentials: "include",
//         });

//         // Check if the response is ok before parsing JSON
//         if (!res.ok) {
//           throw new Error(`HTTP error! status: ${res.status}`);
//         }

//         const data = await res.json();

//         // /api/accounts returns a plain array
//         if (!Array.isArray(data) || data.length === 0) {
//           setAccounts([]);
//           setPopupMessage(
//             "No email account found. Please add an email account."
//           );
//           setShowAddAccountPopup(true);
//           return;
//         }

//         setAccounts(data);
//         setShowAddAccountPopup(false);
//       } catch (err) {
//         console.error("❌ Error fetching accounts by empId:", err);
//         setPopupMessage("Unable to load accounts. Please try again.");
//         setShowAddAccountPopup(true);
//       }
//     };

//     fetchAccounts();
//   }, [user?.empId]);

//   const toggleRowExpansion = (index) =>
//     setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));

//   // Open Compose Inline
//   const handleComposeClick = (lead, index) => {
//     if (composeRow === index) {
//       setComposeRow(null);
//       setComposeData(null);
//     } else {
//       setComposeRow(index);
//       setComposeData({
//         from: accounts[0]?.email || "",
//         emailAccountId: accounts[0]?.id || null,
//         to: lead.email || "",
//         cc: lead.cc || "",
//         subject: `Follow-up: ${lead.subject || "Regarding our discussion"}`,
//         body:
//           lead.response && lead.response.trim().length > 0
//             ? `Hi ${lead.email || "there"},\n\nThanks for your response:\n"${
//                 lead.response
//               }"\n\nBest regards,\n`
//             : `Hi ${
//                 lead.email || "there"
//               },\n\nHope you're doing well.\nFollowing up regarding our previous message.\n\nBest regards,\n`,
//       });
//     }
//   };

//   // ✅ FIX: Simplified and corrected handleSendEmail function
//   const handleSendEmail = async (payload) => {
//     // Ensure emailAccountId is present
//     if (!payload.emailAccountId) {
//       alert(
//         "⚠️ Email account is not selected. Please select a 'From' address."
//       );
//       return;
//     }

//     setIsSending(true);
//     try {
//       const res = await fetch(`${API_BASE_URL}/api/smtp/send`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         // FIX: Send the payload directly, as it already has the correct structure
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();

//       if (data.success) {
//         alert("✅ Email sent successfully!");
//         setShowComposePopup(false);
//         setComposeData(null);
//         setComposeRow(null);
//         setNewMessage("");
//         setForwardedContent("");
//       } else {
//         alert("❌ Failed to send email: " + (data.message || "Unknown error"));
//       }
//     } catch (err) {
//       console.error("Send error:", err);
//       alert("⚠️ Server error while sending email.");
//     } finally {
//       setIsSending(false);
//     }
//   };

//   // const handleOpenComposePopup = (lead) => {
//   //   setComposeData({
//   //     from: accounts[0]?.email || "",
//   //     emailAccountId: accounts[0]?.id || null,
//   //     to: lead.client || "",
//   //     cc: lead.cc || "",
//   //     subject: `Fwd: ${lead.subject || "No Subject"}`,
//   //     body: "", // user typed message
//   //     attachments: [],
//   //   });

//   //   // Store EXACT DB raw text—NO HTML formatting!
//   //   setForwardedContent(lead.body || "");

//   //   setShowComposePopup(true);
//   // };
//   // FORWARDEDLEAD.JSX (Around line 301)

//   // ONLY ONE forwarded header added by system
//   // Remove any forwarded header inside the DB body

//   function indentNestedGmailStyle(text) {
//     // Escape emails inside <>
//     text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

//     const lines = text.split("\n");
//     let html = "";
//     let inQuoted = false;

//     lines.forEach((line) => {
//       if (/^On .* wrote:/.test(line)) {
//         if (!inQuoted) {
//           html += `
//         <div style="
//           border-left:1px solid #bcbcbc;
//           padding-left:12px;
//           margin-top:12px;
//         ">
//         `;
//         }
//         inQuoted = true;
//         html += `${line}<br>`;
//       } else if (inQuoted) {
//         html += `${line}<br>`;
//       } else {
//         html += `${line}<br>`;
//       }
//     });

//     if (inQuoted) html += "</div>";

//     return html;
//   }

//   function buildForwardBlock(text) {
//     text = text.replace(/\r\n/g, "\n");

//     const headerRegex = /(From:.*\nDate:.*\nSubject:.*\nTo:.*(?:\n)?)/i;
//     const match = text.match(headerRegex);

//     const header = match ? match[1].trim() : "";
//     const body = text.replace(match ? match[1] : "", "").trim();

//     const safeHeader = header
//       .replace(/&/g, "&amp;")
//       .replace(/</g, "&lt;")
//       .replace(/>/g, "&gt;")
//       .replace(/\n/g, "<br>");

//     const safeBody = indentNestedGmailStyle(body);

//     return `
//     <div style="
//       border-left:1px solid #dadce0;
//       padding-left:12px;
//       margin-top:12px;
//       font-family:Calibri,Arial,sans-serif;
//       font-size:11pt;
//       line-height:1.6;
//     ">
//       ---------- Forwarded message ----------<br><br>
//       ${safeHeader}<br><br>
//       ${safeBody}
//     </div>
//   `;
//   }

//   // FORWARDEDLEAD.JSX (Around line 341)

//   // FORWARDEDLEAD.JSX (Around line 341)

//   const handleOpenComposePopup = (lead) => {
//     // 1. CLEAN DB BODY: remove any existing forwarded headers
//     let raw = lead.body || ""; // STEP 1: Remove ALL forwarded-message headers coming from DB
//     raw = raw
//       // remove: ---------- Forwarded message ----------
//       .replace(/-{2,}\s*Forwarded message\s*-{2,}/gi, "")
//       // remove: Forwarded message --------
//       .replace(/Forwarded message\s*-{2,}/gi, "")
//       // remove: any line starting with "Forwarded message"
//       .replace(/^Forwarded message.*$/gim, "")
//       // cleanup spacing
//       .trim();

//     // 2. STRUCTURE THE FORWARDED BODY LIKE GMAIL
//     const structured = buildForwardBlock(raw);

//     // 3. SET COMPOSE POPUP VALUES (Functionality is unchanged)
//     const ccList =
//       lead.cc && typeof lead.cc === "string"
//         ? lead.cc
//             .split(",")
//             .map((c) => c.trim())
//             .filter((c) => c !== "")
//         : [];

//     setComposeData({
//       from: accounts[0]?.email || "",
//       emailAccountId: accounts[0]?.id || null,
//       to: lead.client || "",
//       cc: "", // keep single cc for inline, ignore
//       ccList: ccList, // <-- important
//       subject: `Fwd: ${lead.subject || "No Subject"}`,
//       body: "",
//       attachments: [],
//     });

//     // 4. FIX: Store ONLY the structured forwarded content.
//     // The primary editor (editorRef) will be initialized with an empty div,
//     // and this content will be used to initialize the *second* editable div (forwardedEditorRef).
//     setForwardedContent(structured);

//     // 5. Open the modal (Functionality is unchanged)
//     setShowComposePopup(true);
//   };

//   function preserveLineBreaks(text) {
//     return text
//       .replace(/&/g, "&amp;")
//       .replace(/</g, "&lt;")
//       .replace(/>/g, "&gt;")
//       .replace(/\r\n/g, "\n")
//       .replace(/\n/g, "<br>");
//   }

//   // FORWARDEDLEAD.JSX (Around line 400)

//   const buildFinalEmailBody = () => {
//     // 1. Get the HTML from the new message editor
//     const userHtml = editorRef.current?.innerHTML || "";

//     // 2. Get the HTML from the editable forwarded content block
//     const forwardedHtml = forwardedEditorRef.current?.innerHTML || "";

//     // 3. Combine them with a line break or separator
//     return `
//     <div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111;line-height:1.6;">
//       ${userHtml}
//       <br><br>
//       ${forwardedHtml}
//     </div>
//   `;
//   };
//   const convertPlainTextToHtml = (text) => {
//     if (!text) return "";
//     return text
//       .replace(/&/g, "&amp;")
//       .replace(/</g, "&lt;")
//       .replace(/>/g, "&gt;")
//       .replace(/\n/g, "<br>");
//   };

//   const handleUpdateResult = async (index) => {
//     const lead = leads[index];

//     try {
//       // Update result
//       await fetch(`${API_BASE_URL}/api/forwardedLeads/${lead.id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ result: lead.result }),
//       });

//       // Save metadata
//       await fetch(`${API_BASE_URL}/api/lead-email-meta/${lead.id}`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           email: lead.email,
//           cc: lead.cc, // 👈 TAKES CC DIRECTLY FROM LeadDetails
//           country: lead.country, // 👈 TAKES COUNTRY DIRECTLY FROM LeadDetails
//         }),
//       });

//       alert("Saved!");
//     } catch (e) {
//       console.error(e);
//     }
//   };

//   const handleResultChange = (index, value) => {
//     setLeads((prev) => {
//       const updated = [...prev];
//       updated[index] = { ...updated[index], result: value };
//       return updated;
//     });
//   };

//   const getLeadTypeColor = (type) => {
//     switch (type) {
//       case "Association Lead":
//         return "bg-blue-50 text-blue-700 border-blue-200";
//       case "Attendees Lead":
//         return "bg-emerald-50 text-emerald-700 border-emerald-200";
//       case "Industry Lead":
//         return "bg-purple-50 text-purple-700 border-purple-200";
//       default:
//         return "bg-gray-50 text-gray-700 border-gray-200";
//     }
//   };

//   return (
//     <div className="min-h-screen bg-white">
//       {/* Modern Header */}
//       <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
//           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900">
//                 Forwarded Leads
//               </h1>
//               <p className="text-sm text-gray-500 mt-1">
//                 Manage and respond to your assigned leads
//               </p>
//             </div>
//             <div className="flex items-center gap-3">
//               <div className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
//                 <div className="text-2xl font-bold">{leads.length}</div>
//                 <div className="text-sm opacity-90">Active Leads</div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {loading ? (
//           <div className="flex items-center justify-center py-20">
//             <div className="text-center">
//               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
//               <p className="text-gray-500">Loading leads...</p>
//             </div>
//           </div>
//         ) : leads.length === 0 ? (
//           <div className="text-center py-20">
//             <div className="text-6xl mb-4">📭</div>
//             <h3 className="text-xl font-semibold text-gray-900 mb-2">
//               No forwarded leads
//             </h3>
//             <p className="text-gray-500">
//               You don't have any assigned leads at the moment
//             </p>
//           </div>
//         ) : (
//           <div className="space-y-6">
//             {leads.map((lead, index) => (
//               <div
//                 key={lead.id || index}
//                 className="group relative backdrop-blur-xl bg-white/60 border border-white/40
//                  rounded-2xl shadow-sm hover:shadow-2xl hover:scale-[1.02]
//                  transition-all duration-500 ease-out overflow-hidden transform"
//               >
//                 {/* Subtle gradient overlay on hover */}
//                 <div
//                   className="absolute inset-0 bg-gradient-to-br from-white/20 via-blue-50/10 to-purple-50/20 
//                       group-hover:from-white/40 group-hover:via-blue-100/20 group-hover:to-purple-100/40 
//                       transition-all duration-700 pointer-events-none"
//                 />

//                 {/* Glow border on hover */}
//                 <div className="absolute inset-0 rounded-2xl border border-white/20 group-hover:border-blue-200/50 transition-all duration-700 pointer-events-none" />

//                 {/* Card Content */}
//                 <div className="relative p-6 sm:p-8">
//                   <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
//                     {/* Left Section — Lead Info */}
//                     <div className="flex items-start gap-4 flex-1 min-w-0">
//                       <div className="w-14 h-14 bg-gradient-to-br from-blue-500/90 to-indigo-500/90 text-white rounded-4xl flex items-center justify-center text-lg font-semibold shadow-md">
//                         {(lead.email?.[0] || "U").toUpperCase()}
//                       </div>

//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-center gap-2 mb-2">
//                           <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
//                           <a
//                             href={`mailto:${lead.client}`}
//                             className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate"
//                           >
//                             {lead.client}
//                           </a>
//                         </div>

//                         {lead.phone && (
//                           <div className="flex items-center gap-2 text-sm text-gray-700">
//                             <Phone className="w-4 h-4 text-blue-500 flex-shrink-0" />
//                             <span>{lead.phone}</span>
//                           </div>
//                         )}

//                         <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
//                           <Globe className="w-4 h-4 text-indigo-500 flex-shrink-0" />
//                           <span>{lead.country || "Not specified"}</span>
//                         </div>
//                       </div>
//                     </div>

//                     {/* Middle Section — Lead Meta */}
//                     <div className="flex flex-wrap items-center gap-3">
//                       <div className="flex items-center gap-2 text-sm text-gray-800 font-medium bg-white/40 border border-white/30 px-3 py-2 rounded-lg shadow-sm backdrop-blur-md">
//                         <Calendar className="w-4 h-4 text-blue-500" />
//                         <span>
//                           {new Date(lead.date).toLocaleDateString("en-IN")}
//                         </span>
//                       </div>

//                       <span
//                         className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border backdrop-blur-md bg-white/40 border-white/30 shadow-sm ${getLeadTypeColor(
//                           lead.leadType
//                         )}`}
//                       >
//                         <Tag className="w-3.5 h-3.5" />
//                         {lead.leadType || "N/A"}
//                       </span>
//                     </div>

//                     {/* Right Section — Actions */}
//                     <div className="flex flex-wrap items-center gap-2">
//                       <input
//                         type="text"
//                         placeholder="Country"
//                         value={
//                           lead.country || lead.leadEmailMeta?.country || ""
//                         }
//                         onChange={(e) =>
//                           setLeads((prev) => {
//                             const updated = [...prev];
//                             updated[index] = {
//                               ...updated[index],
//                               country: e.target.value,
//                             };
//                             return updated;
//                           })
//                         }
//                         className="border border-purple-400/70 bg-white/50 backdrop-blur-md rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-purple-400 focus:border-purple-500 transition-colors w-28"
//                       />

//                       <select
//                         value={lead.result || ""}
//                         onChange={(e) =>
//                           handleResultChange(index, e.target.value)
//                         }
//                         className="border border-blue-400/70 bg-white/50 backdrop-blur-md rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-colors"
//                       >
//                         <option value="">Status</option>
//                         <option value="pending">Pending</option>
//                         <option value="closed">Closed</option>
//                       </select>

//                       <button
//                         onClick={() => handleUpdateResult(index)}
//                         className="px-4 py-2 bg-green-500/80 backdrop-blur-md text-white font-semibold rounded-lg text-sm hover:bg-green-600/90 transition-colors flex items-center gap-2 shadow-sm"
//                       >
//                         <Save className="w-4 h-4" />
//                         Save
//                       </button>

//                       <button
//                         onClick={() => handleOpenComposePopup(lead)}
//                         className="px-4 py-2 bg-blue-600/80 backdrop-blur-md text-white rounded-lg text-sm font-medium hover:bg-blue-700/90 transition-colors flex items-center gap-2 shadow-sm"
//                       >
//                         <Send className="w-4 h-4" />
//                         Send
//                       </button>

//                       <button
//                         onClick={() => toggleRowExpansion(index)}
//                         className="px-4 py-2 bg-purple-600/80 backdrop-blur-md text-white rounded-lg text-sm font-medium hover:bg-purple-700/90 transition-colors flex items-center gap-2 shadow-sm"
//                       >
//                         {expandedRows[index] ? (
//                           <>
//                             <ChevronUp className="w-4 h-4" />
//                             Less
//                           </>
//                         ) : (
//                           <>
//                             <ChevronDown className="w-4 h-4" />
//                             More
//                           </>
//                         )}
//                       </button>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Inline Compose Form */}
//                 {composeRow === index && (
//                   <div className="px-6 sm:px-8 pb-6 bg-white/50 backdrop-blur-md border-t border-white/30">
//                     <ComposeForm
//                       composeData={composeData}
//                       setComposeData={setComposeData}
//                       handleSendEmail={handleSendEmail}
//                       isSending={isSending}
//                       accounts={accounts}
//                     />
//                   </div>
//                 )}

//                 {/* Expanded Details */}
//                 {expandedRows[index] && (
//                   <div className="border-t border-white/30 bg-white/50 backdrop-blur-md p-6 sm:p-8 space-y-4">
//                     {lead.subject && (
//                       <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40">
//                         <div className="flex items-center gap-2 mb-2">
//                           <MessageSquare className="w-5 h-5 text-blue-600" />
//                           <h4 className="text-sm font-semibold text-gray-900">
//                             Subject
//                           </h4>
//                         </div>
//                         <p className="text-sm text-gray-700 ml-7">
//                           {lead.subject}
//                         </p>
//                       </div>
//                     )}

//                     {lead.cc && (
//                       <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40">
//                         <div className="flex items-center gap-2 mb-2">
//                           <Mail className="w-5 h-5 text-indigo-600" />
//                           <h4 className="text-sm font-semibold text-gray-900">
//                             CC Recipients
//                           </h4>
//                         </div>
//                         <p className="text-sm text-gray-700 ml-7 break-all">
//                           {lead.cc}
//                         </p>
//                       </div>
//                     )}

//                     {lead.body && (
//                       <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/40">
//                         <div className="flex items-center gap-2 mb-3">
//                           <Mail className="w-5 h-5 text-purple-600" />
//                           <h4 className="text-sm font-semibold text-gray-900">
//                             Message Content
//                           </h4>
//                         </div>

//                         <div
//                           className="text-sm text-gray-700 ml-7 border-l-2 border-gray-300 pl-4 whitespace-pre-wrap"
//                           dangerouslySetInnerHTML={{
//                             __html: lead.body || "",
//                           }}
//                         />
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Compose Popup Modal */}
//       {showComposePopup && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
//             {/* Modal Header */}
//             <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center">
//               <div>
//                 <h2 className="text-xl font-bold">Compose Email</h2>
//                 <p className="text-sm text-blue-100 mt-1">
//                   Reply to forwarded lead
//                 </p>
//               </div>
//               <button
//                 onClick={() => setShowComposePopup(false)}
//                 className="bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
//               >
//                 <X className="w-5 h-5" />
//               </button>
//             </div>

//             {/* Modal Body */}
//             <div className="p-6 overflow-y-auto flex-1">
//               <div className="space-y-4">
//                 {/* FROM */}
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">
//                     From
//                   </label>
//                   <select
//                     value={composeData.from}
//                     onChange={(e) => {
//                       const selectedAccount = accounts.find(
//                         (acc) => acc.email === e.target.value
//                       );
//                       setComposeData({
//                         ...composeData,
//                         from: e.target.value,
//                         // FIX: Ensure emailAccountId is always set correctly
//                         emailAccountId: selectedAccount
//                           ? selectedAccount.id
//                           : null,
//                       });
//                     }}
//                     className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                   >
//                     <option value="">Select From</option>
//                     {accounts.map((acc) => (
//                       <option key={acc.id} value={acc.email}>
//                         {acc.email}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 {/* TO */}
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">
//                     To
//                   </label>
//                   <input
//                     type="email"
//                     placeholder="Recipient email"
//                     value={composeData.to}
//                     onChange={(e) =>
//                       setComposeData({ ...composeData, to: e.target.value })
//                     }
//                     className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                   />
//                 </div>
//                 {/* CC Section */}
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">
//                     CC
//                   </label>
//                   {(composeData.ccList && composeData.ccList.length > 0
//                     ? composeData.ccList
//                     : composeData.cc
//                     ? [composeData.cc]
//                     : [""]
//                   ).map((cc, idx) => (
//                     <div key={idx} className="flex items-center gap-2 mb-2">
//                       <input
//                         type="email"
//                         placeholder={`CC email ${idx + 1}`}
//                         value={cc}
//                         onChange={(e) => {
//                           const newList = [
//                             ...(composeData.ccList ||
//                               (composeData.cc ? [composeData.cc] : [""])),
//                           ];
//                           newList[idx] = e.target.value;
//                           setComposeData({ ...composeData, ccList: newList });
//                         }}
//                         className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                       />
//                       <button
//                         onClick={() => {
//                           const newList = (
//                             composeData.ccList ||
//                             (composeData.cc ? [composeData.cc] : [""])
//                           ).filter((_, i) => i !== idx);
//                           setComposeData({ ...composeData, ccList: newList });
//                         }}
//                         className="bg-red-100 text-red-600 rounded-lg px-3 py-3 text-sm hover:bg-red-200 transition-colors"
//                       >
//                         <X className="w-4 h-4" />
//                       </button>
//                     </div>
//                   ))}

//                   <button
//                     onClick={() =>
//                       setComposeData({
//                         ...composeData,
//                         ccList: [
//                           ...(composeData.ccList ||
//                             (composeData.cc ? [composeData.cc] : [])),
//                           "",
//                         ],
//                       })
//                     }
//                     className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1"
//                   >
//                     <Plus className="w-4 h-4" />
//                     Add CC
//                   </button>
//                 </div>
//                 {/* SUBJECT */}
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">
//                     Subject
//                   </label>
//                   <input
//                     type="text"
//                     placeholder="Subject"
//                     value={composeData.subject}
//                     onChange={(e) =>
//                       setComposeData({
//                         ...composeData,
//                         subject: e.target.value,
//                       })
//                     }
//                     className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                   />
//                 </div>
//                 {/* Message Editor */}
//                 {/* Message Editor */}
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">
//                     New Message Body
//                   </label>
//                   {/* ✏️ Editable area for new reply (Primary Editor) */}
//                   <div
//                     ref={editorRef}
//                     contentEditable
//                     suppressContentEditableWarning={true}
//                     className="border border-gray-300 rounded-lg px-4 py-4 bg-white text-sm text-gray-800 min-h-[150px] whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto"
//                     // FIX: Initialize with only the empty placeholder
//                     dangerouslySetInnerHTML={{
//                       __html: `<div class="user-message" style="min-height:100px;font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1f1f1f;line-height:1.6;"></div>`,
//                     }}
//                   />

//                   {/* 📩 Forwarded Content - Now Editable */}
//                   {forwardedContent && (
//                     <div className="mt-6">
//                       <label className="block text-sm font-semibold text-gray-700 mb-2">
//                         Forwarded Message (Editable)
//                       </label>
//                       <div
//                         // ✅ FIX 1: Attach the new ref
//                         ref={forwardedEditorRef}
//                         // ✅ FIX 2: Make it editable
//                         contentEditable
//                         suppressContentEditableWarning={true}
//                         className="border border-gray-300 rounded-lg px-4 py-4 bg-gray-50 text-sm text-gray-800 shadow-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto"
//                         style={{
//                           fontFamily: "Calibri, Arial, sans-serif",
//                           fontSize: "11pt",
//                           color: "#1f1f1f",
//                           lineHeight: "1.6",
//                         }}
//                         // ✅ FIX 3: Initialize with the forwarded content
//                         dangerouslySetInnerHTML={{ __html: forwardedContent }}
//                       />
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Modal Footer */}
//             <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
//               <button
//                 onClick={() => setShowComposePopup(false)}
//                 className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
//               >
//                 Cancel
//               </button>

//               <button
//                 // ✅ FIX: Correctly prepare the payload before sending
//                 onClick={() => {
//                   const ccString = (
//                     composeData.ccList || [composeData.cc || ""]
//                   )
//                     .filter((c) => c.trim() !== "")
//                     .join(", ");

//                   const finalPayload = {
//                     ...composeData,
//                     cc: ccString,
//                     body: buildFinalEmailBody(), // Correctly combines new message and formatted forwarded content
//                     // ✅ CRITICAL FIX: Explicitly include 'attachments' array (even if empty)
//                     attachments: composeData.attachments || [],
//                   };

//                   handleSendEmail(finalPayload);
//                 }}
//                 disabled={isSending}
//                 className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
//               >
//                 {isSending ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
//                     Sending...
//                   </>
//                 ) : (
//                   <>
//                     <Send className="w-4 h-4" />
//                     Send Email
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
