import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus } from "lucide-react";
import api from "../../services/api";
import type { Region } from "../../types";

export default function Geography() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ type: "", name: "", parentId: "" });
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: tree } = useQuery<Region[]>({
    queryKey: ["geography-tree"],
    queryFn: () => api.get("/geography/tree").then((r) => r.data.data),
  });

  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: () => api.get("/geography/districts").then((r) => r.data.data),
  });

  const { data: tas } = useQuery({
    queryKey: ["tas"],
    queryFn: () => api.get("/geography/tas").then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: ({
      type,
      name,
      parentId,
    }: {
      type: string;
      name: string;
      parentId: string;
    }) => {
      const endpoint =
        type === "region"
          ? "/admin/geography/regions"
          : type === "district"
            ? "/admin/geography/districts"
            : type === "ta"
              ? "/admin/geography/tas"
              : "/admin/geography/zones";
      const body =
        type === "region"
          ? { name }
          : type === "district"
            ? { name, regionId: parentId }
            : type === "ta"
              ? { name, districtId: parentId }
              : { name, taId: parentId };
      return api.post(endpoint, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geography-tree"] });
      queryClient.invalidateQueries({ queryKey: ["districts"] });
      queryClient.invalidateQueries({ queryKey: ["tas"] });
      setForm({ type: "", name: "", parentId: "" });
      setError("");
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || "Failed to create."),
  });

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Tree */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4">Geographic Hierarchy</h2>
        <div className="space-y-1 text-sm max-h-[600px] overflow-y-auto">
          {tree?.map((region) => (
            <div key={region.id}>
              <button
                onClick={() => toggle(region.id)}
                className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded hover:bg-gray-50 font-semibold text-gray-800"
              >
                <ChevronRight
                  size={14}
                  className={`transition-transform ${expanded[region.id] ? "rotate-90" : ""}`}
                />
                🌍 {region.name}
              </button>
              {expanded[region.id] &&
                region.districts?.map((d) => (
                  <div key={d.id} className="ml-4">
                    <button
                      onClick={() => toggle(d.id)}
                      className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded hover:bg-gray-50 text-gray-700"
                    >
                      <ChevronRight
                        size={14}
                        className={`transition-transform ${expanded[d.id] ? "rotate-90" : ""}`}
                      />
                      🏙 {d.name}
                    </button>
                    {expanded[d.id] &&
                      d.traditionalAuthorities?.map((ta: any) => (
                        <div key={ta.id} className="ml-4">
                          <button
                            onClick={() => toggle(ta.id)}
                            className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded hover:bg-gray-50 text-gray-600"
                          >
                            <ChevronRight
                              size={14}
                              className={`transition-transform ${expanded[ta.id] ? "rotate-90" : ""}`}
                            />
                            🏘 {ta.name}
                          </button>
                          {expanded[ta.id] &&
                            ta.zones?.map((z: any) => (
                              <div
                                key={z.id}
                                className="ml-4 py-1 px-2 text-gray-500"
                              >
                                📍 {z.name} ({z.villages?.length ?? 0} villages)
                              </div>
                            ))}
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Add form */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Add Geographic Unit</h2>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Type
          </label>
          <select
            className="input"
            value={form.type}
            onChange={(e) =>
              setForm((p) => ({ ...p, type: e.target.value, parentId: "" }))
            }
          >
            <option value="">Select type...</option>
            <option value="region">Region</option>
            <option value="district">District</option>
            <option value="ta">Traditional Authority</option>
            <option value="zone">Zone</option>
          </select>
        </div>

        {form.type === "district" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Region
            </label>
            <select
              className="input"
              value={form.parentId}
              onChange={(e) =>
                setForm((p) => ({ ...p, parentId: e.target.value }))
              }
            >
              <option value="">Select region...</option>
              {tree?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.type === "ta" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              District
            </label>
            <select
              className="input"
              value={form.parentId}
              onChange={(e) =>
                setForm((p) => ({ ...p, parentId: e.target.value }))
              }
            >
              <option value="">Select district...</option>
              {districts?.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.region?.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.type === "zone" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Traditional Authority
            </label>
            <select
              className="input"
              value={form.parentId}
              onChange={(e) =>
                setForm((p) => ({ ...p, parentId: e.target.value }))
              }
            >
              <option value="">Select TA...</option>
              {tas?.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.district?.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.type && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Name
            </label>
            <input
              className="input"
              placeholder={`Enter ${form.type} name`}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
        )}

        {form.type && (
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => createMutation.mutate(form)}
            disabled={createMutation.isPending || !form.name}
          >
            <Plus size={16} />
            {createMutation.isPending ? "Creating..." : `Add ${form.type}`}
          </button>
        )}
      </div>
    </div>
  );
}
