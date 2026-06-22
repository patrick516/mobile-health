// Household Risk Stratification
//
// Combines health score, visit recency, pending referrals, overdue vaccines,
// and overdue ANC visits into a single risk level: HIGH, MEDIUM, or LOW.
//
// This runs locally on the phone (offline-first) using data already present
// in SQLite. The exact same scoring logic is mirrored on the backend
// (backend/src/utils/riskScore.js) so a household never shows a different
// risk level on mobile vs the web portal.

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

export interface RiskInput {
  healthScore: number; // 0-100, from latrine/water/nets/distance
  daysSinceLastVisit: number | null; // null = never visited
  pendingReferrals: number;
  overdueVaccines: number;
  overdueAnc: number;
}

export interface RiskResult {
  level: RiskLevel;
  score: number; // 0-100, higher = more urgent
  reasons: string[];
}

export function calculateHouseholdRisk(input: RiskInput): RiskResult {
  const reasons: string[] = [];
  let riskScore = 0;

  // Health score contributes inversely — poor conditions raise risk
  const healthDeficit = 100 - input.healthScore;
  riskScore += healthDeficit * 0.3;
  if (input.healthScore < 50) reasons.push("Poor household health score");

  // Visit recency
  if (input.daysSinceLastVisit === null) {
    riskScore += 25;
    reasons.push("Never visited");
  } else if (input.daysSinceLastVisit > 30) {
    riskScore += 20;
    reasons.push(`No visit in ${input.daysSinceLastVisit} days`);
  } else if (input.daysSinceLastVisit > 14) {
    riskScore += 10;
    reasons.push(`No visit in ${input.daysSinceLastVisit} days`);
  }

  // Pending referrals — each one adds urgency
  if (input.pendingReferrals > 0) {
    riskScore += Math.min(input.pendingReferrals * 15, 30);
    reasons.push(
      `${input.pendingReferrals} pending referral${input.pendingReferrals > 1 ? "s" : ""}`,
    );
  }

  // Overdue vaccines
  if (input.overdueVaccines > 0) {
    riskScore += Math.min(input.overdueVaccines * 5, 15);
    reasons.push(
      `${input.overdueVaccines} overdue vaccine${input.overdueVaccines > 1 ? "s" : ""}`,
    );
  }

  // Overdue ANC
  if (input.overdueAnc > 0) {
    riskScore += Math.min(input.overdueAnc * 10, 20);
    reasons.push(
      `${input.overdueAnc} overdue ANC visit${input.overdueAnc > 1 ? "s" : ""}`,
    );
  }

  riskScore = Math.min(Math.round(riskScore), 100);

  let level: RiskLevel = "LOW";
  if (riskScore >= 50) level = "HIGH";
  else if (riskScore >= 25) level = "MEDIUM";

  if (reasons.length === 0) reasons.push("No risk factors detected");

  return { level, score: riskScore, reasons };
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  HIGH: "#dc2626",
  MEDIUM: "#f59e0b",
  LOW: "#16a34a",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  HIGH: "High Risk",
  MEDIUM: "Medium Risk",
  LOW: "Low Risk",
};
