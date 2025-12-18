import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Edit2,
  Calendar,
  User,
  Building2,
  Globe,
  Phone,
  FileText,
  X,
  Check,
  CheckCircle,
} from "lucide-react";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export default function LeadCardDashboard() {
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    from: "",
    to: "",
    month: "",
    year: "",
    search: "",
  });
  const [selectedLead, setSelectedLead] = useState(null);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchClosedLeads = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/leadDetails/closed`);
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
          setLeads(data.data);
        } else {
          setLeads([]);
        }
      } catch (error) {
        console.error("Error fetching closed leads:", error);
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClosedLeads();
  }, []);

  const filteredLeads = leads
    .filter((lead) => {
      const leadDate = new Date(lead.date);
      const matchType = filters.type ? lead.leadType === filters.type : true;
      const matchStatus = filters.status
        ? lead.leadStatus === filters.status
        : true;
      const matchDateRange =
        (!filters.from || leadDate >= new Date(filters.from)) &&
        (!filters.to || leadDate <= new Date(filters.to));
      const matchMonth = filters.month
        ? leadDate.getMonth() + 1 === parseInt(filters.month)
        : true;
      const matchYear = filters.year
        ? leadDate.getFullYear() === parseInt(filters.year)
        : true;

      const searchLower = filters.search.toLowerCase();
      const matchSearch =
        !filters.search ||
        [
          lead.client,
          lead.email,
          lead.phone,
          lead.subject,
          lead.body,
          lead.response,
          lead.salesperson,
          lead.user?.name,
          lead.brand,
          lead.country,
          lead.cc,
        ]
          .filter(Boolean)
          .some((f) => f.toLowerCase().includes(searchLower));

      const hasRequiredFields =
        lead.leadStatus?.trim() &&
        lead.salesperson?.trim() &&
        lead.brand?.trim();

      return (
        hasRequiredFields &&
        matchType &&
        matchStatus &&
        matchDateRange &&
        matchMonth &&
        matchYear &&
        matchSearch
      );
    })
    .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

  const clearFilters = () =>
    setFilters({
      type: "",
      status: "",
      from: "",
      to: "",
      month: "",
      year: "",
      search: "",
    });

  const getStatusConfig = (status) => {
    const configs = {
      Deal: {
        bg: "bg-emerald-500/10",
        text: "text-emerald-700",
        border: "border-emerald-500",
        dot: "bg-emerald-500",
      },
      "Active Client": {
        bg: "bg-green-500/10",
        text: "text-green-700",
        border: "border-green-500",
        dot: "bg-green-500",
      },
      "Invoice Pending": {
        bg: "bg-amber-500/10",
        text: "text-amber-700",
        border: "border-amber-500",
        dot: "bg-amber-500",
      },
      "1 Follow Up": {
        bg: "bg-orange-500/10",
        text: "text-orange-700",
        border: "border-orange-500",
        dot: "bg-orange-500",
      },
      "2 Follow Up": {
        bg: "bg-orange-500/10",
        text: "text-orange-700",
        border: "border-orange-500",
        dot: "bg-orange-500",
      },
      "3 Follow Up": {
        bg: "bg-orange-500/10",
        text: "text-orange-700",
        border: "border-orange-500",
        dot: "bg-orange-500",
      },
      "Invoice Cancel": {
        bg: "bg-rose-500/10",
        text: "text-rose-700",
        border: "border-rose-500",
        dot: "bg-rose-500",
      },
      "No Response": {
        bg: "bg-red-500/10",
        text: "text-red-700",
        border: "border-red-500",
        dot: "bg-red-500",
      },
      "Sample Pending": {
        bg: "bg-sky-500/10",
        text: "text-sky-700",
        border: "border-sky-500",
        dot: "bg-sky-500",
      },
      Call: {
        bg: "bg-blue-500/10",
        text: "text-blue-700",
        border: "border-blue-500",
        dot: "bg-blue-500",
      },
    };
    return (
      configs[status] || {
        bg: "bg-gray-500/10",
        text: "text-gray-700",
        border: "border-gray-500",
        dot: "bg-gray-500",
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 backdrop-blur-xl bg-white/80">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Overall Lead Details
              </h1>
              <p className="text-gray-600">
                Complete overview of all closed leads
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-emerald-600 to-green-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/30">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5" />
                  <div className="text-right">
                    <p className="text-2xl font-bold">{filteredLeads.length}</p>
                    <p className="text-xs opacity-90">of {leads.length}</p>
                  </div>
                  {loading && (
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      ></path>
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 font-medium"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 p-6 bg-gray-50 rounded-2xl border border-gray-200">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Status</option>
                  <option value="Invoice Pending">Invoice Pending</option>
                  <option value="Deal">Deal</option>
                  <option value="Active Client">Active Client</option>
                  <option value="1 Follow Up">1 Follow Up</option>
                  <option value="2 Follow Up">2 Follow Up</option>
                  <option value="3 Follow Up">3 Follow Up</option>
                </select>
                <select
                  value={filters.type}
                  onChange={(e) =>
                    setFilters({ ...filters, type: e.target.value })
                  }
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Types</option>
                  <option value="Association Lead">Association Lead</option>
                  <option value="Industry Lead">Industry Lead</option>
                  <option value="Attendees Lead">Attendees Lead</option>
                </select>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) =>
                    setFilters({ ...filters, from: e.target.value })
                  }
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) =>
                    setFilters({ ...filters, to: e.target.value })
                  }
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Leads Grid */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid gap-4">
          {filteredLeads.map((lead, i) => {
            const statusConfig = getStatusConfig(lead.leadStatus);
            const isExpanded = expandedCardId === lead.id;

            return (
              <div
                key={lead.id || i}
                className={`bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 border-l-4 ${
                  statusConfig.border
                } overflow-hidden ${
                  isExpanded ? "ring-2 ring-emerald-500 shadow-xl" : ""
                }`}
              >
                {/* Card Header */}
                <div
                  onClick={() => setExpandedCardId(isExpanded ? null : lead.id)}
                  className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {lead.client?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {lead.client}
                        </h3>
                        <p className="text-sm text-emerald-600 font-medium mb-2">
                          {lead.email}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}
                            ></span>
                            {lead.leadStatus}
                          </span>
                          {lead.leadType && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                              {lead.leadType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
                        #{i + 1}
                      </span>
                    </div>
                  </div>

                  {/* Quick Info Grid */}
                  <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Salesperson</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {lead.salesperson || lead.user?.name || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Brand</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {lead.brand || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Country</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {lead.country || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Last Updated</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(lead.lastUpdated).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-6">
                    {lead.cc && (
                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                        <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                            CC
                          </p>
                          <p className="text-sm text-gray-900 break-words">
                            {lead.cc}
                          </p>
                        </div>
                      </div>
                    )}

                    {lead.subject && (
                      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">
                              Subject
                            </p>
                            <div className="text-sm text-gray-900 leading-relaxed max-h-96 overflow-y-auto">
                              {lead.subject}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {lead.body && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-blue-600 uppercase mb-2">
                              Pitch / Body
                            </p>
                            <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto">
                              {lead.body}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {lead.response && (
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-emerald-600 uppercase mb-2">
                              Client Response
                            </p>
                            <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto">
                              {lead.response}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                        }}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all font-semibold shadow-lg shadow-emerald-500/30"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Lead
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!loading && filteredLeads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No closed leads found
            </h3>
            <p className="text-gray-500">
              Try adjusting your filters or search criteria
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold">
                  {selectedLead.client?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Edit Lead Details
                  </h2>
                  <p className="text-sm text-gray-500">{selectedLead.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="space-y-6">
                {/* Editable Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Salesperson
                    </label>
                    <input
                      type="text"
                      value={
                        selectedLead.salesperson ||
                        selectedLead.user?.name ||
                        ""
                      }
                      onChange={(e) =>
                        setSelectedLead({
                          ...selectedLead,
                          salesperson: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={selectedLead.brand || ""}
                      onChange={(e) =>
                        setSelectedLead({
                          ...selectedLead,
                          brand: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lead Status
                  </label>
                  <select
                    value={selectedLead.leadStatus || ""}
                    onChange={(e) =>
                      setSelectedLead({
                        ...selectedLead,
                        leadStatus: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select Status</option>
                    <option value="Invoice Pending">Invoice Pending</option>
                    <option value="Invoice Cancel">Invoice Cancel</option>
                    <option value="Deal">Deal</option>
                    <option value="Active Client">Active Client</option>
                    <option value="No Response">No Response</option>
                    <option value="1 Follow Up">1 Follow Up</option>
                    <option value="2 Follow Up">2 Follow Up</option>
                    <option value="3 Follow Up">3 Follow Up</option>
                    <option value="Call">Call</option>
                    <option value="Sample Pending">Sample Pending</option>
                  </select>
                </div>

                {/* Read-only Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Country
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedLead.country || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Date
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(selectedLead.date).toLocaleDateString("en-US")}
                    </p>
                  </div>
                </div>

                {/* Message Details */}
                {selectedLead.subject && (
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">
                      Subject
                    </p>
                    <p className="text-sm text-gray-900">
                      {selectedLead.subject}
                    </p>
                  </div>
                )}

                {selectedLead.body && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-semibold text-blue-600 uppercase mb-2">
                      Pitch / Body
                    </p>
                    <div className="text-sm text-gray-900 whitespace-pre-line max-h-96 overflow-y-auto leading-relaxed">
                      {selectedLead.body}
                    </div>
                  </div>
                )}

                {selectedLead.response && (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-600 uppercase mb-2">
                      Client Response
                    </p>
                    <div className="text-sm text-gray-900 whitespace-pre-line max-h-96 overflow-y-auto leading-relaxed">
                      {selectedLead.response}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setSelectedLead(null)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `${API_BASE_URL}/api/leads/${selectedLead.id}`,
                      {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          leadStatus: selectedLead.leadStatus,
                          salesperson:
                            selectedLead.salesperson || selectedLead.user?.name,
                          brand: selectedLead.brand,
                        }),
                      }
                    );

                    const data = await res.json();

                    if (data.success) {
                      alert("✅ Lead updated successfully!");
                      setLeads((prev) =>
                        prev.map((l) =>
                          l.id === selectedLead.id ? data.updatedLead : l
                        )
                      );
                      setSelectedLead(null);
                    } else {
                      alert("❌ Update failed: " + data.message);
                    }
                  } catch (err) {
                    console.error("Error updating lead:", err);
                    alert("Error updating lead.");
                  }
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all font-semibold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// import React, { useState, useEffect } from "react";
// import EmailModal from "./components/EmailModal";
// import useEmailHandler from "./components/useEmailHandler";
// import { Search, Filter, Mail, Edit2, MessageSquare, Calendar, User, Building2, Globe, Phone, FileText, X, Check } from "lucide-react";

// export default function Pending() {
//   const [leads, setLeads] = useState([]);
//   const [filters, setFilters] = useState({
//     type: "",
//     status: "",
//     from: "",
//     to: "",
//     month: "",
//     year: "",
//     search: "",
//   });
//   const [selectedLead, setSelectedLead] = useState(null);
//   const [expandedCardId, setExpandedCardId] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [showFilters, setShowFilters] = useState(false);

//   const user = JSON.parse(localStorage.getItem("user"));
//   const {
//     emailModalOpen,
//     selectedEmailLead,
//     emailData,
//     openEmailModal,
//     handleEmailChange,
//     handleSendEmail,
//     closeEmailModal,
//   } = useEmailHandler(user);

//   useEffect(() => {
//     const fetchPendingLeads = async () => {
//       try {
//         setLoading(true);
//         const res = await fetch("http://localhost:4002/api/leadDetails/pending");
//         const data = await res.json();

//         if (data.success && Array.isArray(data.data)) {
//           const filtered = data.data.filter(
//             (lead) =>
//               !["closed", "success"].includes(
//                 lead.result?.toLowerCase?.() || ""
//               )
//           );
//           setLeads(filtered);
//         } else {
//           setLeads([]);
//         }
//       } catch (error) {
//         console.error("Error fetching pending leads:", error);
//         setLeads([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchPendingLeads();
//   }, []);

//   const filteredLeads = leads
//     .filter((lead) => {
//       const leadDate = new Date(lead.date);
//       const matchType = filters.type ? lead.leadType === filters.type : true;
//       const matchStatus = filters.status
//         ? lead.leadStatus === filters.status
//         : true;
//       const matchDateRange =
//         (!filters.from || leadDate >= new Date(filters.from)) &&
//         (!filters.to || leadDate <= new Date(filters.to));
//       const matchMonth = filters.month
//         ? leadDate.getMonth() + 1 === parseInt(filters.month)
//         : true;
//       const matchYear = filters.year
//         ? leadDate.getFullYear() === parseInt(filters.year)
//         : true;

//       const searchLower = filters.search.toLowerCase();
//       const matchSearch =
//         !filters.search ||
//         [
//           lead.client,
//           lead.email,
//           lead.phone,
//           lead.subject,
//           lead.body,
//           lead.response,
//           lead.salesperson,
//           lead.user?.name,
//           lead.brand,
//           lead.country,
//           lead.cc,
//         ]
//           .filter(Boolean)
//           .some((f) => f.toLowerCase().includes(searchLower));

//       const hasRequiredFields =
//         lead.leadStatus?.trim() &&
//         lead.salesperson?.trim() &&
//         lead.brand?.trim();

//       return (
//         hasRequiredFields &&
//         matchType &&
//         matchStatus &&
//         matchDateRange &&
//         matchMonth &&
//         matchYear &&
//         matchSearch
//       );
//     })
//     .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

//   const clearFilters = () =>
//     setFilters({
//       type: "",
//       status: "",
//       from: "",
//       to: "",
//       month: "",
//       year: "",
//       search: "",
//     });

//   const getStatusConfig = (status) => {
//     const configs = {
//       "Deal": { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500", dot: "bg-emerald-500" },
//       "Active Client": { bg: "bg-green-500/10", text: "text-green-700", border: "border-green-500", dot: "bg-green-500" },
//       "Invoice Pending": { bg: "bg-amber-500/10", text: "text-amber-700", border: "border-amber-500", dot: "bg-amber-500" },
//       "1 Follow Up": { bg: "bg-orange-500/10", text: "text-orange-700", border: "border-orange-500", dot: "bg-orange-500" },
//       "2 Follow Up": { bg: "bg-orange-500/10", text: "text-orange-700", border: "border-orange-500", dot: "bg-orange-500" },
//       "3 Follow Up": { bg: "bg-orange-500/10", text: "text-orange-700", border: "border-orange-500", dot: "bg-orange-500" },
//       "Invoice Cancel": { bg: "bg-rose-500/10", text: "text-rose-700", border: "border-rose-500", dot: "bg-rose-500" },
//       "No Response": { bg: "bg-red-500/10", text: "text-red-700", border: "border-red-500", dot: "bg-red-500" },
//       "Sample Pending": { bg: "bg-sky-500/10", text: "text-sky-700", border: "border-sky-500", dot: "bg-sky-500" },
//       "Call": { bg: "bg-blue-500/10", text: "text-blue-700", border: "border-blue-500", dot: "bg-blue-500" },
//     };
//     return configs[status] || { bg: "bg-gray-500/10", text: "text-gray-700", border: "border-gray-500", dot: "bg-gray-500" };
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
//       {/* Modern Header */}
//       <div className="bg-white border-b border-gray-200 sticky top-0 z-30 backdrop-blur-xl bg-white/80">
//         <div className="max-w-7xl mx-auto px-6 py-6">
//           <div className="flex items-center justify-between mb-6">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900 mb-1">Pending Leads</h1>
//               <p className="text-gray-600">Manage leads awaiting follow-up</p>
//             </div>
//             <div className="flex items-center gap-4">
//               <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/30">
//                 <div className="flex items-center gap-3">
//                   <div className="text-right">
//                     <p className="text-2xl font-bold">{filteredLeads.length}</p>
//                     <p className="text-xs opacity-90">of {leads.length}</p>
//                   </div>
//                   {loading && (
//                     <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
//                     </svg>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Search and Filter Bar */}
//           <div className="flex gap-3">
//             <div className="flex-1 relative">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
//               <input
//                 type="text"
//                 placeholder="Search leads..."
//                 value={filters.search}
//                 onChange={(e) => setFilters({ ...filters, search: e.target.value })}
//                 className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//               />
//             </div>
//             <button
//               onClick={() => setShowFilters(!showFilters)}
//               className="px-6 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 font-medium"
//             >
//               <Filter className="w-5 h-5" />
//               Filters
//             </button>
//           </div>

//           {/* Advanced Filters */}
//           {showFilters && (
//             <div className="mt-4 p-6 bg-gray-50 rounded-2xl border border-gray-200">
//               <div className="grid grid-cols-4 gap-4 mb-4">
//                 <select
//                   value={filters.status}
//                   onChange={(e) => setFilters({ ...filters, status: e.target.value })}
//                   className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                 >
//                   <option value="">All Status</option>
//                   <option value="Invoice Pending">Invoice Pending</option>
//                   <option value="Deal">Deal</option>
//                   <option value="1 Follow Up">1 Follow Up</option>
//                   <option value="2 Follow Up">2 Follow Up</option>
//                   <option value="3 Follow Up">3 Follow Up</option>
//                 </select>
//                 <select
//                   value={filters.type}
//                   onChange={(e) => setFilters({ ...filters, type: e.target.value })}
//                   className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                 >
//                   <option value="">All Types</option>
//                   <option value="Hot">Hot</option>
//                   <option value="Warm">Warm</option>
//                   <option value="Cold">Cold</option>
//                 </select>
//                 <input
//                   type="date"
//                   value={filters.from}
//                   onChange={(e) => setFilters({ ...filters, from: e.target.value })}
//                   className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                 />
//                 <input
//                   type="date"
//                   value={filters.to}
//                   onChange={(e) => setFilters({ ...filters, to: e.target.value })}
//                   className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
//               <button
//                 onClick={clearFilters}
//                 className="text-sm text-blue-600 hover:text-blue-700 font-medium"
//               >
//                 Clear all filters
//               </button>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Leads Grid */}
//       <div className="max-w-7xl mx-auto p-6">
//         <div className="grid gap-4">
//           {filteredLeads.map((lead, i) => {
//             const statusConfig = getStatusConfig(lead.leadStatus);
//             const isExpanded = expandedCardId === lead.id;

//             return (
//               <div
//                 key={lead.id || i}
//                 className={`bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 border-l-4 ${statusConfig.border} overflow-hidden ${
//                   isExpanded ? 'ring-2 ring-blue-500 shadow-xl' : ''
//                 }`}
//               >
//                 {/* Card Header */}
//                 <div
//                   onClick={() => setExpandedCardId(isExpanded ? null : lead.id)}
//                   className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors"
//                 >
//                   <div className="flex items-start justify-between">
//                     <div className="flex items-start gap-4 flex-1">
//                       <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
//                         {lead.client?.charAt(0).toUpperCase()}
//                       </div>
//                       <div className="flex-1">
//                         <h3 className="text-lg font-bold text-gray-900 mb-1">{lead.client}</h3>
//                         <p
//                           className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer font-medium mb-2"
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             openEmailModal(lead);
//                           }}
//                         >
//                           {lead.email}
//                         </p>
//                         <div className="flex items-center gap-3 flex-wrap">
//                           <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
//                             <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
//                             {lead.leadStatus}
//                           </span>
//                           {lead.leadType && (
//                             <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
//                               {lead.leadType}
//                             </span>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-3">
//                       <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
//                         #{i + 1}
//                       </span>
//                     </div>
//                   </div>

//                   {/* Quick Info Grid */}
//                   <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
//                     <div className="flex items-center gap-2">
//                       <User className="w-4 h-4 text-gray-400" />
//                       <div>
//                         <p className="text-xs text-gray-500">Salesperson</p>
//                         <p className="text-sm font-semibold text-gray-900 truncate">
//                           {lead.salesperson || lead.user?.name || "-"}
//                         </p>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <Building2 className="w-4 h-4 text-gray-400" />
//                       <div>
//                         <p className="text-xs text-gray-500">Brand</p>
//                         <p className="text-sm font-semibold text-gray-900 truncate">
//                           {lead.brand || "-"}
//                         </p>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <Globe className="w-4 h-4 text-gray-400" />
//                       <div>
//                         <p className="text-xs text-gray-500">Country</p>
//                         <p className="text-sm font-semibold text-gray-900 truncate">
//                           {lead.country || "-"}
//                         </p>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <Calendar className="w-4 h-4 text-gray-400" />
//                       <div>
//                         <p className="text-xs text-gray-500">Last Updated</p>
//                         <p className="text-sm font-semibold text-gray-900">
//                           {new Date(lead.lastUpdated).toLocaleDateString()}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Expanded Details */}
//                 {isExpanded && (
//                   <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-6">
//                     {lead.phone && (
//                       <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
//                         <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
//                         <div>
//                           <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Phone</p>
//                           <p className="text-sm text-gray-900">{lead.phone}</p>
//                         </div>
//                       </div>
//                     )}

//                     {lead.subject && (
//                       <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
//                         <div className="flex items-start gap-3">
//                           <FileText className="w-5 h-5 text-indigo-600 mt-0.5" />
//                           <div className="flex-1">
//                             <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">Subject</p>
//                             <p className="text-sm text-gray-900 leading-relaxed">{lead.subject}</p>
//                           </div>
//                         </div>
//                       </div>
//                     )}

//                     {lead.body && (
//                       <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
//                         <div className="flex items-start gap-3">
//                           <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
//                           <div className="flex-1 min-w-0">
//                             <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Message Body</p>
//                             <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto pr-2">
//                               {lead.body}
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     )}

