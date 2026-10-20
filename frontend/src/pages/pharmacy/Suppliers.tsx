import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Truck, Plus } from "lucide-react";
import api from "../../services/api";

const SUPPLIER_TYPES = ["CMST", "NGO", "PRIVATE", "DONATION"];

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    type: "",
    contactName: "",
    phone: "",
    email: "",
  });
  const [error, setError] = useState("");

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/pharmacy/suppliers").then((r) => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (data: object) => api.post("/pharmacy/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setForm({ name: "", type: "", contactName: "", phone: "", email: "" });
      setError("");
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || "Failed to create supplier."),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Truck size={20} className="text-teal-700" />
          <h2 className="font-bold text-gray-900">Add Supplier</h2>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Supplier Type
            </label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="">Select type...</option>
              {SUPPLIER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Supplier Name
            </label>
            <input
              className="input"
              placeholder="e.g. Central Medical Stores Trust"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Contact Name
            </label>
            <input
              className="input"
              placeholder="Contact person"
              value={form.contactName}
              onChange={(e) =>
                setForm((p) => ({ ...p, contactName: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Phone
            </label>
            <input
              className="input"
              placeholder="+265..."
              value={form.phone}
              onChange={(e) =>
                setForm((p) => ({ ...p, phone: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email
            </label>
            <input
              className="input"
              type="email"
              placeholder="supplier@example.com"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
            />
          </div>
        </div>

        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending || !form.name || !form.type}
        >
          <Plus size={16} />
          {mutation.isPending ? "Saving..." : "Add Supplier"}
        </button>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">All Suppliers</h2>
        <div className="space-y-3">
          {suppliers?.map((s: any) => (
            <div key={s.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  {s.contactName && (
                    <p className="text-xs text-gray-500">{s.contactName}</p>
                  )}
                  {s.phone && (
                    <p className="text-xs text-gray-500">{s.phone}</p>
                  )}
                </div>
                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
                  {s.type}
                </span>
              </div>
            </div>
          ))}
          {suppliers?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No suppliers added yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
