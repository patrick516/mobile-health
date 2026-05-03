import { useState, useEffect } from "react";
import { fetchAnalytics } from "../../../services/analyticsService";
import type { AnalyticsData } from "../../../services/analyticsService";

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics()
      .then(setAnalytics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { analytics, loading, error };
}
