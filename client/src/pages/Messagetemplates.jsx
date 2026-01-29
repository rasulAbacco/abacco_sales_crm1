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
import OutlookEditor from "../components/OutlookEditor.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

  // const handleSave = async () => {
  //   // Get content from the ref provided by OutlookEditor
  //   const bodyContent = editorRef.current?.innerHTML || "";

  //   if (!formData.name.trim() || !formData.leadStatus || !bodyContent.trim()) {
  //     alert("Please fill required fields (Name, Status, Body)");
  //     return;
  //   }

  //   try {
  //     const payload = { ...formData, bodyHtml: bodyContent };
  //     if (editingTemplate) {
  //       await api.put(
  //         `${API_BASE_URL}/api/email-templates/${editingTemplate.id}`,
  //         payload,
  //       );
  //     } else {
  //       await api.post(`${API_BASE_URL}/api/email-templates`, payload);
  //     }
  //     fetchTemplates();
  //     setShowCreateModal(false);
  //   } catch (err) {
  //     alert("Save failed");
  //   }
  // };
  const handleSave = async () => {
    const bodyContent = editorRef.current?.getHtml() || "";

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
      console.error(err);
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
