import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  PackagePlus,
  Pill,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Clock,
} from "lucide-react";
import api from "../../services/api";

export default function PharmacyDashboard() {
  const { data: alerts } = useQuery({
    queryKey: ["pharmacy-alerts"],
    queryFn: () => api.get("/pharmacy/alerts").then((r) => r.data.data),
  });

  const { data: requests } = useQuery({
    queryKey: ["pharmacy-requests-pending"],
    queryFn: () =>
      api
        .get("/pharmacy/requests", { params: { status: "PENDING" } })
        .then((r) => r.data.data),
  });

  const { data: batches } = useQuery({
    queryKey: ["pharmacy-batches"],
    queryFn: () => api.get("/pharmacy/batches").then((r) => r.data.data),
  });

  const expiringCount = alerts?.expiring?.length ?? 0;
  const lowStockCount = alerts?.lowStock?.length ?? 0;
  const pendingRequests = requests?.length ?? 0;
  const totalBatches = batches?.length ?? 0;

  const QUICK_LINKS = [
    {
      to: "/pharmacy/receiving",
      icon: PackagePlus,
      label: "Receive Stock",
      desc: "Record new drug batch received",
      color: "text-teal-700",
      bg: "bg-teal-50",
    },
    {
      to: "/pharmacy/dispense",
      icon: Pill,
      label: "Dispense Drug",
      desc: "Dispense to patient using FEFO",
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      to: "/pharmacy/requests",
      icon: ClipboardList,
      label: "Drug Requests",
      desc: `${pendingRequests} pending requests`,
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
    {
      to: "/pharmacy/alerts",
      icon: AlertTriangle,
      label: "Expiry Alerts",
      desc: `${expiringCount} batches expiring soon`,
      color: "text-red-700",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pharmacy Dashboard</h1>
        <p className="text-sm text-gray-500">
          Drug stock management and dispensing
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Active Batches
          </p>
          <p className="text-2xl font-bold text-teal-700 mt-1">
            {totalBatches}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Pending Requests
          </p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {pendingRequests}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Expiring Soon
          </p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {expiringCount}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Low Stock
          </p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {lowStockCount}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`${link.bg} p-3 rounded-xl`}>
              <link.icon size={22} className={link.color} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">
                {link.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
            </div>
            <ArrowRight size={16} className="text-gray-400" />
          </Link>
        ))}
      </div>

      {/* Expiring batches preview */}
      {expiringCount > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock size={16} className="text-red-500" />
              Expiring Within 90 Days
            </h2>
            <Link
              to="/pharmacy/alerts"
              className="text-xs text-teal-600 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {alerts?.expiring?.slice(0, 5).map((b: any) => (
              <div
                key={b.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {b.drugName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Batch {b.batchNumber} · {b.quantityRemaining} {b.unit}{" "}
                    remaining
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    new Date(b.expiryDate) <
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {new Date(b.expiryDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low stock preview */}
      {lowStockCount > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-yellow-500" />
            Low Stock Alert
          </h2>
          <div className="space-y-2">
            {alerts?.lowStock?.slice(0, 5).map((b: any) => (
              <div
                key={b.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {b.drug_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Batch {b.batch_number}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                  {b.quantity_remaining} {b.unit} left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
