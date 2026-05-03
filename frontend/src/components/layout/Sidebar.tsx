import { useEffect } from "react";
import { NAV_ITEMS, type PageKey } from "../../lib/constants";
import { useUIStore } from "../../store/uiStore";
import { cn } from "../../lib/utils";
import { getIcon } from "../../lib/icons";
import { fetchDashboardStats } from "../../services/dashboardService";

const SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "management", label: "Management" },
  { key: "settings", label: "Settings" },
];

export function Sidebar() {
  const {
    activePage,
    setActivePage,
    pendingReports,
    pendingVerifications,
    setBadgeCounts,
  } = useUIStore();

  useEffect(() => {
    fetchDashboardStats()
      .then((stats) => {
        setBadgeCounts({
          pendingReports: stats.pendingReports,
          pendingVerifications: stats.pendingVerifications,
        });
      })
      .catch(console.error);
  }, []);

  const BADGES: Record<string, number> = {
    pendingVerifications,
    pendingReports,
  };

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-60 bg-[#0f0a1a] flex flex-col z-40 overflow-hidden">
      {/* glow */}
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-fuchsia-600/15 pointer-events-none" />

      {/* Logo */}
      <div className="px-5 pt-5 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
          <img
            src="/images/Logo.png"
            alt="Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-white font-semibold text-[15px] tracking-tight">
          Anzathu<span className="text-fuchsia-400">Connect</span>
        </span>
      </div>

      <div className="mx-4 mt-3 px-2.5 py-1 rounded-md bg-fuchsia-900/30 border border-fuchsia-700/30 text-fuchsia-300 text-[10px] uppercase tracking-widest font-medium">
        Admin Portal
      </div>

      <nav className="flex-1 overflow-y-auto mt-2 pb-4">
        {SECTIONS.map((section) => {
          const items = NAV_ITEMS.filter((n) => n.section === section.key);
          return (
            <div key={section.key}>
              <p className="px-4 pt-4 pb-1.5 text-[10px] uppercase tracking-widest text-white/25 font-medium">
                {section.label}
              </p>
              {items.map((item) => {
                const badge = item.badgeKey ? BADGES[item.badgeKey] : null;
                const isActive = activePage === item.key;
                const IconComponent = getIcon(item.icon);

                return (
                  <button
                    key={item.key}
                    onClick={() => setActivePage(item.key as PageKey)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-sm transition-all relative text-left",
                      "w-[calc(100%-16px)]",
                      isActive
                        ? "bg-fuchsia-900/30 text-fuchsia-300"
                        : "text-white/50 hover:text-white/90 hover:bg-white/5",
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-fuchsia-500 rounded-r-full -ml-2" />
                    )}
                    <span className="w-4 text-center flex-shrink-0">
                      {IconComponent && <IconComponent size={16} />}
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {badge !== null && badge > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Admin user */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            SA
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">
              Super Admin
            </div>
            <div className="text-white/30 text-[11px] truncate">
              admin@anzathuconnect.com
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
