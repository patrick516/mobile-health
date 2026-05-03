import { useUIStore } from "../../store/uiStore";
import { NAV_ITEMS } from "../../lib/constants";

export function Topbar() {
  const { activePage, showModal } = useUIStore();
  const current = NAV_ITEMS.find((n) => n.key === activePage);

  return (
    <header className="h-[60px] bg-white border-b border-purple-100 flex items-center gap-4 px-7 sticky top-0 z-30">
      <div className="flex-1">
        <span className="text-base font-semibold text-gray-900">
          {current?.label ?? "Dashboard"}
        </span>
        <span className="text-gray-400 text-sm ml-2">
          {activePage === "dashboard" ? "Overview" : ""}
        </span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 w-56">
        <span className="text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search users, reports..."
          className="bg-transparent text-sm text-gray-700 outline-none w-full placeholder:text-gray-400"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => showModal("notification")}
          className="w-9 h-9 rounded-lg border border-purple-200 bg-white flex items-center justify-center text-base hover:bg-purple-50 relative transition-colors"
        >
          🔔
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
        </button>
        <button className="w-9 h-9 rounded-lg border border-purple-200 bg-white flex items-center justify-center text-base hover:bg-purple-50 transition-colors">
          ⚙️
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
          SA
        </div>
      </div>
    </header>
  );
}
