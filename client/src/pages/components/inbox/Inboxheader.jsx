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
} from "lucide-react";
import { api } from "../../../pages/api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function InboxHeader({
  selectedAccount,
  selectedFolder,
  onFilterApply,
  onTodayFollowUpClick,
  onScheduleClick,
  onSearchEmail,
}) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [countries, setCountries] = useState([]);
  const [filters, setFilters] = useState({
    status: "all",
    sender: "",
    recipient: "",
    subject: "",
    tags: [],
    dateFrom: "",
    dateTo: "",
    hasAttachment: false,
    isUnread: false,
    isStarred: false,
    country: "",
  });
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Status options matching the uploaded image
  const statusOptions = [
    "All Statuses",
    "Invoice Pending",
    "Invoice Cancel",
    "Deal",
    "Active Client",
    "No Response",
    "1 Reply",
    "2 Reply",
    "3 Reply",
    "1 Follow Up",
    "2 Follow Up",
    "3 Follow Up",
    "Call",
    "Sample Pending",
  ];

  // Fetch countries on mount
  useEffect(() => {
    fetchCountries();
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

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchEmail(value);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (onSearchEmail) {
        onSearchEmail(value);
      }
    }, 500);
  };

  const handleApplyFilter = () => {
    if (onFilterApply) {
      onFilterApply(filters);
    }
    setShowFilterDropdown(false);
  };

  const handleResetFilter = () => {
    const resetFilters = {
      status: "all",
      sender: "",
      recipient: "",
      subject: "",
      tags: [],
      dateFrom: "",
      dateTo: "",
      hasAttachment: false,
      isUnread: false,
      isStarred: false,
      country: "",
    };
    setFilters(resetFilters);
    if (onFilterApply) {
      onFilterApply(resetFilters);
    }
  };

  const activeFilterCount = Object.values(filters).filter((val) => {
    if (typeof val === "boolean") return val;
    if (Array.isArray(val)) return val.length > 0;
    return val && val !== "all" && val !== "";
  }).length;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between mb-3">
        {/* Left Side - Account & Folder Info */}
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

        {/* Right Side - Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Today Follow-up Button */}
          <button
            onClick={onTodayFollowUpClick}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <Clock className="w-4 h-4" />
            Today Follow-up
          </button>

          {/* Schedule Button */}
          <button
            onClick={onScheduleClick}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <Calendar className="w-4 h-4" />
            Schedule
          </button>

          {/* Filter Button */}
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
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters({ ...filters, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      {statusOptions.map((status) => (
                        <option
                          key={status}
                          value={status.toLowerCase().replace(/ /g, "_")}
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Country Filter */}
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

                  {/* Sender Filter */}
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

                  {/* Recipient Filter */}
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

                  {/* Subject Filter */}
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

                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date Range
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) =>
                          setFilters({ ...filters, dateFrom: e.target.value })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) =>
                          setFilters({ ...filters, dateTo: e.target.value })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Tags Filter */}
                  <div>
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
                  </div>

                  {/* Checkbox Filters */}
                  <div className="space-y-2">
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
                    <label className="flex items-center gap-2 cursor-pointer">
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
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-2">
                  <button
                    onClick={handleResetFilter}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleApplyFilter}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
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
    </div>
  );
}
