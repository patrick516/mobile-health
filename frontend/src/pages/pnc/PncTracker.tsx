import { useEffect, useState } from "react";
import api from "../../services/api";

type PncVisit = {
  id: string;
  pncNumber: number;
  expectedDate: string;
  visitedDate: string | null;
  status: string;
  referralNeeded: boolean;
  notes: string | null;
  member: {
    id: string;
    fullName: string;
    expectedDeliveryDate: string | null;
  };
  visitedBy: { fullName: string } | null;
};

const PNC_LABEL: Record<number, string> = {
  1: "PNC 1 — Day 1",
  2: "PNC 2 — Day 3",
  3: "PNC 3 — Day 7",
  4: "PNC 4 — Week 6",
};

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-green-100 text-green-800",
  ATTENDED: "bg-blue-100 text-blue-800",
  OVERDUE: "bg-red-100 text-red-800",
  MISSED: "bg-gray-100 text-gray-600",
};

export default function PncTracker() {
  const [visits, setVisits] = useState<PncVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/pnc/schedules");
        setVisits(res.data.data);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Failed to load PNC visits.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered =
    filter === "ALL" ? visits : visits.filter((v) => v.status === filter);

  const counts = {
    ALL: visits.length,
    SCHEDULED: visits.filter((v) => v.status === "SCHEDULED").length,
    OVERDUE: visits.filter((v) => v.status === "OVERDUE").length,
    ATTENDED: visits.filter((v) => v.status === "ATTENDED").length,
    MISSED: visits.filter((v) => v.status === "MISSED").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 rounded-lg p-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Postnatal Care Tracker
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Monitor PNC visits for mothers and newborns in your catchment area
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Scheduled", key: "SCHEDULED", color: "border-green-500" },
          { label: "Overdue", key: "OVERDUE", color: "border-red-500" },
          { label: "Attended", key: "ATTENDED", color: "border-blue-500" },
          { label: "Missed", key: "MISSED", color: "border-gray-400" },
        ].map(({ label, key, color }) => (
          <div
            key={key}
            className={`bg-white rounded-xl p-4 border-l-4 ${color} shadow-sm`}
          >
            <p className="text-2xl font-bold text-gray-900">
              {counts[key as keyof typeof counts]}
            </p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", "SCHEDULED", "OVERDUE", "ATTENDED", "MISSED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === s
                ? "bg-green-700 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {s === "ALL"
              ? `All (${counts.ALL})`
              : `${s} (${counts[s as keyof typeof counts]})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Mother
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Visit
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Expected
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Status
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Visited
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Recorded By
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Referral
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No PNC visits found for this filter.
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {v.member.fullName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {PNC_LABEL[v.pncNumber] ?? `PNC ${v.pncNumber}`}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(v.expectedDate).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        STATUS_STYLES[v.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {v.visitedDate
                      ? new Date(v.visitedDate).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {v.visitedBy?.fullName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {v.referralNeeded ? (
                      <span className="text-red-600 font-semibold text-xs">
                        ⚠ Yes
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">No</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
