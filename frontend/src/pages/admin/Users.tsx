import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  UserX,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth.store";
import Select from "../../components/ui/Select";

interface User {
  id: string;
  title?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  facility?: { name: string };
}

const ROLES = ["CCW", "NURSE", "DISTRICT_OFFICER", "PHARMACIST", "ADMIN"];
const TITLES = ["Mr.", "Mrs.", "Ms.", "Miss", "Dr.", "Prof.", "Rev."];

const extractPhoneSuffix = (raw: string): string => {
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("265")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 9);
};

export default function Users() {
  const queryClient = useQueryClient();
  const { user, isAdmin, isSuperAdmin } = useAuthStore();

  const [showForm, setShowForm] = useState(false);
  const [viewTarget, setViewTarget] = useState<User | null>(null);

  const [form, setForm] = useState({
    title: "",
    firstName: "",
    lastName: "",
    phoneSuffix: "",
    email: "",
    phone: "",
    pin: "1234",
    role: "CCW",
    facilityId: "",
    regionId: "",
    districtId: "",
    selectedZoneIds: [] as string[],
    selectedTaIds: [] as string[],
  });

  const [showPin, setShowPin] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetResult, setResetResult] = useState<{
    name: string;
    tempPin?: string;
    isWebUser?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const [roleFilter, setRoleFilter] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data, isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then((r) => r.data.data),
  });

  const { data: zones } = useQuery({
    queryKey: ["user-zones"],
    queryFn: () => api.get("/geography/zones").then((r) => r.data.data),
    enabled: isAdmin() || isSuperAdmin(),
  });

  const { data: tas } = useQuery({
    queryKey: ["user-tas"],
    queryFn: () => api.get("/geography/tas").then((r) => r.data.data),
    enabled: isAdmin() || isSuperAdmin(),
  });

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: () => api.get("/geography/regions").then((r) => r.data.data),
  });

  const { data: districts } = useQuery({
    queryKey: ["user-districts", form.regionId],
    queryFn: () =>
      api
        .get(`/geography/districts?regionId=${form.regionId}`)
        .then((r) => r.data.data),
    enabled: !!form.regionId,
  });

  const { data: facilities } = useQuery({
    queryKey: ["user-facilities", form.districtId],
    queryFn: () =>
      api
        .get(`/admin/facilities?districtId=${form.districtId}`)
        .then((r) => r.data.data),
    enabled: !!form.districtId,
  });

  const isWebUser = [
    "NURSE",
    "DISTRICT_OFFICER",
    "PHARMACIST",
    "ADMIN",
  ].includes(form.role);
  const needsFacility =
    ["CCW", "NURSE", "DISTRICT_OFFICER", "PHARMACIST", "ADMIN"].includes(
      form.role,
    ) && user?.role === "SUPER_ADMIN";
  const isCcw = form.role === "CCW";
  const isNurseOrDO = ["NURSE", "DISTRICT_OFFICER"].includes(form.role);

  const validate = (): string | null => {
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim()) return "Last name is required.";
    if (!form.phoneSuffix || form.phoneSuffix.length !== 9)
      return "Enter the full 9-digit mobile number.";
    if (!/^[89]/.test(form.phoneSuffix))
      return "Malawi mobile numbers start with 8 or 9.";
    if (!isWebUser && (!form.pin || form.pin.length !== 4))
      return "PIN must be exactly 4 digits.";
    if (!form.role) return "Role is required.";
    if (isWebUser && !form.email.trim())
      return "Email is required for web portal users.";
    if (needsFacility && !form.facilityId)
      return "Facility is required for this role.";
    if (isCcw && form.selectedZoneIds.length === 0)
      return "Please assign at least one zone to the CCW.";
    return null;
  };

  const canSubmit =
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.phoneSuffix.length === 9 &&
    /^[89]/.test(form.phoneSuffix) &&
    (isWebUser || form.pin.length === 4) &&
    form.role &&
    (!isWebUser || form.email.trim().length > 0) &&
    (!needsFacility || !!form.facilityId) &&
    (!isCcw || form.selectedZoneIds.length > 0);

  const resetForm = () => {
    setForm({
      title: "",
      firstName: "",
      lastName: "",
      phoneSuffix: "",
      email: "",
      phone: "",
      pin: "1234",
      role: "CCW",
      facilityId: "",
      regionId: "",
      districtId: "",
      selectedZoneIds: [],
      selectedTaIds: [],
    });
    setError("");
  };

  const createMutation = useMutation({
    mutationFn: (payload: object) => api.post("/admin/users", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowForm(false);
      resetForm();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || "Failed to create user."),
  });

  const handleSubmit = () => {
    const validationError = validate();
    if (validationError) return setError(validationError);

    if (isWebUser) {
      const emailExists = data?.some(
        (u) => u.email?.toLowerCase() === form.email.trim().toLowerCase(),
      );
      if (emailExists) {
        return setError(
          "This email address is already registered to another user.",
        );
      }
    }

    setError("");
    const payload = {
      title: form.title,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phoneNumber: `+265${form.phoneSuffix}`,
      phone: form.phone || `+265${form.phoneSuffix}`,
      email: isWebUser ? form.email.trim() : undefined,
      pin: form.pin,
      role: form.role,
      zoneIds: form.selectedZoneIds,
      taIds: form.selectedTaIds,
      ...(form.facilityId ? { facilityId: form.facilityId } : {}),
    };
    createMutation.mutate(payload);
  };

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/deactivate`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/reactivate`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const resetPinMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/reset-pin`),
    onSuccess: (res) => {
      setResetResult({
        name: `${resetTarget?.title ? resetTarget.title + " " : ""}${resetTarget?.firstName} ${resetTarget?.lastName}`,
        tempPin: res.data.data.tempPin,
        isWebUser: res.data.data.isWebUser,
      });
      setResetTarget(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to reset account.");
      setResetTarget(null);
    },
  });

  const roleColor: Record<string, string> = {
    ADMIN: "badge-red",
    SUPER_ADMIN: "badge-red",
    DISTRICT_OFFICER: "badge-blue",
    NURSE: "badge-green",
    PHARMACIST: "badge-blue",
    CCW: "badge-gray",
  };

  const facilityOptions = Array.from(
    new Map(
      (data || [])
        .map((u) => (u as any).facility)
        .filter(Boolean)
        .map((f: any) => [f.id, f]),
    ).values(),
  ).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const filteredUsers = (data || []).filter((u) => {
    if (user?.role !== "SUPER_ADMIN" && u.role === "SUPER_ADMIN") return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (facilityFilter && (u as any).facility?.id !== facilityFilter)
      return false;
    if (statusFilter === "active" && !u.isActive) return false;
    if (statusFilter === "inactive" && u.isActive) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) resetForm();
          }}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={16} /> Add Staff
        </button>
      </div>

      {showForm && (
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-gray-900">
            Create New Staff & Allocate
          </h3>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Title
                </label>
                <Select
                  value={form.title}
                  onChange={(val) => setForm((p) => ({ ...p, title: val }))}
                  placeholder="Select..."
                  options={TITLES.map((t) => ({ value: t, label: t }))}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  First Name
                </label>
                <input
                  className="input"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                  placeholder="e.g. Chimwemwe"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Last Name
                </label>
                <input
                  className="input"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                  placeholder="e.g. Leno"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Phone Number (Mobile Login)
              </label>
              <div className="flex items-stretch rounded-lg border border-gray-200 bg-white overflow-hidden focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-500/20 transition-colors">
                <span className="flex items-center px-3 bg-gray-50 text-gray-500 font-mono text-sm border-r border-gray-200 select-none">
                  +265
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phoneSuffix}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      phoneSuffix: extractPhoneSuffix(e.target.value),
                    }))
                  }
                  placeholder="991234567"
                  maxLength={9}
                  className="flex-1 px-3 py-2.5 text-sm font-mono text-gray-900 outline-none bg-white placeholder:text-gray-300"
                />
              </div>
            </div>

            {isWebUser && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address (Web Login)
                </label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="user@example.com"
                />
              </div>
            )}

            {!isWebUser && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Temporary PIN (4 digits)
                </label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPin ? "text" : "password"}
                    maxLength={4}
                    inputMode="numeric"
                    value={form.pin}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {isWebUser && (
              <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mt-2">
                <p className="text-sm text-blue-800 font-medium">
                  A temporary password will be automatically generated and sent
                  to their email address. They will be prompted to change it on
                  their first login.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Role
              </label>
              <Select
                value={form.role}
                onChange={(val) =>
                  setForm((p) => ({
                    ...p,
                    role: val,
                    facilityId: "",
                    selectedZoneIds: [],
                    selectedTaIds: [],
                  }))
                }
                placeholder="Select role..."
                options={ROLES.map((r) => ({
                  value: r,
                  label: r.replace("_", " "),
                }))}
              />
            </div>

            {isCcw && (
              <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-sm text-amber-800 font-medium">
                  CCW users log in via the mobile app (Phone + PIN).
                </p>
              </div>
            )}

            {needsFacility && user?.role === "SUPER_ADMIN" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Region
                  </label>
                  <Select
                    value={form.regionId}
                    onChange={(val) =>
                      setForm((p) => ({
                        ...p,
                        regionId: val,
                        districtId: "",
                        facilityId: "",
                      }))
                    }
                    placeholder="Select region..."
                    options={(regions || []).map((r: any) => ({
                      value: r.id,
                      label: r.name,
                    }))}
                  />
                </div>
                {form.regionId && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      District
                    </label>
                    <Select
                      value={form.districtId}
                      onChange={(val) =>
                        setForm((p) => ({
                          ...p,
                          districtId: val,
                          facilityId: "",
                        }))
                      }
                      placeholder="Select district..."
                      options={(districts || []).map((d: any) => ({
                        value: d.id,
                        label: d.name,
                      }))}
                    />
                  </div>
                )}
                {form.districtId && (
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Facility
                    </label>
                    <Select
                      value={form.facilityId}
                      onChange={(val) =>
                        setForm((p) => ({ ...p, facilityId: val }))
                      }
                      placeholder="Select facility..."
                      options={
                        facilities?.map((f: any) => ({
                          value: f.id,
                          label: `${f.name} — ${f.facilityType?.replace(/_/g, " ")}`,
                        })) || []
                      }
                    />
                  </div>
                )}
              </>
            )}

            {isCcw && (
              <div className="col-span-2 mt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Assign Zones (Required for CCW)
                </label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                  {zones?.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No zones found. Create them in Geography Setup first.
                    </p>
                  )}
                  {zones?.map((z: any) => (
                    <label
                      key={z.id}
                      className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border text-sm cursor-pointer hover:bg-teal-50 shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.selectedZoneIds.includes(z.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked
                            ? [...form.selectedZoneIds, z.id]
                            : form.selectedZoneIds.filter((id) => id !== z.id);
                          setForm((p) => ({ ...p, selectedZoneIds: newIds }));
                        }}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      {z.name} {z.ta?.name ? `(${z.ta.name})` : ""}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {isNurseOrDO && (
              <div className="col-span-2 mt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Assign Traditional Authorities
                </label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                  {tas?.length === 0 && (
                    <p className="text-sm text-gray-500">No TAs found.</p>
                  )}
                  {tas?.map((t: any) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border text-sm cursor-pointer hover:bg-teal-50 shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.selectedTaIds.includes(t.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked
                            ? [...form.selectedTaIds, t.id]
                            : form.selectedTaIds.filter((id) => id !== t.id);
                          setForm((p) => ({ ...p, selectedTaIds: newIds }));
                        }}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!canSubmit || createMutation.isPending}
            >
              {createMutation.isPending
                ? "Creating..."
                : "Create & Allocate User"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-teal-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">User Details</h3>
              <button
                onClick={() => setViewTarget(null)}
                className="text-teal-200 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 text-2xl font-bold">
                  {viewTarget.firstName.charAt(0)}
                  {viewTarget.lastName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">
                    {viewTarget.title ? `${viewTarget.title} ` : ""}
                    {viewTarget.firstName} {viewTarget.lastName}
                  </h4>
                  <span
                    className={`badge-${viewTarget.isActive ? "green" : "gray"} mt-1`}
                  >
                    {viewTarget.isActive ? "Active Account" : "Deactivated"}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-medium">Role</span>
                  <span className="font-bold text-gray-900">
                    {viewTarget.role.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-medium">
                    Phone Number
                  </span>
                  <span className="font-mono text-gray-900">
                    {viewTarget.phoneNumber}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-medium">
                    Email Address
                  </span>
                  <span className="text-gray-900">
                    {viewTarget.email || "Not provided"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-medium">Facility</span>
                  <span className="text-gray-900">
                    {viewTarget.facility?.name || "Unassigned"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500 font-medium">Date Added</span>
                  <span className="text-gray-900">
                    {viewTarget.createdAt
                      ? new Date(viewTarget.createdAt).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )
                      : "Unknown"}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setViewTarget(null)}
                  className="btn-secondary w-full"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm reset PIN/Password */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">
              Reset {resetTarget.role === "CCW" ? "PIN" : "Password"}?
            </h3>
            <p className="text-sm text-gray-600">
              {resetTarget.role === "CCW"
                ? `This will generate a new 4-digit temporary PIN for ${resetTarget.title ? resetTarget.title + " " : ""}${resetTarget.firstName} ${resetTarget.lastName}.`
                : `This will generate a new temporary password and email it to ${resetTarget.email}.`}
            </p>
            <div className="flex gap-3">
              <button
                className="btn-primary"
                onClick={() => resetPinMutation.mutate(resetTarget.id)}
                disabled={resetPinMutation.isPending}
              >
                {resetPinMutation.isPending ? "Resetting..." : "Yes, Reset"}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setResetTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show temp PIN or Email Confirmation */}
      {resetResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">
              {resetResult.isWebUser
                ? "Password Emailed"
                : "Temporary PIN Generated"}
            </h3>
            <p className="text-sm text-gray-600">
              {resetResult.isWebUser
                ? `A temporary password has been sent to the email address for ${resetResult.name}.`
                : `Relay this PIN to ${resetResult.name} now.`}
            </p>

            {!resetResult.isWebUser && resetResult.tempPin && (
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <span className="text-2xl font-mono font-bold text-gray-900 tracking-widest">
                  {resetResult.tempPin}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resetResult.tempPin!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}

            <button
              className="btn-primary w-full"
              onClick={() => setResetResult(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div className="w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Role
          </label>
          <Select
            value={roleFilter}
            onChange={(val) => {
              setRoleFilter(val);
              setPage(1);
            }}
            placeholder="All Roles"
            options={[
              { value: "", label: "All Roles" },
              ...ROLES.map((r) => ({ value: r, label: r.replace("_", " ") })),
            ]}
          />
        </div>
        <div className="w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Facility
          </label>
          <Select
            value={facilityFilter}
            onChange={(val) => {
              setFacilityFilter(val);
              setPage(1);
            }}
            placeholder="All Facilities"
            options={[
              { value: "", label: "All Facilities" },
              ...facilityOptions.map((f: any) => ({
                value: f.id,
                label: f.name,
              })),
            ]}
          />
        </div>
        <div className="w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Status
          </label>
          <Select
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            placeholder="All Statuses"
            options={[
              { value: "", label: "All Statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </div>
        {(roleFilter || facilityFilter || statusFilter) && (
          <button
            onClick={() => {
              setRoleFilter("");
              setFacilityFilter("");
              setStatusFilter("");
              setPage(1);
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
        <p className="text-sm text-gray-400 ml-auto">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {["Name", "Phone", "Role", "Facility", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ),
              )}
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
            {!isLoading && pagedUsers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-12 text-gray-400 text-sm"
                >
                  No users match these filters.
                </td>
              </tr>
            )}
            {pagedUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {u.title ? `${u.title} ` : ""}
                  {u.firstName} {u.lastName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                  {u.phoneNumber}
                </td>
                <td className="px-4 py-3">
                  <span className={roleColor[u.role] ?? "badge-gray"}>
                    {u.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {(u as any).facility?.name || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={u.isActive ? "badge-green" : "badge-gray"}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setViewTarget(u)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Eye size={13} /> View
                    </button>
                    {u.role !== "SUPER_ADMIN" && (
                      <button
                        onClick={() => setResetTarget(u)}
                        className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors"
                      >
                        <KeyRound size={13} />{" "}
                        {u.role === "CCW" ? "Reset PIN" : "Reset Password"}
                      </button>
                    )}
                    {u.isActive ? (
                      u.id !== user?.id && (
                        <button
                          onClick={() => deactivateMutation.mutate(u.id)}
                          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 transition-colors"
                        >
                          <UserX size={13} /> Deactivate
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => activateMutation.mutate(u.id)}
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 transition-colors"
                      >
                        <UserPlus size={13} /> Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
