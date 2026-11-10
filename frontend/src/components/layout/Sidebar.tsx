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
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
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
        roles: [
          "DISTRICT_OFFICER",
          "NURSE",
          "PHARMACIST",
          "ADMIN",
          "SUPER_ADMIN",
        ],
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

  // Pending prescriptions — everyone who can open Pharmacy Hub sees the badge
  const canSeePharmacy = [
    "PHARMACIST",
    "ADMIN",
    "SUPER_ADMIN",
    "NURSE",
    "DISTRICT_OFFICER",
  ].includes(user?.role || "");
  const { data: pendingRequests } = useQuery({
    queryKey: ["pharmacy-requests-pending"],
    queryFn: () =>
      api
        .get("/pharmacy/requests", { params: { status: "PENDING" } })
        .then((r) => r.data.data),
    enabled: canSeePharmacy,
    refetchInterval: 5000,
  });
  const pendingCount = pendingRequests?.length ?? 0;

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

                  {canSeePharmacy &&
                    item.to === "/pharmacy" &&
                    pendingCount > 0 && (
                      <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                        {pendingCount}
                      </span>
                    )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
