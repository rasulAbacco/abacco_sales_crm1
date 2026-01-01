import React, { useEffect, useState } from "react";
import {
  Edit2,
  Calendar,
  Mail,
  Phone,
  TrendingUp,
  X,
  Save,
  AlertCircle,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  User,
  Building,
  DollarSign,
  Clock,
  MessageSquare,
  CheckCircle,
  Send,
  Tag,
} from "lucide-react";
import FloatingEditWindow from "./components/FloatingEditWindow";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function FollowUpPlanner() {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingLead, setEditingLead] = useState(
    JSON.parse(localStorage.getItem("editingLead")) || null
  );
  const [editForm, setEditForm] = useState(
    JSON.parse(localStorage.getItem("editForm")) || {}
  );
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageForm, setMessageForm] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [accounts, setAccounts] = useState([]);

  const leadStatusOptions = [
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

  const resultOptions = ["pending", "closed"];

  const getStatusColor = (status) => {
    const colors = {
      "Invoice Pending": "bg-amber-100 text-amber-800 border-amber-200",
      "Invoice Cancel": "bg-red-100 text-red-800 border-red-200",
      Deal: "bg-green-100 text-green-800 border-green-200",
      "Active Client": "bg-blue-100 text-blue-800 border-blue-200",
      "No Response": "bg-gray-100 text-gray-800 border-gray-200",
      Call: "bg-purple-100 text-purple-800 border-purple-200",
      "1 Reply": "bg-cyan-100 text-cyan-800 border-cyan-200",
      "1 Follow Up": "bg-indigo-100 text-indigo-800 border-indigo-200",
      "2 Follow Up": "bg-pink-100 text-pink-800 border-pink-200",
      "3 Follow Up": "bg-orange-100 text-orange-800 border-orange-200",
      "Sample Pending": "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    return colors[status] || "bg-slate-100 text-slate-800 border-slate-200";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/leads/pending`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) setFollowups(data.data);
        else setFollowups([]);
      } catch (error) {
        console.error("Error fetching followups:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleEditClick = (lead) => {
    setEditingLead(lead.id);
    setEditForm({
      id: lead.id,
      client: lead.client || "",
      email: lead.email || "",
      cc: lead.cc || "",
      phone: lead.phone || "",
      subject: lead.subject || "",
      body: lead.body || "",
      response: lead.response || "",
      leadStatus: lead.leadStatus || "",
      salesperson: lead.salesperson || "",
      brand: lead.brand || "",
      companyName: lead.companyName || "",
      dealValue: lead.dealValue || "",
      result: lead.result || "pending",
      day: lead.day || "",
      followUpDate: lead.followUpDate
        ? new Date(lead.followUpDate).toISOString().split("T")[0]
        : "",
    });
    localStorage.setItem("editingLead", JSON.stringify(lead.id));
    localStorage.setItem("editForm", JSON.stringify(lead));
  };

  const handleChange = (field, value) => {
    if (field === "followUpDate" && value) {
      const date = new Date(value);
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      setEditForm((prev) => ({
        ...prev,
        followUpDate: value,
        day: dayName,
      }));
    } else {
      setEditForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/leads/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: editForm.client,
          email: editForm.email,
          cc: editForm.cc,
          phone: editForm.phone,
          subject: editForm.subject,
          body: editForm.body,
          response: editForm.response,
          leadStatus: editForm.leadStatus,
          salesperson: editForm.salesperson,
          brand: editForm.brand,
          companyName: editForm.companyName,
          dealValue: editForm.dealValue,
          result: editForm.result,
          day: editForm.day,
          followUpDate: editForm.followUpDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFollowups((prev) =>
          prev.map((f) => (f.id === editForm.id ? data.data : f))
        );
        setEditingLead(null);
        alert("✅ Lead updated successfully!");
      } else {
        alert("❌ Update failed: " + data.message);
      }
    } catch (error) {
      console.error("Error updating lead:", error);
      alert("❌ Server error");
    }
  };

  const handleCancelEdit = () => {
    setEditingLead(null);
    setEditForm({});
    localStorage.removeItem("editingLead");
    localStorage.removeItem("editForm");
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5" />
    );
  };

  const exportToCSV = () => {
    const headers = [
      "Email",
      "Phone",
      "Subject",
      "Response",
      "Status",
      "Follow-Up Date",
      "Day",
      "Result",
      "Salesperson",
      "Company",
      "Brand",
      "Deal Value",
    ];
    const csvData = filteredFollowups.map((lead) => [
      lead.email || "",
      lead.phone || "",
      lead.subject || "",
      lead.response || "",
      lead.leadStatus || "",
      lead.followUpDate
        ? new Date(lead.followUpDate).toLocaleDateString("en-IN")
        : "",
      lead.day || "",
      lead.result || "",
      lead.salesperson || "",
      lead.company || "",
      lead.brand || "",
      lead.dealValue || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `leads_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEmailClick = async (lead) => {
    const res = await fetch(
      `${API_BASE_URL}/api/leads/saleslead-by-email/${lead.email}`
    );
    const json = await res.json();

    const sales = json.data;

    setSelectedLead({
      ...lead,
      subject: sales?.subject || "No subject",
      body: sales?.body || "No body",
    });

    setShowDetailModal(true);
  };

  const handleMessageClick = async (lead) => {
    setSelectedLead(lead);

    // Fetch email accounts securely
    const accountsRes = await fetch(`${API_BASE_URL}/api/accounts`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      credentials: "include",
    });

    const resData = await accountsRes.json();
    const accList = Array.isArray(resData) ? resData : resData.data || [];
    setAccounts(accList);

    const defaultAcc = accList[0] || {};

    // ✅ Convert DB comma-separated CC → array
    const ccList =
      lead.cc && typeof lead.cc === "string"
        ? lead.cc
            .split(",")
            .map((c) => c.trim())
            .filter((c) => c !== "")
        : [];

    // ✅ Initialize form with CC array
    setMessageForm({
      from: defaultAcc.email || "",
      emailAccountId: defaultAcc.id || "",
      to: lead.email || "",
      ccList: ccList, // <-- important
      cc: "", // keep empty (backward compatibility)
      subject: lead.subject || "",
      body: "",
    });

    setShowMessageModal(true);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    const formData = new FormData();

    // Convert CC array to string
    const ccString = (messageForm.ccList || [])
      .filter((c) => c.trim() !== "")
      .join(", ");

    // ✅ Convert line breaks to HTML format
    const formattedBody = messageForm.body
      .replace(/\n/g, "<br>") // Convert all line breaks to <br>
      .replace(/\s\s+/g, " "); // Optional: clean up extra spaces

    formData.append("from", messageForm.from);
    formData.append("emailAccountId", messageForm.emailAccountId);
    formData.append("to", messageForm.to);
    formData.append("cc", ccString);
    formData.append("subject", messageForm.subject);
    formData.append("body", formattedBody); // ✅ Use formatted body

    // Attach files
    if (messageForm.attachments) {
      messageForm.attachments.forEach((file) => {
        formData.append("attachments", file);
      });
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/smtp/send`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        alert("Mail sent successfully!");
        setShowMessageModal(false);
        setMessageForm({ to: "", subject: "", body: "", ccList: [] }); // ✅ Reset form
      } else {
        alert("Failed: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // const handleSendMessage = async (e) => {
  //   e.preventDefault();

  //   const formData = new FormData();

  //   // Convert CC array to string
  //   const ccString = (messageForm.ccList || [])
  //     .filter((c) => c.trim() !== "")
  //     .join(", ");

  //   formData.append("from", messageForm.from);
  //   formData.append("emailAccountId", messageForm.emailAccountId);
  //   formData.append("to", messageForm.to);
  //   formData.append("cc", ccString);
  //   formData.append("subject", messageForm.subject);
  //   formData.append("body", messageForm.body);

  //   // Attach files
  //   if (messageForm.attachments) {
  //     messageForm.attachments.forEach((file) => {
  //       formData.append("attachments", file);
  //     });
  //   }

  //   try {
  //     const res = await fetch(`${API_BASE_URL}/api/smtp/send`, {
  //       method: "POST",
  //       body: formData,
  //     });

  //     const data = await res.json();

  //     if (data.success) {
  //       alert("Mail sent successfully!");
  //       setShowMessageModal(false);
  //     } else {
  //       alert("Failed: " + data.message);
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     alert("Server error");
  //   }
  // };

  const filteredFollowups = followups
    .filter((lead) => {
      // Status filter
      if (statusFilter !== "all" && lead.leadStatus !== statusFilter)
        return false;

      // Search term (searches across multiple fields)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          lead.client?.toLowerCase().includes(search) ||
          lead.email?.toLowerCase().includes(search) ||
          lead.phone?.toLowerCase().includes(search) ||
          lead.subject?.toLowerCase().includes(search) ||
          lead.response?.toLowerCase().includes(search) ||
          lead.brand?.toLowerCase().includes(search) ||
          lead.salesperson?.toLowerCase().includes(search) ||
          lead.company?.toLowerCase().includes(search) ||
          lead.dealValue?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Date range filter
      if (dateRange.start || dateRange.end) {
        if (!lead.followUpDate) return false;
        const leadDate = new Date(lead.followUpDate)
          .toISOString()
          .split("T")[0];
        if (dateRange.start && leadDate < dateRange.start) return false;
        if (dateRange.end && leadDate > dateRange.end) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle date sorting
      if (sortConfig.key === "followUpDate") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      // Handle string sorting (case insensitive)
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      // Handle null/undefined
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const stats = {
    total: followups.length,
    invoicePending: followups.filter((f) => f.leadStatus === "Invoice Pending")
      .length,
    invoiceCancel: followups.filter((f) => f.leadStatus === "Invoice Cancel")
      .length,
    activeClient: followups.filter((f) => f.leadStatus === "Active Client")
      .length,
    noResponse: followups.filter((f) => f.leadStatus === "No Response").length,
    oneReply: followups.filter((f) => f.leadStatus === "1 Reply").length,
    oneFollowUp: followups.filter((f) => f.leadStatus === "1 Follow Up").length,
    twoFollowUp: followups.filter((f) => f.leadStatus === "2 Follow Up").length,
    threeFollowUp: followups.filter((f) => f.leadStatus === "3 Follow Up")
      .length,
    call: followups.filter((f) => f.leadStatus === "Call").length,
    samplePending: followups.filter((f) => f.leadStatus === "Sample Pending")
      .length,
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Sales CRM
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Weekly Follow-Up Management & Lead Pipeline
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {/* Total Leads */}
          <div className="bg-white/70 backdrop-blur-md rounded-xl border border-slate-200/50 p-3 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <p className="text-slate-600 text-xs font-medium">Total</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              {stats.total}
            </p>
          </div>

          {/* Invoice Pending */}
          <div className="bg-white/70 backdrop-blur-md rounded-xl border border-amber-200/50 p-3 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <p className="text-amber-700 text-xs font-medium">
              Invoice Pending
            </p>
            <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">
              {stats.invoicePending}
            </p>
          </div>

          {/* Invoice Cancel */}
          <div className="bg-white/70 backdrop-blur-md rounded-xl border border-red-200/50 p-3 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <p className="text-red-700 text-xs font-medium">Invoice Cancel</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">
              {stats.invoiceCancel}
            </p>
          </div>

          {/* Active Client */}
          <div className="bg-white/70 backdrop-blur-md rounded-xl border border-blue-200/50 p-3 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <p className="text-blue-700 text-xs font-medium">Active Client</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
              {stats.activeClient}
            </p>
          </div>

          {/* No Response */}
          <div className="bg-white/70 backdrop-blur-md rounded-xl border border-gray-200/50 p-3 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <p className="text-gray-700 text-xs font-medium">No Response</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-600 mt-1">
              {stats.noResponse}
            </p>
          </div>

          {/* 1 Reply */}
          <div className="bg-white/70 backdrop-blur-md rounded-xl border border-cyan-200/50 p-3 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <p className="text-cyan-700 text-xs font-medium">1 Reply</p>
            <p className="text-xl sm:text-2xl font-bold text-cyan-600 mt-1">
              {stats.oneReply}
            </p>
          </div>

          {/* 1 Follow Up */}
          <div className="bg-white/70 backdrop-blur-md rounded-xl border border-indigo-200/50 p-3 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <p className="text-indigo-700 text-xs font-medium">1 Follow Up</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1">
              {stats.oneFollowUp}
            </p>
          </div>

          {/* 2 Follow Up */}
          <div className="bg-white/70 backdrop-blur-md rounded-xl border border-pink-200/50 p-3 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <p className="text-pink-700 text-xs font-medium">2 Follow Up</p>
            <p className="text-xl sm:text-2xl font-bold text-pink-600 mt-1">
              {stats.twoFollowUp}
            </p>
          </div>

          {/* 3 Follow Up */}
          <div className="bg-white/70 backdrop-blur-md rounded-xl border border-orange-200/50 p-3 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <p className="text-orange-700 text-xs font-medium">3 Follow Up</p>
            <p className="text-xl sm:text-2xl font-bold text-orange-600 mt-1">
              {stats.threeFollowUp}
            </p>
          </div>

          {/* Call */}
          <div className="bg-white/70 backdrop-blur-md rounded-xl border border-purple-200/50 p-3 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <p className="text-purple-700 text-xs font-medium">Call</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-600 mt-1">
              {stats.call}
            </p>
          </div>

          {/* Sample Pending */}
          <div className="bg-white/70 backdrop-blur-md rounded-xl border border-yellow-200/50 p-3 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <p className="text-yellow-700 text-xs font-medium">
              Sample Pending
            </p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1">
              {stats.samplePending}
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 space-y-4">
        {/* Search Bar */}
        <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-sm border border-slate-200/50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Search & Filter</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Search by name, email, phone, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Date Range Start */}
            <div>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                placeholder="From Date"
                className="w-full px-3 py-2 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Date Range End */}
            <div>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                placeholder="To Date"
                className="w-full px-3 py-2 bg-white/50 backdrop-blur-sm border border-slate-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Result & Status Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white/70 backdrop-blur-md border border-slate-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-w-[180px]"
          >
            <option value="all">All Statuses</option>
            {leadStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(searchTerm ||
            statusFilter !== "all" ||
            dateRange.start ||
            dateRange.end) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setDateRange({ start: "", end: "" });
              }}
              className="px-4 py-2 bg-white/70 backdrop-blur-md hover:bg-white/90 text-slate-700 rounded-lg transition text-sm font-medium whitespace-nowrap"
            >
              Clear Filters
            </button>
          )}

          {/* Export CSV Button */}
          <button
            onClick={exportToCSV}
            disabled={filteredFollowups.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Results Count */}
        <div className="text-sm text-slate-600">
          Showing{" "}
          <span className="font-semibold text-indigo-600">
            {filteredFollowups.length}
          </span>{" "}
          of <span className="font-semibold">{followups.length}</span> pending
          leads
        </div>
      </div>

      {/* Table Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex justify-center items-center gap-2">
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
              <div
                className="w-3 h-3 bg-purple-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-3 h-3 bg-pink-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <span className="ml-2 text-slate-600">Loading leads...</span>
            </div>
          </div>
        ) : filteredFollowups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-400 font-medium text-lg">No leads found</p>
            <p className="text-slate-400 text-sm mt-1">
              Try adjusting your filters or search terms
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white/70 backdrop-blur-md rounded-xl shadow-md border border-slate-200/50">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center gap-1">Client Email</div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("phone")}
                  >
                    <div className="flex items-center gap-1">Contact</div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("subject")}
                  >
                    <div className="flex items-center gap-1">Subject</div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("followUpDate")}
                  >
                    <div className="flex items-center gap-1">Follow-up</div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider"
                  >
                    Result
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-slate-200">
                {filteredFollowups.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleEmailClick(lead)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                      >
                        {lead.client || "Unknown Email"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {lead.phone || "Not provided"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="truncate max-w-xs" title={lead.subject}>
                        {lead.subject || "No subject"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {lead.followUpDate
                          ? new Date(lead.followUpDate).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }
                            )
                          : "No date set"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusColor(
                          lead.leadStatus
                        )}`}
                      >
                        {lead.leadStatus || "Not Set"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          lead.result === "closed"
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-amber-100 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {lead.result}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(lead)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Lead"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMessageClick(lead)}
                          className="text-green-600 hover:text-green-900"
                          title="Send Message"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Detail Modal - View Only */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur">
                  <User className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-white">
                    Lead Details
                  </h2>
                  <p className="text-xs text-white/80 mt-0.5">
                    {selectedLead.client || "No client provided"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X size={22} />
              </button>
            </div>

            <div className="px-4 sm:px-6 py-5 space-y-6">
              {/* Contact Information Section */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 sm:p-5 border border-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Mail className="text-white" size={16} />
                  </div>
                  <h3 className="text-base font-semibold text-indigo-900">
                    Contact Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-indigo-100/50">
                    <p className="text-xs font-medium text-indigo-600 mb-1">
                      Client Email
                    </p>
                    <p className="text-sm font-medium text-gray-900 break-all">
                      {selectedLead.client || "Not provided"}
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-indigo-100/50">
                    <p className="text-xs font-medium text-indigo-600 mb-1">
                      CC Email
                    </p>
                    <p className="text-sm font-medium text-gray-900 break-all">
                      {selectedLead.cc || "Not provided"}
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-indigo-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-3.5 h-3.5 text-indigo-600" />
                      <p className="text-xs font-medium text-indigo-600">
                        Phone
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedLead.phone || "Not provided"}
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-indigo-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="w-3.5 h-3.5 text-indigo-600" />
                      <p className="text-xs font-medium text-indigo-600">
                        Company Name
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedLead.companyName || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Communication Section */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 sm:p-5 border border-purple-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <MessageSquare className="text-white" size={16} />
                  </div>
                  <h3 className="text-base font-semibold text-purple-900">
                    Communication
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-purple-100/50">
                    <p className="text-xs font-medium text-purple-600 mb-1">
                      Subject
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedLead.subject || "No subject"}
                    </p>
                  </div>
                  
                  

                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-purple-100/50">
                    <p className="text-xs font-medium text-purple-600 mb-1">
                      Body / Pitch
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedLead.body || "No body"}
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-purple-100/50">
                    <p className="text-xs font-medium text-purple-600 mb-1">
                      Response
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedLead.response || "No response yet"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lead Information Section */}
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 sm:p-5 border border-pink-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center">
                    <Tag className="text-white" size={16} />
                  </div>
                  <h3 className="text-base font-semibold text-pink-900">
                    Lead Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-pink-100/50">
                    <p className="text-xs font-medium text-pink-600 mb-2">
                      Lead Status
                    </p>
                    <span
                      className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                        selectedLead.leadStatus === "Invoice Pending"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : selectedLead.leadStatus === "Invoice Cancel"
                          ? "bg-red-100 text-red-800 border-red-200"
                          : selectedLead.leadStatus === "Deal"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : selectedLead.leadStatus === "Active Client"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : selectedLead.leadStatus === "No Response"
                          ? "bg-gray-100 text-gray-800 border-gray-200"
                          : selectedLead.leadStatus === "Call"
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : selectedLead.leadStatus === "1 Reply"
                          ? "bg-cyan-100 text-cyan-800 border-cyan-200"
                          : selectedLead.leadStatus === "1 Follow Up"
                          ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                          : selectedLead.leadStatus === "2 Follow Up"
                          ? "bg-pink-100 text-pink-800 border-pink-200"
                          : selectedLead.leadStatus === "3 Follow Up"
                          ? "bg-orange-100 text-orange-800 border-orange-200"
                          : selectedLead.leadStatus === "Sample Pending"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                          : "bg-slate-100 text-slate-800 border-slate-200"
                      }`}
                    >
                      {selectedLead.leadStatus || "Not Set"}
                    </span>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-pink-100/50">
                    <p className="text-xs font-medium text-pink-600 mb-2">
                      Result
                    </p>
                    <span
                      className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                        selectedLead.result === "closed"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {selectedLead.result || "pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sales Info Section */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 sm:p-5 border border-emerald-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-white" size={16} />
                  </div>
                  <h3 className="text-base font-semibold text-emerald-900">
                    Sales Info
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-emerald-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <p className="text-xs font-medium text-emerald-600">
                        Salesperson
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedLead.salesperson || "Not assigned"}
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-emerald-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="w-3.5 h-3.5 text-emerald-600" />
                      <p className="text-xs font-medium text-emerald-600">
                        Brand
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedLead.brand || "Not specified"}
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-emerald-100/50 sm:col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <p className="text-xs font-medium text-emerald-600">
                        Deal Value
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedLead.dealValue
                        ? `₹${selectedLead.dealValue}`
                        : "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Follow-Up Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 border border-blue-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Calendar className="text-white" size={16} />
                  </div>
                  <h3 className="text-base font-semibold text-blue-900">
                    Follow-Up
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-blue-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <p className="text-xs font-medium text-blue-600">
                        Follow-Up Date
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedLead.followUpDate
                        ? new Date(
                            selectedLead.followUpDate
                          ).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "No date set"}
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-blue-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <p className="text-xs font-medium text-blue-600">Day</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedLead.day || "Not set"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-4 sm:px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Close
              </button>

              {/* <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleEditClick(selectedLead);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                Edit Lead
              </button> */}
            </div>
          </div>
        </div>
      )}
      {/* Send Email Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Send Email
              </h2>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-4 sm:px-6 py-4 space-y-4">
              {/* FROM */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  From
                </label>
                <select
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={messageForm.from}
                  onChange={(e) => {
                    const selected = accounts.find(
                      (acc) => acc.email === e.target.value
                    );
                    setMessageForm({
                      ...messageForm,
                      from: e.target.value,
                      emailAccountId: selected?.id || "",
                    });
                  }}
                >
                  <option value="">Select Email Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.email}>
                      {acc.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* TO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  To
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="recipient@example.com"
                  value={messageForm.to}
                  onChange={(e) =>
                    setMessageForm({ ...messageForm, to: e.target.value })
                  }
                />
              </div>

              {/* CC */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  CC (Optional)
                </label>

                <div className="space-y-2">
                  {(messageForm.ccList || []).map((cc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="email"
                        className="flex-1 border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={cc}
                        placeholder={`cc${idx + 1}@example.com`}
                        onChange={(e) => {
                          const updated = [...(messageForm.ccList || [])];
                          updated[idx] = e.target.value;
                          setMessageForm({ ...messageForm, ccList: updated });
                        }}
                      />

                      <button
                        onClick={() => {
                          const updated = messageForm.ccList.filter(
                            (_, i) => i !== idx
                          );
                          setMessageForm({ ...messageForm, ccList: updated });
                        }}
                        className="flex-shrink-0 bg-red-50 hover:bg-red-100 text-red-600 p-2.5 rounded-lg transition-colors"
                        aria-label="Remove CC"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2.5 flex items-center gap-1"
                  onClick={() =>
                    setMessageForm({
                      ...messageForm,
                      ccList: [...(messageForm.ccList || []), ""],
                    })
                  }
                >
                  <span className="text-lg">+</span> Add CC
                </button>
              </div>

              {/* SUBJECT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Enter subject"
                  value={messageForm.subject}
                  onChange={(e) =>
                    setMessageForm({ ...messageForm, subject: e.target.value })
                  }
                />
              </div>

              {/* MESSAGE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Message
                </label>
                <textarea
                  rows={6}
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  placeholder="Type your message here..."
                  value={messageForm.body}
                  onChange={(e) =>
                    setMessageForm({ ...messageForm, body: e.target.value })
                  }
                />
              </div>

              {/* ATTACHMENTS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Attachments
                </label>
                <input
                  type="file"
                  multiple
                  className="w-full border border-gray-300 p-2.5 rounded-lg file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setMessageForm({
                      ...messageForm,
                      attachments: [
                        ...(messageForm.attachments || []),
                        ...files,
                      ],
                    });
                  }}
                />

                {/* File Preview */}
                {messageForm.attachments?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {messageForm.attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-3 rounded-lg border border-gray-200 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                              />
                            </svg>
                          </div>
                          <span className="text-sm text-gray-700 truncate">
                            {file.name}
                          </span>
                        </div>
                        <button
                          className="flex-shrink-0 text-red-500 hover:text-red-700 text-sm font-medium ml-3 transition-colors"
                          onClick={() => {
                            const updated = messageForm.attachments.filter(
                              (_, i) => i !== idx
                            );
                            setMessageForm({
                              ...messageForm,
                              attachments: updated,
                            });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-4 sm:px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-2xl">
              <button
                className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                onClick={() => setShowMessageModal(false)}
              >
                Cancel
              </button>

              <button
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                onClick={handleSendMessage}
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editingLead && (
        <FloatingEditWindow onClose={handleCancelEdit}>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEdit();
            }}
          >
            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-semibold text-indigo-900 border-b border-indigo-200 pb-2 mb-3">
                Contact Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Client Email
                  </label>
                  <input
                    type="email"
                    value={editForm.client || ""}
                    onChange={(e) => handleChange("client", e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    CC Email
                  </label>
                  <input
                    type="text"
                    value={editForm.cc || ""}
                    onChange={(e) => handleChange("cc", e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  value={editForm.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Communication */}
            <div>
              <h3 className="text-sm font-semibold text-purple-900 border-b border-purple-200 pb-2 mb-3">
                Communication
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={editForm.subject || ""}
                    onChange={(e) => handleChange("subject", e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Body / Pitch
                  </label>
                  <textarea
                    rows="3"
                    value={editForm.body || ""}
                    onChange={(e) => handleChange("body", e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Response
                  </label>
                  <textarea
                    rows="2"
                    value={editForm.response || ""}
                    onChange={(e) => handleChange("response", e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Lead Info */}
            <div>
              <h3 className="text-sm font-semibold text-pink-900 border-b border-pink-200 pb-2 mb-3">
                Lead Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Lead Status
                  </label>
                  <select
                    value={editForm.leadStatus || ""}
                    onChange={(e) => handleChange("leadStatus", e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">Select Status</option>
                    {[
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
                    ].map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Result
                  </label>
                  <select
                    value={editForm.result || ""}
                    onChange={(e) => handleChange("result", e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sales Info */}
            <div>
              <h3 className="text-sm font-semibold text-emerald-900 border-b border-emerald-200 pb-2 mb-3">
                Sales Info
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Salesperson
                  </label>
                  <input
                    type="text"
                    value={editForm.salesperson || ""}
                    onChange={(e) =>
                      handleChange("salesperson", e.target.value)
                    }
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={editForm.companyName || ""}
                    onChange={(e) =>
                      handleChange("companyName", e.target.value)
                    }
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={editForm.brand || ""}
                    onChange={(e) => handleChange("brand", e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Deal Value
                  </label>
                  <input
                    type="number"
                    value={editForm.dealValue || ""}
                    onChange={(e) => handleChange("dealValue", e.target.value)}
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Follow-up */}
            <div>
              <h3 className="text-sm font-semibold text-indigo-900 border-b border-indigo-200 pb-2 mb-3">
                Follow-Up
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={editForm.followUpDate || ""}
                    onChange={(e) =>
                      handleChange("followUpDate", e.target.value)
                    }
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Day
                  </label>
                  <input
                    type="text"
                    value={editForm.day || ""}
                    readOnly
                    className="w-full border px-3 py-2 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </form>
        </FloatingEditWindow>
      )}
    </div>
  );
}
