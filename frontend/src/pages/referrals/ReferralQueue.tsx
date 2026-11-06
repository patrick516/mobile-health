import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Clock, MessageSquare } from "lucide-react";
import api from "../../services/api";
import type { Referral, Pagination } from "../../types";
import { useAuthStore } from "../../store/auth.store";

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

const fullName = (p: any) =>
  p
    ? `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.fullName || "—"
    : "—";

export default function ReferralQueue() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canPrescribe = user?.role === "NURSE";
  const [filter, setFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Referral | null>(null);
  const [feedback, setFeedback] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  // Medication the nurse prescribes when marking a referral as treated
  const [meds, setMeds] = useState<
    { drugName: string; quantity: string; dosage: string }[]
  >([]);

  // In-date stock at the nurse's facility (the same list the pharmacist dispenses from)
  const { data: stockBatches } = useQuery<any[]>({
    queryKey: ["pharmacy-batches-active"],
    queryFn: () =>
      api
        .get("/pharmacy/batches", { params: { status: "ACTIVE" } })
        .then((r) => r.data.data),
    enabled: canPrescribe && selected?.status === "ARRIVED",
  });

  // Add up what is left per drug name, skipping expired or empty batches
  const availableStock: Record<string, { total: number; unit: string }> = {};
  (stockBatches || []).forEach((b: any) => {
    if (new Date(b.expiryDate) <= new Date() || b.quantityRemaining <= 0)
      return;
    const entry = availableStock[b.drugName] || { total: 0, unit: b.unit };
    entry.total += b.quantityRemaining;
    availableStock[b.drugName] = entry;
  });

  // Change one field of one medication row
  const updateMed = (
    index: number,
    field: "drugName" | "quantity" | "dosage",
    value: string,
  ) =>
    setMeds((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );

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
      queryClient.invalidateQueries({ queryKey: ["pharmacy-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["pharmacy-requests-pending"],
      });
      setSelected(null);
      setFeedback("");
      setDiagnosis("");
      setMeds([]);
    },
    onError: (err: any) =>
      alert(err.response?.data?.message || "Could not update this referral."),
  });

  const handleUpdate = (status: string) => {
    if (!selected) return;

    // Only "Treated" carries a prescription
    let medications: {
      drugName: string;
      quantityRequested: number;
      notes?: string;
    }[] = [];

    if (status === "TREATED") {
      for (const m of meds) {
        if (!m.drugName && !m.quantity) continue; // empty row, ignore
        const qty = parseInt(m.quantity);
        if (!m.drugName || !(qty > 0)) {
          return alert("Choose a drug and enter a quantity for each row.");
        }
        const left = availableStock[m.drugName]?.total ?? 0;
        if (qty > left) {
          return alert(
            `Only ${left} of ${m.drugName} in stock. Lower the quantity.`,
          );
        }
        medications.push({
          drugName: m.drugName,
          quantityRequested: qty,
          ...(m.dosage.trim() ? { notes: m.dosage.trim() } : {}),
        });
      }
    }

    updateMutation.mutate({
      id: selected.id,
      data: {
        status,
        ...(diagnosis ? { diagnosis } : {}),
        ...(feedback ? { feedbackNote: feedback } : {}),
        ...(feedback ? { treatmentGiven: feedback } : {}),
        ...(medications.length > 0 ? { medications } : {}),
      },
    });
  };
  const filters = [
    "ALL",
    "PENDING",
    "OVERDUE",
    "ARRIVED",
    "TREATED",
    "COMPLETED",
    "MISSED",
  ];

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 space-y-4 min-w-0">
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

        {(() => {
          const overdueCount =
            data?.data.filter((ref) => ref.status === "OVERDUE").length ?? 0;
          return (
            overdueCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <AlertTriangle size={18} className="text-red-600 shrink-0" />
                <p className="text-sm text-red-800 font-medium">
                  {overdueCount} referral{overdueCount > 1 ? "s are" : " is"}{" "}
                  overdue! Immediate attention required.
                </p>
              </div>
            )
          );
        })()}

        {(() => {
          const pendingCount =
            data?.data.filter((ref) => ref.status === "PENDING").length ?? 0;
          return (
            pendingCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <Clock size={18} className="text-yellow-600 shrink-0" />
                <p className="text-sm text-yellow-800 font-medium">
                  {pendingCount} pending referral
                  {pendingCount > 1 ? "s waiting" : " waiting"} for action.
                </p>
              </div>
            )
          );
        })()}

        {isLoading && (
          <p className="text-center text-gray-400 py-12 text-sm">Loading...</p>
        )}

        {data?.data.map((ref) => {
          const tick = TICKS[ref.status] || TICKS.PENDING;
          return (
            <div
              key={ref.id}
              onClick={() => {
                setSelected(ref);
                setMeds([]);
              }}
              className={`card p-4 cursor-pointer hover:shadow-md transition-shadow ${selected?.id === ref.id ? "ring-2 ring-teal-500" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {ref.urgency === "EMERGENCY" && (
                      <AlertTriangle
                        size={14}
                        className="text-red-500 shrink-0"
                      />
                    )}
                    {ref.status === "OVERDUE" && (
                      <Clock size={14} className="text-red-500 shrink-0" />
                    )}
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {fullName(ref.member)}
                    </p>
                    <span className={URGENCY_STYLE[ref.urgency]}>
                      {ref.urgency}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {ref.reason.replace("_", " ")}
                  </p>

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

      {selected && (
        <div className="w-80 shrink-0">
          <div className="card p-5 sticky top-0 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">
                  {fullName(selected.member)}
                </h3>
                <p className="text-xs text-gray-500">
                  {fullName(selected.referringUser)}
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
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Urgency</span>
                <div className="flex items-center gap-2">
                  {selected.urgency === "EMERGENCY" && (
                    <AlertTriangle size={14} className="text-red-500" />
                  )}
                  <span className="font-medium text-gray-900">
                    {selected.urgency}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <div className="flex items-center gap-2">
                  {selected.status === "OVERDUE" && (
                    <Clock size={14} className="text-red-500" />
                  )}
                  <span className="font-medium text-gray-900">
                    {selected.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              {[
                ["Reason", selected.reason.replace("_", " ")],
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
                {selected.status === "ARRIVED" && canPrescribe && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-500">
                        Medication for the pharmacist
                      </label>
                      <button
                        type="button"
                        className="text-xs font-semibold text-teal-700"
                        onClick={() =>
                          setMeds((prev) => [
                            ...prev,
                            { drugName: "", quantity: "", dosage: "" },
                          ])
                        }
                      >
                        + Add drug
                      </button>
                    </div>

                    {meds.length === 0 && (
                      <p className="text-xs text-gray-400">
                        No medication added.
                      </p>
                    )}

                    {meds.map((m, i) => (
                      <div
                        key={i}
                        className="border border-gray-100 rounded-lg p-2 space-y-2"
                      >
                        <div className="flex gap-2">
                          <select
                            className="input text-sm flex-1"
                            value={m.drugName}
                            onChange={(e) =>
                              updateMed(i, "drugName", e.target.value)
                            }
                          >
                            <option value="">Select drug...</option>
                            {Object.entries(availableStock).map(
                              ([name, info]) => (
                                <option key={name} value={name}>
                                  {name} — {info.total} {info.unit}
                                </option>
                              ),
                            )}
                          </select>
                          <input
                            type="number"
                            min={1}
                            className="input text-sm w-20"
                            placeholder="Qty"
                            value={m.quantity}
                            onChange={(e) =>
                              updateMed(i, "quantity", e.target.value)
                            }
                          />
                          <button
                            type="button"
                            className="text-gray-400 hover:text-red-600 px-1"
                            onClick={() =>
                              setMeds((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              )
                            }
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                        <input
                          className="input text-sm"
                          placeholder="Dosage, e.g. 2 tablets twice daily"
                          value={m.dosage}
                          onChange={(e) =>
                            updateMed(i, "dosage", e.target.value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
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
