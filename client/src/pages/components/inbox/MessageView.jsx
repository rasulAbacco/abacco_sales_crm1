import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
  Trash2,
  Paperclip,
  Download,
  Send,
  X,
  Loader2,
  Mail,
  File,
  Globe,
  Bold,
  Italic,
  Underline,
  List,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import DOMPurify from "dompurify";
import { api } from "../../../pages/api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function MessageView({
  selectedAccount,
  selectedConversation,
  selectedFolder,
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
  const editorRef = useRef(null);
  const [showQuotedText, setShowQuotedText] = useState(false);

  useEffect(() => {
    if (selectedConversation && selectedAccount) {
      setCountry(null);
      fetchMessages();
      fetchCountry();
      fetchAccountUserName();
      markConversationAsRead();
    }
  }, [selectedConversation, selectedAccount, selectedFolder]);

  useEffect(() => {
    if (messages.length > 0) {
      const latestId = messages[0].id;
      setExpandedMessages({ [latestId]: true });
    }
  }, [messages]);

  const markConversationAsRead = async () => {
    try {
      await api.post(`${API_BASE_URL}/api/inbox/mark-read-conversation`, {
        conversationId: selectedConversation.conversationId,
        accountId: selectedAccount.id,
      });
    } catch (error) {
      console.error("❌ Failed to mark conversation as read:", error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedConversation || !selectedAccount) return;

    setLoading(true);
    try {
      const response = await api.get(
        `${API_BASE_URL}/api/inbox/conversation-detail`,
        {
          params: {
            conversationId: selectedConversation.conversationId,
            accountId: selectedAccount.id,
            folder: selectedFolder,
          },
        }
      );

      if (response.data.success) {
        const updatedMessages = (response.data.data || []).map((msg) => ({
          ...msg,
          isRead: true,
        }));
        setMessages(updatedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountry = async () => {
    if (!selectedConversation) return;

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
    const confirmed = window.confirm(
      "Are you sure you want to move this conversation to Trash?"
    );

    if (!confirmed) return;

    try {
      const response = await api.patch(
        `${API_BASE_URL}/api/inbox/hide-inbox-conversation`,
        {
          conversationId: selectedConversation.conversationId,
          accountId: selectedAccount.id,
        }
      );

      if (response.data.success) {
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

  // Helper to format "Name <email>"
  const formatSender = (name, email) => {
    if (name && name.trim() !== "" && name !== email) {
      return `${name} &lt;${email}&gt;`;
    }
    return email;
  };

  // Outlook-style display: Name <email> OR email only
  const formatHeaderAddress = (name, email) => {
    const cleanEmail = email?.trim() || "";
    const cleanName = name?.trim();
    return cleanName ? `${cleanName} &lt;${cleanEmail}&gt;` : cleanEmail;
  };

  // Helper: Outlook style long date format
  const formatLongDate = (dateStr) => {
    return new Date(dateStr).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // const handleReply = (type, message) => {
  //   if (!message) return;

  //   // 1. Prepare Data for the "Outlook Style" Header
  //   const originalSender = formatSender(message.fromName, message.fromEmail);
  //   const sentDate = formatLongDate(message.sentAt);
  //   const originalTo = message.toEmail;
  //   const originalCc = message.ccEmail
  //     ? message.ccEmail.split(",").join("; ")
  //     : "";
  //   const originalSubject = message.subject || "(No Subject)";

  //   // 2. Build the Outlook Header Block
  //   const outlookHeader = `
  //     <br>
  //     <hr style="border:none; border-top:1px solid #E1E1E1">
  //     <div style="font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
  //       <b>From:</b> ${originalSender}<br>
  //       <b>Sent:</b> ${sentDate}<br>
  //       <b>To:</b> ${originalTo}<br>
  //       ${originalCc ? `<b>Cc:</b> ${originalCc}<br>` : ""}
  //       <b>Subject:</b> ${originalSubject}
  //     </div>
  //     <br>
  //   `;

  //   // 3. Combine Header + Original Body
  //   const quotedBody = `
  //     ${outlookHeader}
  //     <div>
  //       ${message.bodyHtml || message.body}
  //     </div>
  //   `;

  //   // 4. Set Reply Mode & ID
  //   setReplyingToMessageId(message.id);
  //   setReplyMode(type);

  //   // 5. Determine New Subject
  //   const prefix = message.subject?.startsWith("Re:") ? "" : "Re: ";
  //   const newSubject = `${prefix}${message.subject || "(No Subject)"}`;

  //   // 6. Determine Recipients
  //   let to = message.fromEmail;
  //   let cc = "";

  //   if (type === "replyAll") {
  //     const allRecipients = [
  //       message.fromEmail,
  //       ...(message.toEmail ? message.toEmail.split(",") : []),
  //       ...(message.ccEmail ? message.ccEmail.split(",") : []),
  //     ]
  //       .map((e) => e.trim())
  //       .filter((e) => e !== selectedAccount.email);

  //     to = [...new Set(allRecipients)].join(", ");
  //   }

  //   // 7. Set Editor State
  //   setReplyData({
  //     from: selectedAccount.email,
  //     to: to,
  //     cc: cc,
  //     subject: newSubject,
  //     body: "",
  //   });

  //   // 8. Put the Quoted Text in the "Show quoted text" section
  //   setReplyData((prev) => ({ ...prev, body: quotedBody }));
  //   setShowQuotedText(true);

  //   // Clear the main typing area
  //   setTimeout(() => {
  //     if (editorRef.current) editorRef.current.innerHTML = "";
  //   }, 0);
  // };
  const handleReply = (type, message) => {
    if (!message) return;

    // Prepare Outlook Style Data
    const originalSender = formatSender(message.fromName, message.fromEmail);
    const sentDate = formatLongDate(message.sentAt);
    const originalTo = message.toEmail;
    const originalCc = message.ccEmail
      ? message.ccEmail.split(",").join("; ")
      : "";
    const originalSubject = message.subject || "(No Subject)";

    // 🔥 UPDATED: Changed font-size from 11pt to 9pt
    const outlookHeader = `
      <hr style="border:none; border-top:1px solid #E1E1E1">
      <div style="font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
        <b>From:</b> ${originalSender}<br>
        <b>Sent:</b> ${sentDate}<br>
        <b>To:</b> ${originalTo}<br>
        ${originalCc ? `<b>Cc:</b> ${originalCc}<br>` : ""}
        <b>Subject:</b> ${originalSubject}
      </div>
      <br>
    `;

    const quotedBody = `
      ${outlookHeader}
      <div>
        ${message.bodyHtml || message.body}
      </div>
    `;

    setReplyingToMessageId(message.id);
    setReplyMode(type);

    const prefix = message.subject?.startsWith("Re:") ? "" : "Re: ";
    const newSubject = `${prefix}${message.subject || "(No Subject)"}`;

    // let to = message.fromEmail;
    // let cc = "";

    // if (type === "replyAll") {
    //   const allRecipients = [
    //     message.fromEmail,
    //     ...(message.toEmail ? message.toEmail.split(",") : []),
    //     ...(message.ccEmail ? message.ccEmail.split(",") : []),
    //   ]
    //     .map((e) => e.trim())
    //     .filter((e) => e !== selectedAccount.email);

    //   to = [...new Set(allRecipients)].join(", ");
    // }
    // Inside handleReply function in MessageView.jsx

    let to = message.fromEmail; // Default 'to' is the original sender
    let cc = "";

    if (type === "replyAll") {
      // 1. The original sender stays in the "To" field
      to = message.fromEmail;

      // 2. Combine original 'To' and 'Cc' recipients for the new 'Cc' field
      const otherRecipients = [
        ...(message.toEmail ? message.toEmail.split(",") : []),
        ...(message.ccEmail ? message.ccEmail.split(",") : []),
      ]
        .map((e) => e.trim())
        // 3. Filter out yourself AND the original sender (since they are in 'To')
        .filter((e) => e !== selectedAccount.email && e !== message.fromEmail);

      // 4. Set unique recipients into the CC string
      cc = [...new Set(otherRecipients)].join(", ");
    }

    // Update the state with separated recipients
    setReplyData({
      from: selectedAccount.email,
      to: to,
      cc: cc, // CC is now correctly populated separately
      subject: newSubject,
      body: "",
    });
    setReplyData({
      from: selectedAccount.email,
      to: to,
      cc: cc,
      subject: newSubject,
      body: "",
    });

    setReplyData((prev) => ({ ...prev, body: quotedBody }));
    setShowQuotedText(true);

    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = "";
    }, 0);
  };
  // const handleForward = (type, message) => {
  //   if (!message) return;

  //   // 1. Prepare Header Data
  //   const fromHeader = formatHeaderAddress(message.fromName, message.fromEmail);
  //   const toHeader = message.toEmail;

  //   const ccHeader = message.ccEmail
  //     ? message.ccEmail
  //         .split(",")
  //         .map((e) => e.trim())
  //         .join("; ")
  //     : "";

  //   const sentDate = formatLongDate(message.sentAt);
  //   const subjectHeader = message.subject || "(No Subject)";

  //   // 2. Build the Outlook Forward Header HTML
  //   const forwardHeader = `
  //     <br>
  //     <div style="font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
  //       <hr style="border:none; border-top:1px solid #E1E1E1">
  //       <b>From:</b> ${fromHeader}<br>
  //       <b>Sent:</b> ${sentDate}<br>
  //       <b>To:</b> ${toHeader}<br>
  //       ${ccHeader ? `<b>Cc:</b> ${ccHeader}<br>` : ""}
  //       <b>Subject:</b> ${subjectHeader}
  //     </div>
  //     <br>
  //   `;

  //   // 3. Combine with original body
  //   const forwardedBody = `
  //     ${forwardHeader}
  //     <div>
  //       ${message.bodyHtml || message.body}
  //     </div>
  //   `;

  //   // 4. Set State
  //   setReplyingToMessageId(message.id);
  //   setReplyMode("forward");

  //   // 🔥 FIX: Ensure we use "Fwd:" not "Re:"
  //   const prefix = message.subject?.startsWith("Fwd:") ? "" : "Fwd: ";

  //   setReplyData({
  //     from: selectedAccount.email,
  //     to: "", // Forward starts with empty To
  //     cc: "",
  //     subject: `${prefix}${message.subject || "(No Subject)"}`,
  //     body: forwardedBody,
  //   });

  //   // 5. Update Editor DOM immediately
  //   setTimeout(() => {
  //     if (editorRef.current) {
  //       editorRef.current.innerHTML = forwardedBody;
  //       editorRef.current.focus();

  //       // Place cursor at start
  //       const range = document.createRange();
  //       const sel = window.getSelection();
  //       range.setStart(editorRef.current, 0);
  //       range.collapse(true);
  //       sel.removeAllRanges();
  //       sel.addRange(range);
  //     }
  //   }, 0);
  // };
  const handleForward = (type, message) => {
    if (!message) return;

    // Prepare Header Data
    const fromHeader = formatHeaderAddress(message.fromName, message.fromEmail);
    const toHeader = message.toEmail;

    const ccHeader = message.ccEmail
      ? message.ccEmail
          .split(",")
          .map((e) => e.trim())
          .join("; ")
      : "";

    const sentDate = formatLongDate(message.sentAt);
    const subjectHeader = message.subject || "(No Subject)";

    // 🔥 UPDATED: Changed font-size from 11pt to 9pt
    const forwardHeader = `
      <br>
      <div style="font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
        <hr style="border:none; border-top:1px solid #E1E1E1">
        <b>From:</b> ${fromHeader}<br>
        <b>Sent:</b> ${sentDate}<br>
        <b>To:</b> ${toHeader}<br>
        ${ccHeader ? `<b>Cc:</b> ${ccHeader}<br>` : ""}
        <b>Subject:</b> ${subjectHeader}
      </div>
      <br>
    `;

    // Combine with original body
    const forwardedBody = `
      ${forwardHeader}
      <div>
        ${message.bodyHtml || message.body}
      </div>
    `;

    setReplyingToMessageId(message.id);
    setReplyMode("forward");

    // Ensure we use "Fwd:" not "Re:"
    const prefix = message.subject?.startsWith("Fwd:") ? "" : "Fwd: ";

    setReplyData({
      from: selectedAccount.email,
      to: "",
      cc: "",
      subject: `${prefix}${message.subject || "(No Subject)"}`,
      body: forwardedBody,
    });

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = forwardedBody;
        editorRef.current.focus();

        // Place cursor at start
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(editorRef.current, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 0);
  };
  const handleSendReply = async () => {
    const bodyContent = editorRef.current?.innerHTML || "";

    let finalBody = bodyContent;
    if (showQuotedText && replyData.body) {
      finalBody = bodyContent + replyData.body;
    }

    if (!finalBody.trim() || !selectedAccount) return;

    if (!replyData.to.trim()) {
      alert("Please enter a recipient email address");
      return;
    }

    setIsSending(true);
    try {
      // Choose endpoint based on mode
      let endpoint;
      if (replyMode === "replyAll")
        endpoint = `${API_BASE_URL}/api/inbox/reply-all`;
      else if (replyMode === "forward")
        endpoint = `${API_BASE_URL}/api/inbox/forward`;
      else endpoint = `${API_BASE_URL}/api/inbox/reply`;

      const payload = {
        emailAccountId: selectedAccount.id,
        fromEmail: replyData.from, // Ensure backend expects 'fromEmail' or 'from'
        from: replyData.from, // Sending both for compatibility
        to: replyData.to,
        cc: replyData.cc || null,
        subject: replyData.subject,
        body: finalBody,
        attachments: attachments.map((att) => ({
          filename: att.name,
          url: att.url,
          type: att.type,
          size: att.size,
        })),
      };

      if (replyingToMessageId) {
        // Different endpoints might expect different ID keys
        payload.replyToMessageId = replyingToMessageId; // For reply
        payload.replyToId = replyingToMessageId; // For reply-all
        payload.forwardMessageId = replyingToMessageId; // For forward
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
        setShowQuotedText(false);
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
        }
        alert("Message sent successfully!");
      }
    } catch (error) {
      console.error("Error sending message:", error);
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
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900">
                  {latestMessage?.subject || "(No subject)"}
                </h2>

                {country && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    <Globe className="w-3 h-3" />
                    {country}
                  </span>
                )}
              </div>

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

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {selectedFolder === "trash" ? (
                <>
                  <button
                    onClick={handleRestore}
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                    title="Restore to Inbox"
                  >
                    <Reply className="w-4 h-4 text-blue-600 rotate-180" />
                  </button>
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
                  <button
                    onClick={handleTrashClick}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                    title="Move to Trash"
                  >
                    <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                  </button>
                </>
              )}
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
            {messages
              .filter((msg) => {
                if (selectedFolder === "sent") return msg.direction === "sent";
                if (["spam", "trash"].includes(selectedFolder)) return true;
                return msg.direction === "received";
              })
              .reverse()
              .map((message) => {
                const isExpanded = expandedMessages[message.id];
                const accountDomain = selectedAccount.email.split("@")[1];
                const senderDomain = message.fromEmail.split("@")[1];
                const isInternal = accountDomain === senderDomain;

                return (
                  <div key={message.id} className="relative mb-3">
                    <div
                      className={`border border-gray-200 rounded-lg overflow-hidden transition-all shadow-sm ${
                        isInternal
                          ? "bg-white border-blue-100"
                          : "bg-orange-50/20 border-orange-100"
                      } ${!message.isRead ? "ring-1 ring-blue-400" : ""}`}
                    >
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

                      {isExpanded && (
                        <div className="px-6 pb-6">
                          <div className="border-t border-gray-100 pt-4">
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

                              {/* 🔥 FORWARD BUTTON: Calls handleForward */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleForward("forward", message);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                              >
                                <Forward className="w-3.5 h-3.5" /> Forward
                              </button>
                            </div>

                            {message.subject && (
                              <h3 className="text-sm font-bold text-gray-900 mb-4 bg-gray-50 p-2 rounded">
                                Subject: {message.subject}
                              </h3>
                            )}

                            <div
                              className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
                              style={{
                                fontFamily: "Calibri, sans-serif",
                                fontSize: "11pt",
                                lineHeight: "1.35",
                                color: "#000000",
                              }}
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(message.body || ""),
                              }}
                            />

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

      {/* Reply Popup */}
      {replyMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setReplyMode(null);
                    setReplyingToMessageId(null);
                    setShowQuotedText(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h3 className="text-lg font-semibold text-gray-900">
                  {replyMode === "reply" && "Reply"}
                  {replyMode === "replyAll" && "Reply All"}
                  {replyMode === "forward" && "Forward Message"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setReplyMode(null);
                  setReplyingToMessageId(null);
                  setShowQuotedText(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="p-6">
                <div className="space-y-4 mb-4">
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
                  <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-300">
                    <button
                      onClick={() => formatText("bold")}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      <Bold className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => formatText("italic")}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      <Italic className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => formatText("underline")}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      <Underline className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <button
                      onClick={() => formatText("insertUnorderedList")}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      <List className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={insertLink}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      <LinkIcon className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <div
                    ref={editorRef}
                    contentEditable
                    className="min-h-[200px] max-h-[300px] overflow-y-auto p-4 focus:outline-none"
                    style={{
                      fontFamily: "Calibri, sans-serif",
                      fontSize: "11pt",
                      lineHeight: "1.35",
                    }}
                    placeholder="Type your message here..."
                  />

                  {(replyMode === "reply" || replyMode === "replyAll") && (
                    <div className="border-t border-gray-200">
                      <button
                        onClick={() => setShowQuotedText(!showQuotedText)}
                        className="w-full px-4 py-2 flex items-center justify-center gap-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-lg leading-none">•••</span>
                        <span>
                          {showQuotedText ? "Hide" : "Show"} quoted text
                        </span>
                      </button>

                      {showQuotedText && (
                        <div
                          className="p-4 bg-gray-50 border-t border-gray-200 max-h-[400px] overflow-y-auto"
                          contentEditable
                          suppressContentEditableWarning
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(replyData.body || ""),
                          }}
                          onBlur={(e) => {
                            setReplyData({
                              ...replyData,
                              body: e.currentTarget.innerHTML,
                            });
                          }}
                          style={{
                            fontFamily: "Calibri, sans-serif",
                            fontSize: "11pt",
                            lineHeight: "1.35",
                          }}
                        />
                      )}
                    </div>
                  )}

                  {replyMode === "forward" && (
                    <div className="hidden">
                      {/* For forwards, body is pre-filled in editorRef, no separate view needed */}
                    </div>
                  )}

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
                      disabled={isSending}
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
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
