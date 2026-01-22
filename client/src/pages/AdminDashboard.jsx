// AdminDashboard.jsx - Replace your existing file with this

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AllLeads from "./AllLeads";
import LeadResponses from "./OverAlldetails";
import AddEmployee from "./AddEmployee";
import {
  ClipboardList,
  FileText,
  LogOut,
  Shield,
  UserPlus,
} from "lucide-react";
import AdminDashboards from "./AdminDashboards";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(
    localStorage.getItem("adminActiveTab") || "all-leads",
  );
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    localStorage.setItem("adminActiveTab", activeTab);
  }, [activeTab]);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const [leads, setLeads] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem("adminActiveTab");
    localStorage.clear();
    navigate("/");
  };

  const tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Shield,
      description: "Overview and insights",
    },
    {
      id: "all-leads",
      label: "Process Leads",
      icon: ClipboardList,
      description: "Manage incoming leads",
    },
    {
      id: "lead-responses",
      label: "Overall Details",
      icon: FileText,
      description: "View comprehensive reports",
    },
    {
      id: "add-employee",
      label: "Add Employee",
      icon: UserPlus,
      description: "Register new employees",
    },
  ];

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Collapsible Sidebar */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col relative z-50 ${
          sidebarExpanded ? "w-72" : "w-18"
        }`}
        style={{
          boxShadow: "2px 0 12px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200">
          {/* Expanded Header */}
          <div
            className={`flex items-center gap-3 transition-all duration-300 ${
              sidebarExpanded ? "opacity-100" : "opacity-0 h-0"
            }`}
          >
            <div className="relative  rounded-full p-[3px] bg-gradient-to-br from-green-400 via-yellow-400 to-orange-500 shadow-lg shadow-orange-500/20">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <img
                  src="/image.svg"
                  alt="Company Logo"
                  className="w-10 h-10 object-contain"
                />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Sales CRM</h1>
              <p className="text-xs text-slate-500">Control Center</p>
            </div>
          </div>

          {/* Collapsed Icon */}
          <div
            className={`flex items-center justify-center transition-all duration-300 ${
              sidebarExpanded ? "opacity-0 h-0 gap-2" : "opacity-100 h-9 gap-4"
            }`}
          >
            <div className="relative rounded-full p-[3px] bg-gradient-to-br from-green-400 via-yellow-400 to-orange-500 shadow-lg shadow-orange-500/20">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <img
                  src="/image.svg"
                  alt="Company Logo"
                  className="w-10 h-10 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Profile */}
          <div
            className={`mt-4 flex items-center ${
              sidebarExpanded ? "gap-3 p-3" : "justify-center py"
            } bg-slate-50 rounded-xl border border-slate-200 transition-all duration-300 overflow-hidden`}
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md text-white font-bold text-sm">
              {(user.name || "A").charAt(0).toUpperCase()}
            </div>

            {sidebarExpanded && (
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-slate-900 truncate">
                  {user.name || "Admin"}
                </h2>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarExpanded ? "p-3 space-y-1" : "p-2 space-y-4"
          }`}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full group relative transition-all duration-300"
              >
                <div
                  className={`flex items-center rounded-xl transition-all duration-300 relative overflow-hidden ${
                    sidebarExpanded ? "p-3" : "p-2 justify-center"
                  } ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {/* Active Indicator Animation */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-pulse"></div>
                  )}

                  <Icon
                    className={`w-5 h-5 flex-shrink-0 relative z-10 transition-all duration-300 ${
                      sidebarExpanded ? "mr-3" : ""
                    } ${
                      isActive
                        ? "text-white"
                        : "text-slate-500 group-hover:text-slate-900"
                    }`}
                  />

                  {sidebarExpanded && (
                    <div className="flex-1 text-left relative z-10">
                      <div className="font-semibold text-sm">{tab.label}</div>
                      <div
                        className={`text-xs mt-0.5 ${
                          isActive ? "text-blue-100" : "text-slate-500"
                        }`}
                      >
                        {tab.description}
                      </div>
                    </div>
                  )}

                  {/* Hover Effect */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/5 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className={`flex items-center w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-red-500 hover:text-white transition-all duration-300 group border border-slate-200 hover:border-red-500 ${
              sidebarExpanded ? "justify-start px-4" : "justify-center"
            }`}
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            <span
              className={`transition-all duration-300 ${
                sidebarExpanded
                  ? "opacity-100 ml-2"
                  : "opacity-0 w-0 overflow-hidden"
              }`}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {activeTab === "dashboard" && <AdminDashboards />}
        {activeTab === "all-leads" && (
          <AllLeads leads={leads} setLeads={setLeads} />
        )}
        {activeTab === "lead-responses" && <LeadResponses leads={leads} />}
        {activeTab === "add-employee" && <AddEmployee />}
      </main>
    </div>
  );
}
