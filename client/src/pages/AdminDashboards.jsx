import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Target,
  DollarSign,
  CheckCircle,
  Clock,
  Users,
  Globe,
  Activity,
  Mail,
  Search,
  Filter,
  Calendar,
  FileText,
  X,
  Download,
  TrendingUp,
  BarChart3,
  Zap,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4002";

// ----------------------------- Helper utilities -----------------------------
const monthsFull = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatShortMoney(x = 0) {
  const n = Number(x) || 0;
  if (n >= 1e7) return `${Math.round(n / 1e6)}M`;
  if (n >= 1e5) return `${Math.round(n / 1e3)}K`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return `${n}`;
}

function buildParamsFromFilters(filters) {
  const p = new URLSearchParams();
  if (filters.period) p.set("period", filters.period);
  if (filters.year) p.set("year", String(filters.year));
  if (filters.month) p.set("month", String(filters.month));
  if (filters.leadType && filters.leadType !== "all")
    p.set("leadType", filters.leadType);
  if (filters.employeeId && filters.employeeId !== "all")
    p.set("employeeId", filters.employeeId);
  if (filters.status && filters.status !== "all")
    p.set("status", filters.status);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  return p.toString();
}

// safer fetch wrapper: returns parsed json OR a sensible fallback object instead of throwing
async function safeFetchJson(url) {
  try {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) {
      // return a structured failure object (so callers can decide)
      const txt = await r.text().catch(() => null);
      return { success: false, error: txt || `HTTP ${r.status}` };
    }
    return await r.json();
  } catch (err) {
    return { success: false, error: err.message || "Network error" };
  }
}

