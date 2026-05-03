import { Card } from "../../components/ui";
import { PageLayout } from "../../components/layout/PageLayout";
import { Table, Th } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui";
import { EmptyState } from "../../components/ui";
import { UserRow } from "./components/UserRow";
import { UserFiltersBar } from "./components/UserFiltersBar";
import { UserDrawer } from "./components/UserDrawer";
import { useUsers } from "./hooks/useUsers";
import { shortNumber } from "../../lib/utils";
import { useUIStore } from "../../store/uiStore";

export function UsersPage() {
  const {
    users,
    total,
    loading,
    filters,
    setFilters,
    pagination,
    handleBan,
    handleUnban,
    handleDelete,
  } = useUsers();
  const { selectedUser } = useUIStore();

  return (
    <>
      <PageLayout
        title="User Management"
        subtitle={`${shortNumber(total)} total users · 1,842 online now`}
        action={<Button variant="primary">+ Add User</Button>}
      >
        <Card noPad>
          <UserFiltersBar
            filters={filters}
            onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
          />

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm animate-pulse">
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No users found"
              description="Try adjusting your filters."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>User</Th>
                  <Th>Location</Th>
                  <Th>Joined</Th>
                  <Th>Status</Th>
                  <Th>Verified</Th>
                  <Th>Plan</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onBan={handleBan}
                    onUnban={handleUnban}
                    onDelete={handleDelete}
                  />
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

      {selectedUser && <UserDrawer />}
    </>
  );
}
