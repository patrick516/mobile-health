import { useState } from "react";
import { Card, Badge, Button, EmptyState } from "../../components/ui";
import { Table, Th, Td, Tr } from "../../components/ui/Table";
import { PageLayout } from "../../components/layout/PageLayout";
import { FilterBar } from "../../components/shared/FilterBar";
import { Pagination } from "../../components/ui/Pagination";
import { ReportModal } from "./components/ReportModal";
import { useReports } from "./hooks/useReports";
import { REPORT_TYPE_LABELS } from "../../lib/constants";
import { timeAgo } from "../../lib/utils";
import type { Report } from "../../types";

const STATUS_PILLS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Under Review", value: "under_review" },
  { label: "Resolved", value: "resolved" },
];
const statusVariant = {
  pending: "warning",
  under_review: "info",
  resolved: "success",
  dismissed: "gray",
} as const;
const typeVariant = {
  inappropriate_photo: "danger",
  harassment: "warning",
  fake_profile: "info",
  spam: "gray",
  other: "gray",
} as const;

export function ReportsPage() {
  const {
    reports,
    total,
    loading,
    filters,
    setFilters,
    pagination,
    resolve,
    dismiss,
  } = useReports();
  const [reviewing, setReviewing] = useState<Report | null>(null);

  return (
    <>
      <PageLayout
        title="Content & User Reports"
        subtitle={`${total} open · 8,200+ resolved`}
      >
        <Card noPad>
          <FilterBar
            pills={STATUS_PILLS}
            activeValue={filters.status ?? "all"}
            onPillChange={(v) =>
              setFilters((prev) => ({
                ...prev,
                status: v as typeof filters.status,
              }))
            }
          />

          {loading ? (
            <div className="p-8 text-center text-gray-400 animate-pulse">
              Loading…
            </div>
          ) : reports.length === 0 ? (
            <EmptyState icon="🚩" title="No reports found" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Reporter</Th>
                  <Th>Reported User</Th>
                  <Th>Type</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <Tr key={r.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: r.reporterAvatarColor }}
                        >
                          {r.reporterInitials}
                        </div>
                        <span className="text-sm font-medium text-gray-800">
                          {r.reporterName}
                        </span>
                      </div>
                    </Td>
                    <Td className="font-medium">{r.reportedUserName}</Td>
                    <Td>
                      <Badge variant={typeVariant[r.type]}>
                        {REPORT_TYPE_LABELS[r.type]}
                      </Badge>
                    </Td>
                    <Td className="text-gray-400 text-xs">
                      {timeAgo(r.createdAt)}
                    </Td>
                    <Td>
                      <Badge variant={statusVariant[r.status]}>
                        {r.status.replace("_", " ")}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={() => setReviewing(r)}>
                          Review
                        </Button>
                        {r.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => dismiss(r.id)}
                          >
                            Dismiss
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
          <Pagination
            page={pagination.page}
            total={total}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
          />
        </Card>
      </PageLayout>

      <ReportModal
        report={reviewing}
        onClose={() => setReviewing(null)}
        onResolve={resolve}
        onDismiss={dismiss}
      />
    </>
  );
}
