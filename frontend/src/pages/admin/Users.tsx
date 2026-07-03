import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, UserX, KeyRound, Copy, Check } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth.store";

import Select from "../../components/ui/Select";

interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  isActive: boolean;
}

// SUPER_ADMIN is not creatable from UI — only via seed/DB
const ROLES = ["CCW", "NURSE", "DISTRICT_OFFICER", "ADMIN"];

export default function Users() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phoneNumber: "",
    pin: "",
    role: "CCW",
    facilityId: "",
    regionId: "",
    districtId: "",
  });

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetResult, setResetResult] = useState<{
    fullName: string;
    tempPin: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState("");

  // Filters — Role, Facility, Status. All client-side since the full
  // user list is already loaded in one call.
  const [roleFilter, setRoleFilter] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination — client-side, fixed page size.
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data, isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then((r) => r.data.data),
  });

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: () => api.get("/geography/regions").then((r) => r.data.data),
  });

  const { data: districts } = useQuery({
    queryKey: ["user-districts", form.regionId],
    queryFn: () =>
      api
        .get(`/geography/districts?regionId=${form.regionId}`)
        .then((r) => r.data.data),
    enabled: !!form.regionId,
  });

  const { data: facilities } = useQuery({
    queryKey: ["user-facilities", form.districtId],
    queryFn: () =>
      api
        .get(`/admin/facilities?districtId=${form.districtId}`)
        .then((r) => r.data.data),
    enabled: !!form.districtId,
  });

  const needsFacility =
    ["NURSE", "DISTRICT_OFFICER"].includes(form.role) &&
    user?.role === "SUPER_ADMIN";
  const isMobileOnly = form.role === "CCW";

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
        regionId: "",
        districtId: "",
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

  const resetPinMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/reset-pin`),
    onSuccess: (res) => {
      setResetResult({
        fullName: resetTarget?.fullName || "",
        tempPin: res.data.data.tempPin,
      });
      setResetTarget(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to reset PIN.");
      setResetTarget(null);
    },
  });

  const roleColor: Record<string, string> = {
    ADMIN: "badge-red",
    DISTRICT_OFFICER: "badge-blue",
    NURSE: "badge-green",
    CCW: "badge-gray",
  };

  // Reset to page 1 any time a filter changes, so narrowing the list
  // never leaves you stranded on a now-empty page.
  const handleRoleFilter = (val: string) => {
    setRoleFilter(val);
    setPage(1);
  };
  const handleFacilityFilter = (val: string) => {
    setFacilityFilter(val);
    setPage(1);
  };
  const handleStatusFilter = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  // Facility options derived from whatever's actually loaded — no extra
  // API call. Sorted alphabetically, deduplicated by facility id.
  const facilityOptions = Array.from(
    new Map(
      (data || [])
        .map((u) => (u as any).facility)
        .filter(Boolean)
        .map((f: any) => [f.id, f]),
    ).values(),
  ).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const filteredUsers = (data || []).filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (facilityFilter && (u as any).facility?.id !== facilityFilter)
      return false;
    if (statusFilter === "active" && !u.isActive) return false;
    if (statusFilter === "inactive" && u.isActive) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

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
              <Select
                value={form.role}
                onChange={(val) =>
                  setForm((p) => ({
                    ...p,
                    role: val,
                    facilityId: "",
                  }))
                }
                placeholder="Select role..."
                options={ROLES.map((r) => ({
                  value: r,
                  label: r.replace("_", " "),
                }))}
              />
            </div>
            {isMobileOnly && (
              <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-sm text-amber-800 font-medium">
                  📱 CCW users are mobile-only. They log in via the mobile app
                  and are allocated to zones, not facilities.
                </p>
              </div>
            )}

            {needsFacility && (
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

                {form.districtId && (
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Facility
                    </label>
                    <Select
                      value={form.facilityId}
                      onChange={(val) =>
                        setForm((p) => ({ ...p, facilityId: val }))
                      }
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
                                label:
                                  "No facilities in this district — add one in Facilities first",
                                disabled: true,
                              },
                            ]
                      }
                    />
                  </div>
                )}
              </>
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

      {/* Confirm reset PIN */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">Reset PIN?</h3>
            <p className="text-sm text-gray-600">
              This will generate a new temporary PIN for{" "}
              <strong>{resetTarget.fullName}</strong>. Their current PIN will
              stop working immediately, and they'll be asked to create a new one
              the next time they log in.
            </p>
            <div className="flex gap-3">
              <button
                className="btn-primary"
                onClick={() => resetPinMutation.mutate(resetTarget.id)}
                disabled={resetPinMutation.isPending}
              >
                {resetPinMutation.isPending ? "Resetting..." : "Yes, Reset PIN"}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setResetTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show temp PIN once */}
      {resetResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">Temporary PIN Generated</h3>
            <p className="text-sm text-gray-600">
              Relay this PIN to <strong>{resetResult.fullName}</strong> now by
              phone or SMS. For security, it will not be shown again after you
              close this window.
            </p>
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <span className="text-2xl font-mono font-bold text-gray-900 tracking-widest">
                {resetResult.tempPin}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetResult.tempPin);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              className="btn-primary w-full"
              onClick={() => setResetResult(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
      {/* Filters */}
      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div className="w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Role
          </label>
          <Select
            value={roleFilter}
            onChange={handleRoleFilter}
            placeholder="All Roles"
            options={[
              { value: "", label: "All Roles" },
              ...ROLES.map((r) => ({ value: r, label: r.replace("_", " ") })),
            ]}
          />
        </div>

        <div className="w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Facility
          </label>
          <Select
            value={facilityFilter}
            onChange={handleFacilityFilter}
            placeholder="All Facilities"
            options={[
              { value: "", label: "All Facilities" },
              ...facilityOptions.map((f: any) => ({
                value: f.id,
                label: f.name,
              })),
            ]}
          />
        </div>

        <div className="w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Status
          </label>
          <Select
            value={statusFilter}
            onChange={handleStatusFilter}
            placeholder="All Statuses"
            options={[
              { value: "", label: "All Statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </div>

        {(roleFilter || facilityFilter || statusFilter) && (
          <button
            onClick={() => {
              setRoleFilter("");
              setFacilityFilter("");
              setStatusFilter("");
              setPage(1);
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}

        <p className="text-sm text-gray-400 ml-auto">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
        </p>
      </div>

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
                  colSpan={6}
                  className="text-center py-12 text-gray-400 text-sm"
                >
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && pagedUsers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-12 text-gray-400 text-sm"
                >
                  No users match these filters.
                </td>
              </tr>
            )}
            {pagedUsers.map((u) => (
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
                  <div className="flex items-center gap-3">
                    {u.role !== "SUPER_ADMIN" && (
                      <button
                        onClick={() => setResetTarget(u)}
                        className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors"
                      >
                        <KeyRound size={13} />
                        Reset PIN
                      </button>
                    )}
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredUsers.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
