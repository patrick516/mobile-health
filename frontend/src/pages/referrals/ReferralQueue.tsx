import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Clock, MessageSquare } from "lucide-react";
import api from "../../services/api";
import type { Referral, Pagination } from "../../types";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "badge-yellow",
  OVERDUE: "badge-red",
  ARRIVED: "badge-blue",
  TREATED: "badge-green",
  FEEDBACK_SENT: "badge-blue",
  COMPLETED: "badge-green",
  MISSED: "badge-red",
};

const URGENCY_STYLE: Record<string, string> = {
  ROUTINE: "badge-green",
  URGENT: "badge-yellow",
  EMERGENCY: "badge-red",
};

const TICKS: Record<string, { text: string; color: string }> = {
  PENDING: { text: "✓", color: "text-gray-400" },
  OVERDUE: { text: "✓", color: "text-red-400" },
  ARRIVED: { text: "✓✓", color: "text-gray-500" },
  TREATED: { text: "✓✓", color: "text-teal-600" },
  FEEDBACK_SENT: { text: "✓✓", color: "text-teal-600" },
  COMPLETED: { text: "✓✓", color: "text-teal-700" },
  MISSED: { text: "✗", color: "text-red-500" },
};

export default function ReferralQueue() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Referral | null>(null);
  const [feedback, setFeedback] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  const { data, isLoading } = useQuery<{
    data: Referral[];
    pagination: Pagination;
  }>({
    queryKey: ["referrals", filter],
    queryFn: () =>
      api
        .get("/referrals", {
          params: {
            status: filter !== "ALL" ? filter : undefined,
            limit: 50,
          },
        })
        .then((r) => r.data),
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      api.patch(`/referrals/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      setSelected(null);
      setFeedback("");
      setDiagnosis("");
    },
  });

  const handleUpdate = (status: string) => {
    if (!selected) return;
    updateMutation.mutate({
      id: selected.id,
      data: {
        status,
        ...(diagnosis ? { diagnosis } : {}),
        ...(feedback ? { feedbackNote: feedback } : {}),
        ...(feedback ? { treatmentGiven: feedback } : {}),
      },
    });
  };

  const filters = [
    "ALL",
    "PENDING",
    "OVERDUE",
    "ARRIVED",
    "COMPLETED",
    "MISSED",
  ];

  return (
    <div className="flex gap-6 h-full">
      {/* List */}
      <div className="flex-1 space-y-4 min-w-0">
        {/* Filter tabs */}
        <div className="card p-1 flex gap-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors ${
                filter === f
                  ? "bg-teal-700 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {isLoading && (
          <p className="text-center text-gray-400 py-12 text-sm">Loading...</p>
        )}

        {data?.data.map((ref) => {
          const tick = TICKS[ref.status] || TICKS.PENDING;
          return (
            <div
              key={ref.id}
              onClick={() => setSelected(ref)}
              className={`card p-4 cursor-pointer hover:shadow-md transition-shadow ${selected?.id === ref.id ? "ring-2 ring-teal-500" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {ref.member.fullName}
                    </p>
                    <span className={URGENCY_STYLE[ref.urgency]}>
                      {ref.urgency}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {ref.reason.replace("_", " ")}
                  </p>

                  {/* WhatsApp-style thread */}
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    {[
                      { label: "Referred", done: true },
                      {
                        label: "Arrived",
                        done: [
                          "ARRIVED",
                          "TREATED",
                          "FEEDBACK_SENT",
                          "COMPLETED",
                        ].includes(ref.status),
                      },
                      {
                        label: "Treated",
                        done: [
                          "TREATED",
                          "FEEDBACK_SENT",
                          "COMPLETED",
                        ].includes(ref.status),
                      },
                    ].map((step, i) => (
                      <span
                        key={step.label}
                        className="flex items-center gap-1"
                      >
                        {i > 0 && (
                          <span
                            className={`w-6 h-px ${step.done ? "bg-teal-500" : "bg-gray-200"}`}
                          />
                        )}
                        <span
                          className={
                            step.done
                              ? "text-teal-600 font-medium"
                              : "text-gray-300"
                          }
                        >
                          {step.label}
                        </span>
                      </span>
                    ))}
                    <span className={`ml-auto font-bold ${tick.color}`}>
                      {tick.text}
                    </span>
                  </div>

                  {ref.feedbackNote && (
                    <div className="mt-2 flex items-start gap-1.5 bg-teal-50 rounded-lg p-2">
                      <MessageSquare
                        size={12}
                        className="text-teal-600 mt-0.5 shrink-0"
                      />
                      <p className="text-xs text-teal-700">
                        {ref.feedbackNote}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={STATUS_STYLE[ref.status]}>
                    {ref.status.replace("_", " ")}
                  </span>
                  <p className="text-xs text-gray-400">
                    {new Date(ref.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {data?.data.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <CheckCircle size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No referrals found</p>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 shrink-0">
          <div className="card p-5 sticky top-0 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">
                  {selected.member.fullName}
                </h3>
                <p className="text-xs text-gray-500">
                  {selected.referringUser.fullName}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-2 text-sm">
              {[
                ["Reason", selected.reason.replace("_", " ")],
                ["Urgency", selected.urgency],
                ["Status", selected.status.replace("_", " ")],
                [
                  "Due",
                  selected.dueBy
                    ? new Date(selected.dueBy).toLocaleDateString("en-GB")
                    : "N/A",
                ],
                [
                  "Facility",
                  selected.destinationFacility?.name || "Not specified",
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-gray-900">{v}</span>
                </div>
              ))}
            </div>

            {["PENDING", "OVERDUE", "ARRIVED"].includes(selected.status) && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700">
                  Update Status
                </p>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Diagnosis
                  </label>
                  <input
                    className="input text-sm"
                    placeholder="e.g. Severe malaria"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Feedback / Treatment given
                  </label>
                  <textarea
                    className="input text-sm resize-none"
                    rows={3}
                    placeholder="Write feedback for the CHW..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {selected.status === "PENDING" ||
                  selected.status === "OVERDUE" ? (
                    <button
                      className="btn-secondary text-sm"
                      onClick={() => handleUpdate("ARRIVED")}
                    >
                      Mark Arrived
                    </button>
                  ) : null}
                  {selected.status === "ARRIVED" ? (
                    <button
                      className="btn-primary text-sm"
                      onClick={() => handleUpdate("TREATED")}
                    >
                      Mark Treated + Send Feedback
                    </button>
                  ) : null}
                  <button
                    className="btn-danger text-sm"
                    onClick={() => handleUpdate("MISSED")}
                  >
                    Mark Missed
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
