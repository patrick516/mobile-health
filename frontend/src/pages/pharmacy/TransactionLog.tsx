import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import api from "../../services/api";

const TYPE_ICONS: Record<string, any> = {
  IN: { icon: ArrowDownCircle, color: "text-green-600" },
  OUT: { icon: ArrowUpCircle, color: "text-red-600" },
  ADJUSTMENT: { icon: RefreshCw, color: "text-blue-600" },
};

const fullName = (p: any) =>
  p
    ? `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.fullName || "—"
    : "—";

export default function TransactionLog() {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [type, setType] = useState("");
  const [drugName, setDrugName] = useState("");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["pharmacy-transactions", from, to, type, drugName],
    queryFn: () =>
      api
        .get("/pharmacy/transactions", {
          params: {
            from,
            to,
            ...(type ? { type } : {}),
            ...(drugName ? { drugName } : {}),
          },
        })
        .then((r) => r.data.data),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Transaction Log</h1>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            From
          </label>
          <input
            type="date"
            className="input text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            To
          </label>
          <input
            type="date"
            className="input text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Type
          </label>
          <select
            className="input text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Drug Name
          </label>
          <input
            className="input text-sm"
            placeholder="Search drug..."
            value={drugName}
            onChange={(e) => setDrugName(e.target.value)}
          />
        </div>
      </div>

      <div className="card p-5">
        {isLoading && (
          <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b bg-gray-50">
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Drug</th>
                <th className="text-left px-3 py-2">Batch</th>
                <th className="text-center px-3 py-2">Qty</th>
                <th className="text-center px-3 py-2">Before</th>
                <th className="text-center px-3 py-2">After</th>
                <th className="text-left px-3 py-2">Patient</th>
                <th className="text-left px-3 py-2">By</th>
                <th className="text-left px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.map((t: any) => {
                const typeInfo =
                  TYPE_ICONS[t.transactionType] || TYPE_ICONS.ADJUSTMENT;
                const Icon = typeInfo.icon;
                return (
                  <tr
                    key={t.id}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`flex items-center gap-1 font-semibold text-xs ${typeInfo.color}`}
                      >
                        <Icon size={14} /> {t.transactionType}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {t.batch?.drugName}
                    </td>
                    <td className="px-3 py-2 text-gray-500 font-mono text-xs">
                      {t.batch?.batchNumber}
                    </td>
                    <td className="px-3 py-2 text-center font-bold">
                      {t.quantity} {t.batch?.unit}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-500">
                      {t.quantityBefore}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-500">
                      {t.quantityAfter}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {t.patientName || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {fullName(t.performedBy)}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {transactions?.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">
                    No transactions found
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
