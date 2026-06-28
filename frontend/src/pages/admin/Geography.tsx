import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus } from "lucide-react";
import api from "../../services/api";
import type { Region } from "../../types";
import { useAuthStore } from "../../store/auth.store";
import Select from "../../components/ui/Select";
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
          <Select
            value={form.type}
            onChange={(val) =>
              setForm((p) => ({ ...p, type: val, parentId: "" }))
            }
            placeholder="Select type..."
            options={[
              ...(isSuperAdmin ? [{ value: "region", label: "Region" }] : []),
              ...(isSuperAdmin
                ? [{ value: "district", label: "District" }]
                : []),
              { value: "ta", label: "Traditional Authority" },
              { value: "zone", label: "Zone" },
            ]}
          />
        </div>

        {/* District → needs Region first */}
        {form.type === "district" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Region
            </label>
            <Select
              value={form.parentId}
              onChange={(val) => setForm((p) => ({ ...p, parentId: val }))}
              placeholder="Select region..."
              options={(tree || []).map((r) => ({
                value: r.id,
                label: r.name,
              }))}
            />
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
                  <Select
                    value={form.regionId}
                    onChange={(val) =>
                      setForm((p) => ({ ...p, regionId: val, parentId: "" }))
                    }
                    placeholder="Select region..."
                    options={(tree || []).map((r) => ({
                      value: r.id,
                      label: r.name,
                    }))}
                  />
                </div>
                {form.regionId && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      District
                    </label>
                    <Select
                      value={form.parentId}
                      onChange={(val) =>
                        setForm((p) => ({ ...p, parentId: val }))
                      }
                      placeholder="Select district..."
                      options={(districts || []).map((d: any) => ({
                        value: d.id,
                        label: d.name,
                      }))}
                    />
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
                  <Select
                    value={form.parentId}
                    onChange={(val) =>
                      setForm((p) => ({ ...p, parentId: val }))
                    }
                    placeholder="Select TA..."
                    options={
                      tas && tas.length > 0
                        ? tas.map((t: any) => ({ value: t.id, label: t.name }))
                        : [
                            {
                              value: "",
                              label: "No TAs found — add a TA first",
                              disabled: true,
                            },
                          ]
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Region
                  </label>
                  <Select
                    value={form.regionId}
                    onChange={(val) =>
                      setForm((p) => ({
                        ...p,
                        regionId: val,
                        districtId: "",
                        parentId: "",
                      }))
                    }
                    placeholder="Select region..."
                    options={(tree || []).map((r) => ({
                      value: r.id,
                      label: r.name,
                    }))}
                  />
                </div>
                {form.regionId && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      District
                    </label>
                    <Select
                      value={form.districtId}
                      onChange={(val) =>
                        setForm((p) => ({
                          ...p,
                          districtId: val,
                          parentId: "",
                        }))
                      }
                      placeholder="Select district..."
                      options={(districts || []).map((d: any) => ({
                        value: d.id,
                        label: d.name,
                      }))}
                    />
                  </div>
                )}
                {form.districtId && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Traditional Authority
                    </label>
                    <Select
                      value={form.parentId}
                      onChange={(val) =>
                        setForm((p) => ({ ...p, parentId: val }))
                      }
                      placeholder="Select TA..."
                      options={
                        tas && tas.length > 0
                          ? tas.map((t: any) => ({
                              value: t.id,
                              label: t.name,
                            }))
                          : [
                              {
                                value: "",
                                label: "No TAs found — add a TA first",
                                disabled: true,
                              },
                            ]
                      }
                    />
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
