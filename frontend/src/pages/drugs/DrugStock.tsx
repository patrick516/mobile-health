import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, AlertTriangle, RefreshCw } from "lucide-react";
import api from "../../services/api";
import type { DrugStock as DrugStockType } from "../../types";

export default function DrugStock() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<DrugStockType[]>({
    queryKey: ["drug-stock"],
    queryFn: () => api.get("/drugs/stock").then((r) => r.data.data),
  });

  const requestMutation = useMutation({
    mutationFn: (drugId: string) =>
      api.post("/drugs/requests", { drugId, quantityRequested: 50 }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["drug-stock"] }),
  });

  const isLow = (d: DrugStockType) => d.quantityCurrent <= d.quantityMinimum;
  const lowCount = data?.filter(isLow).length ?? 0;

  const pct = (d: DrugStockType) =>
    Math.min(
      100,
      (d.quantityCurrent / Math.max(d.quantityMinimum * 3, 1)) * 100,
    );

  return (
    <div className="space-y-4">
      {/* Stats Cards with FlaskConical */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <FlaskConical size={20} className="text-teal-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {data?.length ?? 0}
            </p>
            <p className="text-xs text-gray-500">Total Drug Types</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <div className="text-green-700 text-xl font-bold">✓</div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {data?.filter((d) => !isLow(d)).length ?? 0}
            </p>
            <p className="text-xs text-gray-500">Adequate Stock</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{lowCount}</p>
            <p className="text-xs text-gray-500">Low Stock Items</p>
          </div>
        </div>
      </div>
      {lowCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-800 font-medium">
            {lowCount} drug{lowCount > 1 ? "s" : ""} running low across all CHWs
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {[
                "Drug",
                "Code",
                "Stock Level",
                "Current / Minimum",
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
            {data?.map((d) => {
              const low = isLow(d);
              const p = pct(d);
              return (
                <tr
                  key={d.id}
                  className={`hover:bg-gray-50 ${low ? "bg-red-50/20" : ""}`}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {d.drug.nameEnglish}
                    </p>
                    <p className="text-xs text-gray-400">
                      {d.drug.nameChichewa}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-500">
                      {d.drug.drugCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-32">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${low ? "bg-red-500" : "bg-teal-500"}`}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm font-semibold ${low ? "text-red-600" : "text-teal-700"}`}
                    >
                      {d.quantityCurrent}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {" "}
                      / {d.quantityMinimum} {d.drug.unit}s
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
                        onClick={() => requestMutation.mutate(d.drugId)}
                        disabled={requestMutation.isPending}
                        className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
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
    </div>
  );
}
