// 🔥 FULLY UPDATED: MessageView.jsx - With Account Dropdown + Template Selection + All Original Features

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
  ListOrdered,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit,
  RotateCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Strikethrough,
  Minus,
  Quote,
} from "lucide-react";
import DOMPurify from "dompurify";
import { api } from "../../../pages/api.js";
import {
  replacePlaceholders,
  buildSignature,
  extractRecipientName,
} from "../../../utils/templateReplacer";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🎨 Outlook-style default fonts
const FONT_FAMILIES = [
  { value: "Calibri, sans-serif", label: "Calibri" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "Tahoma, sans-serif", label: "Tahoma" },
  { value: "'Comic Sans MS', cursive", label: "Comic Sans MS" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
  { value: "Impact, sans-serif", label: "Impact" },
];

// 📏 Font sizes like Outlook
const FONT_SIZES = [
  { value: "8pt", label: "8" },
  { value: "9pt", label: "9" },
  { value: "10pt", label: "10" },
  { value: "11pt", label: "11" },
  { value: "12pt", label: "12" },
  { value: "14pt", label: "14" },
  { value: "16pt", label: "16" },
  { value: "18pt", label: "18" },
  { value: "20pt", label: "20" },
  { value: "22pt", label: "22" },
  { value: "24pt", label: "24" },
  { value: "26pt", label: "26" },
  { value: "28pt", label: "28" },
  { value: "36pt", label: "36" },
  { value: "48pt", label: "48" },
  { value: "72pt", label: "72" },
];

// 🎨 Common colors like Outlook
const COLORS = [
  "#000000",
  "#444444",
  "#666666",
  "#999999",
  "#CCCCCC",
  "#EEEEEE",
  "#F3F3F3",
  "#FFFFFF",
  "#FF0000",
  "#FF9900",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#0000FF",
  "#9900FF",
  "#FF00FF",
  "#F4CCCC",
  "#FCE5CD",
  "#FFF2CC",
  "#D9EAD3",
  "#D0E0E3",
  "#C9DAF8",
  "#D9D2E9",
  "#EAD1DC",
  "#EA9999",
  "#F9CB9C",
  "#FFE599",
  "#B6D7A8",
  "#A2C4C9",
  "#A4C2F4",
  "#B4A7D6",
  "#D5A6BD",
  "#E06666",
  "#F6B26B",
  "#FFD966",
  "#93C47D",
  "#76A5AF",
  "#6D9EEB",
  "#8E7CC3",
  "#C27BA0",
  "#CC0000",
  "#E69138",
  "#F1C232",
  "#6AA84F",
  "#45818E",
  "#3C78D8",
  "#674EA7",
  "#A64D79",
  "#990000",
  "#B45F06",
  "#BF9000",
  "#38761D",
  "#134F5C",
  "#1155CC",
  "#351C75",
  "#741B47",
  "#660000",
  "#783F04",
  "#7F6000",
  "#274E13",
  "#0C343D",
  "#1C4587",
  "#20124D",
  "#4C1130",
];

export default function MessageView({
  selectedAccount,
  selectedConversation,
  selectedFolder,
  onBack,
}) {
  // 🔥 NEW: Account and Template state
  const [accounts, setAccounts] = useState([]);
  const [selectedFromAccount, setSelectedFromAccount] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [replyMode, setReplyMode] = useState(null);
  const [replyingToMessageId, setReplyingToMessageId] = useState(null);
  const [editingScheduledId, setEditingScheduledId] = useState(null);
  const [scheduledDraft, setScheduledDraft] = useState(null);
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

  // 🎨 Editor state for formatting
  const [currentFont, setCurrentFont] = useState("Calibri, sans-serif");
  const [currentSize, setCurrentSize] = useState("11pt");
  const [currentColor, setCurrentColor] = useState("#000000");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef(null);

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const isEditableScheduled = () => {
    return scheduledDraft && scheduledDraft.status === "pending";
  };

  const fetchScheduledConversation = async (scheduledMessageId) => {
    try {
      setLoading(true);
      const response = await api.get(
        `${API_BASE_URL}/api/scheduled-messages/${scheduledMessageId}/conversation`
      );
      if (response.data.success) {
        setMessages(response.data.conversationMessages);
        setScheduledDraft(response.data.scheduledMessage);
      }
    } catch (error) {
      console.error("❌ Error fetching scheduled conversation:", error);
    } finally {
      setLoading(false);
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

  const fetchCountry = async () => {
    if (!selectedConversation) return;
    const email =
      selectedConversation.primaryRecipient || selectedConversation.email;
    if (!email) return;
    try {
      const response = await api.get(
        `${API_BASE_URL}/api/inbox/conversation/${email}/country`,
        { params: { emailAccountId: selectedAccount.id } }
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

  const formatSender = (name, email) => {
    if (name && name.trim() !== "" && name !== email) {
      return `${name} &lt;${email}&gt;`;
    }
    return email;
  };

  const formatHeaderAddress = (name, email) => {
    const cleanEmail = email?.trim() || "";
    const cleanName = name?.trim();
    return cleanName ? `${cleanName} &lt;${cleanEmail}&gt;` : cleanEmail;
  };

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

  // ============================================================
  // 🎨 FORMATTING FUNCTIONS
  // ============================================================

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const applyFontFamily = (font) => {
    setCurrentFont(font);
    formatText("fontName", font);
  };

  const applyFontSize = (size) => {
    setCurrentSize(size);
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.style.fontSize = size;
      try {
        range.surroundContents(span);
      } catch (e) {
        const content = range.extractContents();
        span.appendChild(content);
        range.insertNode(span);
      }
    }
    editorRef.current?.focus();
  };

  const applyColor = (color) => {
    setCurrentColor(color);
    formatText("foreColor", color);
    setShowColorPicker(false);
  };

  const applyHighlight = (color) => {
    formatText("backColor", color);
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      formatText("createLink", url);
    }
  };

  const insertHorizontalLine = () => {
    formatText("insertHorizontalRule");
  };

  // 🔥 FORMAT-PRESERVING PASTE
  const handlePaste = (e) => {
    e.preventDefault();

    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedHTML = clipboardData.getData("text/html");
    const pastedText = clipboardData.getData("text/plain");

    const contentToInsert = pastedHTML || pastedText.replace(/\n/g, "<br>");

    const cleanHTML = DOMPurify.sanitize(contentToInsert, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "strike",
        "span",
        "div",
        "font",
        "a",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "table",
        "tr",
        "td",
        "th",
        "tbody",
        "thead",
        "blockquote",
        "pre",
        "code",
        "hr",
      ],
      ALLOWED_ATTR: [
        "style",
        "href",
        "target",
        "class",
        "id",
        "color",
        "size",
        "face",
        "align",
      ],
      ALLOWED_STYLES: {
        "*": {
          color: [/^#[0-9a-fA-F]{3,6}$/],
          "background-color": [/^#[0-9a-fA-F]{3,6}$/],
          "font-size": [/^\d+pt$/, /^\d+px$/],
          "font-family": [/.*/],
          "font-weight": [/^(bold|normal|\d+)$/],
          "font-style": [/^(italic|normal)$/],
          "text-decoration": [/^(underline|line-through|none)$/],
          "text-align": [/^(left|right|center|justify)$/],
        },
      },
    });

    document.execCommand("insertHTML", false, cleanHTML);
    editorRef.current?.focus();
  };

  const handleCopy = (e) => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const clonedSelection = range.cloneContents();
      const div = document.createElement("div");
      div.appendChild(clonedSelection);

      e.clipboardData.setData("text/html", div.innerHTML);
      e.clipboardData.setData("text/plain", selection.toString());
      e.preventDefault();
    }
  };

  // ============================================================
  // 🔥 NEW: FETCH ACCOUNTS AND TEMPLATES
  // ============================================================

  const fetchAccounts = async () => {
    try {
      const response = await api.get(`${API_BASE_URL}/api/accounts`);
      if (response.data.success) {
        setAccounts(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get(`${API_BASE_URL}/api/email-templates`);
      if (response.data.success) {
        setTemplates(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  // ============================================================
  // 🔥 NEW: ACCOUNT & TEMPLATE HANDLERS
  // ============================================================

  // const handleAccountChange = (accountId) => {
  //   const account = accounts.find((acc) => acc.id === parseInt(accountId));
  //   setSelectedFromAccount(account);

  //   // Update replyData.from
  //   if (account) {
  //     setReplyData((prev) => ({
  //       ...prev,
  //       from: account.email,
  //     }));
  //   }

  //   // If template is selected, reapply with new account
  //   if (selectedTemplate) {
  //     applyTemplateWithAccount(selectedTemplate, account);
  //   }
  // };

  // const handleTemplateSelect = (templateId) => {
  //   if (!templateId) {
  //     setSelectedTemplate(null);
  //     return;
  //   }

  //   const template = templates.find((t) => t.id === parseInt(templateId));
  //   setSelectedTemplate(template);

  //   if (selectedFromAccount) {
  //     applyTemplateWithAccount(template, selectedFromAccount);
  //   }
  // };

  // ============================================================
  // FUNCTION 1: applyTemplateWithAccount (FIXED VERSION)
  // Location: Around line 600-650 in MessageView.jsx
  // This version preserves quoted text when applying template
  // ============================================================

  const applyTemplateWithAccount = (template, account) => {
    if (!template || !account) return;

    const message = messages[0];

    const recipientName = extractRecipientName(
      message.fromEmail,
      message.fromName
    );

    // Replace placeholders
    let templateBody = replacePlaceholders(template.bodyHtml, {
      senderName: account.senderName || account.email.split("@")[0],
      clientName: recipientName,
      recipientName: recipientName,
      email: message.fromEmail,
      company: "",
    });

    // 🔥 FIX: Strip all background colors using regex
    templateBody = templateBody.replace(/background-color\s*:\s*[^;]+;?/gi, "");
    templateBody = templateBody.replace(/background\s*:\s*[^;]+;?/gi, "");
    templateBody = templateBody.replace(/bgcolor\s*=\s*["'][^"']*["']/gi, "");

    // 🔥 FIX: Deep clean using DOM manipulation
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = templateBody;

    // Remove background from ALL elements
    const allEls = tempDiv.querySelectorAll("*");
    allEls.forEach((el) => {
      el.style.background = "none";
      el.style.backgroundColor = "transparent";
      el.removeAttribute("bgcolor");
    });

    templateBody = tempDiv.innerHTML;

    // Add signature
    if (account.senderName) {
      templateBody += buildSignature(account.senderName);
    }

    // Preserve quoted message
    const currentContent = editorRef.current?.innerHTML || "";
    const quotedStart = currentContent.indexOf(
      '<hr style="border:none;border-top:1px solid #e5e7eb'
    );

    let quotedText = "";
    if (quotedStart !== -1) {
      quotedText = currentContent.substring(quotedStart);
    }

    const finalContent = `${templateBody}<br/><br/>${quotedText}`;

    // Set in editor
    if (editorRef.current) {
      editorRef.current.innerHTML = finalContent;

      // 🔥 FIX: Ensure editor background is transparent
      editorRef.current.style.background = "transparent";
      editorRef.current.style.backgroundColor = "transparent";

      editorRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();

      if (editorRef.current.firstChild) {
        range.setStart(editorRef.current.firstChild, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    if (template.subject) {
      setReplyData((prev) => ({
        ...prev,
        subject: template.subject,
      }));
    }
  };

  // ============================================================
  // FUNCTION 2: handleTemplateSelect (IMPROVED VERSION)
  // Location: Around line 650-680 in MessageView.jsx
  // Handles clearing template selection properly
  // ============================================================

  const handleTemplateSelect = (templateId) => {
    if (!templateId || templateId === "") {
      // User cleared template selection
      setSelectedTemplate(null);
      return;
    }

    const template = templates.find((t) => t.id === parseInt(templateId));
    setSelectedTemplate(template);

    // Only apply if account is selected
    if (selectedFromAccount && template) {
      applyTemplateWithAccount(template, selectedFromAccount);
    } else if (!selectedFromAccount) {
      // Warn user to select account first
      console.warn("⚠️ Please select a sending account first");
      alert("Please select a sending account before choosing a template");
      setSelectedTemplate(null);
    }
  };

  // ============================================================
  // FUNCTION 3: handleAccountChange (IMPROVED VERSION)
  // Location: Around line 620-640 in MessageView.jsx
  // Re-applies template when account changes
  // ============================================================

  const handleAccountChange = (accountId) => {
    const account = accounts.find((acc) => acc.id === parseInt(accountId));
    setSelectedFromAccount(account);

    // Update replyData.from
    if (account) {
      setReplyData((prev) => ({
        ...prev,
        from: account.email,
      }));
    }

    // If template is selected, reapply with new account
    if (selectedTemplate && account) {
      applyTemplateWithAccount(selectedTemplate, account);
    }
  };

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    fetchAccounts();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedConversation && selectedAccount) {
      setCountry(null);
      setScheduledDraft(null);

      if (
        selectedConversation.isScheduled &&
        selectedConversation.scheduledMessageId
      ) {
        fetchScheduledConversation(selectedConversation.scheduledMessageId);
      } else {
        fetchMessages();
        markConversationAsRead();
      }

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target)
      ) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ============================================================
  // ACTION HANDLERS
  // ============================================================

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

  // ============================================================
  // REPLY HANDLERS
  // ============================================================

  const handleReply = (type, message) => {
    if (!message) return;

    if (scheduledDraft && scheduledDraft.status === "pending") {
      handleReplyWithScheduledDraft(type, message);
      return;
    }

    setReplyingToMessageId(message.id);
    setReplyMode(type);

    const prefix = message.subject?.toLowerCase().startsWith("re:")
      ? ""
      : "Re: ";
    const cleanSubject =
      message.subject?.replace(/^(re:\s*)+/gi, "").trim() || "(No Subject)";
    const newSubject = `${prefix}${cleanSubject}`;
    const myEmail = selectedAccount.email.toLowerCase();

    let to = "";
    let cc = "";

    if (message.direction === "received") {
      to = message.fromEmail;

      if (type === "replyAll") {
        const ccList = [];

        if (message.toEmail) {
          const originalTos = message.toEmail.split(",").map((e) => e.trim());
          originalTos.forEach((email) => {
            const normalized = email.toLowerCase();
            if (
              normalized !== myEmail &&
              normalized !== message.fromEmail.toLowerCase()
            ) {
              ccList.push(email);
            }
          });
        }

        if (message.ccEmail) {
          const originalCcs = message.ccEmail.split(",").map((e) => e.trim());
          originalCcs.forEach((email) => {
            const normalized = email.toLowerCase();
            if (
              normalized !== myEmail &&
              normalized !== message.fromEmail.toLowerCase()
            ) {
              ccList.push(email);
            }
          });
        }

        cc = [...new Set(ccList)].join(", ");
      }
    } else if (message.direction === "sent") {
      to = message.toEmail;
      if (type === "replyAll" && message.ccEmail) {
        cc = message.ccEmail
          .split(",")
          .map((e) => e.trim())
          .filter((e) => e.toLowerCase() !== myEmail)
          .join(", ");
      }
    }

    const quoted = `
  <br/><br/>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />
  <div style="font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
    <b style="font-weight: bold;">From:</b> ${formatSender(
      message.fromName,
      message.fromEmail
    )}<br/>
    <b style="font-weight: bold;">Sent:</b> ${formatLongDate(
      message.sentAt
    )}<br/>
    <b style="font-weight: bold;">To:</b> ${message.toEmail}<br/>
    ${
      message.ccEmail
        ? `<b style="font-weight: bold;">Cc:</b> ${message.ccEmail}<br/>`
        : ""
    }
    <b style="font-weight: bold;">Subject:</b> ${
      message.subject || "(No Subject)"
    }
    <br/><br/>
    ${message.bodyHtml || message.body || ""}
  </div>
`;

    // 🔥 Set default account
    const defaultAccount = accounts.find(
      (acc) => acc.id === selectedAccount?.id
    );
    setSelectedFromAccount(defaultAccount);

    setReplyData({
      from: selectedAccount.email,
      to,
      cc,
      subject: newSubject,
      body: "",
    });

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = `<div><br/></div>${quoted}`;
        editorRef.current.focus();

        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(editorRef.current, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 100);
  };

  const handleReplyWithScheduledDraft = (type, message) => {
    setReplyMode("editScheduled");
    setEditingScheduledId(scheduledDraft.id);

    const normalizeEmail = (value) => {
      if (!value) return "";
      const match = value.match(/<(.+?)>/);
      return match ? match[1].trim() : value.trim();
    };

    const quoted = `
    <br/><br/>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />
    <div style="font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
      <b>From:</b> ${formatSender(message.fromName, message.fromEmail)}<br/>
      <b>Sent:</b> ${formatLongDate(message.sentAt)}<br/>
      <b>To:</b> ${message.toEmail}<br/>
      ${message.ccEmail ? `<b>Cc:</b> ${message.ccEmail}<br/>` : ""}
      <b>Subject:</b> ${message.subject || "(No Subject)"}
      <br/><br/>
      ${message.bodyHtml || message.body || ""}
    </div>
  `;

    let to = normalizeEmail(scheduledDraft.toEmail);
    let cc = scheduledDraft.ccEmail
      ? normalizeEmail(scheduledDraft.ccEmail)
      : "";

    if (type === "replyAll") {
      const myEmail = selectedAccount.email.toLowerCase();
      const ccList = cc ? cc.split(",").map((e) => normalizeEmail(e)) : [];

      const pushIfValid = (email) => {
        const normalized = normalizeEmail(email).toLowerCase();
        if (
          normalized &&
          normalized !== myEmail &&
          normalized !== message.fromEmail?.toLowerCase()
        ) {
          ccList.push(normalized);
        }
      };

      if (message.toEmail) {
        message.toEmail.split(",").forEach(pushIfValid);
      }

      if (message.ccEmail) {
        message.ccEmail.split(",").forEach(pushIfValid);
      }

      cc = [...new Set(ccList)].join(", ");
    }

    // 🔥 Set default account
    const defaultAccount = accounts.find(
      (acc) => acc.id === selectedAccount?.id
    );
    setSelectedFromAccount(defaultAccount);

    setReplyData({
      from: selectedAccount.email,
      to,
      cc,
      subject: scheduledDraft.subject || "",
      body: "",
    });

    setTimeout(() => {
      if (editorRef.current) {
        const fullContent = `${
          scheduledDraft.bodyHtml || ""
        }<br/><br/>${quoted}`;
        editorRef.current.innerHTML = fullContent;
        editorRef.current.focus();

        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(editorRef.current, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 100);
  };

  const handleForward = (type, message) => {
    if (!message) return;

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

    const forwardHeader = `
      <br/>
      <hr style="border:none; border-top:1px solid #E1E1E1; margin:12px 0;">
      <div style="font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
        <b style="font-weight: bold;">From:</b> ${fromHeader}<br>
        <b style="font-weight: bold;">Sent:</b> ${sentDate}<br>
        <b style="font-weight: bold;">To:</b> ${toHeader}<br>
        ${
          ccHeader
            ? `<b style="font-weight: bold;">Cc:</b> ${ccHeader}<br>`
            : ""
        }
        <b style="font-weight: bold;">Subject:</b> ${subjectHeader}
      </div>
      <br/>
    `;

    const forwardedBody = `<div><br/></div>${forwardHeader}<div>${
      message.bodyHtml || message.body
    }</div>`;

    setReplyingToMessageId(message.id);
    setReplyMode("forward");

    const prefix = message.subject?.startsWith("Fwd:") ? "" : "Fwd: ";

    // 🔥 Set default account
    const defaultAccount = accounts.find(
      (acc) => acc.id === selectedAccount?.id
    );
    setSelectedFromAccount(defaultAccount);

    setReplyData({
      from: selectedAccount.email,
      to: "",
      cc: "",
      subject: `${prefix}${message.subject || "(No Subject)"}`,
      body: "",
    });

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = forwardedBody;
        editorRef.current.focus();

        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(editorRef.current, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 100);
  };

  const updateScheduledMessage = async (bodyContent) => {
    const payload = {
      subject: replyData.subject,
      bodyHtml: bodyContent,
      toEmail: replyData.to,
      ccEmail: replyData.cc || null,
    };

    const response = await api.patch(
      `${API_BASE_URL}/api/scheduled-messages/${editingScheduledId}`,
      payload
    );

    if (response.data.success) {
      alert("Scheduled message updated successfully!");
      await fetchScheduledConversation(editingScheduledId);
      closeReplyModal();
    }
  };

  const sendNormalReply = async (bodyContent) => {
    let endpoint;
    if (replyMode === "replyAll")
      endpoint = `${API_BASE_URL}/api/inbox/reply-all`;
    else if (replyMode === "forward")
      endpoint = `${API_BASE_URL}/api/inbox/forward`;
    else endpoint = `${API_BASE_URL}/api/inbox/reply`;

    const payload = {
      emailAccountId: selectedFromAccount?.id || selectedAccount.id,
      fromEmail: replyData.from,
      from: replyData.from,
      to: replyData.to,
      cc: replyData.cc || null,
      subject: replyData.subject,
      body: bodyContent,
      attachments: attachments.map((att) => ({
        filename: att.name,
        url: att.url,
        type: att.type,
        size: att.size,
      })),
    };

    if (replyingToMessageId) {
      payload.replyToMessageId = replyingToMessageId;
      payload.replyToId = replyingToMessageId;
      payload.forwardMessageId = replyingToMessageId;
    }

    const response = await api.post(endpoint, payload);

    if (response.data.success) {
      await fetchMessages();
      closeReplyModal();
      alert("Message sent successfully!");
    }
  };

  const handleSendReply = async () => {
    const bodyContent = editorRef.current?.innerHTML || "";

    if (!bodyContent.trim() || !selectedAccount) {
      alert("Please enter message content");
      return;
    }

    if (!replyData.to.trim()) {
      alert("Please enter a recipient email address");
      return;
    }

    if (!selectedFromAccount) {
      alert("Please select an email account to send from");
      return;
    }

    setIsSending(true);

    try {
      if (replyMode === "editScheduled" && editingScheduledId) {
        await updateScheduledMessage(bodyContent);
      } else {
        await sendNormalReply(bodyContent);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const closeReplyModal = () => {
    setReplyMode(null);
    setReplyingToMessageId(null);
    setEditingScheduledId(null);
    setSelectedFromAccount(null);
    setSelectedTemplate(null);
    setReplyData({
      from: "",
      to: "",
      cc: "",
      subject: "",
      body: "",
    });
    setAttachments([]);
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
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

  const downloadAttachment = (attachment) => {
    if (attachment.storageUrl || attachment.url) {
      window.open(attachment.storageUrl || attachment.url, "_blank");
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

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
            {selectedFolder === "trash" ? (
              <>
                <button
                  onClick={handleRestore}
                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                  title="Restore to Inbox"
                >
                  <RotateCw className="w-4 h-4 text-blue-600 rotate-180" />
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

      {scheduledDraft && scheduledDraft.status === "pending" && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-900">
                Scheduled Email - Will be sent on{" "}
                {new Date(scheduledDraft.sendAt).toLocaleString()}
              </span>
            </div>
            <span className="text-xs text-amber-700">
              💡 Click Reply to edit before sending
            </span>
          </div>
        </div>
      )}

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
                                  {message.fromName || message.fromEmail}
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
                                {scheduledDraft &&
                                scheduledDraft.status === "pending" ? (
                                  <>
                                    <Edit className="w-3.5 h-3.5" /> Edit
                                    Scheduled
                                  </>
                                ) : (
                                  <>
                                    <Reply className="w-3.5 h-3.5" /> Reply
                                  </>
                                )}
                              </button>

                              {!scheduledDraft && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReply("replyAll", message);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                                  >
                                    <ReplyAll className="w-3.5 h-3.5" /> Reply
                                    All
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleForward("forward", message);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                                  >
                                    <Forward className="w-3.5 h-3.5" /> Forward
                                  </button>
                                </>
                              )}
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

      {/* 🔥 REPLY MODAL WITH ACCOUNT & TEMPLATE DROPDOWNS */}
      {replyMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={closeReplyModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h3 className="text-lg font-semibold text-gray-900">
                  {replyMode === "editScheduled" && "Edit Scheduled Message"}
                  {replyMode === "reply" && "Reply"}
                  {replyMode === "replyAll" && "Reply All"}
                  {replyMode === "forward" && "Forward Message"}
                </h3>
              </div>
              <button
                onClick={closeReplyModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(95vh-140px)]">
              <div className="p-6">
                {/* 🔥 Account Selection Dropdown */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From Email Account *
                  </label>
                  <select
                    value={selectedFromAccount?.id || ""}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.email} {acc.senderName && `(${acc.senderName})`}
                      </option>
                    ))}
                  </select>
                  {selectedFromAccount && !selectedFromAccount.senderName && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ No sender name set for this account. Set it in Account
                      Settings.
                    </p>
                  )}
                </div>

                {/* 🔥 Template Selection Dropdown */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Template (Optional)
                  </label>
                  <select
                    value={selectedTemplate?.id || ""}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}{" "}
                        {template.leadStatus && `(${template.leadStatus})`}
                      </option>
                    ))}
                  </select>
                </div>

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
                  {/* Toolbar */}
                  <div className="bg-gradient-to-b from-gray-50 to-gray-100 border-b border-gray-300">
                    <div className="flex items-center gap-2 p-2 flex-wrap">
                      {/* Font Family */}
                      <div className="relative">
                        <select
                          value={currentFont}
                          onChange={(e) => applyFontFamily(e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none pr-8"
                          style={{ minWidth: "140px" }}
                        >
                          {FONT_FAMILIES.map((font) => (
                            <option key={font.value} value={font.value}>
                              {font.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>

                      {/* Font Size */}
                      <div className="relative">
                        <select
                          value={currentSize}
                          onChange={(e) => applyFontSize(e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none pr-8"
                          style={{ minWidth: "70px" }}
                        >
                          {FONT_SIZES.map((size) => (
                            <option key={size.value} value={size.value}>
                              {size.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>

                      <div className="w-px h-6 bg-gray-300"></div>

                      {/* Text Formatting */}
                      <button
                        onClick={() => formatText("bold")}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Bold"
                      >
                        <Bold className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => formatText("italic")}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Italic"
                      >
                        <Italic className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => formatText("underline")}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Underline"
                      >
                        <Underline className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => formatText("strikeThrough")}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Strikethrough"
                      >
                        <Strikethrough className="w-4 h-4 text-gray-700" />
                      </button>

                      <div className="w-px h-6 bg-gray-300"></div>

                      {/* Font Color */}
                      <div className="relative" ref={colorPickerRef}>
                        <button
                          onClick={() => setShowColorPicker(!showColorPicker)}
                          className="p-2 hover:bg-white rounded transition-colors relative"
                          title="Font Color"
                        >
                          <Type className="w-4 h-4 text-gray-700" />
                          <div
                            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-1 rounded"
                            style={{ backgroundColor: currentColor }}
                          ></div>
                        </button>

                        {showColorPicker && (
                          <div
                            className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl p-3 z-50"
                            style={{ width: "240px" }}
                          >
                            <div className="mb-2 text-xs font-semibold text-gray-600">
                              Font Color
                            </div>
                            <div className="grid grid-cols-8 gap-1 mb-3">
                              {COLORS.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => applyColor(color)}
                                  className="w-6 h-6 rounded border-2 hover:scale-110 transition-transform"
                                  style={{
                                    backgroundColor: color,
                                    borderColor:
                                      color === currentColor
                                        ? "#3B82F6"
                                        : "#E5E7EB",
                                  }}
                                  title={color}
                                />
                              ))}
                            </div>
                            <div className="pt-2 border-t border-gray-200">
                              <div className="text-xs font-semibold text-gray-600 mb-2">
                                Highlight Color
                              </div>
                              <div className="grid grid-cols-8 gap-1">
                                {COLORS.slice(8, 32).map((color) => (
                                  <button
                                    key={color}
                                    onClick={() => applyHighlight(color)}
                                    className="w-6 h-6 rounded border-2 border-gray-200 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="w-px h-6 bg-gray-300"></div>

                      {/* Lists */}
                      <button
                        onClick={() => formatText("insertUnorderedList")}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Bullet List"
                      >
                        <List className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => formatText("insertOrderedList")}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Numbered List"
                      >
                        <ListOrdered className="w-4 h-4 text-gray-700" />
                      </button>

                      <div className="w-px h-6 bg-gray-300"></div>

                      {/* Alignment */}
                      <button
                        onClick={() => formatText("justifyLeft")}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Align Left"
                      >
                        <AlignLeft className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => formatText("justifyCenter")}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Align Center"
                      >
                        <AlignCenter className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => formatText("justifyRight")}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Align Right"
                      >
                        <AlignRight className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => formatText("justifyFull")}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Justify"
                      >
                        <AlignJustify className="w-4 h-4 text-gray-700" />
                      </button>

                      <div className="w-px h-6 bg-gray-300"></div>

                      <button
                        onClick={insertLink}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Insert Link"
                      >
                        <LinkIcon className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={insertHorizontalLine}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Horizontal Line"
                      >
                        <Minus className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => formatText("formatBlock", "blockquote")}
                        className="p-2 hover:bg-white rounded transition-colors"
                        title="Quote"
                      >
                        <Quote className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  </div>

                  {/* Editor */}
                  <div
                    ref={editorRef}
                    contentEditable
                    onPaste={handlePaste}
                    onCopy={handleCopy}
                    className="min-h-[400px] max-h-[500px] overflow-y-auto p-4 focus:outline-none transition-all"
                    style={{
                      fontFamily: "Calibri, sans-serif",
                      fontSize: "11pt",
                      lineHeight: "1.5",
                    }}
                    placeholder="Type your message here..."
                  />

                  {attachments.length > 0 && (
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((att, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-300 shadow-sm"
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

                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
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
                        title="Attach files"
                      >
                        <Paperclip className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <button
                      onClick={handleSendReply}
                      disabled={isSending}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow-md"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {replyMode === "editScheduled"
                        ? "Update Schedule"
                        : "Send"}
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
