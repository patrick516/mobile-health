import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Home,
  MapPin,
  Users,
  Eye,
  X,
  Phone,
  Droplets,
  ShieldCheck,
  Baby,
} from "lucide-react";
import api from "../../services/api";
import type { Household, Pagination } from "../../types";

export default function HouseholdList() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["household", selectedId],
    queryFn: () =>
      api.get(`/households/${selectedId}`).then((r) => r.data.data),
    enabled: !!selectedId,
  });

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <Home size={20} className="text-teal-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {data?.pagination?.total ?? 0}
            </p>
            <p className="text-xs text-gray-500">Total Households</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Users size={20} className="text-blue-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {data?.data?.reduce(
                (sum, h) => sum + (h._count?.members ?? 0),
                0,
              ) ?? 0}
            </p>
            <p className="text-xs text-gray-500">Total Members</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <div className="text-green-700 text-xl font-bold">✓</div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {data?.data?.filter((h) => score(h) >= 75).length ?? 0}
            </p>
            <p className="text-xs text-gray-500">Good Health Score</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <MapPin size={20} className="text-purple-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {new Set(data?.data?.map((h) => h.village?.name)).size ?? 0}
            </p>
            <p className="text-xs text-gray-500">Villages Covered</p>
          </div>
        </div>
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
                "Action",
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
                  colSpan={7}
                  className="text-center py-12 text-gray-400 text-sm"
                >
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-12 text-gray-400 text-sm"
                >
                  No households found
                </td>
              </tr>
            )}
            {data?.data.map((h) => (
              <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Home size={14} className="text-teal-500 shrink-0" />
                    <span className="font-mono text-sm font-semibold text-teal-700">
                      {h.householdNumber || "—"}
                    </span>
                  </div>
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
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedId(h.id)}
                    className="flex items-center gap-1 text-teal-600 hover:text-teal-800 text-xs font-medium transition-colors"
                  >
                    <Eye size={14} />
                    View
                  </button>
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

      {/* ── HOUSEHOLD DETAIL MODAL ── */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Home size={20} className="text-teal-700" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-lg">
                    {detailLoading ? "Loading..." : detail?.headOfHouseholdName}
                  </p>
                  <p className="text-xs text-teal-600 font-mono">
                    {detail?.householdNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {detailLoading && (
              <div className="flex items-center justify-center py-16 text-gray-400">
                Loading household details...
              </div>
            )}

            {detail && (
              <div className="p-6 space-y-6">
                {/* Location */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Village</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {detail.village?.name || "—"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Zone</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {detail.village?.zone?.name || "—"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">TA</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {detail.village?.zone?.ta?.name || "—"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">District</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {detail.village?.zone?.ta?.district?.name || "—"}
                    </p>
                  </div>
                </div>

                {/* Household Info */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Home size={15} className="text-teal-600" /> Household
                    Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-gray-400" />
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium">
                        {detail.headPhone || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Droplets size={14} className="text-blue-400" />
                      <span className="text-gray-500">Water:</span>
                      <span className="font-medium">{detail.waterSource}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <ShieldCheck size={14} className="text-green-500" />
                      <span className="text-gray-500">Latrine:</span>
                      <span className="font-medium">
                        {detail.latrinePresent
                          ? detail.latrineType || "Yes"
                          : "No"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Structure:</span>
                      <span className="font-medium">
                        {detail.structureType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Rooms:</span>
                      <span className="font-medium">
                        {detail.numberOfRooms || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Nets:</span>
                      <span className="font-medium">
                        {detail.mosquitoNets || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">
                        Distance to Facility:
                      </span>
                      <span className="font-medium">
                        {detail.distanceToFacility}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Handwashing:</span>
                      <span className="font-medium">
                        {detail.handwashingFacility ? "Yes" : "No"}
                      </span>
                    </div>
                    {detail.landmark && (
                      <div className="flex items-center gap-2 text-sm col-span-2">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="text-gray-500">Landmark:</span>
                        <span className="font-medium">{detail.landmark}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Members */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Users size={15} className="text-teal-600" />
                    Family Members ({detail.members?.length || 0})
                  </h3>
                  <div className="space-y-3">
                    {detail.members?.map((m: any) => (
                      <div
                        key={m.id}
                        className="border border-gray-100 rounded-xl p-4 hover:border-teal-200 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${m.sex === "FEMALE" ? "bg-pink-400" : "bg-blue-400"}`}
                            >
                              {m.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">
                                {m.fullName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {m.relationshipToHead} · {m.sex} ·{" "}
                                {m.dateOfBirth
                                  ? `${new Date().getFullYear() - new Date(m.dateOfBirth).getFullYear()} yrs`
                                  : m.estimatedAge
                                    ? `~${m.estimatedAge} yrs`
                                    : "Age unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {m.isPregnant && (
                              <span className="flex items-center gap-1 text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                                <Baby size={11} /> Pregnant
                              </span>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                            >
                              {m.status}
                            </span>
                          </div>
                        </div>

                        {/* Member health alerts */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.referrals?.filter((r: any) =>
                            ["PENDING", "OVERDUE"].includes(r.status),
                          ).length > 0 && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              ⚠{" "}
                              {
                                m.referrals.filter((r: any) =>
                                  ["PENDING", "OVERDUE"].includes(r.status),
                                ).length
                              }{" "}
                              Active Referral(s)
                            </span>
                          )}
                          {m.immunisationSchedules?.filter((i: any) =>
                            ["DUE", "OVERDUE"].includes(i.status),
                          ).length > 0 && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                              💉{" "}
                              {
                                m.immunisationSchedules.filter((i: any) =>
                                  ["DUE", "OVERDUE"].includes(i.status),
                                ).length
                              }{" "}
                              Vaccine(s) Due
                            </span>
                          )}
                          {m.ancVisits?.filter((a: any) =>
                            ["SCHEDULED", "OVERDUE"].includes(a.status),
                          ).length > 0 && (
                            <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                              🏥{" "}
                              {
                                m.ancVisits.filter((a: any) =>
                                  ["SCHEDULED", "OVERDUE"].includes(a.status),
                                ).length
                              }{" "}
                              ANC Visit(s)
                            </span>
                          )}
                          {m.visits?.[0] && (
                            <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                              Last visit:{" "}
                              {new Date(
                                m.visits[0].visitedAt,
                              ).toLocaleDateString("en-GB")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {detail.members?.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No members registered
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
