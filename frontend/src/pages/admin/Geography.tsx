import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus } from "lucide-react";
import api from "../../services/api";
import type { Region } from "../../types";
import { useAuthStore } from "../../store/auth.store";
export default function Geography() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    type: "",
    name: "",
    parentId: "",
    regionId: "",
    districtId: "",
  });
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: tree } = useQuery<Region[]>({
    queryKey: ["geography-tree"],
    queryFn: () => api.get("/geography/tree").then((r) => r.data.data),
  });

  const { data: districts } = useQuery({
    queryKey: ["districts", form.regionId],
    queryFn: () =>
      api
        .get(
          `/geography/districts${form.regionId ? `?regionId=${form.regionId}` : ""}`,
        )
        .then((r) => r.data.data),
    enabled:
      form.type === "ta" || form.type === "zone" || form.type === "district",
  });

  const adminDistrictId = user?.facility?.districtId;

  const { data: tas } = useQuery({
    queryKey: ["tas", isAdmin ? adminDistrictId : form.districtId],
    queryFn: () => {
      const distId = isAdmin ? adminDistrictId : form.districtId;
      return api
        .get(`/geography/tas?districtId=${distId}`)
        .then((r) => r.data.data);
    },
    enabled:
      form.type === "zone" || form.type === "ta"
        ? isAdmin
          ? !!adminDistrictId
          : !!form.districtId
        : false,
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
      // ADMIN creating TA — auto-use their facility's districtId
      const taDistrictId =
        isAdmin && user?.facility?.districtId
          ? user.facility.districtId
          : parentId;

      const body =
        type === "region"
          ? { name }
          : type === "district"
            ? { name, regionId: parentId }
            : type === "ta"
              ? { name, districtId: taDistrictId }
              : { name, taId: parentId };
      return api.post(endpoint, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geography-tree"] });
      queryClient.invalidateQueries({ queryKey: ["districts"] });
      queryClient.invalidateQueries({ queryKey: ["tas"] });
      setForm({
        type: "",
        name: "",
        parentId: "",
        regionId: "",
        districtId: "",
      });
      setError("");
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || "Failed to create. Please try again.",
      );
    },
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
            {isSuperAdmin && <option value="region">Region</option>}
            {isSuperAdmin && <option value="district">District</option>}
            <option value="ta">Traditional Authority</option>
            <option value="zone">Zone</option>
          </select>
        </div>

        {/* District → needs Region first */}
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

        {/* TA → needs Region then District (SUPER_ADMIN), or auto-uses facility district (ADMIN) */}
        {form.type === "ta" && (
          <>
            {isAdmin && user?.facility ? (
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                <p className="text-xs text-teal-700 font-medium">
                  📍 Adding TA to: <strong>{user.facility.name}</strong>{" "}
                  district
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Region
                  </label>
                  <select
                    className="input"
                    value={form.regionId}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        regionId: e.target.value,
                        parentId: "",
                      }))
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
                {form.regionId && (
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
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Zone → ADMIN skips Region/District, SUPER_ADMIN sees full cascade */}
        {form.type === "zone" && (
          <>
            {isAdmin && user?.facility ? (
              <>
                <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-teal-700 font-medium">
                    📍 Adding Zone within: <strong>{user.facility.name}</strong>{" "}
                    district
                  </p>
                </div>
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
                        {t.name}
                      </option>
                    ))}
                    {(!tas || tas.length === 0) && (
                      <option disabled value="">
                        No TAs found — add a TA first
                      </option>
                    )}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Region
                  </label>
                  <select
                    className="input"
                    value={form.regionId}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        regionId: e.target.value,
                        districtId: "",
                        parentId: "",
                      }))
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
                {form.regionId && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      District
                    </label>
                    <select
                      className="input"
                      value={form.districtId}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          districtId: e.target.value,
                          parentId: "",
                        }))
                      }
                    >
                      <option value="">Select district...</option>
                      {districts?.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {form.districtId && (
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
                          {t.name}
                        </option>
                      ))}
                      {(!tas || tas.length === 0) && (
                        <option disabled value="">
                          No TAs found — add a TA first
                        </option>
                      )}
                    </select>
                  </div>
                )}
              </>
            )}
          </>
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
