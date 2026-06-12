import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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

  const { data: symptomData } = useQuery({
    queryKey: ["symptom-trends", days],
    queryFn: () =>
      api
        .get("/analytics/symptom-trends", { params: { days } })
        .then((r) => r.data.data),
  });

  const { data: referralStats } = useQuery({
    queryKey: ["referral-stats", days],
    queryFn: () =>
      api
        .get("/analytics/referral-stats", { params: { days } })
        .then((r) => r.data),
  });

  const { data: muacData } = useQuery({
    queryKey: ["muac-trends", days],
    queryFn: () =>
      api
        .get("/analytics/muac-trends", { params: { days } })
        .then((r) => r.data.data),
  });

  const { data: immunisationData } = useQuery({
    queryKey: ["immunisation-coverage"],
    queryFn: () =>
      api.get("/analytics/immunisation-coverage").then((r) => r.data),
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
      {/* Visit trends chart */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">Visit Trends</h2>
        {trends && trends.length > 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              height: 220,
              padding: "0 8px",
              borderBottom: "1px solid #e2e8f0",
              borderLeft: "1px solid #e2e8f0",
            }}
          >
            {trends.map((d: any) => {
              const maxCount = Math.max(...trends.map((t: any) => t.count), 1);
              const heightPct = Math.max((d.count / maxCount) * 180, 24);
              return (
                <div
                  key={d.visitedAt}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "#0f766e",
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    {d.count}
                  </span>
                  <div
                    style={{
                      width: "70%",
                      height: heightPct,
                      backgroundColor: "#0f766e",
                      borderRadius: "4px 4px 0 0",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: "#6b7280",
                      marginTop: 6,
                      textAlign: "center",
                    }}
                  >
                    {new Date(d.visitedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            No visit data for this period
          </div>
        )}
      </div>

      {/* Line Chart Trends */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">
          Comparative Trends (7-Day Moving Average)
        </h2>
        {trends && trends.length > 0 ? (
          <div
            style={{
              position: "relative",
              height: 220,
              padding: "0 8px",
              borderBottom: "1px solid #e2e8f0",
              borderLeft: "1px solid #e2e8f0",
            }}
          >
            {/* Y axis labels */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 20,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {[
                Math.max(...trends.map((t: any) => t.count)),
                Math.round(Math.max(...trends.map((t: any) => t.count)) / 2),
                0,
              ].map((v) => (
                <span key={v} style={{ fontSize: 9, color: "#9ca3af" }}>
                  {v}
                </span>
              ))}
            </div>
            {/* Dots and line */}
            <svg width="100%" height="100%" style={{ overflow: "visible" }}>
              {trends.map((d: any, i: number) => {
                const maxCount = Math.max(
                  ...trends.map((t: any) => t.count),
                  1,
                );
                const x =
                  trends.length === 1 ? 50 : (i / (trends.length - 1)) * 100;
                const y = 100 - (d.count / maxCount) * 80;
                const next = trends[i + 1];
                const nx = next ? ((i + 1) / (trends.length - 1)) * 100 : null;
                const ny = next ? 100 - (next.count / maxCount) * 80 : null;
                return (
                  <g key={d.visitedAt}>
                    {nx !== null && (
                      <line
                        x1={`${x}%`}
                        y1={`${y}%`}
                        x2={`${nx}%`}
                        y2={`${ny}%`}
                        stroke="#0f766e"
                        strokeWidth={2}
                      />
                    )}
                    <circle cx={`${x}%`} cy={`${y}%`} r={5} fill="#0f766e" />
                    <text
                      x={`${x}%`}
                      y={`${y - 6}%`}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#0f766e"
                      fontWeight="bold"
                    >
                      {d.count}
                    </text>
                    <text
                      x={`${x}%`}
                      y="98%"
                      textAnchor="middle"
                      fontSize={9}
                      fill="#6b7280"
                    >
                      {new Date(d.visitedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            No trend data available for line chart
          </div>
        )}
      </div>

      {/* Symptom Trends */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">
          Top Symptoms This Period
        </h2>
        {symptomData && symptomData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={symptomData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="symptom"
                type="category"
                tick={{ fontSize: 11 }}
                width={120}
              />
              <Tooltip />
              <Bar
                dataKey="count"
                name="Cases"
                fill="#0f766e"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No symptom data for this period
          </div>
        )}
      </div>

      {/* Referral Completion Rate */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">
          Referral Completion Rate
        </h2>
        {referralStats?.data ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-teal-700">
                {referralStats.data.completionRate}%
              </span>
              <span className="text-sm text-gray-500">
                {referralStats.data.completed} of {referralStats.data.total}{" "}
                completed
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-teal-600 h-3 rounded-full transition-all"
                style={{ width: `${referralStats.data.completionRate}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              {[
                {
                  label: "Completed",
                  value: referralStats.data.completed,
                  color: "text-green-600",
                },
                {
                  label: "Missed",
                  value: referralStats.data.missed,
                  color: "text-red-600",
                },
                {
                  label: "Pending",
                  value: referralStats.data.pending,
                  color: "text-yellow-600",
                },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>
                    {s.value}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No referral data for this period
          </div>
        )}
      </div>

      {/* MUAC / Malnutrition */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">
          MUAC — Malnutrition Screening
        </h2>
        {muacData && muacData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={muacData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: any, _name: any, props: any) => [
                  `${value} (${props.payload.pct}%)`,
                  "Children",
                ]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {muacData.map((_entry: any, index: number) => (
                  <Cell
                    key={index}
                    fill={
                      index === 0
                        ? "#16a34a"
                        : index === 1
                          ? "#f59e0b"
                          : "#dc2626"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No MUAC data for this period
          </div>
        )}
      </div>

      {/* Immunisation Coverage */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">Immunisation Coverage</h2>
        {immunisationData?.data ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-teal-700">
                {immunisationData.coverageRate}%
              </span>
              <span className="text-sm text-gray-500">
                {immunisationData.total} total doses tracked
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-teal-600 h-3 rounded-full transition-all"
                style={{ width: `${immunisationData.coverageRate}%` }}
              />
            </div>
            <div className="grid grid-cols-4 gap-3 pt-2">
              {immunisationData.data.map((s: any) => (
                <div key={s.status} className="text-center">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: s.color }}
                  >
                    {s.count}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{s.status}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No immunisation data available
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
