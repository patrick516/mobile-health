import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, X } from "lucide-react";
import api from "../../services/api";
import Select from "../../components/ui/Select";
import { useAuthStore } from "../../store/auth.store";

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

  const isPharmacist = user?.role === "PHARMACIST";
  const canCreateRequest = ["NURSE", "ADMIN", "DISTRICT_OFFICER"].includes(
    user?.role || "",
  );

  const [filter, setFilter] = useState("PENDING");
  const [selected, setSelected] = useState<any>(null);
  const [fulfillData, setFulfillData] = useState<Record<string, string>>({});

  const [showForm, setShowForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    patientName: "",
    diagnosis: "",
    drugName: "",
    quantity: "",
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["pharmacy-requests", filter],
    queryFn: () =>
      api
        .get("/pharmacy/requests", {
          params: filter !== "ALL" ? { status: filter } : {},
        })
        .then((r) => r.data.data),
  });

  const { data: drugs } = useQuery({
    queryKey: ["drugs-formulary"],
    queryFn: () => api.get("/drugs").then((r) => r.data.data),
    enabled: showForm,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/pharmacy/requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-requests"] });
      setShowForm(false);
      setNewRequest({
        patientName: "",
        diagnosis: "",
        drugName: "",
        quantity: "",
      });
      alert("Drug request sent to Pharmacist successfully!");
    },
    onError: (err: any) =>
      alert(err.response?.data?.message || "Failed to create request"),
  });

  const fulfillMutation = useMutation({
    mutationFn: ({ id, data }: any) =>
      api.patch(`/pharmacy/requests/${id}/fulfill`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-batches"] });
      setSelected(null);
      setFulfillData({});
    },
  });

  const handleFulfill = () => {
    if (!selected) return;
    const fulfilledItems = selected.items.map((item: any) => ({
      itemId: item.id,
      quantityFulfilled: parseInt(fulfillData[item.id] || "0"),
    }));
    fulfillMutation.mutate({ id: selected.id, data: { fulfilledItems } });
  };

  const handleCreate = () => {
    if (
      !newRequest.patientName ||
      !newRequest.drugName ||
      !newRequest.quantity
    ) {
      return alert("Please fill in Patient Name, Drug, and Quantity.");
    }
    createMutation.mutate({
      patientName: newRequest.patientName,
      diagnosis: newRequest.diagnosis,
      items: [
        {
          drugName: newRequest.drugName,
          quantityRequested: parseInt(newRequest.quantity),
        },
      ],
    });
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
              <Plus size={16} /> New Prescription
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

      {isLoading && (
        <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
      )}

      <div className="space-y-3">
        {requests?.map((r: any) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{r.patientName}</p>
                {r.diagnosis && (
                  <p className="text-xs text-gray-500">
                    Diagnosis: {r.diagnosis}
                  </p>
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
                {isPharmacist && r.status === "PENDING" && (
                  <button
                    onClick={() => {
                      setSelected(r);
                      const init: Record<string, string> = {};
                      r.items.forEach((i: any) => {
                        init[i.id] = String(i.quantityRequested);
                      });
                      setFulfillData(init);
                    }}
                    className="text-xs bg-teal-600 text-white px-3 py-1 rounded-lg hover:bg-teal-700"
                  >
                    Fulfill
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

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900">
                New Patient Prescription
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Patient Name
              </label>
              <input
                className="input"
                value={newRequest.patientName}
                onChange={(e) =>
                  setNewRequest({ ...newRequest, patientName: e.target.value })
                }
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Diagnosis (Optional)
              </label>
              <input
                className="input"
                value={newRequest.diagnosis}
                onChange={(e) =>
                  setNewRequest({ ...newRequest, diagnosis: e.target.value })
                }
                placeholder="e.g. Severe Malaria"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Drug
              </label>
              <Select
                value={newRequest.drugName}
                onChange={(val) =>
                  setNewRequest({ ...newRequest, drugName: val })
                }
                placeholder="Select drug..."
                options={
                  drugs?.map((d: any) => ({
                    value: d.nameEnglish,
                    label: d.nameEnglish,
                  })) || []
                }
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Quantity
              </label>
              <input
                className="input"
                type="number"
                value={newRequest.quantity}
                onChange={(e) =>
                  setNewRequest({ ...newRequest, quantity: e.target.value })
                }
                placeholder="0"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="btn-primary w-full"
            >
              {createMutation.isPending ? "Sending..." : "Send to Pharmacist"}
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-gray-900">
              Fulfill Prescription — {selected.patientName}
            </h3>
            <p className="text-sm text-gray-500">
              Enter quantity to dispense for each item. Stock will deduct using
              FEFO.
            </p>
            <div className="space-y-3">
              {selected.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.drugName}</p>
                    <p className="text-xs text-gray-500">
                      Requested: {item.quantityRequested}
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
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelected(null)}
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
                  : "Confirm Dispense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