//                     {lead.response && (
//                       <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
//                         <div className="flex items-start gap-3">
//                           <Mail className="w-5 h-5 text-emerald-600 mt-0.5" />
//                           <div className="flex-1">
//                             <p className="text-xs font-semibold text-emerald-600 uppercase mb-2">Client Response</p>
//                             <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">{lead.response}</p>
//                           </div>
//                         </div>
//                       </div>
//                     )}

//                     {/* Action Buttons */}
//                     <div className="flex gap-3 pt-2">
//                       <button
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           setSelectedLead(lead);
//                         }}
//                         className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-xl hover:bg-blue-50 transition-all font-semibold"
//                       >
//                         <Edit2 className="w-4 h-4" />
//                         Edit Lead
//                       </button>
//                       <button
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           openEmailModal(lead);
//                         }}
//                         className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg shadow-blue-500/30"
//                       >
//                         <Mail className="w-4 h-4" />
//                         Send Follow-up
//                       </button>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>

//         {!loading && filteredLeads.length === 0 && (
//           <div className="flex flex-col items-center justify-center py-20">
//             <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
//               <FileText className="w-10 h-10 text-gray-400" />
//             </div>
//             <h3 className="text-xl font-bold text-gray-900 mb-2">No pending leads found</h3>
//             <p className="text-gray-500">Try adjusting your filters or search criteria</p>
//           </div>
//         )}
//       </div>

