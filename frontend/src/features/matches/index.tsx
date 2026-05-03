import { Card, Badge, Button, EmptyState } from "../../components/ui";
import { Table, Th, Td, Tr } from "../../components/ui/Table";
import { PageLayout } from "../../components/layout/PageLayout";
import { Pagination } from "../../components/ui/Pagination";
import { CreateMatchModal } from "./components/CreateMatchModal";
import { useMatches } from "./hooks/useMatches";
import { useUIStore } from "../../store/uiStore";
import { timeAgo } from "../../lib/utils";

export function MatchesPage() {
  const { matches, total, loading, pagination, createMatch, dissolve } =
    useMatches();
  const { openModal, showModal, hideModal } = useUIStore();

  return (
    <>
      <PageLayout
        title="Match Management"
        subtitle={`${total} total matches`}
        action={
          <Button variant="primary" onClick={() => showModal("match")}>
            💞 Create Manual Match
          </Button>
        }
      >
        <Card noPad>
          {loading ? (
            <div className="p-8 text-center text-gray-400 animate-pulse">
              Loading…
            </div>
          ) : matches.length === 0 ? (
            <EmptyState icon="💞" title="No matches yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>User 1</Th>
                  <Th>User 2</Th>
                  <Th>Type</Th>
                  <Th>Matched</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <Tr key={m.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: m.user1AvatarColor }}
                        >
                          {m.user1Initials}
                        </div>
                        <span className="text-sm font-medium">
                          {m.user1Name}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: m.user2AvatarColor }}
                        >
                          {m.user2Initials}
                        </div>
                        <span className="text-sm font-medium">
                          {m.user2Name}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <Badge variant={m.type === "manual" ? "purple" : "gray"}>
                        {m.type}
                      </Badge>
                    </Td>
                    <Td className="text-gray-400 text-xs">
                      {timeAgo(m.createdAt)}
                    </Td>
                    <Td>
                      <Badge
                        variant={m.status === "active" ? "success" : "gray"}
                      >
                        {m.status}
                      </Badge>
                    </Td>
                    <Td>
                      {m.status === "active" && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => dissolve(m.id)}
                        >
                          Dissolve
                        </Button>
                      )}
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

      <CreateMatchModal
        open={openModal === "match"}
        onClose={hideModal}
        onCreate={createMatch}
      />
    </>
  );
}
