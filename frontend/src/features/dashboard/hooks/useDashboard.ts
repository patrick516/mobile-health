import { useState, useEffect } from "react";
import { fetchDashboardStats } from "../../../services/dashboardService";
import type { DashboardStats } from "../../../types";

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchDashboardStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}
