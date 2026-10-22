import { useLocation, useNavigate } from "react-router-dom";
import { Bell, RefreshCw, LogOut, ChevronLeft } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useQueryClient } from "@tanstack/react-query";

const TITLES: Record<string, string> = {
  "/": "Dashboard Overview",
  "/households": "Households",
  "/referrals": "Referral Queue",
  "/immunisations": "Immunisation Tracker",
  "/drugs": "CHW Drug Kits",
  "/analytics": "Analytics & Trends",
  "/export": "DHIS2 Export",
  "/reports": "Reports",
  "/programs": "Clinical Programs",
  "/feedback": "CHW Feedback",
  "/admin/users": "User Management",
  "/admin/geography": "Geography Setup",
  "/admin/facilities": "Facilities & Clinics",
  "/admin/security": "Security Alerts",
  "/admin/relocated-households": "Relocated Households",
  "/pharmacy": "Pharmacy Dashboard",
  "/pharmacy/receiving": "Stock Receiving",
  "/pharmacy/dispense": "Dispensing",
  "/pharmacy/requests": "Patient Prescriptions",
  "/pharmacy/alerts": "Expiry Alerts",
  "/pharmacy/transactions": "Transaction Log",
  "/pharmacy/suppliers": "Suppliers",
};

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const isHome = pathname === "/";

  // Backwards compatibility: display first/last name if available, else fallback to fullName
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : (user as any)?.fullName || "User";

  const avatarInitial = user?.firstName
    ? user.firstName.charAt(0).toUpperCase()
    : (user as any)?.fullName?.charAt(0).toUpperCase() || "U";

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between shrink-0">
      {/* Left: Back button + page title + date */}
      <div className="flex items-center gap-3 min-w-0">
        {!isHome && (
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            title="Go back"
          >
            <ChevronLeft size={20} />
          </button>
        )}
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
              {user?.title ? `${user.title} ` : ""}
              {displayName}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-gray-400">
              {user?.role?.replace(/_/g, " ") || ""}
            </p>
          </div>

          <div
            className="w-9 h-9 rounded-full bg-teal-700 flex items-center justify-center text-white text-sm font-bold shrink-0"
            title={displayName}
          >
            {avatarInitial}
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
