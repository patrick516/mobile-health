import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Home,
  Stethoscope,
  Shield,
  FlaskConical,
  TrendingUp,
  FileBarChart,
  Download,
  Users,
  Map,
  Network,
  ShieldAlert,
  Building2,
  MapPinOff,
  Baby,
  Pill,
  HeartHandshake,
  MessageSquare,
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
  { to: "/pnc", icon: Baby, label: "PNC", roles: ["ALL"] },
  { to: "/tb", icon: Pill, label: "TB Follow-up", roles: ["ALL"] },
  { to: "/fp", icon: HeartHandshake, label: "Family Planning", roles: ["ALL"] },
  {
    to: "/feedback",
    icon: MessageSquare,
    label: "CHW Feedback",
    roles: ["NURSE", "DISTRICT_OFFICER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/reports",
    icon: FileBarChart,
    label: "Reports",
    roles: ["DISTRICT_OFFICER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/export",
    icon: Download,
    label: "DHIS2 Export",
    roles: ["DISTRICT_OFFICER", "ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/admin/users",
    icon: Users,
    label: "Users",
    roles: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/admin/geography",
    icon: Map,
    label: "Geography",
    roles: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/admin/facilities",
    icon: Building2,
    label: "Facilities",
    roles: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/admin/allocations",
    icon: Network,
    label: "Allocations",
    roles: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/admin/relocated-households",
    icon: MapPinOff,
    label: "Relocated Households",
    roles: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/admin/security",
    icon: ShieldAlert,
    label: "Security",
    roles: ["SUPER_ADMIN"],
  },
];

export default function Sidebar() {
  const { user } = useAuthStore();

  const visible = NAV.filter(
    (n) => n.roles.includes("ALL") || n.roles.includes(user?.role || ""),
  );

  return (
    <aside className="w-64 bg-teal-800 flex flex-col h-full">
      {/* ── Brand block: logo centered, wordmark below ── */}
      <div className="flex flex-col items-center text-center px-4 py-6 border-b border-teal-700">
        <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shadow-md mb-3">
          <img
            src="/images/logo.png"
            alt="MobileHealth Malawi"
            className="w-10 h-10 object-contain rounded-lg"
          />
        </div>
        <p className="text-white font-bold text-sm leading-tight">
          MobileHealth Malawi
        </p>
        <p className="text-teal-300 text-[10px] uppercase tracking-widest mt-1 px-2 truncate max-w-full">
          {user?.facility?.name || "Health Portal"}
        </p>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-teal-200 hover:bg-teal-700/50 hover:text-white",
              )
            }
          >
            <item.icon size={18} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
