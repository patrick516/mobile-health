import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Network, Plus } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth.store";
import Select from "../../components/ui/Select";

export default function Allocations() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isAdmin = user?.role === "ADMIN";

  const [form, setForm] = useState({
    userId: "",
    zoneId: "",
    taId: "",
    facilityId: "",
    type: isSuperAdmin ? "facility" : "zone", // SUPER_ADMIN assigns ADMINs to facilities
    regionId: "",
    districtId: "",
    filterTaId: "",
  });
  const [error, setError] = useState("");

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then((r) => r.data.data),
  });

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: () => api.get("/geography/regions").then((r) => r.data.data),
  });

  const { data: districts } = useQuery({
    queryKey: ["alloc-districts", form.regionId],
    queryFn: () =>
      api
        .get(`/geography/districts?regionId=${form.regionId}`)
        .then((r) => r.data.data),
    enabled: !!form.regionId && isSuperAdmin,
  });

  // For ADMIN — load TAs directly from their facility's district

  const { data: tas } = useQuery({
    queryKey: [
      "alloc-tas",
      isAdmin ? user?.facility?.districtId : form.districtId,
    ],
    queryFn: () => {
      const distId = isAdmin ? user?.facility?.districtId : form.districtId;
      return api
        .get(`/geography/tas?districtId=${distId}`)
        .then((r) => r.data.data);
    },
    enabled: isAdmin ? !!user?.facility?.districtId : !!form.districtId,
  });

  const { data: zones } = useQuery({
    queryKey: ["alloc-zones", form.filterTaId],
    queryFn: () =>
      api
        .get(`/geography/zones?taId=${form.filterTaId}`)
        .then((r) => r.data.data),
    enabled: form.type === "zone" && !!form.filterTaId,
  });

  const { data: facilities } = useQuery({
    queryKey: ["alloc-facilities", form.districtId],
    queryFn: () =>
      api
        .get(`/admin/facilities?districtId=${form.districtId}`)
        .then((r) => r.data.data),
    enabled: form.type === "facility" && !!form.districtId,
  });

  const allocateMutation = useMutation({
    mutationFn: () => {
      if (form.type === "zone") {
        return api.post("/admin/allocations/zone", {
          userId: form.userId,
          zoneId: form.zoneId,
        });
      }
      if (form.type === "ta") {
        return api.post("/admin/allocations/ta", {
          userId: form.userId,
          taId: form.taId,
        });
      }
      // facility — SUPER_ADMIN assigns ADMIN to a facility
      return api.patch(`/admin/users/${form.userId}`, {
        facilityId: form.facilityId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setForm((p) => ({
        ...p,
        userId: "",
        zoneId: "",
        taId: "",
        facilityId: "",
        regionId: "",
        districtId: "",
        filterTaId: "",
      }));
      setError("");
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || "Allocation failed. Please try again.",
      );
    },
  });

  // Filter users by role depending on who is logged in
  const ccws = users?.filter((u: any) => u.role === "CCW") || [];
  const nurses =
    users?.filter((u: any) => ["NURSE", "DISTRICT_OFFICER"].includes(u.role)) ||
    [];
  const admins = users?.filter((u: any) => u.role === "ADMIN") || [];

  // User list for the allocation form depends on type
  const getAllocatableUsers = () => {
    if (form.type === "facility") return admins;
    if (form.type === "zone") return ccws;
    return nurses;
  };

  const resetCascade = () => ({
    regionId: "",
    districtId: "",
    filterTaId: "",
    taId: "",
    zoneId: "",
    facilityId: "",
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isSuperAdmin && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg">
            <p className="text-sm text-red-700 font-medium">Total Admins</p>
            <p className="text-2xl font-bold text-red-900">{admins.length}</p>
          </div>
        )}
        <div className="bg-gradient-to-r from-teal-50 to-teal-100 p-4 rounded-lg">
          <p className="text-sm text-teal-700 font-medium">Total CCWs</p>
          <p className="text-2xl font-bold text-teal-900">{ccws.length}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
          <p className="text-sm text-blue-700 font-medium">Total Nurses</p>
          <p className="text-2xl font-bold text-blue-900">
            {nurses.filter((n: any) => n.role === "NURSE").length}
          </p>
        </div>
        {!isSuperAdmin && (
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
            <p className="text-sm text-purple-700 font-medium">
              District Officers
            </p>
            <p className="text-2xl font-bold text-purple-900">
              {nurses.filter((n: any) => n.role === "DISTRICT_OFFICER").length}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocate form */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Network size={20} className="text-teal-700" />
            <h2 className="font-bold text-gray-900">Allocate User to Area</h2>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Allocation type — scoped by role */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Allocation Type
            </label>
            <Select
              value={form.type}
              onChange={(val) =>
                setForm((p) => ({
                  ...p,
                  type: val,
                  userId: "",
                  ...resetCascade(),
                }))
              }
              placeholder="Select type..."
              options={[
                ...(isSuperAdmin
                  ? [{ value: "facility", label: "Admin → Facility" }]
                  : []),
                ...(isAdmin || isSuperAdmin
                  ? [{ value: "zone", label: "CCW → Zone" }]
                  : []),
                ...(isAdmin || isSuperAdmin
                  ? [
                      {
                        value: "ta",
                        label: "Nurse/DO → Traditional Authority",
                      },
                    ]
                  : []),
              ]}
            />
          </div>

          {/* User selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {form.type === "facility"
                ? "Admin User"
                : form.type === "zone"
                  ? "CCW"
                  : "Nurse / District Officer"}
            </label>
            <Select
              value={form.userId}
              onChange={(val) => setForm((p) => ({ ...p, userId: val }))}
              placeholder="Select user..."
              options={getAllocatableUsers().map((u: any) => ({
                value: u.id,
                label: `${u.fullName} (${u.role.replace("_", " ")})${
                  u.facility ? ` — ${u.facility.name}` : " — No facility"
                }`,
              }))}
            />
          </div>

          {/* SUPER_ADMIN sees full cascade, ADMIN skips to TA directly */}
          {isSuperAdmin && (
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
                      filterTaId: "",
                      taId: "",
                      zoneId: "",
                      facilityId: "",
                    }))
                  }
                  placeholder="Select region..."
                  options={(regions || []).map((r: any) => ({
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
                        filterTaId: "",
                        taId: "",
                        zoneId: "",
                        facilityId: "",
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
            </>
          )}
          {isAdmin && user?.facility && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
              <p className="text-xs text-teal-700 font-medium">
                📍 Allocating within: <strong>{user.facility.name}</strong>
              </p>
            </div>
          )}

          {/* Facility picker — SUPER_ADMIN assigning ADMIN */}
          {form.type === "facility" && form.districtId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Facility
              </label>
              <Select
                value={form.facilityId}
                onChange={(val) => setForm((p) => ({ ...p, facilityId: val }))}
                placeholder="Select facility..."
                options={
                  facilities && facilities.length > 0
                    ? facilities.map((f: any) => ({
                        value: f.id,
                        label: `${f.name} — ${f.facilityType?.replace(/_/g, " ")}`,
                      }))
                    : [
                        {
                          value: "",
                          label: "No facilities in this district",
                          disabled: true,
                        },
                      ]
                }
              />
            </div>
          )}

          {/* TA picker — zone or ta type */}
          {(form.type === "zone" || form.type === "ta") &&
            (isAdmin || form.districtId) && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Traditional Authority
                </label>
                <Select
                  value={form.type === "ta" ? form.taId : form.filterTaId}
                  onChange={(val) =>
                    setForm((p) => ({
                      ...p,
                      ...(form.type === "ta"
                        ? { taId: val }
                        : { filterTaId: val, zoneId: "" }),
                    }))
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
            )}

          {/* Zone picker */}
          {form.type === "zone" && form.filterTaId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Zone
              </label>
              <Select
                value={form.zoneId}
                onChange={(val) => setForm((p) => ({ ...p, zoneId: val }))}
                placeholder="Select zone..."
                options={
                  zones && zones.length > 0
                    ? zones.map((z: any) => ({
                        value: z.id,
                        label: z.facilityName
                          ? `${z.name} (${z.facilityName})`
                          : z.name,
                      }))
                    : [
                        {
                          value: "",
                          label:
                            "No zones found — add zones in Geography first",
                          disabled: true,
                        },
                      ]
                }
              />
            </div>
          )}

          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => allocateMutation.mutate()}
            disabled={
              allocateMutation.isPending ||
              !form.userId ||
              (form.type === "zone" && !form.zoneId) ||
              (form.type === "ta" && !form.taId) ||
              (form.type === "facility" && !form.facilityId)
            }
          >
            <Plus size={16} />
            {allocateMutation.isPending ? "Allocating..." : "Allocate"}
          </button>
        </div>

        {/* Current CCW allocations */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">
            Current CCW Allocations
          </h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {ccws.map((u: any) => (
              <div
                key={u.id}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {u.fullName}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {u.phoneNumber}
                  </p>
                </div>
                <div className="text-right">
                  {u.zoneAllocations?.length > 0 ? (
                    u.zoneAllocations.map((za: any) => (
                      <span
                        key={za.zone.id}
                        className="badge-blue text-xs block mb-1"
                      >
                        {za.zone.name}
                      </span>
                    ))
                  ) : (
                    <span className="badge-gray text-xs">No zone</span>
                  )}
                </div>
              </div>
            ))}
            {ccws.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">
                No CCW users found
              </p>
            )}
          </div>
        </div>

        {/* Right panel — depends on role */}
        <div className="card p-5">
          {isSuperAdmin ? (
            <>
              <h2 className="font-bold text-gray-900 mb-4">
                Admin Facility Assignments
              </h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {admins.map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {a.fullName}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {a.phoneNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      {a.facility ? (
                        <span className="badge-green text-xs block">
                          {a.facility.name}
                        </span>
                      ) : (
                        <span className="badge-red text-xs">No facility</span>
                      )}
                    </div>
                  </div>
                ))}
                {admins.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No admin users found
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-bold text-gray-900 mb-4">
                Nurse & DO Allocations to TAs
              </h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {nurses.map((n: any) => (
                  <div
                    key={n.id}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {n.fullName}
                      </p>
                      <p className="text-xs text-gray-500">{n.role}</p>
                      <p className="text-xs text-gray-400 font-mono">
                        {n.phoneNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      {n.taAllocations?.length > 0 ? (
                        n.taAllocations.map((taa: any) => (
                          <span
                            key={taa.ta.id}
                            className="badge-green text-xs block mb-1"
                          >
                            {taa.ta.name} (TA)
                          </span>
                        ))
                      ) : (
                        <span className="badge-gray text-xs">
                          Not allocated
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {nurses.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No nurses or district officers found
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
