import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import api from "../../services/api";
import Select from "../../components/ui/Select";

const FACILITY_TYPES = [
  { value: "DISTRICT_HOSPITAL", label: "District Hospital" },
  { value: "TA_HOSPITAL", label: "TA Hospital" },
  { value: "CLINIC", label: "Clinic" },
];

export default function Facilities() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    facilityType: "",
    districtId: "",
    taId: "",
    parentDistrictHospitalId: "",
  });
  const [error, setError] = useState("");

  const { data: facilities, isLoading } = useQuery({
    queryKey: ["admin-facilities"],
    queryFn: () => api.get("/admin/facilities").then((r) => r.data.data),
  });

  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: () => api.get("/geography/districts").then((r) => r.data.data),
  });

  const { data: tas } = useQuery({
    queryKey: ["tas"],
    queryFn: () => api.get("/geography/tas").then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => api.post("/admin/facilities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      setForm({
        name: "",
        facilityType: "",
        districtId: "",
        taId: "",
        parentDistrictHospitalId: "",
      });
      setError("");
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || "Failed to create facility."),
  });

  const typeColor: Record<string, string> = {
    DISTRICT_HOSPITAL: "badge-red",
    TA_HOSPITAL: "badge-blue",
    CLINIC: "badge-green",
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Create form */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Building2 size={20} className="text-teal-700" />
          <h2 className="font-bold text-gray-900">Add Health Facility</h2>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Facility Type
          </label>
          <Select
            value={form.facilityType}
            onChange={(val) =>
              setForm((p) => ({
                ...p,
                facilityType: val,
                districtId: "",
                taId: "",
                parentDistrictHospitalId: "",
              }))
            }
            placeholder="Select type..."
            options={FACILITY_TYPES}
          />
        </div>

        {form.facilityType === "DISTRICT_HOSPITAL" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              District
            </label>
            <Select
              value={form.districtId}
              onChange={(val) => setForm((p) => ({ ...p, districtId: val }))}
              placeholder="Select district..."
              options={(districts || []).map((d: any) => ({
                value: d.id,
                label: `${d.name} — ${d.region?.name}`,
              }))}
            />
          </div>
        )}

        {form.facilityType === "TA_HOSPITAL" && (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Parent District Hospital *
              </label>
              <Select
                value={form.parentDistrictHospitalId}
                onChange={(val) =>
                  setForm((p) => ({ ...p, parentDistrictHospitalId: val }))
                }
                placeholder="Select parent district hospital..."
                options={(facilities || [])
                  .filter((f: any) => f.facilityType === "DISTRICT_HOSPITAL")
                  .map((f: any) => ({
                    value: f.id,
                    label: `${f.name} — ${f.district?.name || "No district"}`,
                  }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Traditional Authority *
              </label>
              <Select
                value={form.taId}
                onChange={(val) => setForm((p) => ({ ...p, taId: val }))}
                placeholder="Select TA..."
                options={(tas || []).map((t: any) => ({
                  value: t.id,
                  label: `${t.name} — ${t.district?.name}`,
                }))}
              />
            </div>
          </>
        )}

        {form.facilityType === "CLINIC" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Traditional Authority *
            </label>
            <Select
              value={form.taId}
              onChange={(val) => setForm((p) => ({ ...p, taId: val }))}
              placeholder="Select TA..."
              options={(tas || []).map((t: any) => ({
                value: t.id,
                label: `${t.name} — ${t.district?.name}`,
              }))}
            />
          </div>
        )}

        {form.facilityType && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Facility Name
            </label>
            <input
              className="input"
              placeholder="e.g. Nsanje District Hospital"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
        )}

        {form.facilityType && (
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => createMutation.mutate(form)}
            disabled={
              createMutation.isPending ||
              !form.name ||
              (form.facilityType === "DISTRICT_HOSPITAL" && !form.districtId) ||
              (form.facilityType === "TA_HOSPITAL" &&
                (!form.taId || !form.parentDistrictHospitalId)) ||
              (form.facilityType === "CLINIC" && !form.taId)
            }
          >
            <Plus size={16} />
            {createMutation.isPending ? "Creating..." : "Add Facility"}
          </button>
        )}
      </div>

      {/* Facility list */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4">All Facilities</h2>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {isLoading && (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          )}
          {facilities?.map((f: any) => (
            <div
              key={f.id}
              className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{f.name}</p>
                <p className="text-xs text-gray-500">
                  {f.district?.name || f.ta?.name || "No location set"}
                  {f.parentDistrictHospital && (
                    <span className="ml-2 text-teal-600">
                      ← {f.parentDistrictHospital.name}
                    </span>
                  )}
                </p>
              </div>
              <span className={typeColor[f.facilityType] ?? "badge-gray"}>
                {f.facilityType?.replace("_", " ") || "Unspecified"}
              </span>
            </div>
          ))}
          {facilities?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No facilities added yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
