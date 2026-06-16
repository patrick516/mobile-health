import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  ShieldCheck,
  Unlock,
  User,
  Clock,
  AlertTriangle,
} from "lucide-react";
import api from "../../services/api";

const fmt = (d: string) => (d ? new Date(d).toLocaleString("en-GB") : "—");

export default function Security() {
  const qc = useQueryClient();
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["security-alerts"],
    queryFn: () => api.get("/admin/security/alerts").then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const unlock = useMutation({
    mutationFn: (userId: string) =>
      api.patch(`/admin/security/unlock/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-alerts"] });
      setUnlocking(null);
    },
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
          {lockedUsers.map((u: any) => (
            <div
              key={u.id}
              className="flex items-center justify-between border border-red-100 bg-red-50 rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-bold">
                  {u.fullName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{u.fullName}</p>
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
          ))}
        </div>
      </div>

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
              {alerts.map((a: any, i: number) => (
                <tr
                  key={i}
                  className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                >
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {a.user?.fullName || "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">
                    {a.user?.phoneNumber || "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        a.action === "ACCOUNT_LOCKED"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {a.action === "ACCOUNT_LOCKED"
                        ? "🔒 Locked"
                        : "🔓 Unlocked"}
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
              ))}
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
