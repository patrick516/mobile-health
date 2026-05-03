import { Badge } from "../../../components/ui";
import { REPORT_TYPE_LABELS } from "../../../lib/constants";
import { timeAgo } from "../../../lib/utils";
import { useUIStore } from "../../../store/uiStore";
import type { Report } from "../../../types";

const statusVariant = {
  pending: "warning",
  under_review: "info",
  resolved: "success",
  dismissed: "gray",
} as const;

interface Props {
  reports: Report[];
}

export function RecentReports({ reports }: Props) {
  const { setActivePage } = useUIStore();
  return (
    <div>
      {reports.slice(0, 4).map((r) => (
        <div
          key={r.id}
          className="flex items-start gap-3 px-5 py-3.5 border-b border-purple-50 last:border-0 hover:bg-fuchsia-50/30"
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${r.status === "resolved" ? "bg-green-50" : "bg-red-50"}`}
          >
            {r.status === "resolved" ? "✅" : "🚩"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {REPORT_TYPE_LABELS[r.type]}
            </p>
            <p className="text-xs text-gray-400">
              From <strong>{r.reporterName}</strong> · {timeAgo(r.createdAt)}
            </p>
          </div>
          <Badge variant={statusVariant[r.status]}>
            {r.status.replace("_", " ")}
          </Badge>
        </div>
      ))}
      <div className="px-5 py-3 border-t border-purple-100">
        <button
          onClick={() => setActivePage("reports")}
          className="text-xs text-fuchsia-600 font-medium hover:underline"
        >
          View all reports →
        </button>
      </div>
    </div>
  );
}
