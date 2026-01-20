import React, { useState, useEffect, useRef, forwardRef } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Strikethrough,
  Minus,
  Quote,
  ArrowUpDown,
  Type as FontIcon,
  Eraser,
  RotateCcw,
  Save,
  Send,
  User,
  Tag,
  MessageSquare,
} from "lucide-react";
import DOMPurify from "dompurify";
import { api } from "../pages/api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ==========================================
// ✅ COPIED: OUTLOOK EDITOR (Manual Inputs) FROM FILE 1
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

export default function MessageTemplates() {
  // Existing States
  const [templates, setTemplates] = useState([]);
  const [customStatuses, setCustomStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    bodyHtml: "",
    leadStatus: "",
  });

  // Ref for the Outlook Editor
  const editorRef = useRef(null);

  const allStatuses = [
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
    ...customStatuses.map((s) => s.name),
  ];

  useEffect(() => {
    fetchTemplates();
    fetchCustomStatuses();
  }, []);

  // --- API Functions (Unchanged) ---
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_BASE_URL}/api/email-templates`);
      if (response.data.success) setTemplates(response.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomStatuses = async () => {
    try {
      const response = await api.get(`${API_BASE_URL}/api/customStatus`);
      if (response.data.success) setCustomStatuses(response.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Action Handlers ---
  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: "", subject: "", bodyHtml: "", leadStatus: "" });
    setShowCreateModal(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject || "",
      bodyHtml: template.bodyHtml,
      leadStatus: template.leadStatus || "",
    });
    setShowCreateModal(true);
  };

  const handleDuplicate = async (template) => {
    try {
      const payload = { ...template, name: `${template.name} (Copy)` };
      const res = await api.post(
        `${API_BASE_URL}/api/email-templates`,
        payload,
      );
      if (res.data.success) {
        fetchTemplates();
        alert("Template duplicated!");
      }
    } catch (err) {
      alert("Duplicate failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await api.delete(`${API_BASE_URL}/api/email-templates/${id}`);
      fetchTemplates();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleSave = async () => {
    // Get content from the ref provided by OutlookEditor
    const bodyContent = editorRef.current?.innerHTML || "";

    if (!formData.name.trim() || !formData.leadStatus || !bodyContent.trim()) {
      alert("Please fill required fields (Name, Status, Body)");
      return;
    }

    try {
      const payload = { ...formData, bodyHtml: bodyContent };
      if (editingTemplate) {
        await api.put(
          `${API_BASE_URL}/api/email-templates/${editingTemplate.id}`,
          payload,
        );
      } else {
        await api.post(`${API_BASE_URL}/api/email-templates`, payload);
      }
      fetchTemplates();
      setShowCreateModal(false);
    } catch (err) {
      alert("Save failed");
    }
  };

  // Filtering Logic (Unchanged)
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.subject || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus ? t.leadStatus === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  const groupedTemplates = filteredTemplates.reduce((acc, t) => {
    const status = t.leadStatus || "No Status";
    if (!acc[status]) acc[status] = [];
    acc[status].push(t);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header Area */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Message Templates
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage reusable email content with rich formatting
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Template
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white min-w-[200px]"
          >
            <option value="">All Lead Statuses</option>
            {allStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTemplates).map(([status, items]) => (
              <div key={status}>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full" /> {status}{" "}
                  ({items.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all group"
                    >
                      <div className="p-4 border-b border-gray-50 flex justify-between items-start">
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">
                            {t.name}
                          </h3>
                          <p className="text-xs text-gray-400 truncate mt-1">
                            {t.subject || "No Subject"}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(t)}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(t)}
                            className="p-1.5 hover:bg-gray-50 text-gray-600 rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <div
                          className="text-sm text-gray-600 line-clamp-2 h-10 prose prose-sm"
                          dangerouslySetInnerHTML={{ __html: t.bodyHtml }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ UPDATED: MODAL WITH OUTLOOK EDITOR ✅ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              <h2 className="font-bold text-lg">
                {editingTemplate ? "Edit Template" : "New Template"}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Initial Outreach"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Trigger Lead Status *
                  </label>
                  <select
                    value={formData.leadStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, leadStatus: e.target.value })
                    }
                    className="w-full mt-1 px-4 py-2 border rounded-lg outline-none"
                  >
                    <option value="">Select Status</option>
                    {allStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Subject..."
                />
              </div>

              {/* ✅ REPLACED TOOLBAR & EDITOR WITH OUTLOOK EDITOR COMPONENT */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Email Body *
                </label>
                <div className="mt-1">
                  <OutlookEditor
                    ref={editorRef}
                    initialContent={formData.bodyHtml}
                    placeholder="Type your template content here..."
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-200"
              >
                {editingTemplate ? "Update Template" : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
