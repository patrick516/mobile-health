import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus } from "lucide-react";
import api from "../../services/api";

const CATEGORIES = [
  "Antibiotics",
  "Antimalarials",
  "Analgesics",
  "Antihypertensives",
  "Antiretrovirals",
  "Vitamins & Supplements",
  "Vaccines",
  "Fluids",
  "Antifungals",
  "Antiparasitics",
  "Contraceptives",
  "Other",
];

const UNITS = [
  "Tablets",
  "Capsules",
  "Vials",
  "Sachets",
  "Bottles",
  "Ampoules",
  "Tubes",
];

export default function StockReceiving() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    drugName: "",
    drugNameChichewa: "",
    category: "",
    unit: "",
    batchNumber: "",
    supplierId: "",
    quantityReceived: "",
    manufactureDate: "",
    expiryDate: "",
    minimumStock: "",
    reorderPoint: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/pharmacy/suppliers").then((r) => r.data.data),
  });

  const { data: batches } = useQuery({
    queryKey: ["pharmacy-batches"],
    queryFn: () => api.get("/pharmacy/batches").then((r) => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (data: object) => api.post("/pharmacy/batches", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-batches"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-alerts"] });
      setSuccess("Batch received successfully.");
      setError("");
      setForm({
        drugName: "",
        drugNameChichewa: "",
        category: "",
        unit: "",
        batchNumber: "",
        supplierId: "",
        quantityReceived: "",
        manufactureDate: "",
        expiryDate: "",
        minimumStock: "",
        reorderPoint: "",
        notes: "",
      });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to receive batch.");
      setSuccess("");
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <PackagePlus size={20} className="text-teal-700" />
          <h2 className="font-bold text-gray-900">Receive Drug Batch</h2>
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

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Drug Name (English)
            </label>
            <input
              className="input"
              placeholder="e.g. Amoxicillin 250mg"
              value={form.drugName}
              onChange={(e) =>
                setForm((p) => ({ ...p, drugName: e.target.value }))
              }
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Drug Name (Chichewa) — optional
            </label>
            <input
              className="input"
              placeholder="Chichewa name"
              value={form.drugNameChichewa}
              onChange={(e) =>
                setForm((p) => ({ ...p, drugNameChichewa: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Category
            </label>
            <select
              className="input"
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
            >
              <option value="">Select...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Unit
            </label>
            <select
              className="input"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            >
              <option value="">Select...</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Batch Number
            </label>
            <input
              className="input"
              placeholder="e.g. BN2024-001"
              value={form.batchNumber}
              onChange={(e) =>
                setForm((p) => ({ ...p, batchNumber: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Quantity Received
            </label>
            <input
              className="input"
              type="number"
              placeholder="0"
              value={form.quantityReceived}
              onChange={(e) =>
                setForm((p) => ({ ...p, quantityReceived: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Manufacture Date
            </label>
            <input
              className="input"
              type="date"
              value={form.manufactureDate}
              onChange={(e) =>
                setForm((p) => ({ ...p, manufactureDate: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Expiry Date *
            </label>
            <input
              className="input"
              type="date"
              value={form.expiryDate}
              onChange={(e) =>
                setForm((p) => ({ ...p, expiryDate: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Minimum Stock Level
            </label>
            <input
              className="input"
              type="number"
              placeholder="0"
              value={form.minimumStock}
              onChange={(e) =>
                setForm((p) => ({ ...p, minimumStock: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Reorder Point
            </label>
            <input
              className="input"
              type="number"
              placeholder="0"
              value={form.reorderPoint}
              onChange={(e) =>
                setForm((p) => ({ ...p, reorderPoint: e.target.value }))
              }
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Supplier
            </label>
            <select
              className="input"
              value={form.supplierId}
              onChange={(e) =>
                setForm((p) => ({ ...p, supplierId: e.target.value }))
              }
            >
              <option value="">Select supplier (optional)</option>
              {suppliers?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.type}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Notes
            </label>
            <textarea
              className="input"
              rows={2}
              placeholder="Any additional notes..."
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
            !form.category ||
            !form.unit ||
            !form.batchNumber ||
            !form.quantityReceived ||
            !form.expiryDate
          }
        >
          <PackagePlus size={16} />
          {mutation.isPending ? "Saving..." : "Receive Batch"}
        </button>
      </div>

      {/* Recent batches */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">Recent Batches</h2>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {batches?.map((b: any) => (
            <div key={b.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {b.drugName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Batch {b.batchNumber} · {b.category}
                  </p>
                  <p className="text-xs text-gray-500">
                    {b.quantityRemaining}/{b.quantityReceived} {b.unit} ·
                    Expires {new Date(b.expiryDate).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    b.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : b.status === "DEPLETED"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {b.status}
                </span>
              </div>
            </div>
          ))}
          {batches?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No batches received yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
