import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
  Archive,
  Trash2,
  Paperclip,
  Download,
  Send,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
  File,
  Globe,
} from "lucide-react";
import DOMPurify from "dompurify";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { api } from "../../../pages/api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function MessageView({
  selectedAccount,
  selectedConversation,
  selectedFolder, // 🔥 RECEIVE THE PROP
  onBack,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [replyMode, setReplyMode] = useState(null);
  const [replyingToMessageId, setReplyingToMessageId] = useState(null);
  const [replyData, setReplyData] = useState({
    from: "",
    to: "",
    cc: "",
    subject: "",
    body: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [country, setCountry] = useState(null);
  const [accountUserName, setAccountUserName] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const quillRef = useRef(null);

  // Quill editor configuration
  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["link"],
      [{ color: [] }, { background: [] }],
      ["clean"],
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "indent",
    "link",
    "color",
    "background",
  ];

  useEffect(() => {
    if (selectedConversation && selectedAccount) {
      setCountry(null); // <-- RESET old country here
      fetchMessages();
      fetchCountry();
      fetchAccountUserName();
    }
  }, [selectedConversation, selectedAccount, selectedFolder]);

  useEffect(() => {
    if (messages.length > 0) {
      const latestId = messages[0].id;
      setExpandedMessages({ [latestId]: true });
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!selectedConversation || !selectedAccount) return;

    setLoading(true);
    try {
      // 🔥 POINT TO: /conversation-detail
      // 🔥 PASS AS: params (Query String)
      const response = await api.get(
        `${API_BASE_URL}/api/inbox/conversation-detail`,
        {
          params: {
            conversationId: selectedConversation.conversationId,
            accountId: selectedAccount.id,
            folder: selectedFolder, // 🔥 CRITICAL: Must pass the current folder (sent/inbox)
          },
        }
      );

      if (response.data.success) {
        setMessages(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchCountry = async () => {
    if (!selectedConversation) return;

    // Get email from conversation (primaryRecipient or email)
    const email =
      selectedConversation.primaryRecipient || selectedConversation.email;
    if (!email) return;

    try {
      const response = await api.get(
        `${API_BASE_URL}/api/inbox/conversation/${email}/country`,
        {
          params: {
            emailAccountId: selectedAccount.id,
          },
        }
      );

      if (response.data.success && response.data.country) {
        setCountry(response.data.country);
      }
    } catch (error) {
      console.error("Error fetching country:", error);
    }
  };

  const fetchAccountUserName = async () => {
    if (!selectedAccount?.id) return;

    try {
      const response = await api.get(
        `${API_BASE_URL}/api/inbox/accounts/${selectedAccount.id}/user`
      );

      if (response.data.success && response.data.userName) {
        setAccountUserName(response.data.userName);
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
  };

  const handleTrashClick = async () => {
    // 1️⃣ Confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to move this conversation to Trash?"
    );

    if (!confirmed) return;

    try {
      // 2️⃣ Call the backend PATCH route to hide the thread
      const response = await api.patch(
        `${API_BASE_URL}/api/inbox/hide-inbox-conversation`,
        {
          conversationId: selectedConversation.conversationId,
          accountId: selectedAccount.id,
        }
      );

      if (response.data.success) {
        // 3️⃣ Notify user and go back to list
        alert("Conversation moved to Trash.");
        onBack();
      }
    } catch (error) {
      console.error("❌ Error moving to trash:", error);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm("Restore this conversation to your Inbox?")) return;
    const res = await api.patch(
      `${API_BASE_URL}/api/inbox/restore-conversation`,
      {
        conversationId: selectedConversation.conversationId,
        accountId: selectedAccount.id,
      }
    );
    if (res.data.success) onBack();
  };

  const handlePermanentDelete = async () => {
    // 🔥 FINAL CONFIRMATION
    if (
      !window.confirm(
        "WARNING: Once deleted, this message cannot be restored. Proceed?"
      )
    )
      return;
    const res = await api.patch(
      `${API_BASE_URL}/api/inbox/permanent-delete-conversation`,
      {
        conversationId: selectedConversation.conversationId,
        accountId: selectedAccount.id,
      }
    );
    if (res.data.success) onBack();
  };
  const toggleMessageExpand = (messageId) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const stripHtmlTags = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // Using the rich text approach from code 2
  const buildReplyBodyHTML = (message) => {
    const formattedDate = new Date(message.sentAt).toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `
      <br><br>
      <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
      <div style="color: #666; font-size: 13px;">
        <p><strong>On ${formattedDate}, ${message.fromEmail} wrote:</strong></p>
      </div>
      <blockquote style="border-left: 3px solid #ccc; margin: 10px 0; padding-left: 15px; color: #666;">
        ${message.body || ""}
      </blockquote>
    `;
  };

  const buildForwardBodyHTML = (message) => {
    const formattedDate = new Date(message.sentAt).toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `
      <br><br>
      <hr style="border: none; border-top: 2px solid #000; margin: 20px 0;">
      <div style="font-family: Arial, sans-serif; font-size: 13px; color: #000;">
        <p style="margin: 5px 0;"><strong>From:</strong> ${
          message.fromEmail
        }</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
        <p style="margin: 5px 0;"><strong>Subject:</strong> ${
          message.subject || "(No subject)"
        }</p>
        <p style="margin: 5px 0;"><strong>To:</strong> ${message.toEmail}</p>
        ${
          message.ccEmail
            ? `<p style="margin: 5px 0;"><strong>Cc:</strong> ${message.ccEmail}</p>`
            : ""
        }
      </div>
      <br>
      <div style="margin-top: 15px;">
        ${message.body || ""}
      </div>
    `;
  };

  // Using the handleReply function from code 2
  const handleReply = (mode, message) => {
    let toEmail = "";
    let ccEmail = "";
    let subject = message.subject || "";
    let body = "";

    if (mode === "reply") {
      toEmail =
        message.fromEmail === selectedAccount.email
          ? message.toEmail
          : message.fromEmail;
      ccEmail = "";
      body = buildReplyBodyHTML(message);
    } else if (mode === "replyAll") {
      toEmail =
        message.fromEmail === selectedAccount.email
          ? message.toEmail
          : message.fromEmail;

      const allRecipients = [
        ...(message.toEmail || "").split(","),
        ...(message.ccEmail || "").split(","),
      ]
        .map((email) => email.trim())
        .filter(
          (email) =>
            email && email !== selectedAccount.email && email !== toEmail
        );

      ccEmail = [...new Set(allRecipients)].join(", ");
      body = buildReplyBodyHTML(message);
    } else if (mode === "forward") {
      toEmail = "";
      ccEmail = "";
      body = buildForwardBodyHTML(message);
    }

    if (mode !== "forward" && !subject.toLowerCase().startsWith("re:")) {
      subject = `Re: ${subject}`;
    } else if (
      mode === "forward" &&
      !subject.toLowerCase().startsWith("fwd:")
    ) {
      subject = `Fwd: ${subject}`;
    }

    setReplyData({
      from: selectedAccount.email,
      to: toEmail,
      cc: ccEmail,
      subject: subject,
      body: body,
    });

    setReplyMode(mode);
    setReplyingToMessageId(message.id);
    setAttachments([]);

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      if (quillRef.current) {
        const editor = quillRef.current.getEditor();
        editor.setSelection(0, 0);
      }
    }, 100);
  };

  const handleSendReply = async () => {
    if (!replyData.body.trim() || !selectedAccount) return;

    if (!replyData.to.trim()) {
      alert("Please enter a recipient email address");
      return;
    }

    setIsSending(true);
    try {
      const endpoint =
        replyMode === "replyAll"
          ? `${API_BASE_URL}/api/inbox/reply-all`
          : `${API_BASE_URL}/api/inbox/reply`;

      const payload = {
        emailAccountId: selectedAccount.id,
        from: replyData.from,
        to: replyData.to,
        cc: replyData.cc || null,
        subject: replyData.subject,
        body: replyData.body,
        attachments: attachments.map((att) => ({
          filename: att.name,
          url: att.url,
          type: att.type,
          size: att.size,
        })),
      };

      // Add replyToMessageId for proper conversation threading
      if (replyingToMessageId) {
        payload.replyToMessageId = replyingToMessageId;
      }

      // Legacy support for replyAll
      if (replyMode === "replyAll" && replyingToMessageId) {
        payload.replyToId = replyingToMessageId;
      }

      const response = await api.post(endpoint, payload);

      if (response.data.success) {
        await fetchMessages();
        setReplyMode(null);
        setReplyingToMessageId(null);
        setReplyData({
          from: "",
          to: "",
          cc: "",
          subject: "",
          body: "",
        });
        setAttachments([]);
        alert("Message sent successfully!");
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleAttachmentUpload = (e) => {
    const files = Array.from(e.target.files || []);

    const newAttachments = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      url: URL.createObjectURL(file),
    }));

    setAttachments([...attachments, ...newAttachments]);
  };

  const removeAttachment = (index) => {
    const newAttachments = [...attachments];
    if (newAttachments[index].url) {
      URL.revokeObjectURL(newAttachments[index].url);
    }
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  const formatDate = (date) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const downloadAttachment = (attachment) => {
    if (attachment.storageUrl || attachment.url) {
      window.open(attachment.storageUrl || attachment.url, "_blank");
    }
  };

  if (!selectedConversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <Mail className="w-12 h-12 opacity-20 mx-auto mb-4" />
          <p className="text-sm">Select a conversation to view messages</p>
        </div>
      </div>
    );
  }

  const latestMessage = messages.length > 0 ? messages[0] : null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div>
              {/* Subject + Country Tag */}
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900">
                  {latestMessage?.subject || "(No subject)"}
                </h2>

                {/* 🌍 Country tag */}
                {country && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    <Globe className="w-3 h-3" />
                    {country}
                  </span>
                )}
              </div>

              {/* Conversation Info */}
              <p className="text-sm text-gray-500 mt-1">
                {messages.length} message{messages.length !== 1 ? "s" : ""} with{" "}
                {selectedConversation.primaryRecipient ||
                  selectedConversation.email}
                {accountUserName && (
                  <span className="ml-2 text-gray-400">
                    • {accountUserName}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right Section (Actions) */}
          <div className="flex items-center gap-2">
            {/* Actions Container */}
            <div className="flex items-center gap-2">
              {selectedFolder === "trash" ? (
                <>
                  {/* RESTORE BUTTON - Only in Trash */}
                  <button
                    onClick={handleRestore}
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                    title="Restore to Inbox"
                  >
                    <Reply className="w-4 h-4 text-blue-600 rotate-180" />
                  </button>

                  {/* PERMANENT DELETE BUTTON - In Trash */}
                  <button
                    onClick={handlePermanentDelete}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                    title="Delete Permanently"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </>
              ) : (
                <>
                  {/* TRASH BUTTON - For Inbox, Sent, and Spam */}
                  <button
                    onClick={handleTrashClick}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                    title="Move to Trash"
                  >
                    <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                  </button>
                </>
              )}

              {/* Options Menu - Stays consistent across all folders */}
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-6 px-6 space-y-4">
            {/* Updated Message Timeline logic */}
            {/* Section 3: Message Timeline Stac {messages.map((message) => {
             */}
            {messages
              .filter((msg) => {
                // 1️⃣ SENT FOLDER: Show ONLY outbound messages
                if (selectedFolder === "sent") {
                  return msg.direction === "sent";
                }

                // 2️⃣ SPAM & TRASH FOLDERS: Show everything returned by the backend
                // These folders often contain bounce-backs (received) and original sends
                if (["spam", "trash"].includes(selectedFolder)) {
                  return true; // 🔥 FIX: Allow both sent/received to show in Spam view
                }

                // 3️⃣ INBOX (DEFAULT): Show ONLY received messages
                return msg.direction === "received";
              })
              .map((message) => {
                const isExpanded = expandedMessages[message.id];
                const isReplying =
                  replyingToMessageId === message.id && replyMode;

                // 🔥 Sales CRM Logic: Distinguish Internal (Employee) vs External (Client)
                const accountDomain = selectedAccount.email.split("@")[1];
                const senderDomain = message.fromEmail.split("@")[1];
                const isInternal = accountDomain === senderDomain;

                return (
                  <div key={message.id} className="relative mb-3">
                    <div
                      className={`border border-gray-200 rounded-lg overflow-hidden transition-all shadow-sm ${
                        isInternal
                          ? "bg-white border-blue-100" // 🟦 Internal (Team) Style
                          : "bg-orange-50/20 border-orange-100" // 🟧 External (Client) Style
                      } ${!message.isRead ? "ring-1 ring-blue-400" : ""}`}
                    >
                      {/* COLLAPSED HEADER: Click to expand/collapse */}
                      <div
                        className="px-6 py-4 cursor-pointer hover:bg-black/5"
                        onClick={() => toggleMessageExpand(message.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm">
                              {message.fromEmail.charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-sm font-bold ${
                                    isInternal
                                      ? "text-blue-700"
                                      : "text-orange-700"
                                  }`}
                                >
                                  {message.fromEmail}
                                  {isInternal && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] rounded uppercase tracking-wider font-bold">
                                      Internal
                                    </span>
                                  )}
                                </span>
                                {!message.isRead && (
                                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                )}
                              </div>

                              {/* 📝 Recipient Metadata */}
                              <div className="text-xs text-gray-500 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold uppercase text-[9px] text-gray-400">
                                    To:
                                  </span>
                                  <span className="truncate">
                                    {message.toEmail}
                                  </span>
                                </div>
                                {message.ccEmail && (
                                  <div className="flex items-center gap-2">
                                    <span className="bg-gray-100 text-gray-600 px-1 rounded-sm text-[9px] font-bold">
                                      CC
                                    </span>
                                    <span className="truncate italic">
                                      {message.ccEmail}
                                    </span>
                                  </div>
                                )}
                                <div className="text-[10px] text-gray-400 mt-1">
                                  {formatDate(message.sentAt)}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {message.attachments?.length > 0 && (
                              <Paperclip className="w-4 h-4 text-gray-400" />
                            )}
                            <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Snippet preview when the message card is collapsed */}
                        {!isExpanded && (
                          <div className="mt-3 ml-13 p-2 border-l-2 border-gray-200 bg-gray-50/50 rounded-r">
                            <p className="text-xs text-gray-600 line-clamp-1 italic">
                              {stripHtmlTags(message.body || "").substring(
                                0,
                                120
                              )}
                              ...
                            </p>
                          </div>
                        )}
                      </div>

                      {/* EXPANDED CONTENT: Shows full email and action bar */}
                      {isExpanded && (
                        <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-1">
                          <div className="border-t border-gray-100 pt-4">
                            {/* Action buttons bar */}
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-50">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReply("reply", message);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                              >
                                <Reply className="w-3.5 h-3.5" /> Reply
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReply("replyAll", message);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                              >
                                <ReplyAll className="w-3.5 h-3.5" /> Reply All
                              </button>
                              {/* 🔄 FORWARD BUTTON RESTORED */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReply("forward", message);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                              >
                                <Forward className="w-3.5 h-3.5" /> Forward
                              </button>
                            </div>

                            {/* Subject display for context */}
                            {message.subject && (
                              <h3 className="text-sm font-bold text-gray-900 mb-4 bg-gray-50 p-2 rounded">
                                Subject: {message.subject}
                              </h3>
                            )}

                            {/* Full Email Body (Sanitized) */}
                            <div
                              className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(message.body || ""),
                              }}
                            />

                            {/* Attachments Section with Download from R2 */}
                            {message.attachments?.length > 0 && (
                              <div className="mt-6 pt-4 border-t border-gray-100">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 flex items-center gap-2 tracking-widest">
                                  <Paperclip className="w-3 h-3" />
                                  {message.attachments.length} Attachment(s)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {message.attachments.map((att, idx) => (
                                    <div
                                      key={att.id || idx}
                                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all group"
                                    >
                                      <div className="w-9 h-9 bg-white rounded border border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50">
                                        <File className="w-4 h-4 text-blue-500" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-700 truncate">
                                          {att.filename}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                          {formatFileSize(att.size || 0)}
                                        </p>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          downloadAttachment(att);
                                        }}
                                        className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                                      >
                                        <Download className="w-4 h-4 text-blue-600" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Reply Box with Rich Text Editor */}
      {replyMode && (
        <div className="border-t-2 border-gray-300 bg-white shadow-lg">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {replyMode === "reply" && "Reply"}
                {replyMode === "replyAll" && "Reply All"}
                {replyMode === "forward" && "Forward Message"}
              </h3>
              <button
                onClick={() => {
                  setReplyMode(null);
                  setReplyingToMessageId(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3 mb-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 w-16">
                  From:
                </label>
                <input
                  type="email"
                  value={replyData.from}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                  disabled
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 w-16">
                  To:
                </label>
                <input
                  type="email"
                  value={replyData.to}
                  onChange={(e) =>
                    setReplyData({ ...replyData, to: e.target.value })
                  }
                  placeholder="Enter recipient email"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 w-16">
                  Cc:
                </label>
                <input
                  type="email"
                  value={replyData.cc}
                  onChange={(e) =>
                    setReplyData({ ...replyData, cc: e.target.value })
                  }
                  placeholder="Enter CC recipients"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 w-16">
                  Subject:
                </label>
                <input
                  type="text"
                  value={replyData.subject}
                  onChange={(e) =>
                    setReplyData({ ...replyData, subject: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={replyData.body}
                onChange={(content) =>
                  setReplyData({ ...replyData, body: content })
                }
                modules={modules}
                formats={formats}
                placeholder="Type your message here..."
                style={{ height: "300px", marginBottom: "42px" }}
              />

              {attachments.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-300"
                      >
                        <File className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-700">
                          {att.name}
                        </span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="p-0.5 hover:bg-gray-200 rounded-full"
                        >
                          <X className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Paperclip className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <button
                  onClick={handleSendReply}
                  disabled={!replyData.body.trim() || isSending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
