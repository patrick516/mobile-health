import { useEffect, useState } from "react";
import api from "../../services/api";
import { useDialog } from "../../components/ui/dialog-context";

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
  member: {
    id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    sex: string;
  };
  registeredBy: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };
  facility: { name: string } | null;
  dotVisits: DotVisit[];
  _count: { dotVisits: number };
};

const personName = (
  p?: {
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null,
) => p?.fullName || `${p?.firstName || ""} ${p?.lastName || ""}`.trim() || "—";

const CATEGORY_OPTIONS = [
  { value: "CAT_I", label: "CAT I — New smear positive" },
  { value: "CAT_II", label: "CAT II — New non-smear / re-treatment" },
  { value: "MDR_TB", label: "MDR-TB" },
  { value: "PEDIATRIC", label: "Pediatric TB" },
];

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
  const { alert } = useDialog();
  const [cases, setCases] = useState<TbCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ACTIVE");
  const [error, setError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<
    { id: string; firstName: string; lastName: string; sex: string }[]
  >([]);
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [treatmentStartDate, setTreatmentStartDate] = useState("");
  const [treatmentCategory, setTreatmentCategory] = useState("CAT_I");
  const [treatmentNumber, setTreatmentNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const isActive = filter === "ACTIVE" ? "true" : "false";
      const res = await api.get(`/tb/cases?isActive=${isActive}`);
      setCases(res.data.data);
      setError(null);
    } catch (e) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to load TB cases.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const isActive = filter === "ACTIVE" ? "true" : "false";
        const res = await api.get(`/tb/cases?isActive=${isActive}`);
        if (!cancelled) {
          setCases(res.data.data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            (e as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? "Failed to load TB cases.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  useEffect(() => {
    if (memberQuery.trim().length < 2) return;
    const t = setTimeout(async () => {
      try {
        const res = await api.get(
          `/members?search=${encodeURIComponent(memberQuery.trim())}`,
        );
        const list = (res.data.data || []).slice(0, 8);
        setMemberResults(list);
      } catch {
        setMemberResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [memberQuery]);

  const resetRegister = () => {
    setShowRegister(false);
    setMemberQuery("");
    setMemberResults([]);
    setSelectedMember(null);
    setTreatmentStartDate("");
    setTreatmentCategory("CAT_I");
    setTreatmentNumber("");
  };

  const submitRegister = async () => {
    if (!selectedMember) {
      await alert({
        title: "Missing patient",
        message: "Select a member first.",
      });
      return;
    }
    if (!treatmentStartDate) {
      await alert({
        title: "Missing date",
        message: "Treatment start date is required.",
      });
      return;
    }
    setSaving(true);
    try {
      await api.post("/tb/cases", {
        memberId: selectedMember.id,
        treatmentStartDate,
        treatmentCategory,
        treatmentNumber: treatmentNumber || undefined,
      });
      await alert({
        title: "Registered",
        message: "TB case registered. It will appear on the phone after sync.",
        variant: "success",
      });
      resetRegister();
      setFilter("ACTIVE");
      setLoading(true);
      await load();
    } catch (e) {
      await alert({
        title: "Failed",
        message:
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "Could not register TB case.",
      });
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">TB Follow-up</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor TB patients and DOT adherence across your catchment area
          </p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="btn-primary shrink-0"
        >
          + Register TB Case
        </button>
      </div>

      {/* Register modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Register TB Case
              </h2>
              <button
                onClick={resetRegister}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient *
              </label>
              {selectedMember ? (
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-gray-900">
                    {selectedMember.name}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-teal-700 font-medium"
                    onClick={() => {
                      setSelectedMember(null);
                      setMemberQuery("");
                      setMemberResults([]);
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={memberQuery}
                    onChange={(e) => {
                      setMemberQuery(e.target.value);
                      if (e.target.value.trim().length < 2)
                        setMemberResults([]);
                    }}
                    placeholder="Search member name..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {memberResults.length > 0 && (
                    <ul className="mt-1 max-h-40 overflow-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                      {memberResults.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50"
                            onClick={() => {
                              setSelectedMember({
                                id: m.id,
                                name: `${m.firstName} ${m.lastName}`.trim(),
                              });
                              setMemberResults([]);
                              setMemberQuery("");
                            }}
                          >
                            <span className="font-medium text-gray-900">
                              {m.firstName} {m.lastName}
                            </span>
                            <span className="ml-2 text-gray-400">{m.sex}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Treatment start *
                </label>
                <input
                  type="date"
                  value={treatmentStartDate}
                  onChange={(e) => setTreatmentStartDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={treatmentCategory}
                  onChange={(e) => setTreatmentCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Treatment number (optional)
              </label>
              <input
                type="text"
                value={treatmentNumber}
                onChange={(e) => setTreatmentNumber(e.target.value)}
                placeholder="e.g. MAL-2026-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={resetRegister}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRegister}
                disabled={saving}
                className="btn-primary disabled:opacity-60"
              >
                {saving ? "Saving..." : "Register Case"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                        {personName(c.member)}
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
