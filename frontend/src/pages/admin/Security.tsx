import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Clock,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import api from "../../services/api";

const fmt = (d: string) => (d ? new Date(d).toLocaleString("en-GB") : "—");

interface AdminUser {
  id: string;
  title?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role: string;
  isActive: boolean;
  facility?: { name: string } | null;
}

export default function Security() {
  const qc = useQueryClient();
  const [unlocking, setUnlocking] = useState<string | null>(null);

  // Super Admin → reset Admin Password state
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetResult, setResetResult] = useState<{
    name: string;
    isWebUser: boolean;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["security-alerts"],
    queryFn: () => api.get("/admin/security/alerts").then((r) => r.data.data),
    refetchInterval: 30000,
  });

  // Admins list — reuses the same /admin/users endpoint, filtered client-side.
  const { data: allUsers } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then((r) => r.data.data),
  });
  const admins = (allUsers || []).filter((u) => u.role === "ADMIN");

  const unlock = useMutation({
    mutationFn: (userId: string) =>
      api.patch(`/admin/security/unlock/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-alerts"] });
      setUnlocking(null);
    },
  });

  const resetPinMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/reset-pin`),
    onSuccess: (res) => {
      setResetResult({
        name: `${resetTarget?.title ? resetTarget.title + " " : ""}${resetTarget?.firstName} ${resetTarget?.lastName}`,
        isWebUser: res.data.data.isWebUser,
      });
      setResetTarget(null);
    },
    onError: () => setResetTarget(null),
  });

  const lockedUsers = data?.lockedUsers || [];
  const alerts = data?.alerts || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ShieldAlert size={24} className="text-red-600" />
          Security Center
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">
            Suspended Accounts
          </p>
          <p className="text-3xl font-bold text-red-700 mt-1">
            {lockedUsers.length}
          </p>
          <p className="text-xs text-red-500 mt-1">Require admin unlock</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide">
            Total Security Events
          </p>
          <p className="text-3xl font-bold text-orange-700 mt-1">
            {alerts.length}
          </p>
          <p className="text-xs text-orange-500 mt-1">Locks + unlocks logged</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">
            Unlocks Performed
          </p>
          <p className="text-3xl font-bold text-green-700 mt-1">
            {alerts.filter((a: any) => a.action === "ACCOUNT_UNLOCKED").length}
          </p>
          <p className="text-xs text-green-500 mt-1">By admins</p>
        </div>
      </div>

      {/* Suspended accounts */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          Suspended Accounts ({lockedUsers.length})
        </h3>

        {isLoading && (
          <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
        )}

        {!isLoading && lockedUsers.length === 0 && (
          <div className="flex flex-col items-center py-8 gap-2">
            <ShieldCheck size={40} className="text-green-400" />
            <p className="text-sm text-gray-400">No suspended accounts</p>
          </div>
        )}

        <div className="space-y-3">
          {lockedUsers.map((u: any) => {
            const name = u.firstName
              ? `${u.firstName} ${u.lastName}`
              : u.fullName || "Unknown";
            return (
              <div
                key={u.id}
                className="flex items-center justify-between border border-red-100 bg-red-50 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-bold">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{name}</p>
                    <p className="text-xs text-gray-500">
                      {u.phoneNumber} · {u.role}
                    </p>
                    <p className="text-xs text-gray-400">
                      {u.zoneAllocations
                        ?.map((z: any) => z.zone.name)
                        .join(", ") || "No zone"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUnlocking(u.id);
                    unlock.mutate(u.id);
                  }}
                  disabled={unlocking === u.id}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  <Unlock size={14} />
                  {unlocking === u.id ? "Unlocking..." : "Unlock"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin accounts — Super Admin resets Admin Passwords here */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <KeyRound size={16} className="text-teal-600" />
          Admin Accounts ({admins.length})
        </h3>

        {admins.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No admin accounts found
          </p>
        )}

        <div className="space-y-3">
          {admins.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between border border-gray-100 bg-gray-50 rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                  {a.firstName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    {a.title ? `${a.title} ` : ""}
                    {a.firstName} {a.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {a.phoneNumber} · {a.facility?.name || "No facility"}
                  </p>
                  <span
                    className={
                      a.isActive
                        ? "text-xs text-green-600 font-medium"
                        : "text-xs text-gray-400 font-medium"
                    }
                  >
                    {a.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setResetTarget(a)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <KeyRound size={14} />
                Reset Password
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm reset Password */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">Reset Admin Password?</h3>
            <p className="text-sm text-gray-600">
              This will generate a new temporary password and email it to{" "}
              <strong>
                {resetTarget.title ? `${resetTarget.title} ` : ""}
                {resetTarget.firstName} {resetTarget.lastName}
              </strong>
              .
            </p>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                onClick={() => resetPinMutation.mutate(resetTarget.id)}
                disabled={resetPinMutation.isPending}
              >
                {resetPinMutation.isPending
                  ? "Resetting..."
                  : "Yes, Reset Password"}
              </button>
              <button
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                onClick={() => setResetTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show Password Emailed Success */}
      {resetResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">Password Emailed</h3>
            <p className="text-sm text-gray-600">
              A temporary password has been sent to the email address for{" "}
              <strong>{resetResult.name}</strong>. They will be prompted to
              change it on their next login.
            </p>
            <button
              className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium"
              onClick={() => setResetResult(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Audit log */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Clock size={16} className="text-gray-500" />
          Security Audit Log
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Phone</th>
                <th className="text-center px-3 py-2">Event</th>
                <th className="text-left px-3 py-2">Details</th>
                <th className="text-left px-3 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a: any, i: number) => {
                const uName = a.user?.firstName
                  ? `${a.user.firstName} ${a.user.lastName}`
                  : a.user?.fullName || "—";
                return (
                  <tr
                    key={i}
                    className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                  >
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {uName}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {a.user?.phoneNumber || "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          a.action.includes("LOCKED")
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {a.action.includes("LOCKED") ? "Locked" : "Unlocked"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {a.newValue?.reason || a.newValue?.unlockedBy
                        ? "By admin"
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs">
                      {fmt(a.loggedAt)}
                    </td>
                  </tr>
                );
              })}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No security events recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
