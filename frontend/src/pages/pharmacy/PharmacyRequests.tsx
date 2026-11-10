import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import api from "../../services/api";
import Select from "../../components/ui/Select";
import { useAuthStore } from "../../store/auth.store";
import WalkInEncounter from "../../components/encounters/WalkInEncounter";
import { useDialog } from "../../components/ui/dialog-context";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  FULFILLED: "bg-green-100 text-green-700",
  PARTIALLY_FULFILLED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Requests" },
  { value: "PENDING", label: "Pending" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "PARTIALLY_FULFILLED", label: "Partially Fulfilled" },
];

export default function PharmacyRequests() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { alert } = useDialog();

  const canFulfill = ["SUPER_ADMIN", "ADMIN", "NURSE", "PHARMACIST"].includes(
    user?.role || "",
  );
  const canCreateRequest = [
    "NURSE",
    "ADMIN",
    "DISTRICT_OFFICER",
    "SUPER_ADMIN",
  ].includes(user?.role || "");
  const isOpenable = (r: any) =>
    canFulfill &&
    (r.status === "PENDING" || r.status === "PARTIALLY_FULFILLED");

  const [filter, setFilter] = useState("PENDING");
  const [selected, setSelected] = useState<any>(null);
  const [fulfillData, setFulfillData] = useState<Record<string, string>>({});
  // Per-item drug substitution chosen by the pharmacist at fulfil time
  const [substitute, setSubstitute] = useState<Record<string, string>>({});

  const [showForm, setShowForm] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["pharmacy-requests", filter],
    queryFn: () =>
      api
        .get("/pharmacy/requests", {
          params: filter !== "ALL" ? { status: filter } : {},
        })
        .then((r) => r.data.data),
    refetchInterval: 5000, // new prescriptions appear within seconds
  });

  // In-date stock at this facility — shown while fulfilling so the
  // pharmacist can see what is actually available before dispensing
  const { data: stockBatches } = useQuery<any[]>({
    queryKey: ["pharmacy-batches-active"],
    queryFn: () =>
      api
        .get("/pharmacy/batches", { params: { status: "ACTIVE" } })
        .then((r) => r.data.data),
    enabled: !!selected,
  });

  const availableStock: Record<
    string,
    { total: number; unit: string; earliest: string | null }
  > = {};
  (stockBatches || []).forEach((b: any) => {
    if (new Date(b.expiryDate) <= new Date() || b.quantityRemaining <= 0)
      return;
    const entry = availableStock[b.drugName] || {
      total: 0,
      unit: b.unit,
      earliest: null,
    };
    entry.total += b.quantityRemaining;
    if (!entry.earliest || new Date(b.expiryDate) < new Date(entry.earliest)) {
      entry.earliest = b.expiryDate;
    }
    availableStock[b.drugName] = entry;
  });

  const fulfillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/pharmacy/requests/${id}/fulfill`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["pharmacy-requests-pending"],
      });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-batches"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-batches-active"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      setSelected(null);
      setFulfillData({});
      setSubstitute({});
    },
    onError: (err: any) => {
      alert({
        title: "Could not fulfil this request",
        message:
          err.response?.data?.message ||
          "Something went wrong. Please try again.",
        variant: "danger",
      });
    },
  });

  const handleFulfill = () => {
    if (!selected) return;
    const fulfilledItems = selected.items.map((item: any) => {
      const chosen = stockMatch(substitute[item.id] || item.drugName);
      const qty = parseInt(fulfillData[item.id] || "0");
      return {
        itemId: item.id,
        quantityFulfilled: qty,
        ...(chosen && chosen !== item.drugName ? { drugName: chosen } : {}),
      };
    });
    fulfillMutation.mutate({ id: selected.id, data: { fulfilledItems } });
  };

  const openFulfill = (r: any) => {
    setSelected(r);
    const init: Record<string, string> = {};
    const subs: Record<string, string> = {};
    (r.items || []).forEach((i: any) => {
      const remaining = Math.max(
        0,
        (i.quantityRequested || 0) - (i.quantityFulfilled || 0),
      );
      init[i.id] = String(remaining || i.quantityRequested || 0);
      subs[i.id] = i.drugName;
    });
    setFulfillData(init);
    setSubstitute(subs);
  };

  const stockMatch = (name: string) => {
    if (!name) return name;
    if (availableStock[name]) return name;
    return (
      Object.keys(availableStock).find(
        (n) => n.toLowerCase() === name.toLowerCase(),
      ) || name
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList size={20} className="text-orange-600" />
          <h1 className="text-xl font-bold text-gray-900">
            Patient Prescriptions
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {canCreateRequest && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> New Walk-in Encounter
            </button>
          )}

          <div className="w-56">
            <Select
              value={filter}
              onChange={setFilter}
              placeholder="Filter by status..."
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      </div>

      <WalkInEncounter open={showForm} onClose={() => setShowForm(false)} />

      {isLoading && (
        <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
      )}

      <div className="space-y-3">
        {requests?.map((r: any) => (
          <div
            key={r.id}
            className={`card p-4 ${
              isOpenable(r) ? "cursor-pointer hover:border-teal-300" : ""
            }`}
            onClick={() => isOpenable(r) && openFulfill(r)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{r.patientName}</p>
                {r.patientAge != null && (
                  <p className="text-xs text-gray-400">{r.patientAge} yrs</p>
                )}
                {r.diagnosis && (
                  <p className="text-xs text-gray-500">
                    Diagnosis: {r.diagnosis}
                  </p>
                )}
                {r.notes && (
                  <p className="text-xs text-gray-400">Signs: {r.notes}</p>
                )}

                {r.referralId ? (
                  <p className="text-xs text-teal-700">
                    Referred patient
                    {r.referral?.reason ? ` · ${r.referral.reason}` : ""}
                    {r.referral?.destinationFacility?.name
                      ? ` → ${r.referral.destinationFacility.name}`
                      : ""}{" "}
                    — dispensing marks it TREATED
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">Walk-in encounter</p>
                )}
                <p className="text-xs text-gray-500">
                  Requested by {r.requestedBy?.firstName}{" "}
                  {r.requestedBy?.lastName} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-2 space-y-1">
                  {r.items?.map((item: any) => (
                    <p key={item.id} className="text-xs text-gray-700">
                      • {item.drugName} — {item.quantityRequested} requested
                      {item.quantityFulfilled > 0 &&
                        `, ${item.quantityFulfilled} fulfilled`}
                      {item.notes && ` (${item.notes})`}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUS_COLORS[r.status]}`}
                >
                  {r.status.replace("_", " ")}
                </span>
                {isOpenable(r) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openFulfill(r);
                    }}
                    className="text-xs bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700"
                  >
                    Open &amp; Dispense
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {requests?.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No requests found
          </p>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="font-bold text-gray-900">
                Dispense — {selected.patientName}
              </h3>
              {selected.referralId ? (
                <p className="text-xs text-teal-700 mt-1">
                  Linked referral
                  {selected.referral?.reason
                    ? ` · ${selected.referral.reason}`
                    : ""}
                  {selected.referral?.urgency
                    ? ` · ${selected.referral.urgency}`
                    : ""}
                  {selected.referral?.destinationFacility?.name
                    ? ` → ${selected.referral.destinationFacility.name}`
                    : ""}
                  {" — "}
                  confirming dispense marks the referral TREATED.
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  Walk-in encounter — quantities below are prefilled from the
                  prescription.
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Drug lines are auto-filled from the request. Adjust quantities
                or substitute an in-stock alternative, then dispense (FEFO).
              </p>
            </div>
            <div className="space-y-3">
              {selected.items.map((item: any) => {
                const chosen = stockMatch(substitute[item.id] || item.drugName);
                const info = availableStock[chosen];
                return (
                  <div
                    key={item.id}
                    className="border border-gray-100 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <select
                          className="input text-sm w-full"
                          value={chosen}
                          onChange={(e) =>
                            setSubstitute((p) => ({
                              ...p,
                              [item.id]: e.target.value,
                            }))
                          }
                        >
                          {![chosen].some((n) =>
                            Object.keys(availableStock).includes(n),
                          ) && (
                            <option value={item.drugName}>
                              {item.drugName}
                            </option>
                          )}
                          {Object.entries(availableStock).map(([name, s]) => (
                            <option key={name} value={name}>
                              {name} — {s.total} {s.unit} in stock
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Requested: {item.quantityRequested}
                          {(item.quantityFulfilled || 0) > 0 &&
                            ` · already given: ${item.quantityFulfilled} · remaining: ${
                              item.quantityRequested - item.quantityFulfilled
                            }`}
                          {item.notes && (
                            <span className="text-teal-700">
                              {" "}
                              · {item.notes}
                            </span>
                          )}
                          {info ? (
                            <span className="text-teal-700">
                              {" "}
                              · FEFO: earliest expiry{" "}
                              {info.earliest
                                ? new Date(info.earliest).toLocaleDateString(
                                    "en-GB",
                                  )
                                : "—"}
                            </span>
                          ) : (
                            <span className="text-red-600">
                              {" "}
                              · no in-date stock
                            </span>
                          )}
                        </p>
                      </div>
                      <input
                        type="number"
                        className="input w-24 text-center"
                        value={fulfillData[item.id] || ""}
                        onChange={(e) =>
                          setFulfillData((p) => ({
                            ...p,
                            [item.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 text-xs text-teal-800">
              {selected.referralId ? (
                <>
                  One action completes the loop: stock is drawn FEFO, the linked
                  referral is marked <b>TREATED</b>, and the CHW sees it on next
                  sync.
                </>
              ) : (
                <>
                  Dispensing draws stock FEFO and updates inventory balances
                  immediately.
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelected(null);
                  setSubstitute({});
                }}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleFulfill}
                disabled={fulfillMutation.isPending}
                className="flex-1 bg-teal-700 text-white py-2 rounded-lg text-sm"
              >
                {fulfillMutation.isPending
                  ? "Processing..."
                  : selected.referralId
                    ? "Confirm Dispense & Close Referral"
                    : "Confirm Dispense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
