import { useLocation } from "react-router-dom";
import { Bell, RefreshCw } from "lucide-react";
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
  "/admin/users": "User Management",
  "/admin/geography": "Geography Setup",
  "/admin/allocations": "Zone Allocations",
};

export default function Header() {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-bold text-gray-900">
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => queryClient.invalidateQueries()}
          className="p-2 text-gray-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
          title="Refresh all data"
        >
          <RefreshCw size={16} />
        </button>
        <button className="p-2 text-gray-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors relative">
          <Bell size={16} />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
          <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-white text-sm font-bold">
            {user?.fullName?.charAt(0) || "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
