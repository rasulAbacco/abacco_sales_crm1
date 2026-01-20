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

function buildParams(filters) {
  const p = new URLSearchParams();
  if (filters.period) p.set("period", filters.period);
  if (filters.year) p.set("year", String(filters.year));
  if (filters.month) p.set("month", String(filters.month));
  if (filters.leadType && filters.leadType !== "all")
    p.set("leadType", filters.leadType);
  if (filters.status && filters.status !== "all")
    p.set("status", filters.status);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  return p.toString();
}
async function safeFetch(url) {
  try {
    const token = localStorage.getItem("token");

    const r = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!r.ok) {
      console.error("Fetch failed:", r.status, url);
      return { success: false };
    }

    return await r.json();
  } catch (e) {
    console.error("Fetch error:", e);
    return { success: false };
  }
}

export default function EmployeeDashboards() {
  // Filters
  const [period, setPeriod] = useState("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState("");
  const [leadType, setLeadType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  // Data states
  const [dashboard, setDashboard] = useState({});
  const [monthly, setMonthly] = useState([]);
  const [statusCounts, setStatusCounts] = useState([]);
  const [typeCounts, setTypeCounts] = useState([]);
  const [countryStats, setCountryStats] = useState([]);
  const [emailStats, setEmailStats] = useState({ sent: 0, received: 0 });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const availableYears = useMemo(() => {
    const y0 = new Date().getFullYear();
    return Array.from({ length: 6 }).map((_, i) => y0 - (5 - i));
  }, []);

  const filters = useMemo(
    () => ({
      period,
      year,
      month,
      leadType,
      status: statusFilter,
      from,
      to,
    }),
    [period, year, month, leadType, statusFilter, from, to]
  );

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    const qs = buildParams(filters);

    const [dashRes, statusRes, typeRes, countryRes, monthlyRes] =
      await Promise.all([
        safeFetch(`${API_BASE}/api/empAnalytics/dashboard?${qs}`),
        safeFetch(`${API_BASE}/api/empAnalytics/leads/status?${qs}`),
        safeFetch(`${API_BASE}/api/empAnalytics/leads/type?${qs}`),
        safeFetch(`${API_BASE}/api/empAnalytics/leads/country?${qs}`),
        safeFetch(`${API_BASE}/api/empAnalytics/leads/monthly?${qs}`),
      ]);

    if (dashRes.success) setDashboard(dashRes.dashboard);
    if (statusRes.success) setStatusCounts(statusRes.statusCounts);
    if (typeRes.success) setTypeCounts(typeRes.typeCounts);
    if (countryRes.success) setCountryStats(countryRes.countries);
    if (monthlyRes.success) setMonthly(monthlyRes.monthly);

    setRefreshing(false);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const leadStatusChart = useMemo(
    () =>
      (statusCounts || []).map((s) => ({
        name: s.leadStatus,
        value: s.count,
      })),
    [statusCounts]
  );

  const leadTypeChart = useMemo(
    () =>
      (typeCounts || []).map((t) => ({
        name: t.leadType,
        value: t.count,
      })),
    [typeCounts]
  );

  const statusPalette = ["#10b981", "#f59e0b", "#ef4444", "#60a5fa"];
  const typePalette = ["#8b5cf6", "#06b6d4", "#f97316", "#f43f5e"];

  function KPI({ title, value, icon: Icon, color = "#6366f1" }) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
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

  const topCountries = countryStats || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Employee Dashboard
          </h1>

          <button
            onClick={() => loadAll()}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing && "animate-spin"}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-600" /> Filters
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Period */}
            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
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
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              >
                {availableYears.map((y) => (
                  <option key={y}>{y}</option>
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
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
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
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              >
                <option value="all">All</option>
                <option value="Association">Association</option>
                <option value="Industry">Industry</option>
                <option value="Attendees">Attendees</option>
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
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              >
                <option value="all">All</option>
                <option value="Closed">Closed</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="New">New</option>
              </select>
            </div>

            {/* Custom Date Filter */}
            {period === "custom" && (
              <>
                <div className="lg:col-span-3">
                  <label className="text-xs font-medium text-gray-700 mb-2 block">
                    From
                  </label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                </div>

                <div className="lg:col-span-3">
                  <label className="text-xs font-medium text-gray-700 mb-2 block">
                    To
                  </label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </>
            )}
          </div>

          {/* Apply / Clear */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => loadAll()}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm"
            >
              <Zap className="w-4 h-4" /> Apply Filters
            </button>
            <button
              onClick={() => {
                setPeriod("monthly");
                setYear(new Date().getFullYear());
                setMonth("");
                setLeadType("all");
                setStatusFilter("all");
                setFrom("");
                setTo("");
              }}
              className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm"
            >
              <X className="w-4 h-4" /> Clear All
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <KPI title="Total Leads" value={dashboard.totalLeads} icon={Target} />
          <KPI
            title="Total Revenue"
            value={`₹${formatShortMoney(dashboard.totalDealValue)}`}
            icon={DollarSign}
            color="#10b981"
          />
          <KPI
            title="Closed"
            value={dashboard.closed}
            icon={CheckCircle}
            color="#059669"
          />
          <KPI
            title="Pending"
            value={dashboard.pending}
            icon={Clock}
            color="#f59e0b"
          />
        </div>

        {/* Charts (Monthly + Status + Type) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Monthly Trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" /> Monthly Trend
            </h3>

            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer>
                <BarChart
                  data={monthly.map((m) => ({
                    month: m.month,
                    count: m.totalLeads,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lead Status Pie */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">Lead Status</h3>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={leadStatusChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {leadStatusChart.map((e, i) => (
                      <Cell key={i} fill={statusPalette[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="mt-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Summary
          </h4>

          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-white/20">
              <span>Total Leads</span>
              <span className="text-xl font-bold">{dashboard.totalLeads}</span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-white/20">
              <span>Total Revenue</span>
              <span className="text-xl font-bold">
                ₹{formatShortMoney(dashboard.totalDealValue)}
              </span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-white/20">
              <span>Closed Rate</span>
              <span className="text-xl font-bold">
                {dashboard.totalLeads
                  ? Math.round((dashboard.closed / dashboard.totalLeads) * 100)
                  : 0}
                %
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span>Emails Sent</span>
              <span className="text-xl font-bold">{emailStats.sent}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
