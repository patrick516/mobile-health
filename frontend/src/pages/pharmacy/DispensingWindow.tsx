import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pill, Search } from "lucide-react";
import api from "../../services/api";

export default function DispensingWindow() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    drugName: "",
    quantity: "",
    patientName: "",
    patientId: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const { data: batches } = useQuery({
    queryKey: ["pharmacy-batches", search],
    queryFn: () =>
      api
        .get("/pharmacy/batches", { params: { status: "ACTIVE", search } })
        .then((r) => r.data.data),
  });

  // Group by drug name for stock summary
  const stockSummary = batches?.reduce((acc: any, b: any) => {
    if (!acc[b.drugName])
      acc[b.drugName] = { total: 0, unit: b.unit, batches: [] };
    acc[b.drugName].total += b.quantityRemaining;
    acc[b.drugName].batches.push(b);
    return acc;
  }, {});

  const mutation = useMutation({
    mutationFn: (data: object) => api.post("/pharmacy/dispense", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-batches"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-alerts"] });
      setSuccess(`Dispensed successfully using FEFO logic.`);
      setError("");
      setForm({
        drugName: "",
        quantity: "",
        patientName: "",
        patientId: "",
        notes: "",
      });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Dispensing failed.");
      setSuccess("");
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Dispense form */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Pill size={20} className="text-blue-700" />
          <div>
            <h2 className="font-bold text-gray-900">Dispense Drug</h2>
            <p className="text-xs text-gray-500">
              FEFO — earliest expiry dispensed first
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            {success}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Drug Name
            </label>
            <select
              className="input"
              value={form.drugName}
              onChange={(e) =>
                setForm((p) => ({ ...p, drugName: e.target.value }))
              }
            >
              <option value="">Select drug...</option>
              {stockSummary &&
                Object.entries(stockSummary).map(([name, info]: any) => (
                  <option key={name} value={name}>
                    {name} — {info.total} {info.unit} available
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Quantity
            </label>
            <input
              className="input"
              type="number"
              placeholder="0"
              value={form.quantity}
              onChange={(e) =>
                setForm((p) => ({ ...p, quantity: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Patient Name
            </label>
            <input
              className="input"
              placeholder="Full name of patient"
              value={form.patientName}
              onChange={(e) =>
                setForm((p) => ({ ...p, patientName: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Patient ID (optional)
            </label>
            <input
              className="input"
              placeholder="OPD/IPD number"
              value={form.patientId}
              onChange={(e) =>
                setForm((p) => ({ ...p, patientId: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Notes
            </label>
            <textarea
              className="input"
              rows={2}
              placeholder="Dosage instructions, etc."
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>
        </div>

        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => mutation.mutate(form)}
          disabled={
            mutation.isPending ||
            !form.drugName ||
            !form.quantity ||
            !form.patientName
          }
        >
          <Pill size={16} />
          {mutation.isPending ? "Dispensing..." : "Dispense"}
        </button>
      </div>

      {/* Stock summary */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-gray-900">Available Stock</h2>
          <div className="relative flex-1 max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className="input pl-8 py-1.5 text-sm"
              placeholder="Search drug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {stockSummary &&
            Object.entries(stockSummary).map(([name, info]: any) => (
              <div key={name} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">
                      {info.batches.length} batch(es)
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${info.total === 0 ? "text-red-600" : info.total <= 10 ? "text-yellow-600" : "text-green-600"}`}
                  >
                    {info.total} {info.unit}
                  </span>
                </div>
              </div>
            ))}
          {(!stockSummary || Object.keys(stockSummary).length === 0) && (
            <p className="text-sm text-gray-400 text-center py-8">
              No active stock
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
