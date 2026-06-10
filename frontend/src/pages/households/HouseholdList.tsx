import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Home, MapPin, Users } from "lucide-react";
import api from "../../services/api";
import type { Household, Pagination } from "../../types";

export default function HouseholdList() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{
    data: Household[];
    pagination: Pagination;
  }>({
    queryKey: ["households", search, page],
    queryFn: () =>
      api
        .get("/households", {
          params: { search: search || undefined, page, limit: 20 },
        })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const scoreColor = (h: Household) => {
    let s = 0;
    if (h.latrinePresent) s += 25;
    if (h.handwashingFacility) s += 25;
    if (["BOREHOLE", "PIPED", "PROTECTED_WELL"].includes(h.waterSource))
      s += 25;
    if (h.mosquitoNets === "Yes") s += 25;
    return s >= 75
      ? "text-green-600 bg-green-50"
      : s >= 50
        ? "text-yellow-600 bg-yellow-50"
        : "text-red-600 bg-red-50";
  };

  const score = (h: Household) => {
    let s = 0;
    if (h.latrinePresent) s += 25;
    if (h.handwashingFacility) s += 25;
    if (["BOREHOLE", "PIPED", "PROTECTED_WELL"].includes(h.waterSource))
      s += 25;
    if (h.mosquitoNets === "Yes") s += 25;
    return s;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="card p-4 flex items-center gap-3">
        <Search size={16} className="text-gray-400 shrink-0" />
        <input
          className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
          placeholder="Search by name, household ID, or village..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        {data?.pagination && (
          <span className="text-xs text-gray-400 shrink-0">
            {data.pagination.total} households
          </span>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {[
                "Household ID",
                "Head of Household",
                "Location",
                "Members",
                "Health Score",
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
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-12 text-gray-400 text-sm"
                >
                  No households found
                </td>
              </tr>
            )}
            {data?.data.map((h) => (
              <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-semibold text-teal-700">
                    {h.householdNumber || "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">
                    {h.headOfHouseholdName}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={12} />
                    {h.village?.name} · {h.village?.zone?.name}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-sm text-gray-700">
                    <Users size={14} className="text-gray-400" />
                    {h._count?.members ?? 0}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${scoreColor(h)}`}
                  >
                    {score(h)}/100
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`badge-${h.status === "ACTIVE" ? "green" : "gray"}`}
                  >
                    {h.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                className="btn-secondary text-xs px-3 py-1.5"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="btn-secondary text-xs px-3 py-1.5"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
