import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Target,
  Award,
  Activity,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  TrendingDown,
} from "lucide-react";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  blue: "#0ea5e9",
};

export default function EmpOverAllDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = JSON.parse(localStorage.getItem("user")) || {};

  useEffect(() => {
    if (!user.empId) {
      setLoading(false);
      setError("Employee ID not found");
      return;
    }

    fetch(`
${API_BASE_URL}/api/analytics/employee/${user.empId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
      })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching analytics:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [user.empId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            Loading your performance...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">
            Unable to Load Data
          </h2>
          <p className="text-gray-600 text-center">
            {error || "No analytics data available yet."}
          </p>
        </div>
      </div>
    );
  }

  const chartData =
    data.performance?.map((item) => ({
      result: item.result,
      count: item.count,
    })) || [];

  const monthlyData = data.monthlyPerformance || [];

  // Calculate performance metrics
  const wonDeals =
    chartData.find((d) => d.result?.toLowerCase().includes("won"))?.count || 0;
  const lostDeals =
    chartData.find((d) => d.result?.toLowerCase().includes("lost"))?.count || 0;
  const winRate =
    data.totalDeals > 0 ? Math.round((wonDeals / data.totalDeals) * 100) : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Performance Dashboard
          </h1>
          <p className="text-gray-600">
            Track your achievements and monitor your progress
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Deals"
            value={data.totalDeals || 0}
            icon={Target}
            color="blue"
            subtitle="This month"
            trend={15}
            trendUp={true}
          />
          <MetricCard
            title="Total Revenue"
            value={`₹${((data.totalValue || 0) / 1000).toFixed(1)}K`}
            icon={DollarSign}
            color="green"
            subtitle={`Avg: ₹${(data.avgDealValue || 0).toLocaleString()}`}
            trend={12}
            trendUp={true}
          />
          <MetricCard
            title="Closed"
            value={`${winRate}%`}
            icon={Award}
            color="purple"
            subtitle={`${wonDeals} won / ${lostDeals} lost`}
            trend={8}
            trendUp={true}
          />
          <MetricCard
            title="Pending"
            value={data.totalDeals || 0}
            icon={Activity}
            color="orange"
            subtitle="In pipeline"
            trend={3}
            trendUp={false}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Area Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            <ChartCard title="Performance Trend" icon={TrendingUp}>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient
                        id="colorDeals"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={COLORS.primary}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={COLORS.primary}
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={COLORS.success}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={COLORS.success}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      stroke="#64748b"
                      style={{ fontSize: "13px", fontWeight: 500 }}
                    />
                    <YAxis stroke="#64748b" style={{ fontSize: "13px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="totalDeals"
                      stroke={COLORS.primary}
                      strokeWidth={3}
                      fill="url(#colorDeals)"
                      name="Deals"
                    />
                    <Area
                      type="monotone"
                      dataKey="totalValue"
                      stroke={COLORS.success}
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                      name="Revenue (₹)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={Activity}
                  message="No monthly data available"
                />
              )}
            </ChartCard>
          </div>

          {/* Vertical Bar Chart */}
          <div className="lg:col-span-1">
            <ChartCard title="Results Breakdown" icon={Award}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      stroke="#64748b"
                      style={{ fontSize: "13px" }}
                    />
                    <YAxis
                      dataKey="result"
                      type="category"
                      stroke="#64748b"
                      style={{ fontSize: "13px" }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {chartData.map((entry, index) => (
                        <bar
                          key={`cell-${index}`}
                          fill={
                            entry.result?.toLowerCase().includes("won")
                              ? COLORS.success
                              : entry.result?.toLowerCase().includes("lost")
                                ? COLORS.danger
                                : COLORS.warning
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={Target} message="No results data available" />
              )}
            </ChartCard>
          </div>
        </div>

        {/* Detailed Bar Chart */}
        {chartData.length > 0 && (
          <ChartCard title="Detailed Performance Analysis" icon={Activity}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="result"
                  stroke="#64748b"
                  style={{ fontSize: "13px", fontWeight: 500 }}
                />
                <YAxis stroke="#64748b" style={{ fontSize: "13px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <bar
                      key={`cell-${index}`}
                      fill={
                        entry.result?.toLowerCase().includes("won")
                          ? COLORS.success
                          : entry.result?.toLowerCase().includes("lost")
                            ? COLORS.danger
                            : COLORS.warning
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Performance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard
            label="Deals Won"
            value={wonDeals}
            icon={CheckCircle}
            color="green"
            description="Successful conversions"
          />
          <SummaryCard
            label="Deals Lost"
            value={lostDeals}
            icon={XCircle}
            color="red"
            description="Opportunities missed"
          />
          <SummaryCard
            label="Success Rate"
            value={`${winRate}%`}
            icon={Award}
            color="purple"
            description="Overall win percentage"
          />
        </div>
      </div>
    </div>
  );
}

// Enhanced Metric Card Component
function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  trend,
  trendUp,
}) {
  const colorClasses = {
    blue: {
      bg: "from-blue-500 to-blue-600",
      light: "bg-blue-50",
      text: "text-blue-600",
    },
    green: {
      bg: "from-green-500 to-green-600",
      light: "bg-green-50",
      text: "text-green-600",
    },
    purple: {
      bg: "from-purple-500 to-purple-600",
      light: "bg-purple-50",
      text: "text-purple-600",
    },
    orange: {
      bg: "from-orange-500 to-orange-600",
      light: "bg-orange-50",
      text: "text-orange-600",
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-gray-300">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color].bg} flex items-center justify-center shadow-sm`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
              trendUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
            }`}
          >
            {trendUp ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
            <span className="text-xs font-semibold">{trend}%</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}

// Enhanced Chart Card Component
function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// Empty State Component
function EmptyState({ icon: Icon, message }) {
  return (
    <div className="h-[350px] flex items-center justify-center text-gray-400">
      <div className="text-center">
        <Icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

// Enhanced Summary Card Component
function SummaryCard({ label, value, icon: Icon, color, description }) {
  const colorClasses = {
    green: {
      bg: "bg-green-50",
      ring: "ring-green-100",
      iconBg: "bg-green-100",
      iconText: "text-green-600",
    },
    red: {
      bg: "bg-red-50",
      ring: "ring-red-100",
      iconBg: "bg-red-100",
      iconText: "text-red-600",
    },
    purple: {
      bg: "bg-purple-50",
      ring: "ring-purple-100",
      iconBg: "bg-purple-100",
      iconText: "text-purple-600",
    },
  };

  return (
    <div
      className={`${colorClasses[color].bg} rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl ${colorClasses[color].iconBg} ${colorClasses[color].iconText} flex items-center justify-center`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}
