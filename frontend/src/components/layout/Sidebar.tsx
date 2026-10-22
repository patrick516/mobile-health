import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Home,
  FlaskConical,
  TrendingUp,
  FileBarChart,
  Download,
  Users,
  Map,
  ShieldAlert,
  Building2,
  MapPinOff,
  MessageSquare,
  Tablets,
  Activity,
  Package,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import clsx from "clsx";

// We group the navigation items into logical sections
const NAV_GROUPS = [
  {
    title: null, // Main items without a header
    items: [
      { to: "/", icon: LayoutDashboard, label: "Overview", roles: ["ALL"] },
    ],
  },
  {
    title: "Clinical Care",
    items: [
      {
        to: "/households",
        icon: Home,
        label: "Households",
        roles: ["ADMIN", "DISTRICT_OFFICER", "NURSE"],
      },
      {
        to: "/programs",
        icon: Activity,
        label: "Clinical Programs",
        roles: ["ADMIN", "DISTRICT_OFFICER", "NURSE"],
      },
      {
        to: "/analytics",
        icon: TrendingUp,
        label: "Clinical Analytics",
        roles: ["ADMIN", "DISTRICT_OFFICER", "NURSE"],
      },
      {
        to: "/feedback",
        icon: MessageSquare,
        label: "CHW Feedback",
        roles: ["ADMIN", "DISTRICT_OFFICER", "NURSE"],
      },
    ],
  },
  {
    title: "Pharmacy & Drugs",
    items: [
      {
        to: "/drugs",
        icon: FlaskConical,
        label: "CHW Drug Kits",
        roles: ["DISTRICT_OFFICER", "NURSE"],
      },
      {
        to: "/pharmacy",
        icon: Tablets,
        label: "Pharmacy Hub",
        roles: ["PHARMACIST", "ADMIN", "DISTRICT_OFFICER", "NURSE"],
      },
      {
        to: "/pharmacy/inventory",
        icon: Package,
        label: "Drug Inventory",
        roles: ["PHARMACIST", "ADMIN", "DISTRICT_OFFICER", "NURSE"],
      },
    ],
  },
  {
    title: "Reports & Export",
    items: [
      {
        to: "/reports",
        icon: FileBarChart,
        label: "Reports",
        roles: ["ADMIN", "DISTRICT_OFFICER", "SUPER_ADMIN"],
      },
      {
        to: "/export",
        icon: Download,
        label: "DHIS2 Export",
        roles: ["ADMIN", "DISTRICT_OFFICER"],
      },
    ],
  },
  {
    title: "System Setup",
    items: [
      {
        to: "/admin/users",
        icon: Users,
        label: "User Management",
        roles: ["ADMIN", "SUPER_ADMIN"],
      },
      {
        to: "/admin/facilities",
        icon: Building2,
        label: "Facilities & Clinics",
        roles: ["ADMIN", "SUPER_ADMIN"],
      },
      {
        to: "/admin/geography",
        icon: Map,
        label: "Geography Setup",
        roles: ["ADMIN", "SUPER_ADMIN"],
      },
      {
        to: "/admin/relocated-households",
        icon: MapPinOff,
        label: "Relocated Households",
        roles: ["ADMIN", "DISTRICT_OFFICER"],
      },
      {
        to: "/admin/security",
        icon: ShieldAlert,
        label: "Security Center",
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
];

export default function Sidebar() {
  const { user } = useAuthStore();
  const isPharmacist = user?.role === "PHARMACIST";

  return (
    <aside className="w-64 bg-teal-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col items-center text-center px-4 py-6 border-b border-teal-700 shrink-0">
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
          {user?.facility?.name || "System Administration"}
        </p>
      </div>

      {/* Navigation grouped by sections */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
        {NAV_GROUPS.map((group, groupIdx) => {
          const visibleItems = group.items.filter((item) => {
            if (isPharmacist) {
              if (item.to === "/") return false;
              // Pharmacist only sees the Pharmacy group
              if (group.title !== "Pharmacy & Drugs") return false;
            }
            return (
              item.roles.includes("ALL") ||
              item.roles.includes(user?.role || "")
            );
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={groupIdx} className="mb-4">
              {group.title && (
                <p className="px-3 text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1.5">
                  {group.title}
                </p>
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  // FIX: Added /pharmacy to the 'end' prop so it doesn't highlight when on /pharmacy/inventory
                  end={item.to === "/" || item.to === "/pharmacy"}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-teal-700 text-white shadow-sm"
                        : "text-teal-200 hover:bg-teal-700/50 hover:text-white",
                    )
                  }
                >
                  <item.icon size={18} className="shrink-0" />
                  <span className="truncate">
                    {isPharmacist && item.to === "/pharmacy"
                      ? "Dashboard"
                      : item.label}
                  </span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
