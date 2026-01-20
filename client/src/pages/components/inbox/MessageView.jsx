// 🔥 FULLY UPDATED: MessageView.jsx - With Outlook Editor Integration

import React, { useState, useEffect, useRef, forwardRef } from "react";
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
  RotateCcw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Strikethrough,
  Minus,
  Quote,
  ArrowUpDown,
  Pencil,
  Plus,
  Eraser,
} from "lucide-react";
import DOMPurify from "dompurify";
import { api } from "../../../pages/api.js";
import {
  replacePlaceholders,
  buildSignature,
  extractRecipientName,
} from "../../../utils/templateReplacer";

// ✅ Import the existing Edit Modal
import FollowUpEditModal from "../../components/FollowUpEditModal.jsx";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ==========================================
// ✅ OUTLOOK EDITOR COMPONENT (COPIED FROM MessageTemplates.jsx)
// ==========================================
const OutlookEditor = forwardRef(({ initialContent, placeholder }, ref) => {
  const editorRef = useRef(null);

  // Toolbar State
  const [fontFamily, setFontFamily] = useState("Calibri");
  const [fontSizeValue, setFontSizeValue] = useState("11");
  const [lineSpacingValue, setLineSpacingValue] = useState("1.15");

  // Color pickers hidden inputs
  const textColorRef = useRef(null);
  const highlightColorRef = useRef(null);

  // Connect parent ref to internal div
  useEffect(() => {
    if (ref) ref.current = editorRef.current;
  }, [ref]);

  // Initialize Content
  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
    document.execCommand("defaultParagraphSeparator", false, "p");
  }, [initialContent]);

  // --- Core Formatting Command ---
  const exec = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  // --- Font Family ---
  const handleFontFamily = (e) => {
    const val = e.target.value;
    setFontFamily(val);
    exec("fontName", val);
  };

  // --- Manual Font Size Handler ---
  const applyFontSize = () => {
    const sizeStr = fontSizeValue + "pt";
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    if (selection.isCollapsed) {
      const span = `<span style="font-size: ${sizeStr}">&nbsp;</span>`;
      document.execCommand("insertHTML", false, span);
    } else {
      applyStyleToSelectionNodes("fontSize", sizeStr);
    }
  };

  // --- Helper: Apply Inline Style to Text Nodes ---
  const applyStyleToSelectionNodes = (styleProp, value) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);

    const tempDiv = document.createElement("div");
    tempDiv.appendChild(range.cloneContents());

    const processNodes = (parentNode) => {
      const children = Array.from(parentNode.childNodes);
      children.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const span = document.createElement("span");
          span.style[styleProp] = value;
          span.textContent = child.textContent;
          parentNode.replaceChild(span, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          processNodes(child);
        }
      });
    };

    processNodes(tempDiv);
    document.execCommand("insertHTML", false, tempDiv.innerHTML);
  };

  // --- Helper: Adjust Font Size Step ---
  const adjustFontSize = (delta) => {
    let current = parseFloat(fontSizeValue);
    if (isNaN(current)) current = 11;

    let newSize = parseFloat((current + delta).toFixed(1));
    if (newSize < 1) newSize = 1;

    setFontSizeValue(newSize.toString());

    const sizeStr = newSize + "pt";
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    if (selection.isCollapsed) {
      document.execCommand(
        "insertHTML",
        false,
        `<span style="font-size:${sizeStr}">&nbsp;</span>`,
      );
    } else {
      applyStyleToSelectionNodes("fontSize", sizeStr);
    }
  };

  // --- Manual Line Spacing Handler ---
  const applyLineSpacing = () => {
    const val = parseFloat(lineSpacingValue);
    const valStr = val.toString();

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    let anchorNode = selection.anchorNode;
    while (
      anchorNode &&
      anchorNode.nodeName !== "P" &&
      anchorNode.nodeName !== "DIV"
    ) {
      anchorNode = anchorNode.parentNode;
    }

    const applyStyle = (element) => {
      if (!element || (element.nodeName !== "P" && element.nodeName !== "DIV"))
        return;
      element.style.lineHeight = valStr;

      if (val <= 1.0) {
        element.style.marginBottom = "0px";
        element.style.marginTop = "0px";
      } else {
        element.style.marginBottom = "12px";
      }
    };

    if (anchorNode) applyStyle(anchorNode);

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    if (container && container.nodeName !== "P") {
      const allPs = container.querySelectorAll("p");
      allPs.forEach((p) => {
        if (selection.containsNode(p, true)) {
          applyStyle(p);
        }
      });
    }
  };

  // --- Colors ---
  const handleColorClick = (type) => {
    if (type === "text") textColorRef.current?.click();
    if (type === "highlight") highlightColorRef.current?.click();
  };

  // --- Manual Select All ---
  const selectAll = () => {
    if (editorRef.current) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  // --- Paste Logic ---
  const handlePaste = (e) => {
    e.preventDefault();
    const htmlData = e.clipboardData.getData("text/html");
    const textData = e.clipboardData.getData("text/plain");

    if (htmlData && htmlData.trim().length > 0) {
      const cleanHtml = htmlData.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );
      document.execCommand("insertHTML", false, cleanHtml);
    } else {
      const paragraphs = textData.split(/\n\s*\n/);
      const normHtml = paragraphs
        .map((para) => {
          const lines = para.trim().replace(/\n/g, "<br>");
          return lines
            ? `<p style="margin:0 0 12px 0;font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.15;">${lines}</p>`
            : "";
        })
        .filter((p) => p)
        .join("");
      document.execCommand("insertHTML", false, normHtml);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 border-b border-gray-300 select-none">
        {/* Group 1: Font Family */}
        <div className="flex items-center border-r border-gray-300 pr-2">
          <div className="relative group">
            <select
              value={fontFamily}
              onChange={handleFontFamily}
              className="appearance-none bg-transparent border border-gray-300 rounded px-2 py-1 text-xs w-32 cursor-pointer hover:bg-white hover:border-blue-400 focus:outline-none"
            >
              <option value="Calibri">Calibri</option>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Tahoma">Tahoma</option>
              <option value="Trebuchet MS">Trebuchet MS</option>
              <option value="Courier New">Courier New</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 w-3 h-3" />
          </div>
        </div>

        {/* Group 2: Font Size (Manual Input) */}
        <div className="flex items-center border-r border-gray-300 pr-2 gap-1">
          <button
            onClick={() => adjustFontSize(-0.1)}
            className="p-1 hover:bg-gray-200 rounded text-gray-700"
            title="Decrease Font Size"
          >
            <Minus className="w-3 h-3" />
          </button>

          <div className="flex items-center border border-gray-300 rounded bg-white">
            <input
              type="number"
              step="0.1"
              min="1"
              value={fontSizeValue}
              onChange={(e) => setFontSizeValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFontSize()}
              className="w-14 text-center text-xs p-0.5 focus:outline-none"
            />
            <span className="text-xs text-gray-500 pr-1">pt</span>
            <button
              onClick={applyFontSize}
              className="px-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded"
              title="Apply Font Size"
            >
              ✓
            </button>
          </div>

          <button
            onClick={() => adjustFontSize(0.1)}
            className="p-1 hover:bg-gray-200 rounded text-gray-700"
            title="Increase Font Size"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Group 3: Basic Formatting */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            onClick={() => exec("bold")}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Bold"
          >
            <Bold className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => exec("italic")}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Italic"
          >
            <Italic className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => exec("underline")}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Underline"
          >
            <Underline className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => exec("strikeThrough")}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Strikethrough"
          >
            <Type className="w-4 h-4 text-gray-600" />
          </button>

          <div className="relative">
            <input
              type="color"
              ref={textColorRef}
              className="hidden"
              onChange={(e) => exec("foreColor", e.target.value)}
            />
            <button
              onClick={() => handleColorClick("text")}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Font Color"
            >
              <div
                className="w-4 h-4 text-gray-600"
                style={{ border: "1px solid #ddd" }}
              >
                A
              </div>
            </button>
          </div>

          <div className="relative">
            <input
              type="color"
              ref={highlightColorRef}
              className="hidden"
              defaultValue="#ffff00"
              onChange={(e) => exec("backColor", e.target.value)}
            />
            <button
              onClick={() => handleColorClick("highlight")}
              className="p-2 hover:bg-gray-200 rounded transition-colors bg-[#ffff00]"
              title="Text Highlight Color"
            >
              <div className="w-4 h-4 bg-transparent"></div>
            </button>
          </div>
        </div>

        {/* Group 4: Paragraph & Alignment */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            onClick={() => exec("insertUnorderedList")}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Bullets"
          >
            <List className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => exec("insertOrderedList")}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Numbering"
          >
            <ListOrdered className="w-4 h-4 text-gray-600" />
          </button>

          <button
            onClick={() => exec("outdent")}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Decrease Indent"
          >
            <ChevronUp className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => exec("indent")}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Increase Indent"
          >
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>

          <button
            onClick={() => exec("justifyLeft")}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => exec("justifyCenter")}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => exec("justifyRight")}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => exec("justifyFull")}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Justify"
          >
            <AlignJustify className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Group 5: Line Spacing (Manual Input) & Utils */}
        <div className="flex items-center gap-2">
          {/* Manual Line Spacing Input */}
          <div className="flex items-center bg-white border border-gray-300 rounded px-1">
            <span className="text-xs text-gray-500 ml-1" title="Line Spacing">
              Spacing:
            </span>
            <input
              type="number"
              step="0.05"
              value={lineSpacingValue}
              onChange={(e) => setLineSpacingValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyLineSpacing()}
              className="w-12 text-center text-xs p-0.5 focus:outline-none"
              min="1"
            />
            <button
              onClick={applyLineSpacing}
              className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 text-xs font-semibold"
              title="Apply Spacing"
            >
              ✓
            </button>
          </div>

          <button
            onClick={() => exec("removeFormat")}
            className="p-2 hover:bg-gray-200 rounded transition-colors text-red-500"
            title="Clear Formatting"
          >
            <Eraser className="w-4 h-4" />
          </button>

          {/* Manual Select All Button */}
          <button
            onClick={selectAll}
            className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
            title="Select All"
          >
            Select All
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[120px] overflow-y-auto p-4 focus:outline-none bg-white resize-y"
        style={{
          fontFamily: "Calibri, Arial, sans-serif",
          fontSize: "11pt",
          lineHeight: "1.15",
          color: "#000000",
          resize: "vertical",
          maxHeight: "70vh",
        }}
        placeholder={placeholder}
        onPaste={handlePaste}
      ></div>
    </div>
  );
});

