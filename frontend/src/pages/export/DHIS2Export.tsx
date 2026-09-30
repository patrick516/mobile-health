import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, MapPin } from "lucide-react";
import api from "../../services/api";
import DatePicker from "../../components/ui/DatePicker";
import Select from "../../components/ui/Select";
import { useAuthStore } from "../../store/auth.store";

export default function DHIS2Export() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isAdmin = user?.role === "ADMIN";
  const isDistrictOfficer = user?.role === "DISTRICT_OFFICER";

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [regionId, setRegionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [taId, setTaId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: regions } = useQuery({
    queryKey: ["dhis-regions"],
    queryFn: () => api.get("/geography/regions").then((r) => r.data.data),
    enabled: isSuperAdmin,
  });

  const { data: districts } = useQuery({
    queryKey: ["dhis-districts", regionId],
    queryFn: () =>
      api
        .get(
          regionId
            ? `/geography/districts?regionId=${regionId}`
            : "/geography/districts",
        )
        .then((r) => r.data.data),
    enabled: isSuperAdmin,
  });

  const { data: tas } = useQuery({
    queryKey: ["dhis-tas", districtId],
    queryFn: () =>
      api
        .get(`/geography/tas?districtId=${districtId}`)
        .then((r) => r.data.data),
    enabled: isSuperAdmin && !!districtId,
  });

  const { data: zones } = useQuery({
    queryKey: ["dhis-zones", taId],
    queryFn: () =>
      api.get(`/geography/zones?taId=${taId}`).then((r) => r.data.data),
    enabled: isSuperAdmin && !!taId,
  });

  const handleExport = async () => {
    if (!from || !to)
      return setError("Please select both start and end dates.");
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = { from, to };
      if (isSuperAdmin) {
        if (regionId) params.regionId = regionId;
        if (districtId) params.districtId = districtId;
        if (taId) params.taId = taId;
        if (zoneId) params.zoneId = zoneId;
      }
      const res = await api.get("/export/dhis2", {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `dhis2_export_${from}_${to}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
            <FileText size={22} className="text-teal-700" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900">DHIS2 Data Export</h2>
            <p className="text-sm text-gray-500">
              Export visit data in DHIS2-compatible CSV format
            </p>
          </div>
        </div>

        {/* Scope banner */}
        {isAdmin && user?.facility && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5 flex items-center gap-3">
            <MapPin size={16} className="text-teal-700 shrink-0" />
            <p className="text-sm text-teal-800">
              Exporting data for <strong>{user.facility.name}</strong> only.
              Contact a SUPER_ADMIN for district or country-wide exports.
            </p>
          </div>
        )}
        {isDistrictOfficer && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5 flex items-center gap-3">
            <MapPin size={16} className="text-teal-700 shrink-0" />
            <p className="text-sm text-teal-800">
              Exporting data for your assigned district only.
            </p>
          </div>
        )}

        {isSuperAdmin && (
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Filter by location — leave blank for country-wide export
          </p>
        )}

        {/* ─── Filters: CSS Grid, cannot overflow ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
          {isSuperAdmin && (
            <>
              <div className="xl:col-span-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Region
                </label>
                <Select
                  value={regionId}
                  onChange={(val) => {
                    setRegionId(val);
                    setDistrictId("");
                    setTaId("");
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

              <div className="xl:col-span-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  District
                </label>
                <Select
                  value={districtId}
                  onChange={(val) => {
                    setDistrictId(val);
                    setTaId("");
                    setZoneId("");
                  }}
                  placeholder="All Districts"
                  options={[
                    { value: "", label: "All Districts" },
                    ...(districts || []).map((d: any) => ({
                      value: d.id,
                      label: d.name,
                    })),
                  ]}
                />
              </div>

              {districtId && (
                <div className="xl:col-span-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    TA
                  </label>
                  <Select
                    value={taId}
                    onChange={(val) => {
                      setTaId(val);
                      setZoneId("");
                    }}
                    placeholder="All TAs"
                    options={[
                      { value: "", label: "All TAs" },
                      ...(tas || []).map((t: any) => ({
                        value: t.id,
                        label: t.name,
                      })),
                    ]}
                  />
                </div>
              )}

              {taId && (
                <div className="xl:col-span-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Zone
                  </label>
                  <Select
                    value={zoneId}
                    onChange={setZoneId}
                    placeholder="All Zones"
                    options={[
                      { value: "", label: "All Zones" },
                      ...(zones || []).map((z: any) => ({
                        value: z.id,
                        label: z.name,
                      })),
                    ]}
                  />
                </div>
              )}
            </>
          )}

          <div className="xl:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              From Date
            </label>
            <DatePicker value={from} max={to || undefined} onChange={setFrom} />
          </div>

          <div className="xl:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              To Date
            </label>
            <DatePicker value={to} min={from || undefined} onChange={setTo} />
          </div>

          <div className="xl:col-span-1 flex xl:justify-end">
            <button
              onClick={handleExport}
              disabled={loading}
              className="btn-primary flex items-center gap-2 w-full xl:w-auto"
            >
              <Download size={16} />
              {loading ? "Generating..." : "Export CSV"}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
      </div>

      {/* Export contents */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Export includes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          {[
            "Visit date, type, and location (GPS)",
            "Patient name, sex, age",
            "District, TA, Zone, Village, Household number",
            "CHW name and their facility",
            "Symptoms and MUAC status",
            "Temperature readings",
            "Referral status",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
