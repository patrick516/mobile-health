import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye, X, Package, Plus } from "lucide-react"; // Added Plus
import api from "../../services/api";
import ReceiveStockForm from "../../components/pharmacy/ReceiveStockForm";

interface DrugBatch {
  id: string;
  drugName: string;
  drugNameChichewa?: string;
  category: string;
  unit: string;
  batchNumber: string;
  quantityReceived: number;
  quantityRemaining: number;
  manufactureDate?: string;
  expiryDate: string;
  receivedAt: string;
  status: string;
  supplier?: { name: string };
  receivedBy?: { firstName: string; lastName: string };
}

export default function DrugList() {
  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<DrugBatch | null>(null);
  const [showAddModal, setShowAddModal] = useState(false); // State for the modal

  // Re-fetch when the modal closes successfully
  const {
    data: batches,
    isLoading,
    refetch,
  } = useQuery<DrugBatch[]>({
    queryKey: ["pharmacy-batches"],
    queryFn: () => api.get("/pharmacy/batches").then((r) => r.data.data),
  });

  const filteredBatches = batches?.filter(
    (b) =>
      b.drugName.toLowerCase().includes(search.toLowerCase()) ||
      b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase()),
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "DEPLETED":
        return "bg-gray-100 text-gray-600";
      case "EXPIRED":
        return "bg-red-100 text-red-700";
      case "QUARANTINED":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-teal-700" /> Drug Inventory
          </h1>
          <p className="text-sm text-gray-500">
            Master list of all received batches
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className="input pl-9 w-full"
              placeholder="Search drug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2 shrink-0"
          >
            <Plus size={16} /> Add Stock
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Drug Name
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Batch No.
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Category
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">
                  Qty Remaining
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Expiry Date
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">
                  Status
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!isLoading && filteredBatches?.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No drugs found matching your search.
                  </td>
                </tr>
              )}
              {filteredBatches?.map((batch) => (
                <tr
                  key={batch.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {batch.drugName}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {batch.batchNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{batch.category}</td>
                  <td className="px-4 py-3 text-center font-bold text-teal-700">
                    {batch.quantityRemaining}{" "}
                    <span className="text-xs font-normal text-gray-400">
                      {batch.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(batch.expiryDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(batch.status)}`}
                    >
                      {batch.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedBatch(batch)}
                      className="p-1.5 text-gray-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD STOCK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-teal-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white">
                Add Stock (Receive Batch)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-teal-200 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {/* Reusing the component here! */}
              <ReceiveStockForm
                onSuccess={() => {
                  setShowAddModal(false);
                  refetch(); // Update the table immediately
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-teal-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white">Drug Details</h3>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-teal-200 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="border-b border-gray-100 pb-4">
                <h4 className="text-xl font-bold text-gray-900">
                  {selectedBatch.drugName}
                </h4>
                <p className="text-sm text-gray-500">
                  {selectedBatch.drugNameChichewa ||
                    "No Chichewa name provided"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 font-medium mb-1">Category</p>
                  <p className="text-gray-900 font-semibold">
                    {selectedBatch.category}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">Unit</p>
                  <p className="text-gray-900 font-semibold">
                    {selectedBatch.unit}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">Batch Number</p>
                  <p className="text-gray-900 font-mono">
                    {selectedBatch.batchNumber}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">Status</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(selectedBatch.status)}`}
                  >
                    {selectedBatch.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">
                    Quantity Received
                  </p>
                  <p className="text-gray-900 font-semibold">
                    {selectedBatch.quantityReceived} {selectedBatch.unit}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">
                    Quantity Remaining
                  </p>
                  <p className="text-teal-700 font-bold">
                    {selectedBatch.quantityRemaining} {selectedBatch.unit}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">
                    Manufacture Date
                  </p>
                  <p className="text-gray-900">
                    {selectedBatch.manufactureDate
                      ? new Date(
                          selectedBatch.manufactureDate,
                        ).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">Expiry Date</p>
                  <p className="text-red-600 font-semibold">
                    {new Date(selectedBatch.expiryDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 font-medium mb-1">Supplier</p>
                  <p className="text-gray-900">
                    {selectedBatch.supplier?.name || "Not specified"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 font-medium mb-1">Received By</p>
                  <p className="text-gray-900">
                    {selectedBatch.receivedBy?.firstName}{" "}
                    {selectedBatch.receivedBy?.lastName} ·{" "}
                    {new Date(selectedBatch.receivedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button
                onClick={() => setSelectedBatch(null)}
                className="btn-secondary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
