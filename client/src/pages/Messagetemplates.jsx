import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  FileText,
  ChevronDown,
  X,
  Bold,
  Italic,
  Underline,
  List,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { api } from "../pages/api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function MessageTemplates() {
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

  const editorRef = useRef(null);

  // Default lead statuses
  const defaultStatuses = [
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
  ];

  const allStatuses = [
    ...defaultStatuses,
    ...customStatuses.map((s) => s.name),
  ];

  useEffect(() => {
    fetchTemplates();
    fetchCustomStatuses();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_BASE_URL}/api/email-templates`);
      if (response.data.success) {
        setTemplates(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomStatuses = async () => {
    try {
      const response = await api.get(`${API_BASE_URL}/api/customStatus`);
      if (response.data.success) {
        setCustomStatuses(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching custom statuses:", error);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      subject: "",
      bodyHtml: "",
      leadStatus: "",
    });
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
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
    if (editorRef.current) {
      editorRef.current.innerHTML = template.bodyHtml;
    }
    setShowCreateModal(true);
  };

  const handleDuplicate = async (template) => {
    try {
      const payload = {
        name: `${template.name} (Copy)`,
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        leadStatus: template.leadStatus,
      };

      const response = await api.post(
        `${API_BASE_URL}/api/email-templates`,
        payload
      );

      if (response.data.success) {
        await fetchTemplates();
        alert("Template duplicated successfully!");
      }
    } catch (error) {
      console.error("Error duplicating template:", error);
      alert("Failed to duplicate template");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      await api.delete(`${API_BASE_URL}/api/email-templates/${id}`);
      await fetchTemplates();
      alert("Template deleted successfully!");
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Failed to delete template");
    }
  };

  const handleSave = async () => {
    const bodyContent = editorRef.current?.innerHTML || "";

    if (!formData.name.trim()) {
      alert("Please enter a template name");
      return;
    }

    if (!formData.leadStatus) {
      alert("Please select a lead status");
      return;
    }

    if (!bodyContent.trim()) {
      alert("Please enter template content");
      return;
    }

    try {
      const payload = {
        name: formData.name,
        subject: formData.subject || "",
        bodyHtml: bodyContent,
        leadStatus: formData.leadStatus,
      };

      if (editingTemplate) {
        await api.put(
          `${API_BASE_URL}/api/email-templates/${editingTemplate.id}`,
          payload
        );
        alert("Template updated successfully!");
      } else {
        await api.post(`${API_BASE_URL}/api/email-templates`, payload);
        alert("Template created successfully!");
      }

      await fetchTemplates();
      setShowCreateModal(false);
      setFormData({ name: "", subject: "", bodyHtml: "", leadStatus: "" });
    } catch (error) {
      console.error("Error saving template:", error);
      alert("Failed to save template");
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

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.subject || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus
      ? template.leadStatus === filterStatus
      : true;

    return matchesSearch && matchesStatus;
  });

  // Group templates by lead status
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const status = template.leadStatus || "No Status";
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(template);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Message Templates
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage reusable email templates for different lead
              statuses
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates by name or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[200px]"
            >
              <option value="">All Lead Statuses</option>
              {allStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText className="w-12 h-12 opacity-20 mb-4" />
            <p className="text-lg font-medium">No templates found</p>
            <p className="text-sm mt-2">
              {searchQuery || filterStatus
                ? "Try adjusting your search or filter"
                : "Create your first template to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([status, templates]) => (
              <div key={status}>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  {status}
                  <span className="text-sm text-gray-500 font-normal">
                    ({templates.length})
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      {/* Template Header */}
                      <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {template.name}
                          </h3>
                          {template.subject && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              Subject: {template.subject}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleEdit(template)}
                            className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(template)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="p-1.5 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        </div>
                      </div>

                      {/* Template Body Preview */}
                      <div className="px-4 py-3">
                        <div
                          className="text-sm text-gray-600 line-clamp-3 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: template.bodyHtml.substring(0, 200),
                          }}
                        />
                      </div>

                      {/* Template Footer */}
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          Used {template.useCount || 0} time
                          {template.useCount !== 1 ? "s" : ""}
                        </span>
                        <span>
                          {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-lg font-semibold text-white">
                {editingTemplate ? "Edit Template" : "Create New Template"}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Follow-up after quote"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Lead Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lead Status *
                </label>
                <div className="relative">
                  <select
                    value={formData.leadStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, leadStatus: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  >
                    <option value="">Select Lead Status</option>
                    {allStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Subject Line */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="Optional default subject"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Body *
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-300">
                    <button
                      onClick={() => formatText("bold")}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Bold"
                      type="button"
                    >
                      <Bold className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => formatText("italic")}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Italic"
                      type="button"
                    >
                      <Italic className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => formatText("underline")}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Underline"
                      type="button"
                    >
                      <Underline className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <button
                      onClick={() => formatText("insertUnorderedList")}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Bullet List"
                      type="button"
                    >
                      <List className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={insertLink}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Insert Link"
                      type="button"
                    >
                      <LinkIcon className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  {/* Editor */}
                  <div
                    ref={editorRef}
                    contentEditable
                    className="min-h-[300px] max-h-[400px] overflow-y-auto p-4 focus:outline-none"
                    style={{
                      fontFamily: "Calibri, sans-serif",
                      fontSize: "11pt",
                      lineHeight: "1.35",
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tip: You can use placeholders like {"{client_name}"},{" "}
                  {"{company}"}, {"{email}"} that will be replaced when sending
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {editingTemplate ? "Update Template" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
