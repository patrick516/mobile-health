import { Button } from "../../../components/ui";
import { useUIStore } from "../../../store/uiStore";

export function QuickActions({ conversionRate }: { conversionRate: number }) {
  const { setActivePage, showModal } = useUIStore();
  return (
    <div className="flex flex-col gap-2.5">
      <Button
        variant="primary"
        className="w-full justify-center"
        onClick={() => showModal("match")}
      >
        💞 Create Manual Match
      </Button>
      <Button
        variant="outline"
        className="w-full justify-center"
        onClick={() => showModal("notification")}
      >
        🔔 Broadcast Notification
      </Button>
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setActivePage("verification")}
      >
        <span>✅ Pending Verifications</span>
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          7
        </span>
      </Button>
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setActivePage("reports")}
      >
        <span>🚩 Open Reports</span>
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          23
        </span>
      </Button>
      <div className="mt-2 p-3 bg-purple-50 rounded-xl">
        <p className="text-xs font-semibold text-purple-700 mb-2">
          Premium Conversion
        </p>
        <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500"
            style={{ width: `${conversionRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[11px] text-purple-400">
          <span>{conversionRate}% of users</span>
          <span>4,433 premium</span>
        </div>
      </div>
    </div>
  );
}
