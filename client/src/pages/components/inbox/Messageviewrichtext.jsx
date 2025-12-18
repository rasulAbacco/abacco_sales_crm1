// MessageView-RichText.jsx
// Optional upgrade: Install react-quill first: npm install react-quill quill
// This provides full rich text editing like Outlook

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
} from "lucide-react";
import DOMPurify from "dompurify";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { api } from "../../../pages/api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function MessageView({
  selectedAccount,
  selectedConversation,
  onBack,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [replyMode, setReplyMode] = useState(null);
  const [replyData, setReplyData] = useState({
    from: "",
    to: "",
    cc: "",
    subject: "",
    body: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
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
      fetchMessages();
    }
  }, [selectedConversation, selectedAccount]);

  useEffect(() => {
    if (messages.length > 0) {
      const latestId = messages[messages.length - 1].id;
      setExpandedMessages({ [latestId]: true });
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!selectedConversation || !selectedAccount) return;

    setLoading(true);
    try {
      const response = await api.get(
        `${API_BASE_URL}/api/inbox/conversation/${selectedConversation.email}`,
        {
          params: {
            emailAccountId: selectedAccount.id,
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

  const toggleMessageExpand = (messageId) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

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

  const handleReply = (mode, message) => {
    const latestMessage = message || messages[messages.length - 1];

    let toEmail = "";
    let ccEmail = "";
    let subject = latestMessage.subject || "";
    let body = "";

    if (mode === "reply") {
      toEmail =
        latestMessage.fromEmail === selectedAccount.email
          ? latestMessage.toEmail
          : latestMessage.fromEmail;
      ccEmail = "";
      body = buildReplyBodyHTML(latestMessage);
    } else if (mode === "replyAll") {
      toEmail =
        latestMessage.fromEmail === selectedAccount.email
          ? latestMessage.toEmail
          : latestMessage.fromEmail;

      const allRecipients = [
        ...(latestMessage.toEmail || "").split(","),
        ...(latestMessage.ccEmail || "").split(","),
      ]
        .map((email) => email.trim())
        .filter(
          (email) =>
            email && email !== selectedAccount.email && email !== toEmail
        );

      ccEmail = [...new Set(allRecipients)].join(", ");
      body = buildReplyBodyHTML(latestMessage);
    } else if (mode === "forward") {
      toEmail = "";
      ccEmail = "";
      body = buildForwardBodyHTML(latestMessage);
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

      if (replyMode === "replyAll" && messages.length > 0) {
        payload.replyToId = messages[messages.length - 1].id;
      }

      const response = await api.post(endpoint, payload);

      if (response.data.success) {
        await fetchMessages();
        setReplyMode(null);
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

  const stripHtmlTags = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
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

  const latestMessage =
    messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {latestMessage?.subject || "(No subject)"}
              </h2>
              <p className="text-sm text-gray-500">
                {messages.length} message{messages.length !== 1 ? "s" : ""} with{" "}
                {selectedConversation.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleReply("reply", latestMessage)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Reply className="w-4 h-4" />
              <span className="hidden sm:inline">Reply</span>
            </button>
            <button
              onClick={() => handleReply("replyAll", latestMessage)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ReplyAll className="w-4 h-4" />
              <span className="hidden sm:inline">Reply All</span>
            </button>
            <button
              onClick={() => handleReply("forward", latestMessage)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Forward className="w-4 h-4" />
              <span className="hidden sm:inline">Forward</span>
            </button>
            <div className="h-6 w-px bg-gray-300 mx-2" />
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Archive className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
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
            {messages.map((message) => {
              const isExpanded = expandedMessages[message.id];

              return (
                <div
                  key={message.id}
                  className={`border border-gray-200 rounded-lg overflow-hidden transition-all ${
                    !message.isRead ? "bg-blue-50/30" : "bg-white"
                  }`}
                >
                  <div className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {message.fromEmail.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {message.fromEmail}
                            </span>
                            {!message.isRead && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 space-y-0.5">
                            <div>
                              <span className="font-medium">To:</span>{" "}
                              {message.toEmail}
                            </div>
                            {message.ccEmail && (
                              <div>
                                <span className="font-medium">Cc:</span>{" "}
                                {message.ccEmail}
                              </div>
                            )}
                            <div className="text-gray-500">
                              {formatDate(message.sentAt)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {message.attachments?.length > 0 && (
                          <Paperclip className="w-4 h-4 text-gray-400" />
                        )}
                        <button
                          onClick={() => toggleMessageExpand(message.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {!isExpanded && (
                      <div className="mt-3 ml-13 p-3 border border-gray-200 rounded bg-gray-50">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {stripHtmlTags(message.body || "").substring(0, 150)}
                          ...
                        </p>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6">
                      <div className="border-t border-gray-200 pt-4">
                        {message.subject && (
                          <h3 className="text-base font-semibold text-gray-900 mb-4">
                            {message.subject}
                          </h3>
                        )}

                        <div
                          className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(message.body || ""),
                          }}
                        />

                        {message.attachments?.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <Paperclip className="w-4 h-4" />
                              {message.attachments.length} Attachment
                              {message.attachments.length !== 1 ? "s" : ""}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {message.attachments.map((att, idx) => (
                                <div
                                  key={att.id || idx}
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <File className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {att.filename}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(att.size || 0)}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => downloadAttachment(att)}
                                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                                  >
                                    <Download className="w-4 h-4 text-gray-600" />
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
                onClick={() => setReplyMode(null)}
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
