import { ShieldCheck, ShieldAlert, IdCard, PenTool } from "lucide-react";

// ─── Types
interface HouseholdIdentity {
  consentGiven?: boolean;
  consentSignatureUrl?: string | null;
  headNationalId?: string | null;
  [key: string]: any;
}
// ─── Small badge for table rows
export function VerificationBadge({
  household,
}: {
  household: HouseholdIdentity;
}) {
  const isVerified = household.consentGiven && !!household.consentSignatureUrl;

  if (isVerified) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full w-fit">
        <ShieldCheck size={12} />
        Verified
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full w-fit">
      <ShieldAlert size={12} />
      Missing
    </span>
  );
}

// ─── Detail panel for the household modal ──────────────────────────────
export function VerificationPanel({
  household,
}: {
  household: HouseholdIdentity;
}) {
  const isVerified = household.consentGiven && !!household.consentSignatureUrl;

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <ShieldCheck size={15} className="text-teal-600" />
        Identity Verification
      </h3>

      <div
        className={`rounded-xl p-4 border ${
          isVerified
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          {isVerified ? (
            <ShieldCheck size={18} className="text-green-600" />
          ) : (
            <ShieldAlert size={18} className="text-amber-600" />
          )}
          <p
            className={`text-sm font-semibold ${
              isVerified ? "text-green-800" : "text-amber-800"
            }`}
          >
            {isVerified
              ? "Consent and signature on file"
              : "Consent or signature missing"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <IdCard size={14} className="text-gray-400" />
            <span className="text-gray-500">National ID:</span>
            <span className="font-medium text-gray-800">
              {household.headNationalId || "Not provided"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <PenTool size={14} className="text-gray-400" />
            <span className="text-gray-500">Consent:</span>
            <span
              className={`font-medium ${
                household.consentGiven ? "text-green-700" : "text-red-600"
              }`}
            >
              {household.consentGiven ? "Given" : "Not given"}
            </span>
          </div>
        </div>

        {household.consentSignatureUrl && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Signature on file</p>
            <div className="bg-white rounded-lg border border-gray-200 p-2 inline-block">
              <svg width="200" height="60" viewBox="0 0 320 160">
                <path
                  d={household.consentSignatureUrl}
                  stroke="#1f2937"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}

        {!isVerified && (
          <p className="text-xs text-amber-700 mt-3">
            This household was registered without full identity verification.
            Consider a follow-up visit to confirm head of household details.
          </p>
        )}
      </div>
    </div>
  );
}
