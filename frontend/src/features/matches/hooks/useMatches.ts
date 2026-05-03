import { useState, useEffect, useCallback } from "react";
import {
  fetchMatches,
  createManualMatch,
  dissolveMatch,
} from "../../../services/matchesService";
import { usePagination } from "../../../hooks/usePagination";
import type { Match } from "../../../types";

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const pagination = usePagination(20);

  const load = useCallback(() => {
    setLoading(true);
    fetchMatches({ page: pagination.page, pageSize: pagination.pageSize })
      .then((res) => {
        setMatches(res.data);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const createMatch = async (
    user1Id: string,
    user2Id: string,
    notes?: string,
  ) => {
    await createManualMatch(user1Id, user2Id, notes);
    load();
  };
  const dissolve = async (id: string) => {
    await dissolveMatch(id);
    load();
  };

  return {
    matches,
    total,
    loading,
    pagination,
    createMatch,
    dissolve,
    reload: load,
  };
}
