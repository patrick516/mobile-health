import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FlaskConical,
  AlertTriangle,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth.store";

interface Drug {
  id: string;
  drugCode: string;
  nameEnglish: string;
  nameChichewa: string;
  unit: string;
  minimumThreshold: number;
  isActive: boolean;
}

interface DrugStockItem {
  id: string;
  drugId: string;
  quantityCurrent: number;
  quantityMinimum: number;
  lastRestockedAt?: string;
  drug: Drug;
  user?: { id: string; fullName: string };
}

interface StockRequest {
  id: string;
  drugId: string;
  quantityRequested: number;
  status: "PENDING" | "APPROVED" | "FULFILLED" | "REJECTED";
  notes?: string;
  createdAt: string;
  drug: Drug;
  requestingUser: { id: string; fullName: string; phoneNumber: string };
  approvedBy?: { id: string; fullName: string };
}

export default function DrugStock() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuthStore();
  const [activeTab, setActiveTab] = useState<
    "formulary" | "stock" | "requests"
  >("stock");
  const [showAddDrug, setShowAddDrug] = useState(false);
  const [showInitKit, setShowInitKit] = useState(false);
  const [selectedCcwId, setSelectedCcwId] = useState("");
  const [kitQuantities, setKitQuantities] = useState<Record<string, number>>(
    {},
  );
  const [drugForm, setDrugForm] = useState({
    drugCode: "",
    nameEnglish: "",
    nameChichewa: "",
    unit: "tablet",
    minimumThreshold: "10",
  });
  const [formError, setFormError] = useState("");

  // Fetch all drugs in formulary
  const { data: drugs, isLoading: drugsLoading } = useQuery<Drug[]>({
    queryKey: ["drugs-formulary"],
    queryFn: () => api.get("/drugs").then((r) => r.data.data),
  });

  // Fetch stock levels
  const { data: stock, isLoading: stockLoading } = useQuery<DrugStockItem[]>({
    queryKey: ["drug-stock"],
    queryFn: () => api.get("/drugs/stock").then((r) => r.data.data),
  });

  // Fetch stock requests
  const { data: stockRequests, isLoading: requestsLoading } = useQuery<
    StockRequest[]
  >({
    queryKey: ["stock-requests"],
    queryFn: () => api.get("/drugs/requests").then((r) => r.data.data),
    enabled: isAdmin(),
  });

  // Fetch CCW users - Admin only
  const { data: ccwUsers } = useQuery({
    queryKey: ["ccw-users"],
    queryFn: () =>
      api
        .get("/admin/users", { params: { role: "CCW" } })
        .then((r) => r.data.data),
    enabled: isAdmin(),
  });

  const createDrugMutation = useMutation({
    mutationFn: (data: object) => api.post("/admin/drugs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drugs-formulary"] });
      setShowAddDrug(false);
      setDrugForm({
        drugCode: "",
        nameEnglish: "",
        nameChichewa: "",
        unit: "tablet",
        minimumThreshold: "10",
      });
      setFormError("");
    },
    onError: (err: any) =>
      setFormError(err.response?.data?.message || "Failed to add drug."),
  });

  const requestMutation = useMutation({
    mutationFn: (drugId: string) =>
      api.post("/drugs/requests", {
        drugId,
        quantityRequested: 50,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["drug-stock"] }),
  });

  const initKitMutation = useMutation({
    mutationFn: async () => {
      const promises = Object.entries(kitQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([drugId, qty]) =>
          api.patch(`/drugs/stock/${drugId}`, {
            quantityCurrent: qty,
            userId: selectedCcwId,
          }),
        );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drug-stock"] });
      setShowInitKit(false);
      setSelectedCcwId("");
      setKitQuantities({});
    },
    onError: (err: any) =>
      setFormError(err.response?.data?.message || "Failed to initialise kit."),
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/drugs/requests/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-requests"] });
      queryClient.invalidateQueries({ queryKey: ["drug-stock"] });
    },
  });

  const isLow = (item: DrugStockItem) =>
    item.quantityCurrent <= item.quantityMinimum;
  const lowCount = stock?.filter(isLow).length ?? 0;

  const pct = (item: DrugStockItem) =>
    Math.min(
      100,
      (item.quantityCurrent / Math.max(item.quantityMinimum * 3, 1)) * 100,
    );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="badge-yellow flex items-center gap-1">
            <Clock size={12} /> PENDING
          </span>
        );
      case "APPROVED":
        return (
          <span className="badge-blue flex items-center gap-1">
            <CheckCircle size={12} /> APPROVED
          </span>
        );
      case "FULFILLED":
        return (
          <span className="badge-green flex items-center gap-1">
            <CheckCircle size={12} /> FULFILLED
          </span>
        );
      case "REJECTED":
        return (
          <span className="badge-red flex items-center gap-1">
            <XCircle size={12} /> REJECTED
          </span>
        );
      default:
        return <span className="badge-gray">{status}</span>;
    }
  };

  const pendingCount =
    stockRequests?.filter((r) => r.status === "PENDING").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Low stock alert */}
      {lowCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-800 font-medium">
            {lowCount} drug{lowCount > 1 ? "s" : ""} running low
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab("stock")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "stock"
                ? "bg-teal-700 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            Stock Levels
          </button>
          {isAdmin() && (
            <>
              <button
                onClick={() => setActiveTab("formulary")}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === "formulary"
                    ? "bg-teal-700 text-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                Drug Formulary
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                  activeTab === "requests"
                    ? "bg-teal-700 text-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                Stock Requests
                {pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            </>
          )}
        </nav>
      </div>

      {/* ==================== STOCK LEVELS TAB ==================== */}
      {activeTab === "stock" && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Current Stock Levels</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Per CHW drug kit status
              </p>
            </div>
            {isAdmin() && (
              <button
                onClick={() => setShowInitKit(!showInitKit)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Plus size={15} />
                Issue Kit
              </button>
            )}
          </div>

          {/* Issue Kit Form */}
          {showInitKit && isAdmin() && (
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3">
                Issue Drug Kit to CCW
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Select CCW *
                  </label>
                  <select
                    className="input"
                    value={selectedCcwId}
                    onChange={(e) => {
                      setSelectedCcwId(e.target.value);
                      const defaults: Record<string, number> = {};
                      drugs?.forEach((d) => {
                        defaults[d.id] = d.minimumThreshold * 2;
                      });
                      setKitQuantities(defaults);
                    }}
                  >
                    <option value="">Select a CCW...</option>
                    {ccwUsers?.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} — {u.phoneNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCcwId && drugs && drugs.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Set quantities for each drug
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {drugs
                      .filter((d) => d.isActive)
                      .map((drug) => (
                        <div
                          key={drug.id}
                          className="flex items-center gap-4 p-3 bg-white rounded-lg border"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {drug.nameEnglish}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">
                              {drug.drugCode} · min: {drug.minimumThreshold}{" "}
                              {drug.unit}s
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                              onClick={() =>
                                setKitQuantities((p) => ({
                                  ...p,
                                  [drug.id]: Math.max(0, (p[drug.id] || 0) - 5),
                                }))
                              }
                            >
                              −
                            </button>
                            <span className="text-sm font-bold w-8 text-center">
                              {kitQuantities[drug.id] ?? 0}
                            </span>
                            <button
                              className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                              onClick={() =>
                                setKitQuantities((p) => ({
                                  ...p,
                                  [drug.id]: (p[drug.id] || 0) + 5,
                                }))
                              }
                            >
                              +
                            </button>
                            <span className="text-xs text-gray-400 w-12">
                              {drug.unit}s
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      className="btn-primary"
                      onClick={() => initKitMutation.mutate()}
                      disabled={initKitMutation.isPending || !selectedCcwId}
                    >
                      {initKitMutation.isPending
                        ? "Issuing..."
                        : "Issue Drug Kit"}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setShowInitKit(false);
                        setSelectedCcwId("");
                        setKitQuantities({});
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stock Levels Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  "Drug",
                  "CHW",
                  "Stock Level",
                  "Current / Min",
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
              {stockLoading && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-gray-400 text-sm"
                  >
                    Loading...
                  </td>
                </tr>
              )}
              {!stockLoading && stock?.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <FlaskConical
                      size={36}
                      className="text-gray-200 mx-auto mb-2"
                    />
                    <p className="text-gray-400 text-sm">No stock data yet</p>
                  </td>
                </tr>
              )}
              {stock?.map((item) => {
                const low = isLow(item);
                const p = pct(item);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 ${low ? "bg-red-50/20" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {item.drug.nameEnglish}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {item.drug.drugCode}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.user?.fullName || "Unknown CHW"}
                    </td>
                    <td className="px-4 py-3 min-w-32">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${low ? "bg-red-500" : "bg-teal-500"}`}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-semibold ${low ? "text-red-600" : "text-teal-700"}`}
                      >
                        {item.quantityCurrent}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {" "}
                        / {item.quantityMinimum} {item.drug.unit}s
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {low ? (
                        <span className="badge-red">Low Stock</span>
                      ) : (
                        <span className="badge-green">Adequate</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {low && (
                        <button
                          onClick={() => requestMutation.mutate(item.drugId)}
                          disabled={requestMutation.isPending}
                          className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900"
                        >
                          <RefreshCw size={12} />
                          Request Restock
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== DRUG FORMULARY TAB ==================== */}
      {activeTab === "formulary" && isAdmin() && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Drug Formulary</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Master list of drugs — {drugs?.length ?? 0} drugs registered
              </p>
            </div>
            <button
              onClick={() => setShowAddDrug(!showAddDrug)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus size={15} />
              Add Drug
            </button>
          </div>

          {showAddDrug && (
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100">
              <h3 className="font-semibold text-gray-900 mb-3">New Drug</h3>
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">
                  {formError}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Drug Code *
                  </label>
                  <input
                    className="input text-sm uppercase"
                    placeholder="e.g. ORS"
                    value={drugForm.drugCode}
                    onChange={(e) =>
                      setDrugForm((p) => ({
                        ...p,
                        drugCode: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    className="input text-sm"
                    value={drugForm.unit}
                    onChange={(e) =>
                      setDrugForm((p) => ({ ...p, unit: e.target.value }))
                    }
                  >
                    {[
                      "tablet",
                      "capsule",
                      "sachet",
                      "kit",
                      "pack",
                      "bottle",
                      "vial",
                      "ampoule",
                    ].map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Name (English) *
                  </label>
                  <input
                    className="input text-sm"
                    placeholder="e.g. Oral Rehydration Salts"
                    value={drugForm.nameEnglish}
                    onChange={(e) =>
                      setDrugForm((p) => ({
                        ...p,
                        nameEnglish: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Name (Chichewa) *
                  </label>
                  <input
                    className="input text-sm"
                    placeholder="e.g. Mankhwala a Kupsomola"
                    value={drugForm.nameChichewa}
                    onChange={(e) =>
                      setDrugForm((p) => ({
                        ...p,
                        nameChichewa: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Minimum Threshold *
                  </label>
                  <input
                    className="input text-sm"
                    type="number"
                    placeholder="e.g. 10"
                    value={drugForm.minimumThreshold}
                    onChange={(e) =>
                      setDrugForm((p) => ({
                        ...p,
                        minimumThreshold: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-primary text-sm"
                  onClick={() =>
                    createDrugMutation.mutate({
                      ...drugForm,
                      minimumThreshold: parseInt(drugForm.minimumThreshold),
                    })
                  }
                  disabled={
                    createDrugMutation.isPending ||
                    !drugForm.drugCode ||
                    !drugForm.nameEnglish
                  }
                >
                  {createDrugMutation.isPending ? "Adding..." : "Add Drug"}
                </button>
                <button
                  className="btn-secondary text-sm"
                  onClick={() => setShowAddDrug(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  "Code",
                  "English Name",
                  "Chichewa Name",
                  "Unit",
                  "Min Threshold",
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
              {drugsLoading && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-gray-400 text-sm"
                  >
                    Loading...
                  </td>
                </tr>
              )}
              {!drugsLoading && drugs?.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <FlaskConical
                      size={36}
                      className="text-gray-200 mx-auto mb-2"
                    />
                    <p className="text-gray-400 text-sm">
                      No drugs in formulary yet
                    </p>
                  </td>
                </tr>
              )}
              {drugs?.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-bold text-teal-700">
                      {d.drugCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {d.nameEnglish}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {d.nameChichewa}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{d.unit}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {d.minimumThreshold}
                  </td>
                  <td className="px-4 py-3">
                    <span className={d.isActive ? "badge-green" : "badge-gray"}>
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== STOCK REQUESTS TAB ==================== */}
      {activeTab === "requests" && isAdmin() && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Stock Requests</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage restock requests from CCWs
            </p>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  "Requested By",
                  "Drug",
                  "Quantity",
                  "Requested On",
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
              {requestsLoading && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-gray-400 text-sm"
                  >
                    Loading...
                  </td>
                </tr>
              )}
              {!requestsLoading && stockRequests?.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <CheckCircle
                      size={36}
                      className="text-gray-200 mx-auto mb-2"
                    />
                    <p className="text-gray-400 text-sm">
                      No stock requests yet
                    </p>
                  </td>
                </tr>
              )}
              {stockRequests?.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {req.requestingUser.fullName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {req.requestingUser.phoneNumber}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {req.drug.nameEnglish}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      {req.drug.drugCode}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {req.quantityRequested}
                    </span>
                    <span className="text-xs text-gray-400">
                      {" "}
                      {req.drug.unit}s
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                  <td className="px-4 py-3">
                    {req.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            updateRequestMutation.mutate({
                              id: req.id,
                              status: "APPROVED",
                            })
                          }
                          className="btn-success text-xs px-3 py-1"
                          disabled={updateRequestMutation.isPending}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            updateRequestMutation.mutate({
                              id: req.id,
                              status: "REJECTED",
                            })
                          }
                          className="btn-danger text-xs px-3 py-1"
                          disabled={updateRequestMutation.isPending}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {req.status === "APPROVED" && (
                      <button
                        onClick={() =>
                          updateRequestMutation.mutate({
                            id: req.id,
                            status: "FULFILLED",
                          })
                        }
                        className="btn-primary text-xs px-3 py-1"
                        disabled={updateRequestMutation.isPending}
                      >
                        Mark Fulfilled
                      </button>
                    )}
                    {req.status === "FULFILLED" && (
                      <span className="text-xs text-green-600">
                        ✓ Completed
                      </span>
                    )}
                    {req.status === "REJECTED" && (
                      <span className="text-xs text-red-600">✗ Rejected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
