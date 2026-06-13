import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Home,
  Stethoscope,
  Shield,
  FlaskConical,
  TrendingUp,
  Download,
  FileBarChart,
  Users,
  Map,
  Network,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import clsx from "clsx";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Overview", roles: ["ALL"] },
  { to: "/households", icon: Home, label: "Households", roles: ["ALL"] },
  { to: "/referrals", icon: Stethoscope, label: "Referrals", roles: ["ALL"] },
  {
    to: "/immunisations",
    icon: Shield,
    label: "Immunisations",
    roles: ["ALL"],
  },
  { to: "/drugs", icon: FlaskConical, label: "Drug Stock", roles: ["ALL"] },
  { to: "/analytics", icon: TrendingUp, label: "Analytics", roles: ["ALL"] },
  {
    to: "/export",
    icon: Download,
    label: "DHIS2 Export",
    roles: ["DISTRICT_OFFICER", "ADMIN"],
  },
  {
    to: "/reports",
    icon: FileBarChart,
    label: "Reports",
    roles: ["DISTRICT_OFFICER", "ADMIN"],
  },
  { to: "/admin/users", icon: Users, label: "Users", roles: ["ADMIN"] },
  { to: "/admin/geography", icon: Map, label: "Geography", roles: ["ADMIN"] },
  {
    to: "/admin/allocations",
    icon: Network,
    label: "Allocations",
    roles: ["ADMIN"],
  },
];

export default function Sidebar() {
  const { user, clearAuth } = useAuthStore();

  const visible = NAV.filter(
    (n) => n.roles.includes("ALL") || n.roles.includes(user?.role || ""),
  );

  return (
    <aside className="w-64 bg-teal-800 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-teal-700">
        <img
          src="/images/logo.png"
          alt="Logo"
          className="w-9 h-9 rounded-lg object-cover"
        />
        <div>
          <p className="text-white font-bold text-sm leading-tight">
            MobileHealth
          </p>
          <p className="text-teal-300 text-xs">Malawi</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-teal-700 text-white"
                  : "text-teal-200 hover:bg-teal-700/50 hover:text-white",
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-teal-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.fullName?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">
              {user?.fullName}
            </p>
            <p className="text-teal-300 text-xs">
              {user?.role?.replace("_", " ")}
            </p>
          </div>
        </div>
        <button
          onClick={clearAuth}
          className="flex items-center gap-2 text-teal-300 hover:text-white text-xs w-full transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
