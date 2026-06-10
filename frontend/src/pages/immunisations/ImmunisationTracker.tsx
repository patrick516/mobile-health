import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, AlertTriangle } from "lucide-react";
import api from "../../services/api";
import type { ImmunisationSchedule } from "../../types";

export default function ImmunisationTracker() {
  const [filter, setFilter] = useState<string>("ALL");

  const { data, isLoading } = useQuery<ImmunisationSchedule[]>({
    queryKey: ["immunisations-due"],
    queryFn: () => api.get("/immunisations/due").then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const filtered =
    filter === "ALL" ? data : data?.filter((s) => s.status === filter);

  const counts = {
    OVERDUE: data?.filter((s) => s.status === "OVERDUE").length ?? 0,
    DUE: data?.filter((s) => s.status === "DUE").length ?? 0,
  };

  const statusStyle: Record<string, string> = {
    DUE: "badge-yellow",
    OVERDUE: "badge-red",
    GIVEN: "badge-green",
    MISSED: "badge-gray",
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Overdue",
            value: counts.OVERDUE,
            color: "bg-red-50 border-red-200",
            text: "text-red-700",
          },
          {
            label: "Due Soon",
            value: counts.DUE,
            color: "bg-yellow-50 border-yellow-200",
            text: "text-yellow-700",
          },
          {
            label: "Total Pending",
            value: data?.length ?? 0,
            color: "bg-gray-50 border-gray-200",
            text: "text-gray-700",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
            <p className={`text-sm ${s.text}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card p-1 flex gap-1 w-fit">
        {["ALL", "OVERDUE", "DUE"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
              filter === f
                ? "bg-teal-700 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {[
                "Child",
                "Household",
                "Vaccine",
                "Dose",
                "Due Date",
                "Status",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
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
            {!isLoading && filtered?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <Shield size={36} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No pending vaccines</p>
                </td>
              </tr>
            )}
            {filtered?.map((s) => (
              <tr
                key={s.id}
                className={`hover:bg-gray-50 ${s.status === "OVERDUE" ? "bg-red-50/30" : ""}`}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {s.member.fullName}
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs font-mono text-teal-700">
                    {s.member.household.householdNumber}
                  </p>
                  <p className="text-xs text-gray-400">
                    {s.member.household.village.name}
                  </p>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                  {s.vaccineCode}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  Dose {s.doseNumber}
                </td>
                <td className="px-4 py-3">
                  <p
                    className={`text-sm font-medium ${s.status === "OVERDUE" ? "text-red-600" : "text-yellow-600"}`}
                  >
                    {new Date(s.dueDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={statusStyle[s.status] ?? "badge-gray"}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
