import React, { useState, useEffect, useRef, forwardRef } from "react";
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
  Bold,
  Italic,
  Underline,
  List,
  Link as LinkIcon,
  Type,
  Eraser,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  RotateCcw,
  ListOrdered,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ==========================================
// ✅ UPDATED: OUTLOOK EDITOR (Manual Inputs)
// ==========================================
const OutlookEditor = forwardRef(({ initialContent, placeholder }, ref) => {
  const editorRef = useRef(null);

  // Toolbar State
  const [fontFamily, setFontFamily] = useState("Calibri");
  const [fontSizeValue, setFontSizeValue] = useState("11"); // Default 11
  const [lineSpacingValue, setLineSpacingValue] = useState("1.15"); // Default 1.15

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

  // --- ✅ MANUAL FONT SIZE HANDLER (Robust) ---
  const applyFontSize = () => {
    const sizeStr = fontSizeValue + "pt";
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    // If cursor is blinking (no selection)
    if (selection.isCollapsed) {
      const span = `<span style="font-size: ${sizeStr}">&nbsp;</span>`;
      document.execCommand("insertHTML", false, span);
    } else {
      // ROBUST: Iterate text nodes to preserve paragraph structure
      applyStyleToSelectionNodes("fontSize", sizeStr);
    }
  };

  // --- Helper: Apply Inline Style to Text Nodes (Prevents structure destruction) ---
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

  // --- ✅ MANUAL LINE SPACING HANDLER ---
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

      // Strict Logic: 1.0 means no spacing. > 1.0 means standard spacing.
      if (val <= 1.0) {
        element.style.marginBottom = "0px";
        element.style.marginTop = "0px";
      } else {
        // Outlook default margin ~ 10-12px
        element.style.marginBottom = "12px";
      }
    };

    if (anchorNode) applyStyle(anchorNode);

    // Apply to all paragraphs in selection
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

  // --- Paste Logic (Keep Format, Enforce Defaults on Plain Text) ---
  const handlePaste = (e) => {
    e.preventDefault();
    const htmlData = e.clipboardData.getData("text/html");
    const textData = e.clipboardData.getData("text/plain");

    if (htmlData && htmlData.trim().length > 0) {
      // Rich Paste: Keep format as requested ("keep format")
      // We strip scripts for safety
      const cleanHtml = htmlData.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );
      document.execCommand("insertHTML", false, cleanHtml);
    } else {
      // Plain Text: Apply User Defaults (Calibri, 1.15)
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
          resize: "vertical", // 👈 enables dragger
          maxHeight: "70vh", // 👈 optional safety limit
        }}
        placeholder={placeholder}
        onPaste={handlePaste}
      ></div>
    </div>
  );
});

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
          (acc) => acc.email === e.target.value,
        );
        setComposeData({
          ...composeData,
          from: e.target.value,
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
  const [showQuotedText, setShowQuotedText] = useState(true);

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
          `${API_BASE_URL}/api/forwardedLeads/assigned/${user.id}`,
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

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const result = await res.json();

        if (
          !result.success ||
          !Array.isArray(result.data) ||
          result.data.length === 0
        ) {
          setAccounts([]);
          setPopupMessage(
            "No email account found. Please add an email account.",
          );
          setShowAddAccountPopup(true);
          return;
        }

        setAccounts(result.data);
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

  const handleSendEmail = async (payload) => {
    if (!payload.emailAccountId) {
      alert(
        "⚠️ Email account is not selected. Please select a 'From' address.",
      );
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/smtp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        setShowQuotedText(true);
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

  // ✅ Helper: Format sender like "Name <email>"
  const formatSender = (name, email) => {
    const cleanEmail = email?.trim() || "";
    const cleanName = name?.trim();
    if (cleanName && cleanName !== cleanEmail) {
      return `${cleanName} &lt;${cleanEmail}&gt;`;
    }
    return cleanEmail;
  };

  // ✅ Helper: Format long date like Outlook
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

  // ✅ Clean forwarded body - remove existing headers
  function cleanForwardedBody(raw) {
    if (!raw) return "";

    return raw
      .replace(/-{2,}\s*Forwarded message\s*-{2,}/gi, "")
      .replace(/Forwarded message\s*-{2,}/gi, "")
      .replace(/^Forwarded message.*$/gim, "")
      .replace(/<hr[^>]*>/gi, "")
      .trim();
  }

  // ✅ Parse From field to extract name and email
  function parseFromField(fromStr) {
    if (!fromStr) return { name: "", email: "" };

    const match = fromStr.match(/^(.+?)\s*<([^>]+)>$|^([^\s]+@[^\s]+)$/);

    if (match) {
      if (match[1] && match[2]) {
        return { name: match[1].trim(), email: match[2].trim() };
      } else if (match[3]) {
        return { name: "", email: match[3].trim() };
      }
    }

    return { name: "", email: fromStr.trim() };
  }

  // ✅ Preserve paragraphs by converting line breaks to HTML
  function formatBodyWithParagraphs(text) {
    if (!text) return "";

    if (/<br|<p|<div/i.test(text)) {
      return text;
    }

    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const paragraphs = escaped.split(/\n\s*\n/);

    return paragraphs
      .map((para) => {
        const lines = para.trim().replace(/\n/g, "<br>");
        return lines
          ? `<p style="margin:0 0 12px 0;line-height:1.15;">${lines}</p>` // Updated to 1.15
          : "";
      })
      .filter((p) => p)
      .join("");
  }

  // ✅ Build proper Outlook-style forward block
  function buildForwardBlock(lead) {
    const cleanBody = cleanForwardedBody(lead.body || "");

    const fromMatch = cleanBody.match(/From:\s*([^\n]+)/i);
    const sentMatch = cleanBody.match(/Sent:\s*([^\n]+)/i);
    const toMatch = cleanBody.match(/To:\s*([^\n]+)/i);
    const ccMatch = cleanBody.match(/Cc:\s*([^\n]+)/i);
    const subjectMatch = cleanBody.match(/Subject:\s*([^\n]+)/i);

    let actualBody = cleanBody;
    if (fromMatch || sentMatch) {
      const headerEnd = Math.max(
        fromMatch?.index || 0,
        sentMatch?.index || 0,
        toMatch?.index || 0,
        ccMatch?.index || 0,
        subjectMatch?.index || 0,
      );

      const bodyStart = cleanBody.indexOf("\n\n", headerEnd);
      if (bodyStart > 0) {
        actualBody = cleanBody.substring(bodyStart + 2);
      } else if (subjectMatch) {
        const subjectEnd = subjectMatch.index + subjectMatch[0].length;
        actualBody = cleanBody.substring(subjectEnd).replace(/^\n+/, "");
      }
    }

    const fromField = fromMatch?.[1] || lead.client || "";
    const parsedFrom = parseFromField(fromField);
    const fromDisplay = parsedFrom.name
      ? `${parsedFrom.name} &lt;${parsedFrom.email}&gt;`
      : parsedFrom.email;

    const sent = lead.date ? formatLongDate(lead.date) : sentMatch?.[1] || "";
    const to = toMatch?.[1] || lead.email || "";
    const cc = ccMatch?.[1] || lead.cc || "";
    const subject = subjectMatch?.[1] || lead.subject || "(No Subject)";

    const formattedBody = formatBodyWithParagraphs(actualBody);

    const header = `
<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000000;line-height:1.15;margin:0;padding:0;">

  <!-- single line before From -->
  <hr style="border:none;border-top:1px solid #E1E1E1;margin:12px 0;" />

  <p style="margin:0 0 2px 0;"><b>From:</b> ${fromDisplay}</p>
  <p style="margin:0 0 2px 0;"><b>Sent:</b> ${sent}</p>
  <p style="margin:0 0 2px 0;"><b>To:</b> ${to}</p>
  ${cc ? `<p style="margin:0 0 2px 0;"><b>Cc:</b> ${cc}</p>` : ""}
  <p style="margin:0 0 12px 0;"><b>Subject:</b> ${subject}</p>

</div>`;
    return `${header}<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.15;">${formattedBody}</div>`;
  }

  const handleOpenComposePopup = (lead) => {
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
      cc: "",
      ccList: ccList,
      subject: `Fwd: ${lead.subject || "No Subject"}`,
      body: "",
      attachments: [],
    });

    const structured = buildForwardBlock(lead);
    setForwardedContent(structured);
    setShowQuotedText(true);

    setShowComposePopup(true);

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
        editorRef.current.focus();
      }
    }, 100);
  };

  // ✅ Build final email body combining new message and forwarded content
  //   const buildFinalEmailBody = () => {
  //     const userHtml = editorRef.current?.innerHTML || "";
  //     const forwardedHtml = showQuotedText
  //       ? forwardedEditorRef.current?.innerHTML || forwardedContent
  //       : "";

  //     return `
  // <div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000000;line-height:1.15;">
  //  ${userHtml}
  //  ${forwardedHtml ? "<br>" + forwardedHtml : ""}
  // </div>`.trim();
  //   };
  const buildFinalEmailBody = () => {
    let userHtml = editorRef.current?.innerHTML || "";
    const forwardedHtml = showQuotedText
      ? forwardedEditorRef.current?.innerHTML || forwardedContent
      : "";

    // ✅ Ensure first line always exists (Outlook behavior)
    if (!userHtml || userHtml.trim() === "") {
      userHtml = `<p style="margin:0 0 12px 0;line-height:1.15;">&#8203;</p>`;
    }

    return `
<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000000;line-height:1.15;">
  ${userHtml}
  ${forwardedHtml ? forwardedHtml : ""}
</div>`.trim();
  };

  const handleUpdateResult = async (index) => {
    const lead = leads[index];

    try {
      await fetch(`${API_BASE_URL}/api/forwardedLeads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: lead.result }),
      });

      await fetch(`${API_BASE_URL}/api/lead-email-meta/${lead.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: lead.email,
          cc: lead.cc,
          country: lead.country,
        }),
      });

      setSuccessMessage("Saved successfully!");
      setShowSuccessMessage(true);

      setTimeout(() => {
        if (user?.id) {
          const fetchLeads = async () => {
            try {
              const res = await fetch(
                `${API_BASE_URL}/api/forwardedLeads/assigned/${user.id}`,
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

        setShowSuccessMessage(false);
      }, 500);
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
      {/* Add global styles for the component */}
      <style>{`
        .forwarded-content p {
          margin: 0 0 12px 0;
          line-height: 1.15;
        }
        .forwarded-content p:last-child {
          margin-bottom: 0;
        }
        .forwarded-content br {
          line-height: 1.15;
        }
        [contenteditable] p {
          margin: 0 0 12px 0;
        }
        [contenteditable] p:last-child {
          margin-bottom: 0;
        }
        [contenteditable]:empty:before {
          content: attr(placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
      `}</style>

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
                <div
                  className="absolute inset-0 bg-gradient-to-br from-white/20 via-blue-50/10 to-purple-50/20 
                      group-hover:from-white/40 group-hover:via-blue-100/20 group-hover:to-purple-100/40 
                      transition-all duration-700 pointer-events-none"
                />

                <div className="absolute inset-0 rounded-2xl border border-white/20 group-hover:border-blue-200/50 transition-all duration-700 pointer-events-none" />

                <div className="relative p-6 sm:p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
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

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-800 font-medium bg-white/40 border border-white/30 px-3 py-2 rounded-lg shadow-sm backdrop-blur-md">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>
                          {new Date(lead.date).toLocaleDateString("en-IN")}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border backdrop-blur-md bg-white/40 border-white/30 shadow-sm ${getLeadTypeColor(
                          lead.leadType,
                        )}`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {lead.leadType || "N/A"}
                      </span>
                    </div>

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

      {/* ✅ IMPROVED Compose Popup Modal */}
      {showComposePopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Forward Email</h2>
                <p className="text-sm text-blue-100 mt-1">
                  Forward lead message
                </p>
              </div>
              <button
                onClick={() => {
                  setShowComposePopup(false);
                  setShowQuotedText(true);
                }}
                className="bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="space-y-4">
                  {/* FROM */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700 w-16">
                      From:
                    </label>
                    <select
                      value={composeData.from}
                      onChange={(e) => {
                        const selectedAccount = accounts.find(
                          (acc) => acc.email === e.target.value,
                        );
                        setComposeData({
                          ...composeData,
                          from: e.target.value,
                          emailAccountId: selectedAccount
                            ? selectedAccount.id
                            : null,
                        });
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700 w-16">
                      To:
                    </label>
                    <input
                      type="email"
                      placeholder="Recipient email"
                      value={composeData.to}
                      onChange={(e) =>
                        setComposeData({ ...composeData, to: e.target.value })
                      }
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* CC Section */}
                  <div className="flex items-start gap-2">
                    <label className="text-sm font-semibold text-gray-700 w-16 pt-2">
                      Cc:
                    </label>
                    <div className="flex-1 space-y-2">
                      {(composeData.ccList && composeData.ccList.length > 0
                        ? composeData.ccList
                        : composeData.cc
                          ? [composeData.cc]
                          : [""]
                      ).map((cc, idx) => (
                        <div key={idx} className="flex items-center gap-2">
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
                              setComposeData({
                                ...composeData,
                                ccList: newList,
                              });
                            }}
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={() => {
                              const newList = (
                                composeData.ccList ||
                                (composeData.cc ? [composeData.cc] : [""])
                              ).filter((_, i) => i !== idx);
                              setComposeData({
                                ...composeData,
                                ccList: newList,
                              });
                            }}
                            className="bg-red-100 text-red-600 rounded-lg px-3 py-2 text-sm hover:bg-red-200 transition-colors"
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
                  </div>

                  {/* SUBJECT */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700 w-16">
                      Subject:
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
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* ✅ NEW OUTLOOK EDITOR REPLACEMENT */}
                <div className="mt-6">
                  <OutlookEditor
                    ref={editorRef}
                    initialContent={composeData.body}
                    placeholder="Type your message here..."
                  />
                </div>

                {/* ✅ Show/Hide Quoted Text Toggle */}
                <div className="border-t border-gray-200 mt-0">
                  <button
                    onClick={() => setShowQuotedText(!showQuotedText)}
                    className="w-full px-4 py-2 flex items-center justify-center gap-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg leading-none">•••</span>
                    <span>
                      {showQuotedText ? "Hide" : "Show"} forwarded message
                    </span>
                  </button>

                  {/* ✅ Forwarded Message - Editable and Well-Formatted */}
                  {showQuotedText && (
                    <div
                      ref={forwardedEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="p-4 bg-gray-50 border-t border-gray-200 max-h-[300px] overflow-y-auto focus:outline-none forwarded-content"
                      style={{
                        fontFamily: "Calibri, Arial, sans-serif",
                        fontSize: "11pt",
                        lineHeight: "1.15",
                        color: "#000000",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: forwardedContent,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowComposePopup(false);
                  setShowQuotedText(true);
                }}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  const ccString = (
                    composeData.ccList || [composeData.cc || ""]
                  )
                    .filter((c) => c.trim() !== "")
                    .join(", ");

                  const finalPayload = {
                    ...composeData,
                    cc: ccString,
                    body: buildFinalEmailBody(),
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
