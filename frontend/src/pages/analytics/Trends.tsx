import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import api from "../../services/api";

export default function Trends() {
  const [days, setDays] = useState(30);

  const { data: trends } = useQuery({
    queryKey: ["trends", days],
    queryFn: () =>
      api
        .get("/analytics/trends", { params: { days } })
        .then((r) => r.data.data),
  });

  const { data: chwData } = useQuery({
    queryKey: ["chw-activity"],
    queryFn: () => api.get("/analytics/chw-activity").then((r) => r.data.data),
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card p-4 flex items-center gap-4">
        <span className="text-sm text-gray-600 font-medium">Time range:</span>
        {[7, 14, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
              days === d
                ? "bg-teal-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Visit trends chart */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">Visit Trends</h2>
        {trends && trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="visitedAt"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })
                }
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                dataKey="_count"
                name="Visits"
                fill="#0f766e"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            No visit data for this period
          </div>
        )}
      </div>

      {/* CHW performance table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">CHW Performance</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {[
                "CHW Name",
                "Zone",
                "Visits This Week",
                "Pending Referrals",
                "Last Sync",
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
            {chwData?.map((chw: any) => (
              <tr key={chw.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {chw.fullName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {chw.zones.join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-teal-700">
                  {chw.visitsThisWeek}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {chw.pendingReferrals}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {chw.lastSyncAt
                    ? new Date(chw.lastSyncAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Never"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      chw.status === "ACTIVE"
                        ? "badge-green"
                        : chw.status === "UNSYNCED"
                          ? "badge-yellow"
                          : "badge-gray"
                    }
                  >
                    {chw.status}
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
