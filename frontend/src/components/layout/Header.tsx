import { useLocation } from "react-router-dom";
import { Bell, RefreshCw, LogOut } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useQueryClient } from "@tanstack/react-query";

const TITLES: Record<string, string> = {
  "/": "Dashboard Overview",
  "/households": "Households",
  "/referrals": "Referral Queue",
  "/immunisations": "Immunisation Tracker",
  "/drugs": "Drug Stock",
  "/analytics": "Analytics & Trends",
  "/export": "DHIS2 Export",
  "/reports": "Reports",
  "/pnc": "PNC Tracker",
  "/tb": "TB Follow-up",
  "/fp": "Family Planning",
  "/feedback": "CHW Feedback",
  "/admin/users": "User Management",
  "/admin/geography": "Geography Setup",
  "/admin/allocations": "Zone Allocations",
  "/admin/facilities": "Facilities",
  "/admin/security": "Security Alerts",
  "/admin/relocated-households": "Relocated Households",
};

export default function Header() {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between shrink-0">
      {/* Left: page title + date */}
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-gray-900 truncate">
          {TITLES[pathname] || "Dashboard"}
        </h1>
        <p className="text-xs text-gray-500">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Right: actions + profile */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => queryClient.invalidateQueries()}
          className="p-2 text-gray-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
          title="Refresh all data"
        >
          <RefreshCw size={16} />
        </button>

        <button
          className="p-2 text-gray-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors relative"
          title="Notifications"
        >
          <Bell size={16} />
        </button>

        {/* Profile block */}
        <div className="flex items-center gap-3 pl-3 ml-1.5 border-l border-gray-100">
          <div className="text-right leading-tight hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">
              {user?.fullName || "User"}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-gray-400">
              {user?.role?.replace(/_/g, " ") || ""}
            </p>
          </div>

          <div
            className="w-9 h-9 rounded-full bg-teal-700 flex items-center justify-center text-white text-sm font-bold shrink-0"
            title={user?.fullName}
          >
            {user?.fullName?.charAt(0).toUpperCase() || "U"}
          </div>

          <button
            onClick={clearAuth}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
