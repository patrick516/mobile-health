import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPinOff, Link2, MapPin, Calendar, Home } from "lucide-react";
import api from "../../services/api";

const fmt = (d: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function RelocatedHouseholds() {
  const queryClient = useQueryClient();
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [newHouseholdSearch, setNewHouseholdSearch] = useState("");

  const { data: relocated, isLoading } = useQuery({
    queryKey: ["relocated-households"],
    queryFn: () => api.get("/households/relocated").then((r) => r.data.data),
  });

  const { data: searchResults } = useQuery({
    queryKey: ["households-search-link", newHouseholdSearch],
    queryFn: () =>
      api
        .get("/households", {
          params: { search: newHouseholdSearch, limit: 5 },
        })
        .then((r) => r.data.data),
    enabled: newHouseholdSearch.length > 1,
  });

  const linkMutation = useMutation({
    mutationFn: ({ oldId, newId }: { oldId: string; newId: string }) =>
      api.patch(`/households/${oldId}/link-relocation`, {
        newHouseholdId: newId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relocated-households"] });
      setLinkingId(null);
      setNewHouseholdSearch("");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <MapPinOff size={24} className="text-amber-600" />
          Relocated Households
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Households that moved to a different zone or district. History is
          preserved; link to a new record once re-registered elsewhere.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {[
                "Household ID",
                "Head of Household",
                "Original Location",
                "Relocated On",
                "Reason",
                "Linked New Record",
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
                  colSpan={7}
                  className="text-center py-12 text-gray-400 text-sm"
                >
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && relocated?.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-12 text-gray-400 text-sm"
                >
                  No relocated households on record
                </td>
              </tr>
            )}
            {relocated?.map((h: any) => (
              <tr key={h.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Home size={14} className="text-amber-500 shrink-0" />
                    <span className="font-mono text-sm font-semibold text-amber-700">
                      {h.householdNumber}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {h.headOfHouseholdName}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    {h.village?.name} · {h.village?.zone?.name} ·{" "}
                    {h.village?.zone?.ta?.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    {fmt(h.relocatedAt)}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {h.relocationReason || "—"}
                </td>
                <td className="px-4 py-3">
                  {h.relocatedTo ? (
                    <span className="badge-green text-xs">
                      → {h.relocatedTo.householdNumber} (
                      {h.relocatedTo.village?.zone?.name})
                    </span>
                  ) : (
                    <span className="badge-gray text-xs">Not linked yet</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!h.relocatedTo && (
                    <button
                      onClick={() => setLinkingId(h.id)}
                      className="flex items-center gap-1 text-teal-600 hover:text-teal-800 text-xs font-medium"
                    >
                      <Link2 size={14} />
                      Link to New Record
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Link modal */}
      {linkingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="font-bold text-gray-800 mb-1">
              Link to New Household Record
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Search for the household this family was re-registered as in their
              new zone or district.
            </p>
            <input
              autoFocus
              className="input mb-3"
              placeholder="Search by name, household ID, or village..."
              value={newHouseholdSearch}
              onChange={(e) => setNewHouseholdSearch(e.target.value)}
            />
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {searchResults?.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() =>
                    linkMutation.mutate({ oldId: linkingId, newId: r.id })
                  }
                  className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-teal-300 hover:bg-teal-50 transition-colors"
                >
                  <p className="text-sm font-semibold text-teal-700 font-mono">
                    {r.householdNumber}
                  </p>
                  <p className="text-sm text-gray-800">
                    {r.headOfHouseholdName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.village?.name} · {r.village?.zone?.name}
                  </p>
                </button>
              ))}
              {newHouseholdSearch.length > 1 && searchResults?.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No matching households found
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setLinkingId(null);
                setNewHouseholdSearch("");
              }}
              className="btn-secondary w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
