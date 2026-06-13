import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Network, Plus } from "lucide-react";
import api from "../../services/api";

export default function Allocations() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    userId: "",
    zoneId: "",
    taId: "",
    type: "zone",
  });
  const [error, setError] = useState("");

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then((r) => r.data.data),
  });

  const { data: zones } = useQuery({
    queryKey: ["zones"],
    queryFn: () => api.get("/geography/zones").then((r) => r.data.data),
  });

  const { data: tas } = useQuery({
    queryKey: ["tas"],
    queryFn: () => api.get("/geography/tas").then((r) => r.data.data),
  });

  const allocateMutation = useMutation({
    mutationFn: () => {
      if (form.type === "zone") {
        return api.post("/admin/allocations/zone", {
          userId: form.userId,
          zoneId: form.zoneId,
        });
      }
      return api.post("/admin/allocations/ta", {
        userId: form.userId,
        taId: form.taId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setForm((p) => ({ ...p, userId: "", zoneId: "", taId: "" }));
      setError("");
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.message || "Allocation failed. Please try again.",
      );
    },
  });

  const ccws = users?.filter((u: any) => u.role === "CCW") || [];
  const nurses =
    users?.filter((u: any) => ["NURSE", "DISTRICT_OFFICER"].includes(u.role)) ||
    [];

  return (
    <div className="space-y-6">
      {/* Stats Summary Row - Now using nurses variable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
          <p className="text-sm text-purple-700 font-medium">
            District Officers
          </p>
          <p className="text-2xl font-bold text-purple-900">
            {nurses.filter((n: any) => n.role === "DISTRICT_OFFICER").length}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Allocation Type
            </label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="zone">CCW → Zone</option>
              <option value="ta">User → Traditional Authority</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {form.type === "zone" ? "CCW" : "User"}
            </label>
            <select
              className="input"
              value={form.userId}
              onChange={(e) =>
                setForm((p) => ({ ...p, userId: e.target.value }))
              }
            >
              <option value="">Select user...</option>
              {(form.type === "zone" ? ccws : users)?.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {form.type === "zone" ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Zone
              </label>
              <select
                className="input"
                value={form.zoneId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, zoneId: e.target.value }))
                }
              >
                <option value="">Select zone...</option>
                {zones?.map((z: any) => (
                  <option key={z.id} value={z.id}>
                    {z.name} — {z.ta?.name ?? ""}
                  </option>
                ))}
                {(!zones || zones.length === 0) && (
                  <option disabled value="">
                    No zones found — add zones in Geography first
                  </option>
                )}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Traditional Authority
              </label>
              <select
                className="input"
                value={form.taId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, taId: e.target.value }))
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

          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => allocateMutation.mutate()}
            disabled={allocateMutation.isPending || !form.userId}
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

        {/* Nurse & DO Allocations - NOW USING nurses VARIABLE */}
        <div className="card p-5">
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
                    <span className="badge-gray text-xs">Not allocated</span>
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
        </div>
      </div>
    </div>
  );
}
