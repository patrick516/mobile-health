import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, UserX } from "lucide-react";
import api from "../../services/api";

interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
}

const ROLES = ["CCW", "NURSE", "DISTRICT_OFFICER", "ADMIN"];

export default function Users() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    pin: "",
    role: "CCW",
    facilityId: "",
  });
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then((r) => r.data.data),
  });

  const { data: facilities } = useQuery({
    queryKey: ["facilities"],
    queryFn: () => api.get("/admin/facilities").then((r) => r.data.data),
  });

  const needsFacility = ["NURSE", "DISTRICT_OFFICER"].includes(form.role);
  const createMutation = useMutation({
    mutationFn: (data: object) => api.post("/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowForm(false);
      setForm({
        fullName: "",
        phoneNumber: "",
        pin: "",
        role: "CCW",
        facilityId: "",
      });
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || "Failed to create user."),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/deactivate`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/reactivate`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const roleColor: Record<string, string> = {
    ADMIN: "badge-red",
    DISTRICT_OFFICER: "badge-blue",
    NURSE: "badge-green",
    CCW: "badge-gray",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-gray-900">Create New User</h3>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Full Name
              </label>
              <input
                className="input"
                value={form.fullName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fullName: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Phone Number
              </label>
              <input
                className="input"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phoneNumber: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                PIN (4 digits)
              </label>
              <input
                className="input"
                type="password"
                maxLength={4}
                value={form.pin}
                onChange={(e) =>
                  setForm((p) => ({ ...p, pin: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Role
              </label>
              <select
                className="input"
                value={form.role}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    role: e.target.value,
                    facilityId: "",
                  }))
                }
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            {needsFacility && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Assigned Facility
                </label>
                <select
                  className="input"
                  value={form.facilityId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, facilityId: e.target.value }))
                  }
                >
                  <option value="">Select facility...</option>
                  {facilities?.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.facilityType?.replace("_", " ")}
                      {f.district
                        ? ` (${f.district.name})`
                        : f.ta
                          ? ` (${f.ta.name})`
                          : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              className="btn-primary"
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create User"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {["Name", "Phone", "Role", "Facility", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-12 text-gray-400 text-sm"
                >
                  Loading...
                </td>
              </tr>
            )}
            {data?.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {u.fullName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                  {u.phoneNumber}
                </td>
                <td className="px-4 py-3">
                  <span className={roleColor[u.role] ?? "badge-gray"}>
                    {u.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {(u as any).facility?.name || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={u.isActive ? "badge-green" : "badge-gray"}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <button
                      onClick={() => deactivateMutation.mutate(u.id)}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 transition-colors"
                    >
                      <UserX size={13} />
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => activateMutation.mutate(u.id)}
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 transition-colors"
                    >
                      <UserPlus size={13} />
                      Activate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
