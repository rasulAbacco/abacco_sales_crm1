// OverAllDashboard.jsx - Replace your existing file with this

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Globe,
  Activity,
  Award,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const COLORS = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
  pink: "#ec4899",
  orange: "#f97316",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.purple,
  COLORS.cyan,
];

export default function OverAllDashboard() {
  const [analytics, setAnalytics] = useState({
    monthlyLeads: [],
    yearlyLeads: [],
    leadTypeData: [],
    leadStatusData: [],
    countryData: [],
    resultData: [],
    kpis: {
      totalLeads: 0,
      totalRevenue: 0,
      avgDealValue: 0,
      conversionRate: 0,
      monthlyGrowth: 0,
      topCountry: "",
    },
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/analytics/comprehensive`
      );
      const data = await response.json();

      if (data.success) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 font-semibold text-lg">
            Loading analytics...
          </p>
          <p className="text-slate-400 text-sm mt-2">Fetching latest data</p>
        </div>
      </div>
    );
  }

  const {
    kpis,
    monthlyLeads,
    yearlyLeads,
    leadTypeData,
    leadStatusData,
    countryData,
    resultData,
  } = analytics;

  const chartData = selectedPeriod === "monthly" ? monthlyLeads : yearlyLeads;

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div style={{ animation: "fadeIn 0.6s ease-out" }}>
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
                  style={{ animation: "pulse-slow 3s ease-in-out infinite" }}
                >
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                  Analytics Dashboard
                </h1>
              </div>
              <p className="text-slate-500 ml-13">
                Real-time insights and performance metrics
              </p>
            </div>
            <div
              className="flex items-center gap-3"
              style={{ animation: "slideLeft 0.6s ease-out" }}
            >
              <button
                onClick={() => setSelectedPeriod("monthly")}
                className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  selectedPeriod === "monthly"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedPeriod("yearly")}
                className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  selectedPeriod === "yearly"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Leads"
            value={kpis.totalLeads.toLocaleString()}
            icon={Users}
            gradient="from-blue-500 to-indigo-600"
            trend={kpis.monthlyGrowth}
            delay="0ms"
          />
          <KPICard
            title="Total Revenue"
            value={`₹${(kpis.totalRevenue / 1000000).toFixed(2)}M`}
            icon={DollarSign}
            gradient="from-emerald-500 to-green-600"
            subtitle={`Avg: ₹${kpis.avgDealValue.toLocaleString()}`}
            delay="100ms"
          />
          <KPICard
            title="Conversion Rate"
            value={`${kpis.conversionRate}%`}
            icon={Target}
            gradient="from-purple-500 to-pink-600"
            trend={kpis.conversionRate > 50 ? 12 : -5}
            delay="200ms"
          />
          <KPICard
            title="Top Country"
            value={kpis.topCountry || "N/A"}
            icon={Globe}
            gradient="from-orange-500 to-red-600"
            subtitle={`${countryData.length} countries`}
            delay="300ms"
          />
        </div>

        {/* Main Area Chart - Revenue & Leads Trend */}
        <ChartCard
          title="Revenue & Leads Trend"
          icon={TrendingUp}
          description="Track your growth over time"
        >
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart key={animationKey} data={chartData}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey={selectedPeriod === "monthly" ? "month" : "year"}
                stroke="#64748b"
                style={{ fontSize: "13px", fontWeight: 500 }}
                tick={{ fill: "#64748b" }}
              />
              <YAxis
                stroke="#64748b"
                style={{ fontSize: "13px", fontWeight: 500 }}
                tick={{ fill: "#64748b" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
                  padding: "12px",
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: "20px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              />
              <Area
                type="monotone"
                dataKey="totalLeads"
                stroke="#6366f1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorLeads)"
                name="Total Leads"
                animationDuration={1500}
              />
              <Area
                type="monotone"
                dataKey="totalValue"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Revenue (₹)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Two Column Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Deal Value Analysis - Trending Chart Style */}
          <ChartCard
            title="Deal Value Analysis"
            icon={DollarSign}
            description="Average vs total deal values"
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart key={animationKey} data={monthlyLeads}>
                <defs>
                  <linearGradient id="dealGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  style={{ fontSize: "12px", fontWeight: 500 }}
                />
                <YAxis
                  stroke="#64748b"
                  style={{ fontSize: "12px", fontWeight: 500 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "15px", fontSize: "13px" }}
                />
                <Area
                  type="monotone"
                  dataKey="totalValue"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#dealGradient)"
                  name="Deal Value (₹)"
                  animationDuration={1500}
                />
                <Area
                  type="monotone"
                  dataKey="avgDealValue"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#avgGradient)"
                  name="Avg Deal (₹)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Lead Status Overview - Area Chart */}
          <ChartCard
            title="Lead Status Overview"
            icon={Activity}
            description="Distribution of lead stages"
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart key={animationKey} data={leadStatusData}>
                <defs>
                  <linearGradient
                    id="statusGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  style={{ fontSize: "11px", fontWeight: 500 }}
                />
                <YAxis
                  stroke="#64748b"
                  style={{ fontSize: "12px", fontWeight: 500 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#statusGradient)"
                  name="Lead Count"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lead Type Analysis - Trending Vertical Chart */}
          <ChartCard
            title="Lead Type Analysis"
            icon={Target}
            description="Breakdown by category"
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                key={animationKey}
                data={leadTypeData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="typeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  style={{ fontSize: "11px" }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fill="url(#typeGradient)"
                  name="Count"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Results Performance - Area Chart */}
          <ChartCard
            title="Results Performance"
            icon={Award}
            description="Win/loss analysis"
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart key={animationKey} data={resultData}>
                <defs>
                  <linearGradient
                    id="resultGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  style={{ fontSize: "11px" }}
                />
                <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#resultGradient)"
                  name="Count"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top Countries */}
          <ChartCard
            title="Top Countries"
            icon={Globe}
            description="Geographic performance"
          >
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
              {countryData.slice(0, 10).map((country, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-transparent rounded-xl hover:from-indigo-50 hover:to-transparent transition-all duration-300 transform hover:scale-[1.02] cursor-pointer group"
                  style={{
                    animation: `slideIn 0.5s ease-out ${index * 50}ms both`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${
                          CHART_COLORS[index % CHART_COLORS.length]
                        }, ${CHART_COLORS[(index + 1) % CHART_COLORS.length]})`,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {country.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {country.count} leads
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 text-lg">
                      ₹{(country.value / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-slate-500">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

// KPI Card Component
function KPICard({
  title,
  value,
  icon: Icon,
  gradient,
  trend,
  subtitle,
  delay,
}) {
  return (
    <div
      className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group relative overflow-hidden"
      style={{ animation: `fadeIn 0.6s ease-out ${delay} both` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
          >
            <Icon className="w-7 h-7 text-white" />
          </div>
          {trend !== undefined && (
            <div
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
                trend >= 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {trend >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <h3 className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">
          {title}
        </h3>
        <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// Chart Card Component
function ChartCard({ title, icon: Icon, description, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 group">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