//       {/* Edit Modal */}
//       {selectedLead && (
//         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
//           <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
//             {/* Modal Header */}
//             <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
//                   {selectedLead.client?.charAt(0).toUpperCase()}
//                 </div>
//                 <div>
//                   <h2 className="text-2xl font-bold text-gray-900">Edit Lead Details</h2>
//                   <p className="text-sm text-gray-500">{selectedLead.email}</p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setSelectedLead(null)}
//                 className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
//               >
//                 <X className="w-5 h-5 text-gray-500" />
//               </button>
//             </div>

//             {/* Modal Body */}
//             <div className="flex-1 overflow-y-auto px-8 py-6">
//               <div className="space-y-6">
//                 {/* Editable Fields */}
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-semibold text-gray-700 mb-2">
//                       Salesperson
//                     </label>
//                     <input
//                       type="text"
//                       value={selectedLead.salesperson || selectedLead.user?.name || ""}
//                       onChange={(e) =>
//                         setSelectedLead({
//                           ...selectedLead,
//                           salesperson: e.target.value,
//                         })
//                       }
//                       className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-semibold text-gray-700 mb-2">
//                       Brand
//                     </label>
//                     <input
//                       type="text"
//                       value={selectedLead.brand || ""}
//                       onChange={(e) =>
//                         setSelectedLead({ ...selectedLead, brand: e.target.value })
//                       }
//                       className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                     />
//                   </div>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-2">
//                     Lead Status
//                   </label>
//                   <select
//                     value={selectedLead.leadStatus || ""}
//                     onChange={(e) =>
//                       setSelectedLead({ ...selectedLead, leadStatus: e.target.value })
//                     }
//                     className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                   >
//                     <option value="">Select Status</option>
//                     <option value="Invoice Pending">Invoice Pending</option>
//                     <option value="Invoice Cancel">Invoice Cancel</option>
//                     <option value="Deal">Deal</option>
//                     <option value="Active Client">Active Client</option>
//                     <option value="No Response">No Response</option>
//                     <option value="1 Follow Up">1 Follow Up</option>
//                     <option value="2 Follow Up">2 Follow Up</option>
//                     <option value="3 Follow Up">3 Follow Up</option>
//                     <option value="Call">Call</option>
//                     <option value="Sample Pending">Sample Pending</option>
//                   </select>
//                 </div>

