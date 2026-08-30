import { useEffect, useState } from "react";
import api from "../../services/api";

type DotVisit = {
  id: string;
  visitDate: string;
  status: string;
};

type TbCase = {
  id: string;
  treatmentStartDate: string;
  treatmentCategory: string;
  treatmentNumber: string | null;
  isActive: boolean;
  outcome: string | null;
  daysSinceStart: number;
  missedDoses: number;
  member: { id: string; fullName: string; sex: string };
  registeredBy: { fullName: string };
  facility: { name: string } | null;
  dotVisits: DotVisit[];
  _count: { dotVisits: number };
};

const CATEGORY_COLOR: Record<string, string> = {
  CAT_I: "bg-green-100 text-green-800",
  CAT_II: "bg-blue-100 text-blue-800",
  MDR_TB: "bg-red-100 text-red-800",
  PEDIATRIC: "bg-purple-100 text-purple-800",
};

const OUTCOME_COLOR: Record<string, string> = {
  CURED: "text-green-700",
  TREATMENT_COMPLETED: "text-blue-700",
  TREATMENT_FAILED: "text-red-700",
  DIED: "text-gray-700",
  LOST_TO_FOLLOW_UP: "text-orange-700",
};

export default function TbTracker() {
  const [cases, setCases] = useState<TbCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ACTIVE");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const isActive = filter === "ACTIVE" ? "true" : "false";
        const res = await api.get(`/tb/cases?isActive=${isActive}`);
        setCases(res.data.data);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Failed to load TB cases.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filter]);

  const adherenceRate = (c: TbCase) => {
    const total = c._count.dotVisits;
    if (total === 0) return null;
    return Math.round(((total - c.missedDoses) / total) * 100);
  };

  const adherenceColor = (rate: number | null) => {
    if (rate === null) return "text-gray-400";
    if (rate >= 90) return "text-green-700";
    if (rate >= 70) return "text-yellow-600";
    return "text-red-700";
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

  const summary = {
    active: cases.length,
    highMissed: cases.filter((c) => c.missedDoses >= 2).length,
    goodAdherence: cases.filter((c) => {
      const r = adherenceRate(c);
      return r !== null && r >= 90;
    }).length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">TB Follow-up</h1>
        <p className="text-gray-500 text-sm mt-1">
          Monitor TB patients and DOT adherence across your catchment area
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border-l-4 border-green-500 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{summary.active}</p>
          <p className="text-sm text-gray-500">Active Cases</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-red-500 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">
            {summary.highMissed}
          </p>
          <p className="text-sm text-gray-500">2+ Missed Doses</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-blue-500 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">
            {summary.goodAdherence}
          </p>
          <p className="text-sm text-gray-500">≥90% Adherence</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["ACTIVE", "CLOSED"].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setLoading(true);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-green-700 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f === "ACTIVE" ? "Active Cases" : "Closed Cases"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Patient
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Category
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Started
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Days
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                DOT Visits
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Missed
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Adherence
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Facility
              </th>
              {filter === "CLOSED" && (
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Outcome
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cases.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  No {filter.toLowerCase()} TB cases found.
                </td>
              </tr>
            ) : (
              cases.map((c) => {
                const rate = adherenceRate(c);
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {c.member.fullName}
                      </p>
                      <p className="text-xs text-gray-400">{c.member.sex}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLOR[c.treatmentCategory] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {c.treatmentCategory.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(c.treatmentStartDate).toLocaleDateString(
                        "en-GB",
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.daysSinceStart}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c._count.dotVisits}
                    </td>
                    <td className="px-4 py-3">
                      {c.missedDoses > 0 ? (
                        <span
                          className={`font-semibold ${c.missedDoses >= 2 ? "text-red-600" : "text-yellow-600"}`}
                        >
                          {c.missedDoses} {c.missedDoses >= 2 ? "⚠" : ""}
                        </span>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${adherenceColor(rate)}`}>
                        {rate !== null ? `${rate}%` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.facility?.name ?? "—"}
                    </td>
                    {filter === "CLOSED" && (
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold ${OUTCOME_COLOR[c.outcome ?? ""] ?? "text-gray-500"}`}
                        >
                          {c.outcome?.replace(/_/g, " ") ?? "—"}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