// ==========================================
// MAIN MESSAGE VIEW COMPONENT
// ==========================================
export default function MessageView({
  selectedAccount,
  selectedConversation,
  selectedFolder,
  onBack,
  onMessageSent,
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

  // ✅ NEW: Lead Edit Modal State
  const [showLeadEditModal, setShowLeadEditModal] = useState(false);
  const [leadEditForm, setLeadEditForm] = useState({});

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  // ============================================================
  // HELPER FUNCTIONS (ALL PRESERVED)
  // ============================================================

  const isEditableScheduled = () => {
    return scheduledDraft && scheduledDraft.status === "pending";
  };

  const fetchScheduledConversation = async (scheduledMessageId) => {
    try {
      setLoading(true);
      const response = await api.get(
        `${API_BASE_URL}/api/scheduled-messages/${scheduledMessageId}/conversation`,
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
        },
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

  const handleMoveToInbox = async () => {
    if (!selectedConversation || !selectedAccount) return;

    try {
      await api.post("/api/inbox/move-to-inbox", {
        conversationIds: [selectedConversation.conversationId],
        accountId: selectedAccount.id,
      });

      alert("Moved to Inbox");

      if (onBack) onBack();
    } catch (err) {
      console.error("Move to inbox failed", err);
      alert("Failed to move message to inbox");
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
        { params: { emailAccountId: selectedAccount.id } },
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
        `${API_BASE_URL}/api/inbox/accounts/${selectedAccount.id}/user`,
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

  const getCollapsedPreview = (html, maxLength = 300) => {
    if (!html) return "";

    const withoutImages = html.replace(/<img[^>]*>/gi, "");
    const cleaned = withoutImages.replace(
      /<(style|script)[^>]*>[\s\S]*?<\/\1>/gi,
      "",
    );

    const tmp = document.createElement("div");
    tmp.innerHTML = cleaned;

    let text = tmp.textContent || tmp.innerText || "";
    text = text.replace(/\s+/g, " ").trim();

    return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
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
  // ✅ LEAD MANAGEMENT LOGIC (ALL PRESERVED)
  // ============================================================

  const handleOpenEditLead = async () => {
    if (!selectedConversation) return;

    let targetEmail = "";

    if (
      selectedConversation.displayEmail &&
      selectedConversation.displayEmail !== "Unknown"
    ) {
      targetEmail = selectedConversation.displayEmail;
    } else {
      const msg = messages[0];
      if (msg) {
        if (msg.direction === "received") {
          targetEmail = msg.fromEmail;
        } else {
          targetEmail = msg.toEmail ? msg.toEmail.split(",")[0].trim() : "";
        }
      }
    }

    const emailMatch = targetEmail.match(/<(.+?)>/);
    const cleanEmail = emailMatch ? emailMatch[1] : targetEmail;

    if (!cleanEmail) {
      alert("Could not determine client email to edit.");
      return;
    }

    try {
      const res = await api.get(
        `${API_BASE_URL}/api/leads/by-email/${cleanEmail}`,
      );

      if (res.data.success && res.data.data) {
        setLeadEditForm(res.data.data);
        setShowLeadEditModal(true);
      } else {
        alert(
          "No existing lead profile found for this email. Please create one in the Leads section first.",
        );
      }
    } catch (error) {
      console.error("Error fetching lead for edit:", error);
      if (error.response && error.response.status === 404) {
        alert(
          "No existing lead profile found for this email. Please create one in the Leads section first.",
        );
      } else {
        alert("Failed to fetch lead details.");
      }
    }
  };

  const handleLeadFormChange = (field, value) => {
    setLeadEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveLead = async () => {
    if (!leadEditForm.id) return;

    try {
      const res = await api.put(
        `${API_BASE_URL}/api/leads/update/${leadEditForm.id}`,
        leadEditForm,
      );

      if (res.data.success) {
        alert("Lead updated successfully!");
        setShowLeadEditModal(false);
        if (leadEditForm.country !== country) {
          setCountry(leadEditForm.country);
        }
      }
    } catch (error) {
      console.error("Error updating lead:", error);
      alert("Failed to update lead details.");
    }
  };

  // ============================================================
  // 🔥 FETCH ACCOUNTS AND TEMPLATES (ALL PRESERVED)
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

  const applyTemplateWithAccount = (template, account) => {
    if (!template || !account) return;

    const message = messages[0];

    const recipientName = extractRecipientName(
      message.fromEmail,
      message.fromName,
    );

    let templateBody = replacePlaceholders(template.bodyHtml, {
      senderName: account.senderName || account.email.split("@")[0],
      clientName: recipientName,
      recipientName: recipientName,
      email: message.fromEmail,
      company: "",
    });

    templateBody = templateBody.replace(/background-color\s*:\s*[^;]+;?/gi, "");
    templateBody = templateBody.replace(/background\s*:\s*[^;]+;?/gi, "");
    templateBody = templateBody.replace(/bgcolor\s*=\s*["'][^"']*["']/gi, "");

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = templateBody;

    const allEls = tempDiv.querySelectorAll("*");
    allEls.forEach((el) => {
      el.style.background = "none";
      el.style.backgroundColor = "transparent";
      el.removeAttribute("bgcolor");
    });

    templateBody = tempDiv.innerHTML;

    if (account.senderName) {
      templateBody += `<br>Best regards,<br><b>${account.senderName}</b>`;
    }

    const currentContent = editorRef.current?.innerHTML || "";
    const quotedStart = currentContent.indexOf(
      '<hr style="border:none;border-top:1px solid #e5e7eb',
    );

    let quotedText = "";
    if (quotedStart !== -1) {
      quotedText = currentContent.substring(quotedStart);
    }

    const finalContent = `${templateBody}<br/><br/>${quotedText}`;

    if (editorRef.current) {
      editorRef.current.innerHTML = finalContent;
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

  const handleTemplateSelect = (templateId) => {
    if (!templateId || templateId === "") {
      setSelectedTemplate(null);
      return;
    }

    const template = templates.find((t) => t.id === parseInt(templateId));
    setSelectedTemplate(template);

    if (selectedFromAccount && template) {
      applyTemplateWithAccount(template, selectedFromAccount);
    } else if (!selectedFromAccount) {
      console.warn("⚠️ Please select a sending account first");
      alert("Please select a sending account before choosing a template");
      setSelectedTemplate(null);
    }
  };

  const handleAccountChange = (accountId) => {
    const account = accounts.find((acc) => acc.id === parseInt(accountId));
    setSelectedFromAccount(account);

    if (account) {
      setReplyData((prev) => ({
        ...prev,
        from: account.email,
      }));
    }

    if (selectedTemplate && account) {
      applyTemplateWithAccount(selectedTemplate, account);
    }
  };

  // ============================================================
  // EFFECTS (ALL PRESERVED)
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
    if (scheduledDraft) {
      if (scheduledDraft.accountId) {
        const linkedAccount = accounts.find(
          (a) => a.id === scheduledDraft.accountId,
        );
        if (linkedAccount) {
          setSelectedFromAccount(linkedAccount);
          setReplyData((prev) => ({ ...prev, from: linkedAccount.email }));
        }
      } else {
        setSelectedFromAccount(null);
        setReplyData((prev) => ({ ...prev, from: "" }));
      }
    }
  }, [scheduledDraft, accounts]);

  useEffect(() => {
    if (messages.length > 0) {
      const latestId = messages[0].id;
      setExpandedMessages({ [latestId]: true });
    }
  }, [messages]);

  // ============================================================
  // ACTION HANDLERS (ALL PRESERVED)
  // ============================================================

  const handleTrashClick = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to move this conversation to Trash?",
    );
    if (!confirmed) return;
    try {
      const response = await api.patch(
        `${API_BASE_URL}/api/inbox/hide-inbox-conversation`,
        {
          conversationId: selectedConversation.conversationId,
          accountId: selectedAccount.id,
        },
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
      },
    );
    if (res.data.success) onBack();
  };

  const handlePermanentDelete = async () => {
    if (
      !window.confirm(
        "WARNING: Once deleted, this message cannot be restored. Proceed?",
      )
    )
      return;
    const res = await api.patch(
      `${API_BASE_URL}/api/inbox/permanent-delete-conversation`,
      {
        conversationId: selectedConversation.conversationId,
        accountId: selectedAccount.id,
      },
    );
    if (res.data.success) onBack();
  };

  // ============================================================
  // REPLY HANDLERS (ALL PRESERVED)
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
      message.fromEmail,
    )}<br/>
    <b style="font-weight: bold;">Sent:</b> ${formatLongDate(
      message.sentAt,
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

    const defaultAccount = accounts.find(
      (acc) => acc.id === selectedAccount?.id,
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

    const defaultAccount = accounts.find(
      (acc) => acc.id === selectedAccount?.id,
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

    const defaultAccount = accounts.find(
      (acc) => acc.id === selectedAccount?.id,
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
      payload,
    );

    if (response.data.success) {
      alert("Scheduled message updated successfully!");
      await fetchScheduledConversation(editingScheduledId);
      closeReplyModal();
    }
  };
  const cleanEmails = (value) =>
    (value || "")
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.includes("@"))
      .join(",");

  const sendNormalReply = async (bodyContent) => {
    let endpoint = `${API_BASE_URL}/api/inbox/reply`;
    if (replyMode === "replyAll")
      endpoint = `${API_BASE_URL}/api/inbox/reply-all`;
    if (replyMode === "forward") endpoint = `${API_BASE_URL}/api/inbox/forward`;

const payload = {
  conversationId: selectedConversation.conversationId,
  emailAccountId: selectedFromAccount.id,
  fromEmail: selectedFromAccount.email,
  from: selectedFromAccount.email,
  to: cleanEmails(replyData.to),
  cc: cleanEmails(replyData.cc) || null,
  subject: replyData.subject,
  body: bodyContent,
  attachments: attachments.map((att) => ({
    filename: att.name,
    type: att.type,
    size: att.size,
    url: att.url || null,
  })),
};



    if (replyingToMessageId) {
      payload.replyToMessageId = replyingToMessageId;
    }

    const response = await api.post(endpoint, payload);

    if (response.data.success) {
      if (onMessageSent) {
        onMessageSent(selectedConversation?.conversationId);
      }
      closeReplyModal();
      alert("Message sent successfully!");
    }
  };

  const handleSendReply = async () => {
    const bodyContent = editorRef.current?.innerHTML || "";

    if (!bodyContent.trim()) {
      alert("Please enter message content");
      return;
    }

    if (!replyData.to.trim()) {
      alert("Please enter a recipient email address");
      return;
    }

    if (!selectedFromAccount) {
      alert("⚠️ Please select a 'From' email account before sending.");
      return;
    }

    setIsSending(true);

    try {
      if (replyMode === "editScheduled" && editingScheduledId) {
        await sendNormalReply(bodyContent);
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
  // RENDER (ALL PRESERVED)
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
            <button
              onClick={handleOpenEditLead}
              className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group"
              title="Edit Lead Info"
            >
              <Pencil className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
            </button>

            {selectedFolder === "spam" && (
              <button
                onClick={handleMoveToInbox}
                className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                title="Move to Inbox"
              >
                <Mail className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
              </button>
            )}

            {selectedFolder === "trash" ? (
              <>
                <button
                  onClick={handleRestore}
                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                  title="Restore to Inbox"
                >
                  <RotateCcw className="w-4 h-4 text-blue-600" />
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

            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="More options"
            >
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
                return msg.direction === "received" || msg.direction === "sent";
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
                              {getCollapsedPreview(message.body, 120)}
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

      {/* 🔥 REPLY MODAL WITH OUTLOOK EDITOR */}
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
                      ⚠️ No sender name set for this account. Set it in Add
                      Account.
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

                {/* ✅ OUTLOOK EDITOR COMPONENT */}
                <div className="mb-4">
                  <OutlookEditor
                    ref={editorRef}
                    initialContent=""
                    placeholder="Type your message here..."
                  />
                </div>

                {/* Attachments */}
                {attachments.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg mb-4">
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

                {/* Footer */}
                <div className="flex items-center justify-between">
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
                    {replyMode === "editScheduled" ? "Update Schedule" : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Lead Edit Modal */}
      {showLeadEditModal && (
        <FollowUpEditModal
          editForm={leadEditForm}
          onChange={handleLeadFormChange}
          onSave={handleSaveLead}
          onClose={() => setShowLeadEditModal(false)}
        />
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
