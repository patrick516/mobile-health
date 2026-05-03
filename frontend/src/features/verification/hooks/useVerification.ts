import { useState, useEffect, useCallback } from "react";
import {
  fetchUsers,
  approveVerification,
  rejectVerification,
} from "../../../services/usersService";
import type { User } from "../../../types";

export function useVerification() {
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchUsers({ verificationStatus: "pending" }, { page: 1, pageSize: 50 })
      .then((res) => setPending(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    await approveVerification(id);
    load();
  };
  const reject = async (id: string, reason: string) => {
    await rejectVerification(id, reason);
    load();
  };

  return { pending, loading, approve, reject, reload: load };
}
