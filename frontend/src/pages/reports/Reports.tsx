import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  FileSpreadsheet,
  Home,
  Stethoscope,
  Activity,
  Shield,
  Loader2,
} from "lucide-react";
import api from "../../services/api";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";

// ─── Types
type ReportType =
  | "households"
  | "referrals"
  | "visits"
  | "immunisations"
  | "anc"
  | "children-under-5";

interface SummaryBox {
  label: string;
  value: string | number;
  color?: string;
}

// ─── Helpers
const fmt = (d: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const REPORT_TYPES: {
  key: ReportType;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { key: "households", label: "Household Report", icon: Home, color: "teal" },
  {
    key: "referrals",
    label: "Referral Report",
    icon: Stethoscope,
    color: "orange",
  },
  { key: "visits", label: "Visit Report", icon: Activity, color: "blue" },
  {
    key: "immunisations",
    label: "Immunisation Report",
    icon: Shield,
    color: "purple",
  },
  { key: "anc", label: "Pregnant Women & ANC", icon: Activity, color: "pink" },
  {
    key: "children-under-5",
    label: "Children Under 5",
    icon: Shield,
    color: "green",
  },
];
// ─── Summary Card
function SummaryCard({ label, value, color }: SummaryBox) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-2xl font-bold ${color || "text-teal-700"}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Main Page
export default function Reports() {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [reportType, setReportType] = useState<ReportType>("referrals");
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [regionId, setRegionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: () => api.get("/geography/tree").then((r) => r.data.data),
  });
  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: () => api.get("/geography/districts").then((r) => r.data.data),
  });
  const { data: zones } = useQuery({
    queryKey: ["zones"],
    queryFn: () => api.get("/geography/zones").then((r) => r.data.data),
  });

  const filteredDistricts = districtId
    ? districts
    : regionId
      ? districts?.filter((d: any) => d.regionId === regionId)
      : districts;

  const filteredZones = zoneId
    ? zones
    : districtId
      ? zones?.filter((z: any) => z.ta?.districtId === districtId)
      : zones;
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  // Auto-load when type or date changes
  useEffect(() => {
    loadReport();
  }, [reportType, from, to, regionId, districtId, zoneId]);

  const loadReport = async () => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await api.get(`/reports/${reportType}`, {
        params: {
          from,
          to,
          ...(regionId ? { regionId } : {}),
          ...(districtId ? { districtId } : {}),
          ...(zoneId ? { zoneId } : {}),
        },
      });
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "excel" | "pdf") => {
    setExporting(format);
    try {
      const res = await api.get(`/reports/export/${format}`, {
        params: { type: reportType, from, to },
        responseType: "blob",
      });
      const ext = format === "excel" ? "xlsx" : "pdf";
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `mobilehealth_${reportType}_${today}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const current = REPORT_TYPES.find((r) => r.key === reportType)!;

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <current.icon size={24} className="text-teal-700" />
          {current.label}
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

      {/* Report type selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.key}
            onClick={() => setReportType(r.key)}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
              reportType === r.key
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-gray-200 bg-white text-gray-600 hover:border-teal-300"
            }`}
          >
            <r.icon size={20} />
            <span className="text-sm font-semibold">{r.label}</span>
          </button>
        ))}
      </div>

      {/* Filters + Export */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-4">
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            From Date
          </label>
          <DatePicker value={from} max={to} onChange={setFrom} />
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            To Date
          </label>
          <DatePicker value={to} min={from} max={today} onChange={setTo} />
        </div>

        <div className="w-44">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Region
          </label>
          <Select
            value={regionId}
            onChange={(val) => {
              setRegionId(val);
              setDistrictId("");
              setZoneId("");
            }}
            placeholder="All Regions"
            options={[
              { value: "", label: "All Regions" },
              ...(regions || []).map((r: any) => ({
                value: r.id,
                label: r.name,
              })),
            ]}
          />
        </div>
        <div className="w-44">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            District
          </label>
          <Select
            value={districtId}
            onChange={(val) => {
              setDistrictId(val);
              setZoneId("");
            }}
            placeholder="All Districts"
            options={[
              { value: "", label: "All Districts" },
              ...(filteredDistricts || []).map((d: any) => ({
                value: d.id,
                label: d.name,
              })),
            ]}
          />
        </div>
        <div className="w-44">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Zone
          </label>
          <Select
            value={zoneId}
            onChange={(val) => setZoneId(val)}
            placeholder="All Zones"
            options={[
              { value: "", label: "All Zones" },
              ...(filteredZones || []).map((z: any) => ({
                value: z.id,
                label: z.name,
              })),
            ]}
          />
        </div>

        <div className="flex-1" />

        {/* Export buttons */}
        <button
          onClick={() => handleExport("excel")}
          disabled={!!exporting || loading || !data}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {exporting === "excel" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={15} />
          )}
          Export Excel
        </button>
        <button
          onClick={() => handleExport("pdf")}
          disabled={!!exporting || loading || !data}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {exporting === "pdf" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Download size={15} />
          )}
          Export PDF
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-teal-600" />
          <span className="ml-3 text-gray-500">Loading report...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ── REFERRAL REPORT ── */}
      {!loading && data && reportType === "referrals" && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard
              label="Total Referrals"
              value={data.summary?.total ?? 0}
              color="text-teal-700"
            />
            <SummaryCard
              label="Completed"
              value={data.summary?.completed ?? 0}
              color="text-green-600"
            />
            <SummaryCard
              label="Missed"
              value={data.summary?.missed ?? 0}
              color="text-red-600"
            />
            <SummaryCard
              label="Pending"
              value={data.summary?.pending ?? 0}
              color="text-yellow-600"
            />
            <SummaryCard
              label="Completion Rate"
              value={`${data.summary?.completionRate ?? 0}%`}
              color="text-teal-700"
            />
          </div>

          {/* CHW Breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              CHW Performance
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="text-left py-2">CHW Name</th>
                  <th className="text-center py-2">Total</th>
                  <th className="text-center py-2">Completed</th>
                  <th className="text-center py-2">Missed</th>
                  <th className="text-center py-2">Pending</th>
                </tr>
              </thead>
              <tbody>
                {(data.chwBreakdown || []).map((c: any, i: number) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="py-2 font-medium text-gray-800">{c.name}</td>
                    <td className="py-2 text-center font-bold text-teal-700">
                      {c.total}
                    </td>
                    <td className="py-2 text-center text-green-600">
                      {c.completed}
                    </td>
                    <td className="py-2 text-center text-red-500">
                      {c.missed}
                    </td>
                    <td className="py-2 text-center text-yellow-600">
                      {c.pending}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Village Breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              Referrals by Village
            </h3>
            <div className="flex flex-wrap gap-2">
              {(data.villageBreakdown || []).map((v: any, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-teal-50 text-teal-800 rounded-full text-xs font-medium"
                >
                  {v.village}: <strong>{v.count}</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Referral Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              All Referrals ({data.data.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-3 py-2">Patient</th>
                    <th className="text-left px-3 py-2">Village</th>
                    <th className="text-left px-3 py-2">CHW</th>
                    <th className="text-left px-3 py-2">Reason</th>
                    <th className="text-center px-3 py-2">Urgency</th>
                    <th className="text-center px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Referred On</th>
                    <th className="text-left px-3 py-2">Due By</th>
                    <th className="text-left px-3 py-2">Diagnosis</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data || []).map((r: any, i: number) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-50 hover:bg-teal-50/30 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                    >
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {r.member?.fullName || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {r.member?.household?.village?.name || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {r.referringUser?.fullName || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">
                        {r.reason}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            r.urgency === "EMERGENCY"
                              ? "bg-red-100 text-red-700"
                              : r.urgency === "URGENT"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {r.urgency}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            ["TREATED", "COMPLETED"].includes(r.status)
                              ? "bg-green-100 text-green-700"
                              : r.status === "MISSED"
                                ? "bg-red-100 text-red-700"
                                : r.status === "ARRIVED"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {fmt(r.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {fmt(r.dueBy)}
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">
                        {r.diagnosis || "—"}
                      </td>
                    </tr>
                  ))}
                  {data.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-8 text-gray-400"
                      >
                        No referrals in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── HOUSEHOLD REPORT ── */}
      {!loading && data && reportType === "households" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Total Households"
              value={data.summary.total}
              color="text-teal-700"
            />
            <SummaryCard
              label="Total Members"
              value={data.summary.totalMembers}
              color="text-blue-600"
            />
            <SummaryCard
              label="Active Households"
              value={data.summary.activeHouseholds}
              color="text-green-600"
            />
            <SummaryCard
              label="Villages Covered"
              value={data.summary.villages}
              color="text-purple-600"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              Households ({data.data.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-3 py-2">Household ID</th>
                    <th className="text-left px-3 py-2">Head of Household</th>
                    <th className="text-left px-3 py-2">Village</th>
                    <th className="text-left px-3 py-2">Zone</th>
                    <th className="text-center px-3 py-2">Members</th>
                    <th className="text-left px-3 py-2">Water Source</th>
                    <th className="text-center px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Registered By</th>
                    <th className="text-left px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data || []).map((h: any, i: number) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-50 hover:bg-teal-50/30 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                    >
                      <td className="px-3 py-2 font-mono text-teal-700 font-semibold text-xs">
                        {h.householdNumber}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {h.headOfHouseholdName}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {h.village?.name || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {h.village?.zone?.name || "—"}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-teal-700">
                        {h.members?.length || 0}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {h.waterSource}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${h.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {h.registeredBy?.fullName || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {fmt(h.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {data.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-8 text-gray-400"
                      >
                        No households in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── VISIT REPORT ── */}
      {!loading && data && reportType === "visits" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Total Visits"
              value={data.summary.total}
              color="text-teal-700"
            />
            <SummaryCard
              label="With Referral"
              value={data.summary.withReferral}
              color="text-orange-600"
            />
            <SummaryCard
              label="Routine Visits"
              value={data.summary.byType?.ROUTINE ?? 0}
              color="text-green-600"
            />
            <SummaryCard
              label="Sick Visits"
              value={data.summary.byType?.SICK ?? 0}
              color="text-red-600"
            />
          </div>

          {/* Top Symptoms */}
          {data.topSymptoms && data.topSymptoms.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">
                Top Symptoms
              </h3>
              <div className="flex flex-wrap gap-2">
                {(data.topSymptoms || []).map((s: any, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-medium"
                  >
                    {s.symptom}: <strong>{s.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              Visits ({data.data.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-3 py-2">Patient</th>
                    <th className="text-left px-3 py-2">Village</th>
                    <th className="text-left px-3 py-2">CHW</th>
                    <th className="text-center px-3 py-2">Type</th>
                    <th className="text-center px-3 py-2">Temp °C</th>
                    <th className="text-center px-3 py-2">MUAC</th>
                    <th className="text-left px-3 py-2">Symptoms</th>
                    <th className="text-center px-3 py-2">Referral</th>
                    <th className="text-left px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data || []).map((v: any, i: number) => {
                    const symptoms = v.symptoms
                      ? (typeof v.symptoms === "string"
                          ? JSON.parse(v.symptoms)
                          : v.symptoms
                        ).join(", ")
                      : "—";
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-50 hover:bg-blue-50/30 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                      >
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {v.member?.fullName || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {v.member?.household?.village?.name || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {v.chw?.fullName || "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {v.visitType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">
                          {v.temperature || "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`text-xs font-semibold ${v.muacStatus === "SEVERE_MALNUTRITION" ? "text-red-600" : v.muacStatus === "MODERATE_MALNUTRITION" ? "text-yellow-600" : "text-green-600"}`}
                          >
                            {v.muacMm ? `${v.muacMm}mm` : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate">
                          {symptoms}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {v.referralNeeded ? (
                            <span className="text-orange-600 font-semibold text-xs">
                              Yes
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {fmt(v.visitedAt)}
                        </td>
                      </tr>
                    );
                  })}
                  {data.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-8 text-gray-400"
                      >
                        No visits in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── IMMUNISATION REPORT ── */}
      {!loading && data && reportType === "immunisations" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Total Scheduled"
              value={data.summary.total}
              color="text-teal-700"
            />
            <SummaryCard
              label="Given"
              value={data.summary.given}
              color="text-green-600"
            />
            <SummaryCard
              label="Overdue"
              value={data.summary.overdue}
              color="text-red-600"
            />
            <SummaryCard
              label="Coverage Rate"
              value={`${data.summary.coverageRate}%`}
              color="text-teal-700"
            />
          </div>

          {/* Vaccine breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              Per Vaccine Breakdown
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="text-left py-2">Vaccine</th>
                  <th className="text-center py-2">Given</th>
                  <th className="text-center py-2">Due</th>
                  <th className="text-center py-2">Overdue</th>
                  <th className="text-center py-2">Missed</th>
                </tr>
              </thead>
              <tbody>
                {(data.vaccineBreakdown ?? []).map((v: any, i: number) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="py-2 font-semibold text-purple-700">
                      {v.vaccine}
                    </td>
                    <td className="py-2 text-center text-green-600 font-bold">
                      {v.given || 0}
                    </td>
                    <td className="py-2 text-center text-yellow-600">
                      {v.due || 0}
                    </td>
                    <td className="py-2 text-center text-red-500">
                      {v.overdue || 0}
                    </td>
                    <td className="py-2 text-center text-gray-400">
                      {v.missed || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              Schedule Details ({data.data.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-3 py-2">Child</th>
                    <th className="text-left px-3 py-2">Village</th>
                    <th className="text-left px-3 py-2">Household</th>
                    <th className="text-center px-3 py-2">Vaccine</th>
                    <th className="text-center px-3 py-2">Dose</th>
                    <th className="text-left px-3 py-2">Due Date</th>
                    <th className="text-center px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Given On</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data ?? []).map((s: any, i: number) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-50 hover:bg-purple-50/30 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                    >
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {s.member?.fullName || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {s.member?.household?.village?.name || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs font-mono">
                        {s.member?.household?.householdNumber || "—"}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-purple-700">
                        {s.vaccineCode}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">
                        Dose {s.doseNumber}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {fmt(s.dueDate)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            s.status === "GIVEN"
                              ? "bg-green-100 text-green-700"
                              : s.status === "OVERDUE"
                                ? "bg-red-100 text-red-700"
                                : s.status === "MISSED"
                                  ? "bg-gray-100 text-gray-600"
                                  : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {fmt(s.givenAt)}
                      </td>
                    </tr>
                  ))}
                  {data.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-8 text-gray-400"
                      >
                        No immunisation records in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ANC / PREGNANT WOMEN REPORT ── */}
      {!loading && data && reportType === "anc" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard
              label="Pregnant Women"
              value={data.summary?.total ?? 0}
              color="text-pink-600"
            />
            <SummaryCard
              label="Total ANC Visits"
              value={data.summary?.totalAncVisits ?? 0}
              color="text-teal-700"
            />
            <SummaryCard
              label="Attended"
              value={data.summary?.attended ?? 0}
              color="text-green-600"
            />
            <SummaryCard
              label="Overdue / Missed"
              value={data.summary?.overdue ?? 0}
              color="text-red-600"
            />
            <SummaryCard
              label="Scheduled"
              value={data.summary?.scheduled ?? 0}
              color="text-yellow-600"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              Pregnant Women ({data.data.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Village</th>
                    <th className="text-left px-3 py-2">Zone</th>
                    <th className="text-left px-3 py-2">LMP</th>
                    <th className="text-left px-3 py-2">Expected Delivery</th>
                    <th className="text-center px-3 py-2">ANC 1</th>
                    <th className="text-center px-3 py-2">ANC 2</th>
                    <th className="text-center px-3 py-2">ANC 3</th>
                    <th className="text-center px-3 py-2">ANC 4</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data ?? []).map((m: any, i: number) => {
                    const ancByNum: Record<number, any> = {};
                    m.ancVisits?.forEach((a: any) => {
                      ancByNum[a.ancNumber] = a;
                    });
                    const ancBadge = (num: number) => {
                      const a = ancByNum[num];
                      if (!a) return <span className="text-gray-300">—</span>;
                      const color =
                        a.status === "ATTENDED"
                          ? "bg-green-100 text-green-700"
                          : a.status === "OVERDUE" || a.status === "MISSED"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700";
                      return (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}
                        >
                          {a.status}
                        </span>
                      );
                    };
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-50 hover:bg-pink-50/30 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                      >
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {m.fullName}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {m.household?.village?.name || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {m.household?.village?.zone?.name || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {fmt(m.lmpDate)}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {fmt(m.expectedDeliveryDate)}
                        </td>
                        <td className="px-3 py-2 text-center">{ancBadge(1)}</td>
                        <td className="px-3 py-2 text-center">{ancBadge(2)}</td>
                        <td className="px-3 py-2 text-center">{ancBadge(3)}</td>
                        <td className="px-3 py-2 text-center">{ancBadge(4)}</td>
                      </tr>
                    );
                  })}
                  {data.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-8 text-gray-400"
                      >
                        No pregnant women in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CHILDREN UNDER 5 REPORT ── */}
      {!loading && data && reportType === "children-under-5" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Children Under 5"
              value={data.summary?.total ?? 0}
              color="text-teal-700"
            />
            <SummaryCard
              label="Vaccines Given"
              value={data.summary?.given ?? 0}
              color="text-green-600"
            />
            <SummaryCard
              label="Overdue Vaccines"
              value={data.summary?.overdue ?? 0}
              color="text-red-600"
            />
            <SummaryCard
              label="Coverage Rate"
              value={`${data.summary?.coverageRate ?? 0}%`}
              color="text-teal-700"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              Children Under 5 ({data.data.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Village</th>
                    <th className="text-left px-3 py-2">Zone</th>
                    <th className="text-left px-3 py-2">District</th>
                    <th className="text-center px-3 py-2">Age</th>
                    <th className="text-center px-3 py-2">Sex</th>
                    <th className="text-center px-3 py-2">Vaccines Given</th>
                    <th className="text-center px-3 py-2">Overdue</th>
                    <th className="text-center px-3 py-2">Due</th>
                    <th className="text-left px-3 py-2">Household</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data ?? []).map((m: any, i: number) => {
                    const schedules = m.immunisationSchedules ?? [];
                    const given = schedules.filter(
                      (s: any) => s.status === "GIVEN",
                    ).length;
                    const overdue = schedules.filter(
                      (s: any) => s.status === "OVERDUE",
                    ).length;
                    const due = schedules.filter(
                      (s: any) => s.status === "DUE",
                    ).length;
                    const age =
                      m.estimatedAge ||
                      (m.dateOfBirth
                        ? Math.floor(
                            (Date.now() - new Date(m.dateOfBirth).getTime()) /
                              (1000 * 60 * 60 * 24 * 365),
                          )
                        : "?");
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-50 hover:bg-green-50/30 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                      >
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {m.fullName}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {m.household?.village?.name || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {m.household?.village?.zone?.name || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {m.household?.village?.zone?.ta?.district?.name ||
                            "—"}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">
                          {age}y
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">
                          {m.sex}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-green-600">
                          {given}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-red-600">
                          {overdue}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-yellow-600">
                          {due}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono text-teal-700">
                          {m.household?.householdNumber || "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {data.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-8 text-gray-400"
                      >
                        No children under 5 in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
