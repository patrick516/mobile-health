import { useEffect, useState } from "react";
import api from "../../services/api";

type FpVisit = {
  id: string;
  visitDate: string;
  method: string;
  quantityGiven: number | null;
  nextFollowUpDate: string | null;
  referralNeeded: boolean;
  counsellingGiven: boolean;
  notes: string | null;
  member: {
    id: string;
    fullName: string;
    sex: string;
    dateOfBirth: string | null;
  };
  visitedBy: { id: string; fullName: string };
};

const METHOD_LABELS: Record<string, string> = {
  CONDOM: "Condoms",
  ORAL_CONTRACEPTIVE: "Oral Pills",
  INJECTABLE: "Injectable",
  IMPLANT: "Implant",
  IUD: "IUD",
  STERILISATION: "Sterilisation",
  NATURAL_FAMILY_PLANNING: "NFP",
  OTHER: "Other",
};

const METHOD_COLOR: Record<string, string> = {
  CONDOM: "bg-blue-100 text-blue-800",
  ORAL_CONTRACEPTIVE: "bg-purple-100 text-purple-800",
  INJECTABLE: "bg-teal-100 text-teal-800",
  IMPLANT: "bg-orange-100 text-orange-800",
  IUD: "bg-pink-100 text-pink-800",
  STERILISATION: "bg-gray-100 text-gray-700",
  NATURAL_FAMILY_PLANNING: "bg-green-100 text-green-800",
  OTHER: "bg-yellow-100 text-yellow-800",
};

type TabType = "all" | "follow-ups" | "referrals";

export default function FpTracker() {
  const [visits, setVisits] = useState<FpVisit[]>([]);
  const [followUps, setFollowUps] = useState<FpVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [visitsRes, followUpsRes] = await Promise.all([
          api.get("/fp/visits"),
          api.get("/fp/follow-ups"),
        ]);
        setVisits(visitsRes.data.data);
        setFollowUps(followUpsRes.data.data);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Failed to load FP data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const referrals = visits.filter((v) => v.referralNeeded);

  const displayed =
    tab === "all" ? visits : tab === "follow-ups" ? followUps : referrals;

  const methodCounts = visits.reduce(
    (acc, v) => {
      acc[v.method] = (acc[v.method] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const daysOverdue = (date: string) => {
    const diff = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
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
        <h1 className="text-2xl font-bold text-gray-900">Family Planning</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track FP visits, method distribution, and follow-ups due across your
          catchment area
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border-l-4 border-teal-500 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{visits.length}</p>
          <p className="text-sm text-gray-500">Total FP Visits</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-orange-500 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{followUps.length}</p>
          <p className="text-sm text-gray-500">Follow-ups Due</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-red-500 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{referrals.length}</p>
          <p className="text-sm text-gray-500">Referrals Needed</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-purple-500 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">
            {visits.filter((v) => v.counsellingGiven).length}
          </p>
          <p className="text-sm text-gray-500">Counselling Given</p>
        </div>
      </div>

      {/* Method breakdown */}
      {Object.keys(methodCounts).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            Method Distribution
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(methodCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([method, count]) => (
                <div
                  key={method}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${METHOD_COLOR[method] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {METHOD_LABELS[method] ?? method}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { key: "all", label: `All Visits (${visits.length})` },
            {
              key: "follow-ups",
              label: `Follow-ups Due (${followUps.length})`,
            },
            { key: "referrals", label: `Referrals (${referrals.length})` },
          ] as { key: TabType; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === key
                ? "bg-green-700 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Follow-ups overdue alert */}
      {tab === "follow-ups" && followUps.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-orange-600 text-lg">⚠</span>
          <p className="text-sm text-orange-800 font-medium">
            {followUps.length} client{followUps.length > 1 ? "s" : ""} overdue
            for follow-up — CCWs should be notified to conduct home visits.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Client
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Method
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Visit Date
              </th>
              {tab !== "all" && (
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  {tab === "follow-ups" ? "Follow-up Due" : "Referral"}
                </th>
              )}
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Qty
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Counselling
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Recorded By
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No records found for this filter.
                </td>
              </tr>
            ) : (
              displayed.map((v) => {
                const overdueDays =
                  v.nextFollowUpDate && tab === "follow-ups"
                    ? daysOverdue(v.nextFollowUpDate)
                    : null;

                return (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {v.member.fullName}
                      </p>
                      <p className="text-xs text-gray-400">{v.member.sex}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${METHOD_COLOR[v.method] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {METHOD_LABELS[v.method] ?? v.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(v.visitDate).toLocaleDateString("en-GB")}
                    </td>
                    {tab !== "all" && (
                      <td className="px-4 py-3">
                        {tab === "follow-ups" && v.nextFollowUpDate ? (
                          <span
                            className={`text-xs font-semibold ${overdueDays && overdueDays > 7 ? "text-red-600" : "text-orange-600"}`}
                          >
                            {new Date(v.nextFollowUpDate).toLocaleDateString(
                              "en-GB",
                            )}
                            {overdueDays !== null && overdueDays > 0
                              ? ` — ${overdueDays}d overdue`
                              : ""}
                          </span>
                        ) : tab === "referrals" ? (
                          <span className="text-xs font-semibold text-red-600">
                            ⚠ Referral needed
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600">
                      {v.quantityGiven ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {v.counsellingGiven ? (
                        <span className="text-green-600 text-xs font-semibold">
                          ✓ Yes
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {v.visitedBy?.fullName ?? "—"}
                    </td>
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