// CSV Export Function (unchanged behaviour)
function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${filename}_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ----------------------------- Main Component -----------------------------
export default function AdminDashboards() {
  // Filters
  const [period, setPeriod] = useState("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState("");
  const [leadType, setLeadType] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  // Data state - initialize with safe defaults
  const [dashboard, setDashboard] = useState({
    totalLeads: 0,
    totalDealValue: 0,
    closed: 0,
    pending: 0,
    totalMessages: 0,
    activeUsers: 0,
    topCountries: [],
  });
  const [monthly, setMonthly] = useState([]);
  const [statusCounts, setStatusCounts] = useState([]);
  const [typeCounts, setTypeCounts] = useState([]);
  const [countryStats, setCountryStats] = useState([]);
  const [teamStats, setTeamStats] = useState([]);
  const [emailStats, setEmailStats] = useState({ sent: 0, received: 0 });

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // available years for dropdown (last 6 years)
  const availableYears = useMemo(() => {
    const y0 = new Date().getFullYear();
    return Array.from({ length: 6 }).map((_, i) => y0 - (5 - i));
  }, []);

  // Build unified filters object
  const filters = useMemo(
    () => ({
      period,
      year,
      month,
      leadType,
      employeeId,
      status: statusFilter,
      from,
      to,
    }),
    [period, year, month, leadType, employeeId, statusFilter, from, to]
  );

  // Fetch all analytics in one function (rewritten to use safeFetchJson)
  const loadAll = useCallback(
    async (opts = { skipMonthly: false }) => {
      try {
        setRefreshing(true);
        setError(null);

        const qs = buildParamsFromFilters(filters);

        const promises = [
          safeFetchJson(`${API_BASE}/api/analytics/dashboard?${qs}`),
          safeFetchJson(`${API_BASE}/api/analytics/leads/status?${qs}`),
          safeFetchJson(`${API_BASE}/api/analytics/leads/type?${qs}`),
          safeFetchJson(`${API_BASE}/api/analytics/leads/country?${qs}`),
          safeFetchJson(`${API_BASE}/api/analytics/team?${qs}`),
          // email endpoints are optional on backend; safeFetchJson will return success:false if 404
          safeFetchJson(`${API_BASE}/api/analytics/email/sent?${qs}`),
          safeFetchJson(`${API_BASE}/api/analytics/email/received?${qs}`),
        ];

        if (!opts.skipMonthly) {
          promises.push(
            safeFetchJson(`${API_BASE}/api/analytics/leads/monthly?${qs}`)
          );
        }

        const results = await Promise.all(promises);

        const [
          dashRes,
          statusRes,
          typeRes,
          countryRes,
          teamRes,
          emailSentRes,
          emailRecvRes,
        ] = results;
        const monthlyRes = !opts.skipMonthly ? results[7] : null;

        // Dashboard
        if (dashRes && dashRes.success) {
          setDashboard(dashRes.dashboard ?? dashboard);
        } else if (dashRes && dashRes.success === false) {
          // don't overwrite with null - just report error
          setError((e) => e || dashRes.error || "Failed to load dashboard");
        }

        // Other stats
        if (statusRes && statusRes.success)
          setStatusCounts(statusRes.statusCounts ?? []);
        else if (statusRes && statusRes.success === false) setStatusCounts([]);

        if (typeRes && typeRes.success) setTypeCounts(typeRes.typeCounts ?? []);
        else if (typeRes && typeRes.success === false) setTypeCounts([]);

        if (countryRes && countryRes.success)
          setCountryStats(countryRes.countries ?? []);
        else if (countryRes && countryRes.success === false)
          setCountryStats([]);

        if (teamRes && teamRes.success)
          setTeamStats(
            Array.isArray(teamRes.teamStats) ? teamRes.teamStats : []
          );
        else if (teamRes && teamRes.success === false) setTeamStats([]);

        // emails - some backends may not provide these endpoints; handle gracefully
        const s =
          emailSentRes && typeof emailSentRes.sent !== "undefined"
            ? Number(emailSentRes.sent)
            : 0;
        const r =
          emailRecvRes && typeof emailRecvRes.received !== "undefined"
            ? Number(emailRecvRes.received)
            : 0;
        setEmailStats({ sent: s, received: r });

        // monthly
        if (monthlyRes && monthlyRes.success)
          setMonthly(monthlyRes.monthly ?? []);
        else if (monthlyRes && monthlyRes.success === false) {
          // set zeroed months so charts render
          setMonthly(
            Array.from({ length: 12 }).map((_, i) => ({
              month: monthsFull[i].slice(0, 3),
              totalLeads: 0,
            }))
          );
        }

        setLoading(false);
        setRefreshing(false);
      } catch (err) {
        console.error("loadAll error:", err);
        setError(err.message || "Failed to load analytics");
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters]
  );

  // initial load & whenever filters change
  useEffect(() => {
    setLoading(true);
    loadAll();
  }, [loadAll]);

  // derived items for charts
  const leadStatusChart = useMemo(
    () =>
      (statusCounts || []).map((s) => ({
        name: s.leadStatus ?? "Unknown",
        value: s.count ?? s._count?.id ?? 0,
      })),
    [statusCounts]
  );
  const leadTypeChart = useMemo(
    () =>
      (typeCounts || []).map((t) => ({
        name: t.leadType ?? "Unknown",
        value: t.count ?? t._count?.id ?? 0,
      })),
    [typeCounts]
  );

  // team options for employee filter
  const employeeOptions = useMemo(() => {
    const unique = (teamStats || []).map((t) => ({
      id: t.empId ?? t.salesperson ?? "Unknown",
      count: t._count?.id ?? 0,
    }));
    return [
      { id: "all", label: "All Employees" },
      ...unique.map((u) => ({ id: u.id, label: `${u.id} (${u.count})` })),
    ];
  }, [teamStats]);

  // utility: clear filters
  function clearFilters() {
    setPeriod("monthly");
    setYear(new Date().getFullYear());
    setMonth("");
    setLeadType("all");
    setEmployeeId("all");
    setStatusFilter("all");
    setFrom("");
    setTo("");
    setSearch("");
  }

  // Export handlers (unchanged behaviour)
  const handleExportMonthly = () => exportToCSV(monthly, "monthly_leads");
  const handleExportTeam = () => {
    if (!filteredTeamStats || filteredTeamStats.length === 0) {
      alert("No team data available to export.");
      return;
    }

    // Correct CSV headers
    let csv = "Rank,Employee ID,Name,Total Leads\n";

    filteredTeamStats.forEach((t, idx) => {
      const empId = t.empId ?? "";
      const empName = t.empName ?? "";
      const totalLeads = t.totalLeads ?? 0;

      csv += `${idx + 1},${empId},${empName},${totalLeads}\n`;
    });

    // Create blob & download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `team_leaderboard_${Date.now()}.csv`);
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleExportCountries = () => {
    const exportData = (countryStats || []).map((c) => ({
      Country: c.country ?? "Unknown",
      Leads: c.count ?? 0,
      DealValue: c.dealValue ?? 0,
      Closed: c.closed ?? 0,
      Pending: c.pending ?? 0,
    }));

    exportToCSV(exportData, "country_stats");
  };

  const handleExportStatus = () => {
    const exportData = (leadStatusChart || []).map((s) => ({
      Status: s.name ?? "Unknown",
      Count: s.value ?? 0,
    }));

    exportToCSV(exportData, "lead_status");
  };

  const handleExportTypes = () => {
    const exportData = (leadTypeChart || []).map((t) => ({
      Type: t.name ?? "Unknown",
      Count: t.value ?? 0,
    }));

    exportToCSV(exportData, "lead_types");
  };

  const handleExportAll = () => {
    const exportData = [
      {
        Period: period,
        Year: year,
        Month: month || "All",
        LeadType: leadType,
        Employee: employeeId,
        Status: statusFilter,
        TotalLeads: dashboard?.totalLeads ?? 0,
        TotalRevenue: dashboard?.totalDealValue ?? 0,
        ClosedDeals: dashboard?.closed ?? 0,
        Pending: dashboard?.pending ?? 0,
        EmailsSent: emailStats.sent ?? 0,
        ActiveUsers: dashboard?.activeUsers ?? 0,
      },
    ];

    exportToCSV(exportData, "complete_analytics");
  };

  const handleExportDashboardSummary = () => {
    const csvRows = [];

    csvRows.push("=== DASHBOARD SUMMARY ===");
    csvRows.push(`Total Leads,${dashboard?.totalLeads ?? 0}`);
    csvRows.push(`Total Revenue,${dashboard?.totalDealValue ?? 0}`);
    csvRows.push(`Closed Deals,${dashboard?.closed ?? 0}`);
    csvRows.push(`Pending,${dashboard?.pending ?? 0}`);
    csvRows.push(`Emails Sent,${emailStats.sent ?? 0}`);
    csvRows.push(`Active Users,${dashboard?.activeUsers ?? 0}`);
    csvRows.push("");

    csvRows.push("=== TOP COUNTRIES ===");
    csvRows.push("Country,Leads,DealValue,Closed,Pending");

    (countryStats || []).forEach((c) => {
      csvRows.push(
        `${c.country ?? "Unknown"},${c.count ?? 0},${c.dealValue ?? 0},${
          c.closed ?? 0
        },${c.pending ?? 0}`
      );
    });

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `dashboard_summary_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.click();
    URL.revokeObjectURL(url);
  };

  // handle search
  const filteredTeamStats = useMemo(() => {
    if (!search) return teamStats || [];
    const term = search.toLowerCase();
    return (teamStats || []).filter((t) =>
      String(t.empId || t.salesperson || "")
        .toLowerCase()
        .includes(term)
    );
  }, [teamStats, search]);

  // palettes
  const statusPalette = ["#10b981", "#f59e0b", "#ef4444", "#60a5fa", "#a78bfa"];
  const typePalette = ["#8b5cf6", "#06b6d4", "#f97316", "#f43f5e", "#a3e635"];

  // KPI Component (keeps original styling)
  function KPI({ title, value, icon: Icon, color = "#6366f1", trend }) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100"
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
              <TrendingUp className="w-4 h-4" />
              {trend}%
            </div>
          )}
        </div>
        <div className="text-sm text-gray-500 mb-1">{title}</div>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">
            Loading Analytics
          </h3>
          <p className="text-sm text-gray-500 mt-2">Fetching your data...</p>
        </div>
      </div>
    );
  }

  // choose top countries source: prefer dashboard.topCountries if present else countryStats
  const topCountries =
    dashboard &&
    Array.isArray(dashboard.topCountries) &&
    dashboard.topCountries.length > 0
      ? dashboard.topCountries
      : countryStats || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600">
              Real-time insights and performance metrics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadAll({})}
              disabled={refreshing}
              className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-700 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              <span className="text-sm font-medium text-gray-700">
                {refreshing ? "Refreshing..." : "Refresh"}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-600" /> Filters & Export
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
            {/* Period */}
            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="lastMonth">Last Month</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Year */}
            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="">All Months</option>
                {monthsFull.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Lead Type */}
            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Lead Type
              </label>
              <select
                value={leadType}
                onChange={(e) => setLeadType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="all">All Types</option>
                <option value="Association">Association</option>
                <option value="Industry">Industry</option>
                <option value="Attendees">Attendees</option>
              </select>
            </div>

            {/* Employee */}
            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Employee
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                {(employeeOptions || []).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label ?? opt.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="all">All Status</option>
                <option value="New">New</option>
                <option value="Pending">Pending</option>
                <option value="Closed">Closed</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {period === "custom" && (
              <>
                <div className="lg:col-span-3">
                  <label className="text-xs font-medium text-gray-700 mb-2 block">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="lg:col-span-3">
                  <label className="text-xs font-medium text-gray-700 mb-2 block">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </>
            )}

            {/* Search */}
            <div className="lg:col-span-4">
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Search Employee
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by employee ID..."
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadAll()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow"
              >
                <Zap className="w-4 h-4" /> Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 transition-all"
              >
                <X className="w-4 h-4" /> Clear All
              </button>
            </div>

            {/* Export Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow">
                <Download className="w-4 h-4" /> Export CSV
              </button>

              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-2">
                  <button
                    onClick={handleExportAll}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Complete Analytics
                  </button>

                  {/* ⭐ ADD THIS NEW ONE ⭐ */}
                  <button
                    onClick={handleExportDashboardSummary}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Dashboard Summary
                  </button>
                  <button
                    onClick={handleExportMonthly}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Monthly Leads
                  </button>
                  <button
                    onClick={handleExportTeam}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Team Performance
                  </button>
                  <button
                    onClick={handleExportCountries}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Country Stats
                  </button>
                  <button
                    onClick={handleExportStatus}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Lead Status
                  </button>
                  <button
                    onClick={handleExportTypes}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Lead Types
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-6 mb-8">
          <KPI
            title="Total Leads"
            value={dashboard?.totalLeads ?? 0}
            icon={Target}
            color="#6366f1"
          />
          <KPI
            title="Total Revenue"
            value={`₹${formatShortMoney(dashboard?.totalDealValue ?? 0)}`}
            icon={DollarSign}
            color="#10b981"
          />
          <KPI
            title="Closed Deals"
            value={dashboard?.closed ?? 0}
            icon={CheckCircle}
            color="#059669"
          />
          <KPI
            title="Pending"
            value={dashboard?.pending ?? 0}
            icon={Clock}
            color="#f59e0b"
          />
          <KPI
            title="Active Users"
            value={dashboard?.activeUsers ?? 0}
            icon={Users}
            color="#3b82f6"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Monthly Trend - Large */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" /> Monthly
                  Trend
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Lead generation over time
                </p>
              </div>
              <button
                onClick={handleExportMonthly}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>

            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer>
                <BarChart
                  data={(monthly || []).map((m) => ({
                    month: m.month ?? "",
                    count: m.totalLeads ?? 0,
                  }))}
                >
                  <defs>
                    <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop
                        offset="100%"
                        stopColor="#8b5cf6"
                        stopOpacity={0.8}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="url(#barGrad)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lead Status Pie */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <h4 className="text-lg font-semibold text-gray-900">
                  Lead Status
                </h4>
                <p className="text-sm text-gray-500 leading-tight">
                  Distribution by status
                </p>
              </div>

              <button
                onClick={handleExportStatus}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            {/* Chart container */}
            <div className="w-full flex items-center justify-center">
              <div style={{ width: "100%", height: 260 }}>
                {leadStatusChart.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={leadStatusChart}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={2}
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {leadStatusChart.map((entry, i) => (
                          <Cell
                            key={`cst-${i}`}
                            fill={statusPalette[i % statusPalette.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    No status data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Lead Types */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Lead Types
                </h4>
                <p className="text-sm text-gray-500 mt-1">By category</p>
              </div>
              <button
                onClick={handleExportTypes}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div style={{ width: "100%", height: 280 }}>
              {leadTypeChart.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart
                    data={leadTypeChart}
                    layout="vertical"
                    margin={{ left: 10, right: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="#94a3b8"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      stroke="#94a3b8"
                      style={{ fontSize: "12px" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {leadTypeChart.map((entry, i) => (
                        <Cell
                          key={`ct-${i}`}
                          fill={typePalette[i % typePalette.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No lead type data available
                </div>
              )}
            </div>
          </div>

          {/* Team Leaderboard */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" /> Team Leaderboard
                </h4>
                <p className="text-sm text-gray-500 mt-1">Top performers</p>
              </div>
              <button
                onClick={handleExportTeam}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(filteredTeamStats || []).slice(0, 6).map((t, idx) => {
                const count = t.totalLeads ?? 0;
                const empName =
                  t.empName ?? t.empId ?? t.salesperson ?? "Unknown";
                const avatar = String(empName).slice(0, 2).toUpperCase();
                return (
                  <motion.div
                    key={`${empName}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-4 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all"
                  >
                    <div className="relative">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                        style={{ background: gradientFor(idx) }}
                      >
                        {avatar}
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow">
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {empName}
                      </div>
                      <div className="text-sm text-gray-500">{count} leads</div>
                    </div>
                    <div className="text-2xl font-bold text-indigo-600">
                      {count}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Section - Countries */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Countries */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-600" /> Top Countries
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Performance by region
                </p>
              </div>
              <button
                onClick={handleExportCountries}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(topCountries || []).slice(0, 6).map((c, i) => (
                <motion.div
                  key={`ct-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      #{i + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {c.name ?? c.country ?? "Unknown"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.count} leads
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-600">
                      ₹{formatShortMoney(c.value ?? c.dealValue ?? 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.closed ?? 0} closed
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" /> Summary
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-white/20">
                <span className="text-sm opacity-90">Total Leads</span>
                <span className="text-xl font-bold">
                  {dashboard?.totalLeads ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/20">
                <span className="text-sm opacity-90">Total Revenue</span>
                <span className="text-xl font-bold">
                  ₹{formatShortMoney(dashboard?.totalDealValue ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/20">
                <span className="text-sm opacity-90">Closed Rate</span>
                <span className="text-xl font-bold">
                  {dashboard?.totalLeads
                    ? Math.round(
                        ((dashboard?.closed ?? 0) / dashboard.totalLeads) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-90">Active Users</span>
                <span className="text-xl font-bold">
                  {dashboard?.activeUsers ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------- Helper Functions -----------------------------
function gradientFor(i) {
  const grads = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  ];
  return grads[i % grads.length];
}
