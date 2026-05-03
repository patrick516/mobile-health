import { useState, useEffect, useCallback } from "react";
import {
  fetchReports,
  resolveReport,
  dismissReport,
} from "../../../services/reportsService";
import { usePagination } from "../../../hooks/usePagination";
import type { Report, ReportFilters } from "../../../types";

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReportFilters>({
    status: "all",
    type: "all",
    search: "",
  });
  const pagination = usePagination(20);

  const load = useCallback(() => {
    setLoading(true);
    fetchReports(filters, {
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
      .then((res) => {
        setReports(res.data);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (
    id: string,
    payload: { adminNotes: string; replyEmail: string; action: string },
  ) => {
    await resolveReport(id, payload);
    load();
  };
  const dismiss = async (id: string) => {
    await dismissReport(id);
    load();
  };

  return {
    reports,
    total,
    loading,
    filters,
    setFilters,
    pagination,
    resolve,
    dismiss,
    reload: load,
  };
}
