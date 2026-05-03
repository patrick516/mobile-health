import { Card, Badge, Button, EmptyState } from "../../components/ui";
import { Table, Th, Td, Tr } from "../../components/ui/Table";
import { PageLayout } from "../../components/layout/PageLayout";
import { StatCard } from "../../components/shared/StatCard";
import { Pagination } from "../../components/ui/Pagination";
import { useSubscriptions } from "./hooks/useSubscriptions";
import { formatDate } from "../../lib/utils";
import { PLAN_LABELS } from "../../lib/constants";

export function SubscriptionsPage() {
  const { subscriptions, total, loading, pagination, revoke } =
    useSubscriptions();

  return (
    <PageLayout
      title="Subscription Management"
      subtitle={`${total} premium subscribers`}
    >
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard label="Premium Users" value={String(total)} accent="purple" />
        <StatCard label="Revenue (MWK)" value="—" accent="teal" />
        <StatCard label="Avg Subscription" value="—" accent="blue" />
      </div>

      <Card noPad>
        {loading ? (
          <div className="p-8 text-center text-gray-400 animate-pulse">
            Loading…
          </div>
        ) : subscriptions.length === 0 ? (
          <EmptyState icon="💎" title="No subscriptions found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Plan</Th>
                <Th>Started</Th>
                <Th>Expires</Th>
                <Th>Payment</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: s.userAvatarColor }}
                      >
                        {s.userInitials}
                      </div>
                      <span className="font-medium text-gray-900">
                        {s.userName}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-violet-700">
                      💎 {PLAN_LABELS[s.plan]}
                    </span>
                  </Td>
                  <Td className="text-gray-400">{formatDate(s.startedAt)}</Td>
                  <Td className="text-gray-400">{formatDate(s.expiresAt)}</Td>
                  <Td>
                    <Badge
                      variant={
                        s.paymentStatus === "paid"
                          ? "success"
                          : s.paymentStatus === "expired"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {s.paymentStatus}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <Button size="sm">History</Button>
                      {s.isActive ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => revoke(s.id)}
                        >
                          Revoke
                        </Button>
                      ) : (
                        <Button size="sm" variant="success">
                          Grant
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
  );
}
