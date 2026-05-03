import { useState } from "react";
import { Card, Badge, Button, EmptyState } from "../../components/ui";
import { Table, Th, Td, Tr } from "../../components/ui/Table";
import { PageLayout } from "../../components/layout/PageLayout";
import { UserCell } from "../../components/shared/UserCell";
import { VerifyModal } from "./components/VerifyModal";
import { useVerification } from "./hooks/useVerification";
import { DOCUMENT_TYPE_LABELS } from "../../lib/constants";
import { timeAgo } from "../../lib/utils";
import type { User } from "../../types";

export function VerificationPage() {
  const { pending, loading, approve, reject } = useVerification();
  const [reviewing, setReviewing] = useState<User | null>(null);

  return (
    <>
      <PageLayout
        title="Identity Verification"
        subtitle={`${pending.length} profiles awaiting review`}
      >
        <Card noPad>
          {loading ? (
            <div className="p-8 text-center text-gray-400 animate-pulse">
              Loading…
            </div>
          ) : pending.length === 0 ? (
            <EmptyState
              icon="✅"
              title="All caught up!"
              description="No pending verifications."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>User</Th>
                  <Th>Document Type</Th>
                  <Th>Submitted</Th>
                  <Th>Photos</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <Tr key={u.id}>
                    <Td>
                      <UserCell user={u} />
                    </Td>
                    <Td>
                      {u.documents[0] ? (
                        <Badge variant="info">
                          {DOCUMENT_TYPE_LABELS[u.documents[0].type]}
                        </Badge>
                      ) : (
                        <Badge variant="gray">No document</Badge>
                      )}
                    </Td>
                    <Td className="text-gray-400">
                      {u.documents[0]
                        ? timeAgo(u.documents[0].uploadedAt)
                        : "—"}
                    </Td>
                    <Td>
                      {u.photos.length} photo{u.photos.length !== 1 ? "s" : ""}
                    </Td>
                    <Td>
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={() => setReviewing(u)}>
                          👁 Review Docs
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => approve(u.id)}
                        >
                          ✅ Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => reject(u.id, "Rejected by admin")}
                        >
                          ✗ Reject
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </PageLayout>

      <VerifyModal
        user={reviewing}
        onClose={() => setReviewing(null)}
        onApprove={approve}
        onReject={reject}
      />
    </>
  );
}
