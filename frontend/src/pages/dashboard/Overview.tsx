import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  FlaskConical,
  Shield,
  Heart,
  TrendingUp,
  Clock,
  ShieldAlert,
  MapPin,
} from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth.store";
import type { OverviewStats, ChwActivity, MapEvent } from "../../types";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const DOT_COLOR = {
  green: "#16a34a",
  yellow: "#d97706",
  red: "#dc2626",
  blue: "#2563eb",
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}
      >
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function Overview() {
  const scopeLevel = useAuthStore((s) => s.scopeLevel());
  const [taId, setTaId] = useState("");

  const { data: myTAs } = useQuery({
    queryKey: ["my-tas"],
    queryFn: () => api.get("/geography/my-tas").then((r) => r.data.data),
    enabled: scopeLevel === "DISTRICT",
  });

  const { data: stats } = useQuery<OverviewStats>({
    queryKey: ["overview", taId],
    queryFn: () =>
      api
        .get("/analytics/overview", { params: taId ? { taId } : {} })
        .then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: chwData } = useQuery<ChwActivity[]>({
    queryKey: ["chw-activity", taId],
    queryFn: () =>
      api
        .get("/analytics/chw-activity", { params: taId ? { taId } : {} })
        .then((r) => r.data.data),
  });

  const { data: mapData } = useQuery<MapEvent[]>({
    queryKey: ["map-events", taId],
    queryFn: () =>
      api
        .get("/map/events", { params: taId ? { taId } : {} })
        .then((r) => r.data.data),
  });
  const unsynced = chwData?.filter((c) => c.status !== "ACTIVE") || [];

  const { data: outbreakData } = useQuery({
    queryKey: ["outbreak-alerts"],
    queryFn: () => api.get("/visits/outbreak-alerts").then((r) => r.data.data),
    refetchInterval: 60000,
  });
  const activeOutbreaks = outbreakData ?? [];

  const { data: securityData } = useQuery({
    queryKey: ["security-alerts"],
    queryFn: () => api.get("/admin/security/alerts").then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const lockedUsers = securityData?.lockedUsers || [];

  return (
    <div className="space-y-6">
      {/* District-wide TA filter — only for District Hospital users */}
      {scopeLevel === "DISTRICT" && (
        <div className="card p-4 flex items-center gap-3">
          <MapPin size={18} className="text-teal-700" />
          <span className="text-sm font-medium text-gray-700">Viewing:</span>
          <select
            className="input max-w-xs"
            value={taId}
            onChange={(e) => setTaId(e.target.value)}
          >
            <option value="">All TAs in District (combined)</option>
            {myTAs?.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Outbreak alert banner */}
      {activeOutbreaks.length > 0 && (
        <div className="bg-red-100 border border-red-400 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-700 shrink-0" />
            <p className="text-sm font-bold text-red-800">
              🚨 {activeOutbreaks.length} Active Outbreak Alert
              {activeOutbreaks.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="space-y-1">
            {activeOutbreaks.map((alert: any) => (
              <div
                key={alert.id}
                className="flex items-center justify-between text-xs text-red-700 bg-white rounded-lg px-3 py-2 border border-red-200"
              >
                <span>
                  <strong>{alert.symptom}</strong> — {alert.caseCount} cases in{" "}
                  <strong>{alert.village?.name}</strong> (
                  {alert.village?.zone?.ta?.name},{" "}
                  {alert.village?.zone?.ta?.district?.name})
                </span>
                <span className="text-red-400 ml-2">
                  {new Date(alert.createdAt).toLocaleDateString("en-GB")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert banner */}
      {/* Security alert banner */}
      {lockedUsers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} className="text-red-600 shrink-0" />
            <p className="text-sm text-red-800 font-medium">
              🔴 {lockedUsers.length} account{lockedUsers.length > 1 ? "s" : ""}{" "}
              suspended due to failed login attempts —{" "}
              {lockedUsers.map((u: any) => u.fullName).join(", ")}
            </p>
          </div>
          <a
            href="/admin/security"
            className="text-xs text-red-700 font-semibold underline shrink-0"
          >
            View &amp; Unlock →
          </a>
        </div>
      )}

      {/* Sync alert banner */}
      {unsynced.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {unsynced.length} CHW{unsynced.length > 1 ? "s" : ""} have not
            synced in the last 48 hours
          </p>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Visits This Week"
          value={stats?.totalVisitsWeek ?? 0}
          color="bg-teal-700"
        />
        <StatCard
          icon={AlertTriangle}
          label="Active Referrals"
          value={stats?.activeReferrals ?? 0}
          color="bg-yellow-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Missed Referrals"
          value={stats?.missedReferrals ?? 0}
          color="bg-red-500"
        />
        <StatCard
          icon={FlaskConical}
          label="Low Drug Stock"
          value={stats?.drugsLowStock ?? 0}
          color="bg-orange-500"
        />
        <StatCard
          icon={Shield}
          label="Vaccines Due"
          value={stats?.vaccinesDue ?? 0}
          color="bg-purple-600"
        />
        <StatCard
          icon={Heart}
          label="ANC Overdue"
          value={stats?.ancOverdue ?? 0}
          color="bg-pink-600"
        />
      </div>

      {/* Additional Stats Row - Using Users and Clock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-4 bg-gradient-to-r from-blue-50 to-white">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-600">
            <Users size={22} className="text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {chwData?.length ?? 0}
            </p>
            <p className="text-sm text-gray-500">Total CHWs</p>
            <p className="text-xs text-gray-400 mt-1">
              Community Health Workers
            </p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4 bg-gradient-to-r from-teal-50 to-white">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-teal-600">
            <Clock size={22} className="text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {new Date().toLocaleTimeString()}
            </p>
            <p className="text-sm text-gray-500">Current Time</p>
            <p className="text-xs text-gray-400 mt-1">Dashboard refreshed</p>
          </div>
        </div>
      </div>
      {/* Map + CHW table */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Map */}
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Visit & Household Map</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {[
                ["green", "Routine"],
                ["yellow", "Referral"],
                ["red", "Emergency"],
                ["blue", "Household"],
              ].map(([c, l]) => (
                <span key={c} className="flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{
                      backgroundColor: DOT_COLOR[c as keyof typeof DOT_COLOR],
                    }}
                  />
                  {l}
                </span>
              ))}
            </div>
          </div>
          <div className="h-96">
            <MapContainer
              center={[-13.9626, 33.7741]}
              zoom={7}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />
              {mapData?.map((ev) => (
                <CircleMarker
                  key={ev.id}
                  center={[ev.lat, ev.lng]}
                  radius={ev.type === "household" ? 6 : 5}
                  pathOptions={{
                    fillColor: DOT_COLOR[ev.colour],
                    fillOpacity: 0.8,
                    color: DOT_COLOR[ev.colour],
                    weight: 1,
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <p className="font-semibold">{ev.label}</p>
                      <p className="text-gray-500 capitalize">{ev.type}</p>
                      {ev.timestamp && (
                        <p className="text-gray-400">
                          {new Date(ev.timestamp).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* CHW Activity */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">CHW Activity</h2>
          </div>
          <div className="divide-y divide-gray-50 overflow-y-auto max-h-96">
            {chwData?.length === 0 && (
              <p className="text-sm text-gray-400 p-5 text-center">
                No CHW data
              </p>
            )}
            {chwData?.map((chw) => (
              <div
                key={chw.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      chw.status === "ACTIVE"
                        ? "bg-green-500"
                        : chw.status === "UNSYNCED"
                          ? "bg-yellow-400"
                          : "bg-gray-300"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {chw.fullName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {chw.zones.join(", ")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-teal-700">
                    {chw.visitsThisWeek}
                  </p>
                  <p className="text-xs text-gray-400">visits</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
