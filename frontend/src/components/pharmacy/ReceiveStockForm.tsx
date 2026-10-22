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

export default function ReceiveStockForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

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

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/pharmacy/suppliers").then((r) => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (data: object) => api.post("/pharmacy/batches", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-batches"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-alerts"] });
      onSuccess(); // Tell the parent to close the modal
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to receive batch.");
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
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
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

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Category *
          </label>
          <Select
            value={form.category}
            onChange={(val) => setForm({ ...form, category: val })}
            placeholder="Select..."
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
            placeholder="Select..."
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
            onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
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

        <div className="col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Supplier (Optional)
          </label>
          <Select
            value={form.supplierId}
            onChange={(val) => setForm({ ...form, supplierId: val })}
            placeholder="Select supplier..."
            options={
              suppliers?.map((s: any) => ({ value: s.id, label: s.name })) || []
            }
          />
        </div>
      </div>

      <button
        className="btn-primary flex items-center justify-center gap-2 w-full mt-4"
        onClick={handleSubmit}
        disabled={mutation.isPending}
      >
        <PackagePlus size={16} />{" "}
        {mutation.isPending ? "Saving..." : "Receive Batch"}
      </button>
    </div>
  );
}
