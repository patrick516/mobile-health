import { useState, useEffect, useCallback } from "react";
import {
  fetchUsers,
  banUser,
  unbanUser,
  deleteUser,
} from "../../../services/usersService";
import { useDebounce } from "../../../hooks/useDebounce";
import { usePagination } from "../../../hooks/usePagination";
import type { User, UserFilters } from "../../../types";

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({
    status: "all",
    verificationStatus: "all",
    plan: "all",
    gender: "all",
    locationId: "all",
    search: "",
  });

  const pagination = usePagination(20);
  const debouncedSearch = useDebounce(filters.search ?? "", 350);

  const load = useCallback(() => {
    setLoading(true);
    fetchUsers(
      { ...filters, search: debouncedSearch },
      { page: pagination.page, pageSize: pagination.pageSize },
    )
      .then((res) => {
        setUsers(res.data);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters, debouncedSearch, pagination.page, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBan = async (id: string) => {
    await banUser(id);
    load();
  };
  const handleUnban = async (id: string) => {
    await unbanUser(id);
    load();
  };
  const handleDelete = async (id: string) => {
    await deleteUser(id);
    load();
  };

  return {
    users,
    total,
    loading,
    filters,
    setFilters,
    pagination,
    handleBan,
    handleUnban,
    handleDelete,
    reload: load,
  };
}
