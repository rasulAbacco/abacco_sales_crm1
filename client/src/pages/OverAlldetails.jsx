import React, { useState, useEffect } from "react";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function LeadDetailsTable() {
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({
    status: "",
    from: "",
    to: "",
    search: "",
  });
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(false);
 

  useEffect(() => {
    const fetchClosedLeads = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/leadDetails/closed`);
        const data = await res.json();

        if (data.success && Array.isArray(data.data)) {
          setLeads(data.data);
        } else {
          console.warn("⚠️ Unexpected response format:", data);
          setLeads([]);
        }
      } catch (error) {
        console.error("❌ Error fetching closed leads:", error);
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClosedLeads();
  }, []);

  // Filter leads
  const filteredLeads = leads
    .filter((lead) => {
      const leadDate = new Date(lead.lastUpdated);

      const matchStatus = filters.status
        ? lead.leadStatus === filters.status
        : true;
      const matchDateRange =
        (!filters.from || leadDate >= new Date(filters.from)) &&
        (!filters.to || leadDate <= new Date(filters.to));

      // Search across all relevant fields
      const searchLower = filters.search.toLowerCase();
      const matchSearch =
        !filters.search ||
        [
          lead.client,
          lead.email,
          lead.leadStatus,
          lead.body,
          lead.response,
          lead.Result,
          lead.leadType,
          lead.country,
          lead.phone,
          lead.cc,
          lead.subject,
          lead.salesperson,
          lead.user?.name,
          lead.brand,
          lead.companyName,
          lead.dealValue ? lead.dealValue.toString() : "",
        ]
          .filter(Boolean)
          .some((f) => f.toLowerCase().includes(searchLower));

      return matchStatus && matchDateRange && matchSearch;
    })
    .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

  const clearFilters = () =>
    setFilters({
      status: "",
      from: "",
      to: "",
      search: "",
    });

  const downloadCSV = () => {
    const headers = [
      "S.No",
      "Lead Email",
      "Lead Status",
      "Client Email",
      "Email Pitch",
      "Response",
      "Payment",
      "Industry",
      "Country",
      "Phone",
      "CC",
      "Subject",
      "Salesperson",
      "Brand",
      "Company",
      "Deal Value",
      "Last Updated",
    ];

    const csvData = filteredLeads.map((lead, index) => [
      index + 1,
      lead.email || "",
      lead.leadStatus || "",
      lead.client || "",
      lead.body ? lead.body.replace(/"/g, '""') : "",
      lead.response ? lead.response.replace(/"/g, '""') : "",
      lead.Result || "",
      lead.leadType || "",
      lead.country || "",
      lead.phone || "",
      lead.cc || "",
      lead.subject || "",
      lead.salesperson || lead.user?.name || "",
      lead.brand || "",
      lead.companyName || "",
      lead.dealValue || "",
      formatIndianDateTime(lead.lastUpdated),
    ]);

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `lead_details_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatIndianDateTime = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

 const getStatusBadgeColor = (status) => {
   switch (status) {
     case "Deal":
     case "Active Client":
       return "bg-green-100/80 text-green-800 border-green-200";
     case "Invoice Pending":
     case "1 Follow Up":
     case "2 Follow Up":
     case "3 Follow Up":
       return "bg-amber-100/80 text-amber-800 border-amber-200";
     case "Invoice Cancel":
     case "No Response":
       return "bg-red-100/80 text-red-800 border-red-200";
     case "Sample Pending":
     case "Call":
       return "bg-blue-100/80 text-blue-800 border-blue-200";
     default:
       return "bg-gray-100/80 text-gray-800 border-gray-200";
   }
 };


  const toggleExpandRow = (leadId) => {
    setExpandedRow(expandedRow === leadId ? null : leadId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Overall Lead Details
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Complete overview of all closed leads
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-md">
              <span className="text-xl sm:text-2xl font-bold">
                {filteredLeads.length}
              </span>
              <span className="text-xs sm:text-sm opacity-90">
                of {leads.length} leads
              </span>
              {loading && (
                <svg
                  className="animate-spin h-4 w-4 ml-2"
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
            <button
              onClick={downloadCSV}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full font-semibold text-sm transition-all shadow-md"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="w-full px-4 sm:px-6 py-4 sm:py-6">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 mb-4 sm:mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Filters
            </h2>
            <button
              onClick={clearFilters}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md w-full sm:w-auto"
            >
              ✕ Clear
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="🔍 Search all fields..."
              className="border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-blue-500 bg-gray-50 hover:bg-white w-full"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />

            <select
              className="border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-blue-500 bg-gray-50 hover:bg-white cursor-pointer w-full"
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">📊 All Status</option>
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

            <input
              type="date"
              placeholder="From Date"
              className="border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-blue-500 bg-gray-50 hover:bg-white w-full"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />

            <input
              type="date"
              placeholder="To Date"
              className="border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-blue-500 bg-gray-50 hover:bg-white w-full"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </div>
        </div>

        {/* CARDS CONTAINER */}
        {/* CARDS CONTAINER */}
        <div className="space-y-6 sm:space-y-8">
          {filteredLeads.map((lead, index) => (
            <div
              key={lead.id}
              className="relative bg-white/10 backdrop-blur-lg border border-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
            >
              {/* GLASS CARD HEADER */}
              <div className="bg-gradient-to-r from-indigo-600/90 via-blue-600/90 to-cyan-500/90 backdrop-blur-md p-5 border-b border-white/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-md rounded-xl p-2 shadow-inner">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg drop-shadow-sm">
                        Lead #{index + 1}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {formatIndianDateTime(lead.lastUpdated)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm bg-opacity-60 ${getStatusBadgeColor(
                        lead.leadStatus
                      )}`}
                    >
                      {lead.leadStatus || "-"}
                    </span>

                    <button
                      onClick={() => toggleExpandRow(lead.id)}
                      className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-all duration-300 backdrop-blur-sm shadow-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 transition-transform ${
                          expandedRow === lead.id ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD CONTENT */}
              <div className="p-5 bg-white/30 backdrop-blur-md">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Lead Email", value: lead.email },
                    { label: "Client Email", value: lead.client },
                    {
                      label: "Payment",
                      value: lead.dealValue
                        ? `₹${lead.dealValue.toLocaleString("en-IN")}`
                        : "-",
                    },
                    { label: "Industry", value: lead.leadType },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="bg-white/40 rounded-xl border border-white/30 shadow-inner p-3 hover:bg-white/50 transition-all"
                    >
                      <p className="text-xs text-gray-600 mb-1">{item.label}</p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.value || "-"}
                      </p>
                    </div>
                  ))}
                </div>

                {/* EXPANDED SECTION */}
                {expandedRow === lead.id && (
                  <div className="mt-6 space-y-6 animate-in fade-in duration-500">
                    {/* DETAILS GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* ADDITIONAL DETAILS */}
                      <div className="bg-white/40 backdrop-blur-md rounded-xl p-4 border border-purple-200/50 shadow-md">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                            Additional Details
                          </h4>
                        </div>
                        <div className="space-y-3 text-sm">
                          {[
                            ["Country", lead.country],
                            ["Phone", lead.phone],
                            ["CC", lead.cc],
                            ["Subject", lead.subject],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="flex justify-between py-2 border-b border-white/30"
                            >
                              <span className="font-semibold text-gray-600">
                                {label}:
                              </span>
                              <span className="text-gray-800">
                                {value || "-"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SALES INFO */}
                      <div className="bg-white/40 backdrop-blur-md rounded-xl p-4 border border-orange-200/50 shadow-md">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                            Sales Information
                          </h4>
                        </div>
                        <div className="space-y-3 text-sm">
                          {[
                            [
                              "Salesperson",
                              lead.salesperson || lead.user?.name,
                            ],
                            ["Brand", lead.brand],
                            ["Company", lead.companyName],
                            [
                              "Deal Value",
                              lead.dealValue
                                ? `₹${lead.dealValue.toLocaleString("en-IN")}`
                                : "-",
                            ],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="flex justify-between py-2 border-b border-white/30"
                            >
                              <span className="font-semibold text-gray-600">
                                {label}:
                              </span>
                              <span className="text-gray-800">
                                {value || "-"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* EMAIL PITCH + RESPONSE */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div className="bg-white/40 backdrop-blur-md rounded-xl p-4 border border-blue-200/50 shadow-md">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                            Email Pitch
                          </h4>
                        </div>
                        <div className="bg-white/60 p-3 rounded-lg max-h-64 overflow-y-auto">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {lead.body || "No pitch available"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white/40 backdrop-blur-md rounded-xl p-4 border border-green-200/50 shadow-md">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                            Response
                          </h4>
                        </div>
                        <div className="bg-white/60 p-3 rounded-lg max-h-64 overflow-y-auto">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {lead.response || "No response available"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GLASS GLOW EFFECT */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl"></div>
            </div>
          ))}
        </div>

        {!loading && filteredLeads.length === 0 && (
          <div className="text-center py-12 sm:py-20 text-gray-500">
            <div className="text-4xl sm:text-6xl mb-4">🔭</div>
            <p className="text-base sm:text-lg font-semibold">No leads found</p>
            <p className="text-xs sm:text-sm mt-2">
              Try adjusting your filters
            </p>
          </div>
        )}

        {/* RESULTS SUMMARY */}
        {filteredLeads.length > 0 && (
          <div className="mt-6 text-xs sm:text-sm text-gray-600 text-center font-medium">
            Showing {filteredLeads.length} of {leads.length} total leads
          </div>
        )}
      </div>
    </div>
  );
}
