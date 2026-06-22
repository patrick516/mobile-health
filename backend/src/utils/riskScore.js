// Household Risk Stratification — backend mirror of mobile/src/utils/riskScore.ts
//
// IMPORTANT: This logic must stay in sync with the mobile version so a
// household never shows a different risk level on mobile vs the web portal.

export function calculateHouseholdRisk({
  healthScore,
  daysSinceLastVisit,
  pendingReferrals,
  overdueVaccines,
  overdueAnc,
}) {
  const reasons = [];
  let riskScore = 0;

  const healthDeficit = 100 - healthScore;
  riskScore += healthDeficit * 0.3;
  if (healthScore < 50) reasons.push("Poor household health score");

  if (daysSinceLastVisit === null) {
    riskScore += 25;
    reasons.push("Never visited");
  } else if (daysSinceLastVisit > 30) {
    riskScore += 20;
    reasons.push(`No visit in ${daysSinceLastVisit} days`);
  } else if (daysSinceLastVisit > 14) {
    riskScore += 10;
    reasons.push(`No visit in ${daysSinceLastVisit} days`);
  }

  if (pendingReferrals > 0) {
    riskScore += Math.min(pendingReferrals * 15, 30);
    reasons.push(
      `${pendingReferrals} pending referral${pendingReferrals > 1 ? "s" : ""}`,
    );
  }

  if (overdueVaccines > 0) {
    riskScore += Math.min(overdueVaccines * 5, 15);
    reasons.push(
      `${overdueVaccines} overdue vaccine${overdueVaccines > 1 ? "s" : ""}`,
    );
  }

  if (overdueAnc > 0) {
    riskScore += Math.min(overdueAnc * 10, 20);
    reasons.push(`${overdueAnc} overdue ANC visit${overdueAnc > 1 ? "s" : ""}`);
  }

  riskScore = Math.min(Math.round(riskScore), 100);

  let level = "LOW";
  if (riskScore >= 50) level = "HIGH";
  else if (riskScore >= 25) level = "MEDIUM";

  if (reasons.length === 0) reasons.push("No risk factors detected");

  return { level, score: riskScore, reasons };
}

export function calculateHealthScore(household) {
  let score = 0;
  if (household.latrinePresent) score += 25;
  if (household.handwashingFacility) score += 25;
  if (["BOREHOLE", "PIPED", "PROTECTED_WELL"].includes(household.waterSource))
    score += 25;
  if (household.mosquitoNets === "Yes") score += 25;
  return score;
}
