import { Button } from "./Button";

interface Props {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}

export function Pagination({ page, total, pageSize, onPageChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const visible = Array.from({ length: Math.min(5, pages) }, (_, i) => {
    if (pages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= pages - 2) return pages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-purple-100">
      <span className="text-xs text-gray-400">
        Showing {Math.min((page - 1) * pageSize + 1, total)}–
        {Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1">
        <Button
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          ← Prev
        </Button>
        {visible.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === page ? "primary" : "outline"}
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}
