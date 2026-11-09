import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarHeart, CheckCircle2 } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth.store";
import { useDialog } from "../../components/ui/dialog-context";

type AncVisit = {
  id: string;
  memberId: string;
  memberName: string | null;
  expectedDeliveryDate: string | null;
  ancNumber: number;
  expectedDate: string;
  status: string;
  attendedDate: string | null;
  notes: string | null;
};

const ANC_LABEL: Record<number, string> = {
  1: "ANC 1 — Week 16",
  2: "ANC 2 — Week 28",
  3: "ANC 3 — Week 32",
  4: "ANC 4 — Week 36",
};

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-green-100 text-green-800",
  ATTENDED: "bg-blue-100 text-blue-800",
  OVERDUE: "bg-red-100 text-red-800",
  MISSED: "bg-gray-100 text-gray-600",
};

export default function AncTracker() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { alert } = useDialog();
  const canRecord = [
    "NURSE",
    "DISTRICT_OFFICER",
    "ADMIN",
    "SUPER_ADMIN",
  ].includes(user?.role || "");
  const [filter, setFilter] = useState<string>("ALL");

  const { data: visits, isLoading } = useQuery<AncVisit[]>({
    queryKey: ["anc-schedules"],
    queryFn: () => api.get("/anc/schedules").then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const recordMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/anc/${id}/record`, {}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["anc-schedules"] }),
    onError: (err: any) => {
      alert({
        title: "Could not record this visit",
        message:
          err.response?.data?.message ||
          "Something went wrong. Please try again.",
        variant: "danger",
      });
    },
  });

  const list = visits || [];
  const filtered =
    filter === "ALL" ? list : list.filter((v) => v.status === filter);

  const counts = {
    ALL: list.length,
    SCHEDULED: list.filter((v) => v.status === "SCHEDULED").length,
    OVERDUE: list.filter((v) => v.status === "OVERDUE").length,
    ATTENDED: list.filter((v) => v.status === "ATTENDED").length,
    MISSED: list.filter((v) => v.status === "MISSED").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <CalendarHeart size={22} className="text-teal-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Antenatal Care Tracker
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              The four ANC contacts are generated automatically from each
              mother's last menstrual period — no dates are memorised
            </p>
          </div>
        </div>
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
                ? "bg-teal-700 text-white"
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
                Attended
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  No ANC visits found for this filter.
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {v.memberName || v.memberId}
                    </p>
                    {v.expectedDeliveryDate && (
                      <p className="text-xs text-gray-400">
                        EDD{" "}
                        {new Date(v.expectedDeliveryDate).toLocaleDateString(
                          "en-GB",
                        )}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ANC_LABEL[v.ancNumber] ?? `ANC ${v.ancNumber}`}
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
                    {v.attendedDate
                      ? new Date(v.attendedDate).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {canRecord && v.status !== "ATTENDED" ? (
                      <button
                        onClick={() => recordMutation.mutate(v.id)}
                        disabled={recordMutation.isPending}
                        className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 disabled:opacity-50"
                      >
                        <CheckCircle2 size={13} />
                        {recordMutation.isPending
                          ? "Saving..."
                          : "Mark Attended"}
                      </button>
                    ) : v.status === "ATTENDED" ? (
                      <span className="text-xs text-teal-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} /> Recorded
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
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
