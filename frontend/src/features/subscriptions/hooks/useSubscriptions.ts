import { useState, useEffect, useCallback } from "react";
import {
  fetchSubscriptions,
  revokeSubscription,
} from "../../../services/subscriptionsService";
import { usePagination } from "../../../hooks/usePagination";
import type { Subscription } from "../../../types";

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const pagination = usePagination(20);

  const load = useCallback(() => {
    setLoading(true);
    fetchSubscriptions({ page: pagination.page, pageSize: pagination.pageSize })
      .then((res) => {
        setSubscriptions(res.data);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (id: string) => {
    await revokeSubscription(id);
    load();
  };

  return { subscriptions, total, loading, pagination, revoke, reload: load };
}
