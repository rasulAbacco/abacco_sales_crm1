import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Forwardedlead from "./Forwardedlead";
import OverAlldetails from "./OverAlldetails";
import Pending from "./Pending";
import InboxPage from "./Inbox";
import FollowUpPlanner from "./FollowUpPlanner";
import LeadEmployeeList from "./LeadEmployeeList";
import ClientReplies from "./ClientReplies";
import MessageTemplates from "./Messagetemplates";
import EmployeeDashboards from "./EmployeeDashboards";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

import {
  Mail,
  BarChart3,
  Clock,
  Inbox,
  Calendar,
  MessageSquare,
  LogOut,
  User,
  FileText,
} from "lucide-react";

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState(
    localStorage.getItem("employeeActiveTab") || "forwarded-leads"
  );
  const [isHovered, setIsHovered] = useState(false);
  const [leads, setLeads] = useState([]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")) || {};
  // pages/EmployeeDashboard.jsx

  // pages/EmployeeDashboard.jsx

  // pages/EmployeeDashboard.jsx
  // 1️⃣ DEFINE THE FUNCTION FIRST (Must be above useEffect)
  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            "BGEMLwQZYtvEcMCigqqrLWoYnGUkqnb1ilIDF99aNlWs8N7lXqk85kraOOLg3bO6Fx-1QZIKRfXJdbcnOBJgrcU",
        });
      }

      await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          subscription: subscription.toJSON(),
        }),
      });

      console.log("✅ Device successfully registered for OS Notifications");
    } catch (err) {
      console.error("❌ Push registration failed:", err);
    }
  };
  useEffect(() => {
    // Only attempt to subscribe if the user is logged in
    if (user?.id) {
      const runSubscription = async () => {
        // 1. Check if permission is already granted
        if (Notification.permission === "granted") {
          await subscribeToPush();
        }
        // 2. Otherwise ask for permission first
        else if (Notification.permission !== "denied") {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            await subscribeToPush();
          }
        }
      };

      runSubscription();
    }
  }, [user.id]); // Runs whenever the user ID is available

  useEffect(() => {
    localStorage.setItem("employeeActiveTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    const fetchLeads = async () => {
      if (!user?.email) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/leads/employee/${user.email}`
        );
        const data = await res.json();
        setLeads(data);
      } catch (error) {
        console.error("Error fetching leads:", error);
      }
    };
    fetchLeads();
  }, [user.email]);

  const handleLogout = () => {
    localStorage.removeItem("employeeActiveTab");
    localStorage.clear();
    navigate("/");
  };

  const tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      description: "Performance summary",
    },
    {
      id: "forwarded-leads",
      label: "Forwarded Leads",
      icon: Mail,
      description: "New assignments",
    },
    {
      id: "overall-details",
      label: "Overall Details",
      icon: BarChart3,
      description: "Performance metrics",
    },
    {
      id: "inbox",
      label: "Inbox",
      icon: Inbox,
      description: "Email management",
    },
    {
      id: "follow-up-planner",
      label: "Follow-Up Planner",
      icon: Calendar,
      description: "Schedule tasks",
    },
    {
      id: "message-templates",
      label: "Message Templates",
      icon: FileText,
      description: "Email templates",
    },
  ];

  return (
    <div className="flex h-screen bg-white">
      {/* Collapsible Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ease-in-out z-50 ${
          isHovered ? "w-64" : "w-16"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="h-16 flex items-center justify-center border-b border-gray-100 px-2">
            {isHovered ? (
              <div className="px-4 w-full">
                <div className="flex items-center gap-2">
                  <div className="relative rounded-full p-[3px] bg-gradient-to-br from-green-400 via-yellow-400 to-orange-500 shadow-lg shadow-orange-500/20">
                    <div className=" bg-white  w-12 h-12 rounded-full flex items-center justify-center">
                      <img
                        src="/image.svg"
                        alt="Company Logo"
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 text-lg">
                    Sales CRM
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative  rounded-full p-[3px] bg-gradient-to-br from-green-400 via-yellow-400 to-orange-500 shadow-lg shadow-orange-500/20">
                <div className=" bg-white  w-12 h-12 rounded-full flex items-center justify-center">
                  <img
                    src="/image.svg"
                    alt="Company Logo"
                    className="w-10 h-10 object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 overflow-y-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full mb-1 transition-all duration-200"
                  title={!isHovered ? tab.label : ""}
                >
                  <div
                    className={`flex items-center gap-3 py-3 rounded-xl transition-all duration-200 ${
                      isHovered ? "px-3" : "px-0 justify-center"
                    } ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        isActive ? "text-blue-600" : "text-gray-500"
                      }`}
                    />
                    {isHovered && (
                      <div className="flex-1 text-left overflow-hidden">
                        <div className="text-sm font-semibold">{tab.label}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {tab.description}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="border-t border-gray-100 p-2">
            {isHovered && (
              <div className="mb-2 px-3 py-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {(user.name || "E").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user.name || "Employee"}
                    </p>
                    <p className="text-xs text-gray-500">Team Member</p>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`w-full py-3 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-700 transition-all duration-200 font-semibold flex items-center gap-2 ${
                isHovered ? "px-3 justify-start" : "justify-center"
              }`}
              title={!isHovered ? "Logout" : ""}
            >
              <LogOut className="w-5 h-5" />
              {isHovered && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          isHovered ? "ml-64" : "ml-16"
        }`}
      >
        {/* Content Area */}
        <div className="min-h-screen bg-gray-50">
          {activeTab === "dashboard" && <EmployeeDashboards />}
          {activeTab === "forwarded-leads" && <Forwardedlead leads={leads} />}
          {activeTab === "overall-details" && <OverAlldetails />}
          {activeTab === "pending-details" && <Pending />}
          {activeTab === "inbox" && <InboxPage />}
          {activeTab === "follow-up-planner" && <FollowUpPlanner />}
          {activeTab === "message-templates" && <MessageTemplates />}
          {activeTab === "total-employee" && <LeadEmployeeList />}

          {/* Floating edit window always rendered if editingLead exists */}
          {localStorage.getItem("editingLead") && <FollowUpPlanner />}
        </div>
      </main>
    </div>
  );
}
