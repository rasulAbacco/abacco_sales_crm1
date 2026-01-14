import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import DOMPurify from "dompurify";
import { api } from "../pages/api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🎨 Constants from MessageView.jsx
const FONT_FAMILIES = [
  { value: "Calibri, sans-serif", label: "Calibri" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "Tahoma, sans-serif", label: "Tahoma" },
];

const FONT_SIZES = [
  { value: "8pt", label: "8" },
  { value: "9pt", label: "9" },
  { value: "10pt", label: "10" },
  { value: "11pt", label: "11" },
  { value: "12pt", label: "12" },
  { value: "14pt", label: "14" },
  { value: "16pt", label: "16" },
  { value: "18pt", label: "18" },
  { value: "24pt", label: "24" },
];

const COLORS = [
  "#000000",
  "#444444",
  "#666666",
  "#999999",
  "#CCCCCC",
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
];

const LINE_HEIGHTS = [
  { value: "1.0", label: "Single" },
  { value: "1.15", label: "1.15" },
  { value: "1.5", label: "1.5" },
  { value: "2.0", label: "Double" },
  { value: "2.5", label: "2.5" },
  { value: "3.0", label: "3.0" },
];

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

  // 🔥 New Editor States (From MessageView)
  const [currentFont, setCurrentFont] = useState("Calibri, sans-serif");
  const [currentSize, setCurrentSize] = useState("11pt");
  const [currentColor, setCurrentColor] = useState("#000000");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLineHeightPicker, setShowLineHeightPicker] = useState(false);

  const editorRef = useRef(null);
  const colorPickerRef = useRef(null);

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

  useEffect(() => {
    if (showCreateModal && editorRef.current) {
      editorRef.current.innerHTML = formData.bodyHtml || "<div><br/></div>";
    }
  }, [showCreateModal]);

  // Handle outside clicks for color picker
  useEffect(() => {
    const handleClick = (e) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target)
      ) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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

  // --- Formatting Logic (From MessageView) ---
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

  const applyLineHeight = (value) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);

    const findBlock = (node) => {
      const tags = ["P", "DIV", "LI", "H1", "H2", "H3", "BLOCKQUOTE"];
      let curr = node;
      while (curr && curr !== editorRef.current) {
        if (curr.nodeType === 1 && tags.includes(curr.tagName)) return curr;
        curr = curr.parentNode;
      }
      return null;
    };

    const block = findBlock(range.startContainer);
    if (block) {
      block.style.lineHeight = value;
    } else {
      document.execCommand("formatBlock", false, "div");
      const newBlock = findBlock(
        window.getSelection().getRangeAt(0).startContainer
      );
      if (newBlock) newBlock.style.lineHeight = value;
    }
    setShowLineHeightPicker(false);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedHTML = clipboardData.getData("text/html");
    const pastedText = clipboardData.getData("text/plain");
    const content = pastedHTML || pastedText.replace(/\n/g, "<br>");

    const cleanHTML = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "span",
        "div",
        "font",
        "a",
        "ul",
        "ol",
        "li",
        "hr",
        "blockquote",
      ],
      ALLOWED_ATTR: ["style", "href", "color", "size", "face", "align"],
    });

    document.execCommand("insertHTML", false, cleanHTML);
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
        payload
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
          payload
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

  const insertPlaceholder = (placeholder) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand("insertHTML", false, `<span>${placeholder}</span>`);
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

      {/* 🔥 NEW RICH TEXT EDITOR MODAL 🔥 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
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

              {/* Toolbar & Editor (The MessageView UI) */}
              <div className="border border-gray-300 rounded-xl overflow-hidden flex flex-col">
                <div className="bg-gray-50 border-b p-2 flex flex-wrap gap-1 items-center">
                  {/* Font Family Dropdown */}
                  <select
                    value={currentFont}
                    onChange={(e) => applyFontFamily(e.target.value)}
                    className="text-xs border p-1 rounded bg-white cursor-pointer"
                  >
                    {FONT_FAMILIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  {/* Font Size Dropdown */}
                  <select
                    value={currentSize}
                    onChange={(e) => applyFontSize(e.target.value)}
                    className="text-xs border p-1 rounded bg-white cursor-pointer w-14"
                  >
                    {FONT_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>

                  <div className="w-px h-6 bg-gray-300 mx-1" />

                  {/* Formatting buttons */}
                  <button
                    onClick={() => formatText("bold")}
                    className="p-2 hover:bg-gray-200 rounded"
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("italic")}
                    className="p-2 hover:bg-gray-200 rounded"
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("underline")}
                    className="p-2 hover:bg-gray-200 rounded"
                    title="Underline"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("strikeThrough")}
                    className="p-2 hover:bg-gray-200 rounded"
                    title="Strikethrough"
                  >
                    <Strikethrough className="w-4 h-4" />
                  </button>

                  <div className="w-px h-6 bg-gray-300 mx-1" />

                  {/* Alignment */}
                  <button
                    onClick={() => formatText("justifyLeft")}
                    className="p-2 hover:bg-gray-200 rounded"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("justifyCenter")}
                    className="p-2 hover:bg-gray-200 rounded"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("justifyRight")}
                    className="p-2 hover:bg-gray-200 rounded"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>

                  <div className="w-px h-6 bg-gray-300 mx-1" />

                  {/* List & Color */}
                  <button
                    onClick={() => formatText("insertUnorderedList")}
                    className="p-2 hover:bg-gray-200 rounded"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("insertOrderedList")}
                    className="p-2 hover:bg-gray-200 rounded"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>

                  <div className="relative" ref={colorPickerRef}>
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="p-2 hover:bg-gray-200 rounded relative"
                    >
                      <Type className="w-4 h-4" />
                      <div
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5"
                        style={{ backgroundColor: currentColor }}
                      />
                    </button>
                    {showColorPicker && (
                      <div className="absolute top-10 left-0 bg-white border shadow-xl p-2 grid grid-cols-6 gap-1 z-50 rounded-lg">
                        {COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => {
                              setCurrentColor(c);
                              formatText("foreColor", c);
                              setShowColorPicker(false);
                            }}
                            className="w-5 h-5 rounded border"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-px h-6 bg-gray-300 mx-1" />

                  {/* Line Height Picker */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setShowLineHeightPicker(!showLineHeightPicker)
                      }
                      className="p-2 hover:bg-gray-200 rounded flex gap-1 items-center"
                    >
                      <ArrowUpDown className="w-4 h-4" />{" "}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showLineHeightPicker && (
                      <div className="absolute top-10 left-0 bg-white border shadow-xl py-1 z-50 w-28 rounded-lg">
                        {LINE_HEIGHTS.map((lh) => (
                          <button
                            key={lh.value}
                            onClick={() => applyLineHeight(lh.value)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50"
                          >
                            {lh.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => formatText("insertHorizontalRule")}
                    className="p-2 hover:bg-gray-200 rounded"
                    title="Horizontal Line"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => formatText("formatBlock", "blockquote")}
                    className="p-2 hover:bg-gray-200 rounded"
                    title="Quote"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const url = prompt("Link URL:");
                      if (url) formatText("createLink", url);
                    }}
                    className="p-2 hover:bg-gray-200 rounded"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Placeholders Guide Bar */}
                {/* <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-3">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">
                    Quick Add:
                  </span>
                  {[
                    "{{clientName}}",
                    "{{senderName}}",
                    "{{email}}",
                    "{{company}}",
                  ].map((p) => (
                    <button
                      key={p}
                      onClick={() => insertPlaceholder(p)}
                      className="text-[10px] bg-white border border-amber-200 px-2 py-0.5 rounded hover:bg-amber-100 transition-colors font-mono"
                    >
                      {p}
                    </button>
                  ))}
                </div> */}

                <div
                  ref={editorRef}
                  contentEditable
                  onPaste={handlePaste}
                  className="min-h-[350px] max-h-[450px] overflow-y-auto p-6 focus:outline-none transition-all prose prose-sm max-w-none"
                  style={{
                    fontFamily: currentFont,
                    fontSize: currentSize,
                    lineHeight: "1.5",
                  }}
                />
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
