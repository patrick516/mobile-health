import { useEffect, useState } from "react";
import api from "../../services/api";

type CcwSummary = {
  id: string;
  fullName: string;
  phoneNumber: string;
  zones: string[];
  ta: string | null;
  visitsThisMonth: number;
  feedbackThisMonth: { id: string; rating: number } | null;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Poor", color: "text-red-600" },
  2: { label: "Below Average", color: "text-orange-500" },
  3: { label: "Average", color: "text-yellow-600" },
  4: { label: "Good", color: "text-blue-600" },
  5: { label: "Excellent", color: "text-green-700" },
};

export default function SupervisorFeedback() {
  const now = new Date();
  const [ccws, setCcws] = useState<CcwSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCcw, setSelectedCcw] = useState<CcwSummary | null>(null);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/feedback/ccws")
      .then((r) => setCcws(r.data.data))
      .catch(() => setError("Failed to load CCW list."))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async () => {
    if (!selectedCcw || !comment.trim()) {
      setError("Please select a CCW and write a comment.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/feedback", {
        ccwId: selectedCcw.id,
        rating,
        comment: comment.trim(),
        periodMonth: month,
        periodYear: year,
        visitsCount: selectedCcw.visitsThisMonth,
      });
      setSuccess(true);
      setComment("");
      setRating(3);
      setSelectedCcw(null);
      // Refresh list
      const r = await api.get("/feedback/ccws");
      setCcws(r.data.data);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to send feedback.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Supervisor Feedback
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Send monthly performance feedback to Community Health Workers
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-300 text-green-800 rounded-lg px-4 py-3 text-sm font-medium">
          ✓ Feedback sent successfully. The CCW will see it on their next sync.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* CCW List */}
        <div className="xl:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Select CHW</h2>
            <p className="text-xs text-gray-500 mt-1">
              {ccws.filter((c) => !c.feedbackThisMonth).length} awaiting
              feedback this month
            </p>
          </div>
          <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
            {ccws.map((ccw) => (
              <button
                key={ccw.id}
                onClick={() => {
                  setSelectedCcw(ccw);
                  setSuccess(false);
                  setError(null);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                  selectedCcw?.id === ccw.id
                    ? "bg-green-50 border-l-4 border-green-600"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {ccw.fullName}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ccw.zones.slice(0, 2).join(", ")}
                      {ccw.zones.length > 2 ? ` +${ccw.zones.length - 2}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-teal-700">
                      {ccw.visitsThisMonth}
                    </p>
                    <p className="text-xs text-gray-400">visits</p>
                  </div>
                </div>
                {ccw.feedbackThisMonth && (
                  <div className="mt-1.5">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      ✓ Feedback sent — {ccw.feedbackThisMonth.rating}/5
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Form */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm p-6">
          {!selectedCcw ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg
                className="w-12 h-12 mb-3 opacity-30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                />
              </svg>
              <p className="text-sm">
                Select a CHW from the list to send feedback
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Selected CCW summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedCcw.fullName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedCcw.zones.join(", ")} · {selectedCcw.ta}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-teal-700">
                      {selectedCcw.visitsThisMonth}
                    </p>
                    <p className="text-xs text-gray-400">visits this month</p>
                  </div>
                </div>
              </div>

              {/* Period */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    min={2024}
                    max={2030}
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Performance Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRating(r)}
                      className={`flex-1 py-3 rounded-lg border-2 text-lg font-bold transition-all ${
                        rating === r
                          ? "border-green-600 bg-green-50 text-green-700 scale-105"
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p
                  className={`text-sm font-medium mt-2 ${RATING_LABELS[rating].color}`}
                >
                  {rating}/5 — {RATING_LABELS[rating].label}
                </p>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. Good work on household registrations this month. Please improve follow-up on overdue referrals. Keep up the consistency with ANC tracking."
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 text-right mt-1">
                  {comment.length}/500
                </p>
              </div>

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={saving || !comment.trim()}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                  saving || !comment.trim()
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-green-700 hover:bg-green-800"
                }`}
              >
                {saving
                  ? "Sending..."
                  : `Send Feedback to ${selectedCcw.fullName}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
