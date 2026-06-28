import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth.store";

export default function FacilitySetup() {
  const navigate = useNavigate();
  const { user, setAuth, token } = useAuthStore();
  const [regionId, setRegionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: () => api.get("/geography/regions").then((r) => r.data.data),
  });

  const { data: districts } = useQuery({
    queryKey: ["districts", regionId],
    queryFn: () =>
      api
        .get(`/geography/districts?regionId=${regionId}`)
        .then((r) => r.data.data),
    enabled: !!regionId,
  });

  const { data: facilities } = useQuery({
    queryKey: ["facilities", districtId],
    queryFn: () =>
      api
        .get(`/admin/facilities?districtId=${districtId}`)
        .then((r) => r.data.data),
    enabled: !!districtId,
  });

  const handleSave = async () => {
    if (!facilityId) return setError("Please select your facility.");
    setSaving(true);
    setError("");
    try {
      const res = await api.patch(`/admin/users/${user?.id}`, { facilityId });
      // Refresh user data from /auth/me
      console.log(res);
      const meRes = await api.get("/auth/me");
      const updatedUser = meRes.data.data;
      setAuth(updatedUser, token!);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save facility.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-4">
            <Building2 size={32} className="text-teal-700" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Welcome, {user?.fullName}
          </h1>
          <p className="text-teal-300 text-sm mt-1">
            Please select the facility you are administering
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">
            Select Your Facility
          </h2>
          <p className="text-sm text-gray-500">
            This links your account to your hospital or clinic. It cannot be
            changed without contacting the System Administrator.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Region
            </label>
            <select
              className="input"
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);
                setDistrictId("");
                setFacilityId("");
              }}
            >
              <option value="">Select region...</option>
              {regions?.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {regionId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                District
              </label>
              <select
                className="input"
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value);
                  setFacilityId("");
                }}
              >
                <option value="">Select district...</option>
                {districts?.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {districtId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Facility
              </label>
              <select
                className="input"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
              >
                <option value="">Select facility...</option>
                {facilities?.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.facilityType?.replace(/_/g, " ")}
                  </option>
                ))}
                {(!facilities || facilities.length === 0) && (
                  <option disabled value="">
                    No facilities in this district yet
                  </option>
                )}
              </select>
            </div>
          )}

          <button
            className="btn-primary w-full mt-2"
            onClick={handleSave}
            disabled={saving || !facilityId}
          >
            {saving ? "Saving..." : "Confirm & Continue"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Contact the System Administrator if your facility is not listed.
          </p>
        </div>
      </div>
    </div>
  );
}
