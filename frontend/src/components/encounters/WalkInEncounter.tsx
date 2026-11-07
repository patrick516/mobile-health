import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Send } from "lucide-react";
import api from "../../services/api";

type MedRow = { drugName: string; quantity: string; dosage: string };

type Props = {
  open: boolean;
  onClose: () => void;
};

// Walk-in encounter: patient arrives with NO referral — the nurse records
// the patient and the prescription here, and it lands in the pharmacist's
// queue instantly (same PharmacyRequest a referred patient produces).
export default function WalkInEncounter({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [meds, setMeds] = useState<MedRow[]>([
    { drugName: "", quantity: "", dosage: "" },
  ]);
  const [error, setError] = useState("");

  const { data: drugs } = useQuery({
    queryKey: ["drugs-formulary"],
    queryFn: () => api.get("/drugs").then((r) => r.data.data),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/pharmacy/requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["pharmacy-requests-pending"],
      });
      reset();
      onClose();
    },
    onError: (err: any) =>
      setError(err.response?.data?.message || "Failed to send request."),
  });

  const reset = () => {
    setPatientName("");
    setPatientAge("");
    setSymptoms("");
    setDiagnosis("");
    setMeds([{ drugName: "", quantity: "", dosage: "" }]);
    setError("");
  };

  const updateMed = (i: number, field: keyof MedRow, value: string) =>
    setMeds((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)),
    );

  const submit = () => {
    setError("");
    if (!patientName.trim())
      return setError("Enter the patient's name to record the encounter.");

    const items: {
      drugName: string;
      quantityRequested: number;
      notes?: string;
    }[] = [];
    for (const m of meds) {
      if (!m.drugName && !m.quantity && !m.dosage) continue; // empty row
      const qty = parseInt(m.quantity);
      if (!m.drugName || !(qty > 0))
        return setError("Choose a drug and enter a quantity for each row.");
      items.push({
        drugName: m.drugName,
        quantityRequested: qty,
        ...(m.dosage.trim() ? { notes: m.dosage.trim() } : {}),
      });
    }
    if (items.length === 0)
      return setError(
        "Add at least one drug before sending to the pharmacist.",
      );

    const encounter = [symptoms.trim(), diagnosis.trim()]
      .filter(Boolean)
      .join(" — ");

    createMutation.mutate({
      patientName: patientName.trim(),
      ...(patientAge ? { patientAge } : {}),
      ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
      ...(encounter ? { notes: encounter.slice(0, 400) } : {}),
      items,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-gray-900">New Walk-in Encounter</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Patient not referred — record signs, prescribe, send straight to
              the pharmacist's queue
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Patient Name *
            </label>
            <input
              className="input"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Mary Tembo"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Age
            </label>
            <input
              className="input"
              type="number"
              min={0}
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              placeholder="Years"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Signs &amp; Symptoms
          </label>
          <textarea
            className="input resize-none text-sm"
            rows={2}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. Fever, headache, vomiting (3 days)"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Diagnosis
          </label>
          <input
            className="input"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Uncomplicated malaria"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">
              Prescription
            </label>
            <button
              type="button"
              className="text-xs font-semibold text-teal-700 flex items-center gap-1"
              onClick={() =>
                setMeds((prev) => [
                  ...prev,
                  { drugName: "", quantity: "", dosage: "" },
                ])
              }
            >
              <Plus size={12} /> Add drug
            </button>
          </div>

          {meds.map((m, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-lg p-2 space-y-2"
            >
              <div className="flex gap-2">
                <select
                  className="input text-sm flex-1"
                  value={m.drugName}
                  onChange={(e) => updateMed(i, "drugName", e.target.value)}
                >
                  <option value="">Search drug…</option>
                  {(drugs || []).map((d: any) => (
                    <option key={d.id || d.nameEnglish} value={d.nameEnglish}>
                      {d.nameEnglish}
                      {d.nameChichewa ? ` — ${d.nameChichewa}` : ""}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className="input text-sm w-20"
                  placeholder="Qty"
                  value={m.quantity}
                  onChange={(e) => updateMed(i, "quantity", e.target.value)}
                />
                <button
                  type="button"
                  className="text-gray-400 hover:text-red-600 px-1"
                  onClick={() =>
                    setMeds((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  title="Remove"
                >
                  ×
                </button>
              </div>
              <input
                className="input text-sm"
                placeholder="Dosage, e.g. 1 tablet twice daily for 3 days"
                value={m.dosage}
                onChange={(e) => updateMed(i, "dosage", e.target.value)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={submit}
          disabled={createMutation.isPending}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Send size={15} />
          {createMutation.isPending
            ? "Sending..."
            : "Record & Send to Pharmacist"}
        </button>
      </div>
    </div>
  );
}
