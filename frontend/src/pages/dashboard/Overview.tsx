import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  FlaskConical,
  Shield,
  Heart,
  TrendingUp,
  ShieldAlert,
  MapPin,
  Building2,
  Pill,
  Stethoscope,
  HeartHandshake,
  MessageSquare,
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

function StatCard({ icon: Icon, label, value, color, to }: any) {
  return (
    <Link
      to={to || "#"}
      className="card p-5 flex items-center gap-4 hover:shadow-md hover:border-teal-200 transition-all cursor-pointer"
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} shrink-0`}
      >
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </Link>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const scopeLevel = useAuthStore((s) => s.scopeLevel());
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isPharmacist = user?.role === "PHARMACIST";
  const [taId, setTaId] = useState("");

  // Redirect Pharmacist to their dedicated operational dashboard
  useEffect(() => {
    if (isPharmacist) {
      navigate("/pharmacy", { replace: true });
    }
  }, [isPharmacist, navigate]);

  // ── SHARED QUERIES ──
  const { data: chwData } = useQuery<ChwActivity[]>({
    queryKey: ["chw-activity", taId],
    queryFn: () =>
      api
        .get("/analytics/chw-activity", { params: taId ? { taId } : {} })
        .then((r) => r.data.data),
    enabled: !isPharmacist,
  });

  const { data: securityData } = useQuery({
    queryKey: ["security-alerts"],
    queryFn: () => api.get("/admin/security/alerts").then((r) => r.data.data),
    enabled: isSuperAdmin === true,
    retry: false,
  });

  const lockedUsers = securityData?.lockedUsers || [];
  const unsynced = chwData?.filter((c) => c.status !== "ACTIVE") || [];

  // ── SYSTEM QUERIES (SUPER ADMIN ONLY) ──
  const { data: allUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then((r) => r.data.data),
    enabled: isSuperAdmin,
  });

  const { data: facilities } = useQuery({
    queryKey: ["admin-facilities"],
    queryFn: () => api.get("/admin/facilities").then((r) => r.data.data),
    enabled: isSuperAdmin,
  });

  // ── CLINICAL QUERIES (HIDDEN FROM SUPER ADMIN & PHARMACIST) ──
  const { data: myTAs } = useQuery({
    queryKey: ["my-tas"],
    queryFn: () => api.get("/geography/my-tas").then((r) => r.data.data),
    enabled: scopeLevel === "DISTRICT" && !isSuperAdmin && !isPharmacist,
  });

  const { data: stats } = useQuery<OverviewStats>({
    queryKey: ["overview", taId],
    queryFn: () =>
      api
        .get("/analytics/overview", { params: taId ? { taId } : {} })
        .then((r) => r.data.data),
    enabled: !isSuperAdmin && !isPharmacist,
    refetchInterval: 30000,
  });

  const { data: mapData } = useQuery<MapEvent[]>({
    queryKey: ["map-events", taId],
    queryFn: () =>
      api
        .get("/map/events", { params: taId ? { taId } : {} })
        .then((r) => r.data.data),
    enabled: !isSuperAdmin && !isPharmacist,
  });

  const { data: outbreakData } = useQuery({
    queryKey: ["outbreak-alerts"],
    queryFn: () => api.get("/visits/outbreak-alerts").then((r) => r.data.data),
    enabled: !isSuperAdmin && !isPharmacist,
    refetchInterval: 60000,
  });
  const activeOutbreaks = outbreakData ?? [];

  // ─────────────────────────────────────────────────────────
  // ── RENDER: SUPER ADMIN DASHBOARD (SYSTEM LEVEL) ──
  // ─────────────────────────────────────────────────────────
  if (isSuperAdmin) {
    const totalUsers = allUsers?.length || 0;
    const totalCCWs =
      allUsers?.filter((u: any) => u.role === "CCW").length || 0;
    const totalFacilities = facilities?.length || 0;
    const unsyncedCHWs =
      chwData?.filter((c) => c.status !== "ACTIVE").length || 0;

    return (
      <div className="space-y-6">
        <div className="bg-teal-800 text-white p-6 rounded-xl shadow-md">
          <h1 className="text-2xl font-bold mb-2">System Administration</h1>
          <p className="text-teal-100">
            Manage national users, facilities, and system security.
          </p>
        </div>

        {lockedUsers.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert size={18} className="text-red-600 shrink-0" />
              <p className="text-sm text-red-800 font-medium">
                {lockedUsers.length} account{lockedUsers.length > 1 ? "s" : ""}{" "}
                suspended due to failed login attempts.
              </p>
            </div>
            <Link
              to="/admin/security"
              className="text-xs text-red-700 font-semibold underline shrink-0"
            >
              View & Unlock
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total System Users"
            value={totalUsers}
            color="bg-blue-600"
            to="/admin/users"
          />
          <StatCard
            icon={MapPin}
            label="Community Health Workers"
            value={totalCCWs}
            color="bg-teal-600"
            to="/admin/users"
          />
          <StatCard
            icon={Building2}
            label="Registered Facilities"
            value={totalFacilities}
            color="bg-purple-600"
            to="/admin/facilities"
          />
          <StatCard
            icon={AlertTriangle}
            label="Unsynced CHWs (48h+)"
            value={unsyncedCHWs}
            color="bg-orange-500"
            to="/admin/users"
          />
        </div>

        <div className="card mt-6">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-900">
              Recent CHW System Activity
            </h2>
            <Link
              to="/admin/users"
              className="text-xs text-teal-600 hover:underline"
            >
              Manage Users
            </Link>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {chwData?.length === 0 && (
              <p className="p-5 text-sm text-gray-400">No CHW data available</p>
            )}
            {chwData?.map((chw: any) => {
              const chwName = chw.firstName
                ? `${chw.firstName} ${chw.lastName}`
                : chw.fullName;
              return (
                <div
                  key={chw.id}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {chwName}
                    </p>
                    <p className="text-xs text-gray-500">{chw.phoneNumber}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        chw.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {chw.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // ── RENDER: CLINICAL DASHBOARD (ADMIN / NURSE / DHO) ──
  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Quick Actions for Nurses/Admins */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <Link
          to="/pharmacy/requests"
          className="card p-4 flex flex-col items-center justify-center hover:bg-teal-50 hover:border-teal-300 transition-colors border-dashed border-2"
        >
          <Pill className="text-teal-600 mb-2" size={24} />
          <p className="text-sm font-semibold text-gray-800">Request Drugs</p>
          <p className="text-xs text-gray-500 text-center">
            Send to Pharmacist
          </p>
        </Link>

        <Link
          to="/referrals"
          className="card p-4 flex flex-col items-center justify-center hover:bg-teal-50 hover:border-teal-300 transition-colors border-dashed border-2"
        >
          <Stethoscope className="text-red-500 mb-2" size={24} />
          <p className="text-sm font-semibold text-gray-800">New Referral</p>
          <p className="text-xs text-gray-500 text-center">Refer a patient</p>
        </Link>

        <Link
          to="/programs"
          className="card p-4 flex flex-col items-center justify-center hover:bg-teal-50 hover:border-teal-300 transition-colors border-dashed border-2"
        >
          <HeartHandshake className="text-purple-600 mb-2" size={24} />
          <p className="text-sm font-semibold text-gray-800">
            Clinical Programs
          </p>
          <p className="text-xs text-gray-500 text-center">PNC, TB, FP</p>
        </Link>

        <Link
          to="/feedback"
          className="card p-4 flex flex-col items-center justify-center hover:bg-teal-50 hover:border-teal-300 transition-colors border-dashed border-2"
        >
          <MessageSquare className="text-blue-600 mb-2" size={24} />
          <p className="text-sm font-semibold text-gray-800">Send Feedback</p>
          <p className="text-xs text-gray-500 text-center">Rate a CHW</p>
        </Link>
      </div>

      {/* District-wide TA filter */}
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

      {/* Outbreak alerts */}
      {activeOutbreaks.length > 0 && (
        <div className="bg-red-100 border border-red-400 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-700 shrink-0" />
            <p className="text-sm font-bold text-red-800">
              {activeOutbreaks.length} Active Outbreak Alert
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
                  <strong>{alert.village?.name}</strong>
                </span>
                <span className="text-red-400 ml-2">
                  {new Date(alert.createdAt).toLocaleDateString("en-GB")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security banner */}
      {lockedUsers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} className="text-red-600 shrink-0" />
            <p className="text-sm text-red-800 font-medium">
              {lockedUsers.length} account{lockedUsers.length > 1 ? "s" : ""}{" "}
              suspended due to failed login attempts.
            </p>
          </div>
          <Link
            to="/admin/security"
            className="text-xs text-red-700 font-semibold underline shrink-0"
          >
            View & Unlock
          </Link>
        </div>
      )}

      {/* Sync alert */}
      {unsynced.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {unsynced.length} CHW{unsynced.length > 1 ? "s" : ""} have not
            synced in the last 48 hours
          </p>
        </div>
      )}

      {/* Clinical Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Visits This Week"
          value={stats?.totalVisitsWeek ?? 0}
          color="bg-teal-700"
          to="/analytics"
        />
        <StatCard
          icon={AlertTriangle}
          label="Active Referrals"
          value={stats?.activeReferrals ?? 0}
          color="bg-yellow-500"
          to="/referrals"
        />
        <StatCard
          icon={CheckCircle}
          label="Missed Referrals"
          value={stats?.missedReferrals ?? 0}
          color="bg-red-500"
          to="/referrals"
        />
        <StatCard
          icon={FlaskConical}
          label="Low Drug Stock"
          value={stats?.drugsLowStock ?? 0}
          color="bg-orange-500"
          to="/pharmacy"
        />
        <StatCard
          icon={Shield}
          label="Vaccines Due"
          value={stats?.vaccinesDue ?? 0}
          color="bg-purple-600"
          to="/immunisations"
        />
        <StatCard
          icon={Heart}
          label="ANC Overdue"
          value={stats?.ancOverdue ?? 0}
          color="bg-pink-600"
          to="/programs"
        />
      </div>

      {/* Map + CHW Table */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
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
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {mapData?.map((ev) => (
                <CircleMarker
                  key={ev.id}
                  center={[ev.lat, ev.lng]}
                  radius={ev.type === "household" ? 6 : 5}
                  pathOptions={{
                    fillColor: DOT_COLOR[ev.colour],
                    fillOpacity: 0.8,
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <p className="font-semibold">{ev.label}</p>
                      <p className="text-gray-500 capitalize">{ev.type}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-900">CHW Activity</h2>
            <Link
              to="/admin/users"
              className="text-xs text-teal-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50 overflow-y-auto max-h-96">
            {chwData?.length === 0 && (
              <p className="text-sm text-gray-400 p-5 text-center">
                No CHW data
              </p>
            )}
            {chwData?.map((chw: any) => {
              const chwName = chw.firstName
                ? `${chw.firstName} ${chw.lastName}`
                : chw.fullName;
              return (
                <div
                  key={chw.id}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${chw.status === "ACTIVE" ? "bg-green-500" : chw.status === "UNSYNCED" ? "bg-yellow-400" : "bg-gray-300"}`}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {chwName}
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
