import { useState } from "react";
import { PAGE_SIZE_DEFAULT } from "../lib/constants";

export function usePagination(initialPageSize = PAGE_SIZE_DEFAULT) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  function reset() {
    setPage(1);
  }

  function goTo(p: number) {
    setPage(p);
  }

  function totalPages(total: number) {
    return Math.max(1, Math.ceil(total / pageSize));
  }

  return { page, pageSize, setPage: goTo, setPageSize, reset, totalPages };
}
