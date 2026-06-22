// Standard MOH / iCCM indicator labels.
// These rename existing analytics output to match the terminology used in
// Malawi Ministry of Health and iCCM (Integrated Community Case Management)
// reporting, without changing any underlying data or calculations.

export const INDICATOR_LABELS = {
  visitTrends: {
    title: "Under-5 & Community Case Visit Trends",
    subtitle: "Daily visit volume — community case management activity",
  },
  comparativeTrends: {
    title: "Visit Trend Comparison (7-Day Moving Average)",
    subtitle: "Smoothed trend line for early pattern detection",
  },
  symptomTrends: {
    title: "Presenting Symptoms — Case Burden by Type",
    subtitle: "Most frequently reported symptoms this reporting period",
  },
  referralCompletion: {
    title: "Proportion of Danger-Sign Cases Referred & Resolved",
    subtitle: "Referral completion rate — iCCM quality indicator",
  },
  muacScreening: {
    title: "Acute Malnutrition Screening (MUAC)",
    subtitle: "Nutritional status distribution — under-5 screening coverage",
  },
  immunisationCoverage: {
    title: "Under-5 Immunisation Coverage Rate",
    subtitle: "Proportion of scheduled vaccine doses administered on time",
  },
  ancAttendance: {
    title: "Antenatal Care (ANC) Attendance Rate",
    subtitle: "Proportion of scheduled ANC visits attended — 4+ visit model",
  },
  chwPerformance: {
    title: "Community Health Worker Performance Summary",
    subtitle: "Activity, referral follow-up, and sync compliance by CHW",
  },
  drugStockOut: {
    title: "Drug Stock-Out Rate",
    subtitle: "Proportion of essential drugs below minimum threshold",
  },
};
