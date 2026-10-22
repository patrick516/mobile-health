import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus } from "lucide-react";
import api from "../../services/api";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";

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

  const handleSubmit = () => {
    if (
      !form.drugName ||
      !form.category ||
      !form.unit ||
      !form.batchNumber ||
      !form.quantityReceived ||
      !form.expiryDate
    ) {
      return setError(
        "Please fill in all required fields (Drug Name, Category, Unit, Batch Number, Quantity, Expiry Date).",
      );
    }
    mutation.mutate(form);
  };

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
              Drug Name (English) *
            </label>
            <input
              className="input"
              placeholder="e.g. Amoxicillin 250mg"
              value={form.drugName}
              onChange={(e) => setForm({ ...form, drugName: e.target.value })}
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
                setForm({ ...form, drugNameChichewa: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Category *
            </label>
            <Select
              value={form.category}
              onChange={(val) => setForm({ ...form, category: val })}
              placeholder="Select category..."
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Unit *
            </label>
            <Select
              value={form.unit}
              onChange={(val) => setForm({ ...form, unit: val })}
              placeholder="Select unit..."
              options={UNITS.map((u) => ({ value: u, label: u }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Batch Number *
            </label>
            <input
              className="input"
              placeholder="e.g. BN2024-001"
              value={form.batchNumber}
              onChange={(e) =>
                setForm({ ...form, batchNumber: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Quantity Received *
            </label>
            <input
              className="input"
              type="number"
              placeholder="0"
              value={form.quantityReceived}
              onChange={(e) =>
                setForm({ ...form, quantityReceived: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Manufacture Date
            </label>
            <DatePicker
              value={form.manufactureDate}
              onChange={(val) => setForm({ ...form, manufactureDate: val })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Expiry Date *
            </label>
            <DatePicker
              value={form.expiryDate}
              onChange={(val) => setForm({ ...form, expiryDate: val })}
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
                setForm({ ...form, minimumStock: e.target.value })
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
                setForm({ ...form, reorderPoint: e.target.value })
              }
            />
          </div>

          {/* Supplier is now optional and uses the custom Select */}
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Supplier (Optional)
            </label>
            <Select
              value={form.supplierId}
              onChange={(val) => setForm({ ...form, supplierId: val })}
              placeholder="Select supplier (if applicable)..."
              options={
                suppliers?.map((s: any) => ({ value: s.id, label: s.name })) ||
                []
              }
            />
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
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <button
          className="btn-primary flex items-center gap-2 w-full"
          onClick={handleSubmit}
          disabled={mutation.isPending}
        >
          <PackagePlus size={16} />{" "}
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
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.status === "ACTIVE" ? "bg-green-100 text-green-700" : b.status === "DEPLETED" ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-700"}`}
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
