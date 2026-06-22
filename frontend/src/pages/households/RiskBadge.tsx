import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

interface RiskBadgeProps {
  riskLevel?: RiskLevel;
  riskScore?: number;
  riskReasons?: string[];
  showReasons?: boolean;
}

const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bg: string; icon: typeof AlertTriangle }
> = {
  HIGH: {
    label: "High Risk",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: AlertTriangle,
  },
  MEDIUM: {
    label: "Medium Risk",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: AlertCircle,
  },
  LOW: {
    label: "Low Risk",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle2,
  },
};

// Small badge for table rows
export function RiskBadge({ riskLevel }: RiskBadgeProps) {
  if (!riskLevel) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  const cfg = RISK_CONFIG[riskLevel];
  const Icon = cfg.icon;

  return (
    <span
      className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${cfg.color} ${cfg.bg} border`}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

// Detail panel for the household modal, with reasons listed
export function RiskPanel({
  riskLevel,
  riskScore,
  riskReasons,
}: RiskBadgeProps) {
  if (!riskLevel) return null;
  const cfg = RISK_CONFIG[riskLevel];
  const Icon = cfg.icon;

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <Icon size={15} className={cfg.color} />
        Risk Stratification
      </h3>
      <div className={`rounded-xl p-4 border ${cfg.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <span
            className={`flex items-center gap-2 text-sm font-semibold ${cfg.color}`}
          >
            <Icon size={16} />
            {cfg.label}
          </span>
          {typeof riskScore === "number" && (
            <span className={`text-xs font-mono ${cfg.color}`}>
              Score: {riskScore}/100
            </span>
          )}
        </div>
        {riskReasons && riskReasons.length > 0 && (
          <ul className="text-xs text-gray-600 space-y-1 mt-2">
            {riskReasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-1 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
