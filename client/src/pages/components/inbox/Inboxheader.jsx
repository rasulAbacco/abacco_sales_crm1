import React, { useState, useRef, useEffect } from "react";
import {
  Filter,
  Calendar,
  Clock,
  ChevronDown,
  X,
  Tag,
  User,
  Mail,
  Search,
  Globe,
  RefreshCcw,
} from "lucide-react";
import { api } from "../../../pages/api.js";
import CustomStatusManager from "../../../components/Customstatusmanager.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function InboxHeader({
  selectedAccount,
  selectedFolder,
  onFilterApply,
  onTodayFollowUpClick,
  onScheduleClick,
  onSearchEmail,
  activeFilters, // 🔥 NEW: Receive current filters from parent
}) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [countries, setCountries] = useState([]);
  const [customStatuses, setCustomStatuses] = useState([]);
  const [showStatusManager, setShowStatusManager] = useState(false);

  // 🔥 Initialize Local State
  const [filters, setFilters] = useState({
    leadStatus: "",
    sender: "",
    recipient: "",
    subject: "",
    tags: [],
    dateFrom: "",
    dateTo: "",
    followUpHistoryDate: "", // 🔥 ADD THIS
    hasAttachment: false,
    isUnread: false,
    isStarred: false,
    country: "",
  });

  // 🔥 NEW: Time Range State
  const [timeRange, setTimeRange] = useState("3m"); // Default to 3m

  // Sync state with activeFilters prop on mount/change
  useEffect(() => {
    if (activeFilters) {
      setFilters(activeFilters);

      // Attempt to auto-detect time range from dateFrom
      if (!activeFilters.dateFrom) {
        setTimeRange("all");
      } else {
        const d = new Date(activeFilters.dateFrom);
        const now = new Date();
        // Rough estimation for UI feedback
        const diffMonth =
          (now.getFullYear() - d.getFullYear()) * 12 +
          (now.getMonth() - d.getMonth());

        if (diffMonth >= 11) setTimeRange("1y");
        else if (diffMonth >= 5) setTimeRange("6m");
        else if (diffMonth >= 2) setTimeRange("3m");
        else setTimeRange("custom");
      }
    }
  }, [activeFilters]);

  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const statusOptions = [
    { label: "All Statuses", value: "" },

    // Default statuses
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

    // Custom statuses
    ...customStatuses.map((s) => s.name),
  ].map((status) =>
    typeof status === "string" ? { label: status, value: status } : status,
  );

  useEffect(() => {
    fetchCountries();
    const fetchCustomStatuses = async () => {
      try {
        const res = await api.get(`${API_BASE_URL}/api/customStatus`);
        if (res.data.success) {
          setCustomStatuses(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load custom statuses", err);
      }
    };
    fetchCustomStatuses();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };
    if (showFilterDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterDropdown]);

  const fetchCountries = async () => {
    try {
      const response = await api.get(`${API_BASE_URL}/api/inbox/countries`);
      if (response.data.success) {
        setCountries(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  // 🔥 NEW: Handle Time Range Dropdown Logic
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);

    if (range === "all") {
      setFilters((prev) => ({ ...prev, dateFrom: "", dateTo: "" }));
      return;
    }

    if (range === "custom") {
      // Don't change dates, let user pick
      return;
    }

    const d = new Date();
    if (range === "3m") d.setMonth(d.getMonth() - 3);
    else if (range === "6m") d.setMonth(d.getMonth() - 6);
    else if (range === "1y") d.setFullYear(d.getFullYear() - 1);

    const dateStr = d.toISOString().split("T")[0];
    setFilters((prev) => ({ ...prev, dateFrom: dateStr, dateTo: "" }));
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchEmail(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (onSearchEmail) onSearchEmail(value);
    }, 500);
  };

  const handleApplyFilter = () => {
    console.log("🔥 Filters being applied:", filters);
    if (onFilterApply) {
      onFilterApply(filters);
    }
    setShowFilterDropdown(false);
  };

  // 🔥 UPDATED: Reset now defaults to 3 months
  const handleResetFilter = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    const defaultDate = d.toISOString().split("T")[0];

    const resetFilters = {
      leadStatus: "",
      sender: "",
      recipient: "",
      subject: "",
      tags: [],
      dateFrom: defaultDate, // ✅ Reset to 3m
      dateTo: "",
      hasAttachment: false,
      isUnread: false,
      isStarred: false,
      country: "",
      followUpHistoryDate: "", // 🔥 Ensure this is reset
    };

    setTimeRange("3m"); // UI update
    setFilters(resetFilters);
    if (onFilterApply) {
      onFilterApply(resetFilters);
    }
  };

  const activeFilterCount = Object.values(filters).filter((val) => {
    if (typeof val === "boolean") return val;
    if (Array.isArray(val)) return val.length > 0;
    return val && val !== "";
  }).length;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between mb-3">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {selectedFolder
                ? selectedFolder.charAt(0).toUpperCase() +
                  selectedFolder.slice(1)
                : "Inbox"}
            </h1>
            {selectedAccount && (
              <p className="text-xs text-gray-500">{selectedAccount.email}</p>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTodayFollowUpClick}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <Clock className="w-4 h-4" />
            Today Follow-up
          </button>

          <button
            onClick={onScheduleClick}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <Calendar className="w-4 h-4" />
            Schedule
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-medium ${
                activeFilterCount > 0
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showFilterDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Filter Dropdown */}
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    Filter Messages
                  </h3>
                  <button
                    onClick={() => setShowFilterDropdown(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* 🔥 NEW: Time Range Selector */}
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <label className="block text-xs font-bold text-blue-800 uppercase mb-2">
                      Fetching Range (Default: 3 Months)
                    </label>
                    <select
                      value={timeRange}
                      onChange={(e) => handleTimeRangeChange(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="3m">Last 3 Months</option>
                      <option value="6m">Last 6 Months</option>
                      <option value="1y">Last 1 Year</option>
                      <option value="all">All Time (Slow)</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {/* Date Range Inputs */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Specific Dates
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => {
                          setFilters({ ...filters, dateFrom: e.target.value });
                          setTimeRange("custom"); // Switch dropdown to custom if manually edited
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => {
                          setFilters({ ...filters, dateTo: e.target.value });
                          setTimeRange("custom");
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Lead Status */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Lead Status
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowStatusManager(true)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        + Manage Status
                      </button>
                    </div>
                    <select
                      value={filters.leadStatus}
                      onChange={(e) =>
                        setFilters({ ...filters, leadStatus: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Country
                    </label>
                    <select
                      value={filters.country}
                      onChange={(e) =>
                        setFilters({ ...filters, country: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">All Countries</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* 📜 FOLLOW-UP HISTORY DATE */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Follow-up History Date
                    </label>

                    <input
                      type="date"
                      value={filters.followUpHistoryDate}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          followUpHistoryDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg
               focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />

                    {filters.followUpHistoryDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Shows leads followed up on this date
                      </p>
                    )}
                  </div>

                  {/* Sender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Sender
                    </label>
                    <input
                      type="text"
                      value={filters.sender}
                      onChange={(e) =>
                        setFilters({ ...filters, sender: e.target.value })
                      }
                      placeholder="Enter sender email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Recipient */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Recipient
                    </label>
                    <input
                      type="text"
                      value={filters.recipient}
                      onChange={(e) =>
                        setFilters({ ...filters, recipient: e.target.value })
                      }
                      placeholder="Enter recipient email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Subject
                    </label>
                    <input
                      type="text"
                      value={filters.subject}
                      onChange={(e) =>
                        setFilters({ ...filters, subject: e.target.value })
                      }
                      placeholder="Search in subject"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Tags */}
                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Tags
                    </label>
                    <input
                      type="text"
                      placeholder="Enter tags (comma separated)"
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          tags: e.target.value.split(",").map((t) => t.trim()),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div> */}

                  {/* Checkbox Filters */}
                  <div className="space-y-2 pt-2 border-t">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.hasAttachment}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            hasAttachment: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Has attachments
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.isUnread}
                        onChange={(e) =>
                          setFilters({ ...filters, isUnread: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Unread only</span>
                    </label>
                    {/* <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.isStarred}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            isStarred: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Starred only
                      </span>
                    </label> */}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-2">
                  <button
                    onClick={handleResetFilter}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" /> Reset (Default)
                  </button>
                  <button
                    onClick={handleApplyFilter}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by email ID..."
          value={searchEmail}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {showStatusManager && (
        <CustomStatusManager
          isOpen={showStatusManager}
          onClose={() => setShowStatusManager(false)}
          customStatuses={customStatuses}
          onStatusCreated={(status) =>
            setCustomStatuses((prev) => [status, ...prev])
          }
          onStatusUpdated={(updated) =>
            setCustomStatuses((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            )
          }
          onStatusDeleted={(id) =>
            setCustomStatuses((prev) => prev.filter((s) => s.id !== id))
          }
        />
      )}
    </div>
  );
}