//                 {/* Read-only Info */}
//                 <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
//                   <div>
//                     <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Country</p>
//                     <p className="text-sm font-semibold text-gray-900">{selectedLead.country || "-"}</p>
//                   </div>
//                   <div>
//                     <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Date</p>
//                     <p className="text-sm font-semibold text-gray-900">
//                       {new Date(selectedLead.date).toLocaleDateString("en-US")}
//                     </p>
//                   </div>
//                 </div>

//                 {/* Message Details */}
//                 {selectedLead.subject && (
//                   <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
//                     <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">Subject</p>
//                     <p className="text-sm text-gray-900">{selectedLead.subject}</p>
//                   </div>
//                 )}

//                 {selectedLead.body && (
//                   <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
//                     <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Message Body</p>
//                     <div className="text-sm text-gray-900 whitespace-pre-line max-h-96 overflow-y-auto leading-relaxed">
//                       {selectedLead.body}
//                     </div>
//                   </div>
//                 )}

//                 {selectedLead.response && (
//                   <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
//                     <p className="text-xs font-semibold text-emerald-600 uppercase mb-2">Client Response</p>
//                     <p className="text-sm text-gray-900 whitespace-pre-line">{selectedLead.response}</p>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Modal Footer */}
//             <div className="px-8 py-6 border-t border-gray-200 flex gap-3">
//               <button
//                 onClick={() => setSelectedLead(null)}
//                 className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={async () => {
//                   try {
//                     const res = await fetch(
//                       `http://localhost:4002/api/leads/${selectedLead.id}`,
//                       {
//                         method: "PUT",
//                         headers: { "Content-Type": "application/json" },
//                         body: JSON.stringify({
//                           leadStatus: selectedLead.leadStatus,
//                           salesperson:
//                             selectedLead.salesperson || selectedLead.user?.name,
//                           brand: selectedLead.brand,
//                         }),
//                       }
//                     );

//                     const data = await res.json();

//                     if (data.success) {
//                       alert("✅ Lead updated successfully!");
//                       setLeads((prev) =>
//                         prev.map((l) =>
//                           l.id === selectedLead.id ? data.updatedLead : l
//                         )
//                       );
//                       setSelectedLead(null);
//                     } else {
//                       alert("❌ Update failed: " + data.message);
//                     }
//                   } catch (err) {
//                     console.error("Error updating lead:", err);
//                     alert("Error updating lead.");
//                   }
//                 }}
//                 className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
//               >
//                 <Check className="w-5 h-5" />
//                 Save Changes
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Email Modal */}
//       <EmailModal
//         isOpen={emailModalOpen}
//         onClose={closeEmailModal}
//         emailData={emailData}
//         handleEmailChange={handleEmailChange}
//         handleSendEmail={handleSendEmail}
//         user={user}
//         selectedEmailLead={selectedEmailLead}
//       />
//     </div>
//   );
// }
