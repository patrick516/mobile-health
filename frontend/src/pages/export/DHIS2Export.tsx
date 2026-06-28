import { useState } from "react";
import { Download, FileText } from "lucide-react";
import api from "../../services/api";
import DatePicker from "../../components/ui/DatePicker";

export default function DHIS2Export() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    if (!from || !to)
      return setError("Please select both start and end dates.");
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/export/dhis2", {
        params: { from, to },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `dhis2_export_${from}_${to}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
            <FileText size={22} className="text-teal-700" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">DHIS2 Data Export</h2>
            <p className="text-sm text-gray-500">
              Export visit data in DHIS2-compatible CSV format
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              From Date
            </label>
            <DatePicker value={from} max={to || undefined} onChange={setFrom} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              To Date
            </label>
            <DatePicker value={to} min={from || undefined} onChange={setTo} />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          onClick={handleExport}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          <Download size={16} />
          {loading ? "Generating..." : "Export CSV for DHIS2"}
        </button>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Export includes</h3>
        <ul className="space-y-1.5">
          {[
            "Visit date, type, and location (GPS)",
            "Patient name, sex, age",
            "District, TA, Zone, Village, Household number",
            "CHW name",
            "Symptoms and MUAC status",
            "Temperature readings",
            "Referral status",
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
