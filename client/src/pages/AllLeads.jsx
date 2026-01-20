import React, { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  Globe,
  Calendar,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AllLeads() {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState(null);
  const [selectedSalesperson, setSelectedSalesperson] = useState(null);
  const [salespersons, setSalespersons] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const fetchSalespersons = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/salespersons`);
        if (!res.ok) throw new Error("Failed to fetch salespersons");
        const data = await res.json();
        if (Array.isArray(data)) {
          setSalespersons(data);
        } else {
          console.error("Invalid salespersons data:", data);
          setSalespersons([]);
        }
      } catch (error) {
        console.error("❌ Error fetching salespersons:", error);
        setSalespersons([]);
      }
    };
    fetchSalespersons();
  }, []);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/sales/leads`);
        const json = await res.json();
        let leadsData = [];
        if (json && Array.isArray(json.data)) {
          leadsData = json.data;
        } else if (Array.isArray(json)) {
          leadsData = json;
        } else {
          console.error("Invalid data received from backend:", json);
          leadsData = [];
        }
        setLeads(leadsData);
        setFilteredLeads(leadsData);
      } catch (error) {
        console.error("❌ Error fetching forwarded leads:", error);
        setLeads([]);
        setFilteredLeads([]);
      }
    };
    
    fetchLeads();
  }, []);

  // Apply search and filters
  useEffect(() => {
    let result = [...leads];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(lead =>
        lead.client?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term) ||
        lead.subject?.toLowerCase().includes(term) ||
        lead.country?.toLowerCase().includes(term)
      );
    }

    // Apply lead type filter
    if (filterType !== "all") {
      result = result.filter(lead => lead.leadType === filterType);
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredLeads(result);
  }, [leads, searchTerm, filterType, sortConfig]);

  const toggleRowExpansion = (index) => {
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const truncate = (text, length = 100) => {
    if (!text) return "-";
    return text.length > length ? text.slice(0, length) + "..." : text;
  };

  const openForwardModal = (index) => {
    setSelectedLeadIndex(index);
    setShowModal(true);
    setSelectedSalesperson(null);
  };

  const forwardLead = async () => {
    if (selectedLeadIndex !== null && selectedSalesperson) {
      const lead = leads[selectedLeadIndex];
      try {
        const res = await fetch(`${API_BASE_URL}/api/leads/forward`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: lead.id,
            date: lead.createdAt,
            client: lead.client,
            email: lead.email,
            cc: lead.cc,
            phone: lead.phone,
            subject: lead.subject,
            body: lead.body,
            response: lead.response,
            leadType: lead.leadType,
            brand: lead.brand || "",
            country: lead.country || "",
            userId: selectedSalesperson.id,
          }),
        });

        const data = await res.json();

        if (data.success) {
          alert(
            `✅ Lead "${lead.client}" forwarded to ${selectedSalesperson.name}`
          );
          setLeads((prev) => prev.filter((_, i) => i !== selectedLeadIndex));
          setShowModal(false);
        } else {
          alert("❌ Failed to forward lead: " + data.message);
        }
      } catch (error) {
        console.error("❌ Error forwarding lead:", error);
        alert("Server error — check backend logs.");
      }
    } else {
      alert("Please select a salesperson to forward.");
    }
  };

  const getLeadTypeColor = (type) => {
    switch (type) {
      case "Association Lead":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Attendees Lead":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Industry Lead":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortConfig.direction === 'ascending'
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .scrollbar-thumb-indigo-300::-webkit-scrollbar-thumb {
          background: #a5b4fc;
        }
        .scrollbar-thumb-blue-300::-webkit-scrollbar-thumb {
          background: #93c5fd;
        }
        .scrollbar-thumb-emerald-300::-webkit-scrollbar-thumb {
          background: #6ee7b7;
        }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                All Leads Communication
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Leads forwarded from Admin (Leads CRM)
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-full shadow-md">
                <span className="text-2xl font-bold">{filteredLeads.length}</span>
                <span className="text-sm opacity-90">leads</span>
              </div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search leads..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <select
                  className="appearance-none bg-white border border-gray-300 rounded-lg py-2 pl-3 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="Association Lead">Association Lead</option>
                  <option value="Attendees Lead">Attendees Lead</option>
                  <option value="Industry Lead">Industry Lead</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <button
                onClick={() => requestSort('createdAt')}
                className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg py-2 px-3 shadow-sm hover:bg-gray-50"
              >
                <span className="text-sm">Sort by Date</span>
                {getSortIcon('createdAt')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Container */}
      <div className="max-w-[1800px] mx-auto p-4 sm:p-6 lg:p-8">
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <div className="text-lg font-medium">
              {leads.length === 0 ? "No leads available" : "No leads match your search"}
            </div>
            <div className="text-sm mt-2 text-gray-500">
              {leads.length === 0
                ? "Waiting for admin to forward leads"
                : "Try adjusting your search or filters"}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredLeads.map((lead, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl"
              >
                {/* Card Header */}
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Column - Lead Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">{lead.client || "No Client Email"}</h3>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getLeadTypeColor(lead.leadType)}`}>
                              {lead.leadType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">Lead Email: {lead.email || "-"}</p>
                        </div>
                      </div>

                      {/* Contact Details */}
                      <div className="flex flex-wrap gap-3">
                        {/* Phone */}
                        {lead.phone && (
                          <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                            <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-800">{lead.phone}</span>
                          </div>
                        )}

                        {/* Country */}
                        <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                          <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center">
                            <Globe className="w-3.5 h-3.5 text-purple-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-800">{lead.country || "-"}</span>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                          <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-800">
                            {new Date(lead.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Action Buttons */}
                    <div className="flex flex-col gap-3 md:w-48">
                      <button
                        onClick={() => toggleRowExpansion(index)}
                        className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 text-sm font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1"
                      >
                        {expandedRows[index] ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Less Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            More Details
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => openForwardModal(index)}
                        className="px-4 py-2.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-sm font-medium border border-amber-200 transition-all flex items-center justify-center gap-1"
                      >
                        <Send className="w-4 h-4" />
                        Forward
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedRows[index] && (
                  <div className="px-6 pb-6">
                    <div className="border-t border-gray-200 pt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                          {/* CC */}
                          {lead.cc && (
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-semibold">
                                CC
                              </p>
                              <p className="text-sm text-gray-700 break-all">
                                {lead.cc}
                              </p>
                            </div>
                          )}

                          {/* Subject */}
                          {lead.subject && (
                            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                  <Mail className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-xs text-indigo-700 uppercase tracking-wide font-bold">
                                  Email Subject
                                </p>
                              </div>
                              <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-indigo-50">
                                <p className="text-sm text-gray-900 leading-relaxed font-medium">
                                  {lead.subject}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          {/* Pitch/Body */}
                          {lead.body && (
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                                  <Mail className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-xs text-blue-700 uppercase tracking-wide font-bold">
                                  Pitch / Message
                                </p>
                              </div>
                              <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50 pr-2">
                                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                  {lead.body}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Response */}
                          {lead.response && (
                            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                                  <Mail className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-xs text-emerald-700 uppercase tracking-wide font-bold">
                                  Client Response
                                </p>
                              </div>
                              <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-emerald-50 pr-2">
                                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                  {lead.response}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Forward Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-[95%] sm:w-[520px] transform transition-all animate-in">
            {/* Header with gradient background */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 rounded-t-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    Forward Lead
                  </h2>
                  <p className="text-indigo-100 text-sm">
                    Assign to team member
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Lead Info Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 mb-6 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Client Email
                    </p>
                    <p className="text-base font-semibold text-gray-900 truncate">
                      {leads[selectedLeadIndex]?.client || "No Client Email"}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-lg border border-indigo-200 text-xs font-medium text-indigo-700 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                        {leads[selectedLeadIndex]?.leadType || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Salesperson Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Assign to Salesperson
                </label>
                <div className="relative group">
                  <select
                    className="w-full appearance-none border-2 border-gray-200 rounded-xl px-4 py-3.5 pr-10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all bg-white hover:border-gray-300 text-gray-700 font-medium cursor-pointer
              [&>option]:py-3 [&>option]:px-4 [&>option]:bg-white [&>option]:text-gray-800 [&>option]:hover:bg-indigo-50
              [&>option:checked]:bg-indigo-100 [&>option:checked]:font-semibold"
                    value={selectedSalesperson?.id || ""}
                    onChange={(e) =>
                      setSelectedSalesperson(
                        salespersons.find(
                          (sp) => sp.id === parseInt(e.target.value)
                        )
                      )
                    }
                  >
                    <option value="" className="text-gray-400 italic">
                      Select a team member...
                    </option>
                    {salespersons.map((sp) => (
                      <option key={sp.id} value={sp.id} className="py-3">
                        {sp.name} • {sp.empId}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-focus-within:rotate-180">
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                {selectedSalesperson && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg animate-in fade-in slide-in-from-top-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">
                      {selectedSalesperson.name} selected
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3.5 rounded-xl hover:bg-gray-200 font-semibold transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={forwardLead}
                  disabled={!selectedSalesperson}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3.5 rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:from-gray-400 disabled:to-gray-400"
                >
                  Forward Lead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
