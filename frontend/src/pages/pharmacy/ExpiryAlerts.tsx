import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock } from "lucide-react";
import api from "../../services/api";

export default function ExpiryAlerts() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["pharmacy-alerts"],
    queryFn: () => api.get("/pharmacy/alerts").then((r) => r.data.data),
  });

  const getDaysUntilExpiry = (date: string) => {
    const days = Math.ceil(
      (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return days;
  };

  const getExpiryColor = (days: number) => {
    if (days <= 0) return "bg-red-100 text-red-700";
    if (days <= 30) return "bg-red-100 text-red-700";
    if (days <= 60) return "bg-orange-100 text-orange-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} className="text-red-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Expiry & Stock Alerts
          </h1>
          <p className="text-sm text-gray-500">
            Batches expiring within 90 days and low stock items
          </p>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
      )}

      {/* Expiring batches */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Clock size={16} className="text-red-500" />
          Expiring Batches ({alerts?.expiring?.length ?? 0})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b bg-gray-50">
                <th className="text-left px-3 py-2">Drug Name</th>
                <th className="text-left px-3 py-2">Batch No.</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-center px-3 py-2">Qty Remaining</th>
                <th className="text-left px-3 py-2">Expiry Date</th>
                <th className="text-center px-3 py-2">Days Left</th>
              </tr>
            </thead>
            <tbody>
              {alerts?.expiring?.map((b: any) => {
                const days = getDaysUntilExpiry(b.expiryDate);
                return (
                  <tr
                    key={b.id}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {b.drugName}
                    </td>
                    <td className="px-3 py-2 text-gray-600 font-mono text-xs">
                      {b.batchNumber}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{b.category}</td>
                    <td className="px-3 py-2 text-center font-semibold">
                      {b.quantityRemaining} {b.unit}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {new Date(b.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${getExpiryColor(days)}`}
                      >
                        {days <= 0 ? "EXPIRED" : `${days} days`}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {alerts?.expiring?.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    No expiring batches
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low stock */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4">
          Low Stock Items ({alerts?.lowStock?.length ?? 0})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b bg-gray-50">
                <th className="text-left px-3 py-2">Drug Name</th>
                <th className="text-left px-3 py-2">Batch No.</th>
                <th className="text-center px-3 py-2">Remaining</th>
                <th className="text-center px-3 py-2">Reorder Point</th>
              </tr>
            </thead>
            <tbody>
              {alerts?.lowStock?.map((b: any) => (
                <tr
                  key={b.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {b.drug_name || b.drugName}
                  </td>
                  <td className="px-3 py-2 text-gray-600 font-mono text-xs">
                    {b.batch_number || b.batchNumber}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-yellow-600">
                    {b.quantity_remaining ?? b.quantityRemaining} {b.unit}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-500">
                    {b.reorder_point ?? b.reorderPoint}
                  </td>
                </tr>
              ))}
              {alerts?.lowStock?.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    No low stock items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
