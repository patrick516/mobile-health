import { Badge, Button } from "../../../components/ui";
import { UserCell } from "../../../components/shared/UserCell";
import { Td, Tr } from "../../../components/ui/Table";
import { formatDate } from "../../../lib/utils";
import { PLAN_LABELS } from "../../../lib/constants";
import { useUIStore } from "../../../store/uiStore";
import type { User } from "../../../types";

const statusVariant = {
  active: "success",
  banned: "danger",
  suspended: "warning",
  pending_verification: "warning",
} as const;
const verifyVariant = {
  verified: "success",
  unverified: "gray",
  pending: "warning",
  rejected: "danger",
} as const;

interface Props {
  user: User;
  onBan: (id: string) => void;
  onUnban: (id: string) => void;
  onDelete: (id: string) => void;
}

export function UserRow({ user, onBan, onUnban, onDelete }: Props) {
  const { setSelectedUser } = useUIStore();

  return (
    <Tr className={user.status === "banned" ? "opacity-60" : ""}>
      <Td>
        <UserCell user={user} />
      </Td>
      <Td>{user.locationName}</Td>
      <Td className="text-gray-400">{formatDate(user.joinedAt)}</Td>
      <Td>
        <Badge variant={statusVariant[user.status]}>
          {user.isOnline && user.status === "active"
            ? "● Online"
            : user.status.replace("_", " ")}
        </Badge>
      </Td>
      <Td>
        <Badge variant={verifyVariant[user.verificationStatus]}>
          {user.verificationStatus.replace("_", " ")}
        </Badge>
      </Td>
      <Td>
        {user.plan === "free" ? (
          <Badge variant="gray">Free</Badge>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-50 to-violet-50 border border-fuchsia-200 text-violet-700">
            💎 {PLAN_LABELS[user.plan]}
          </span>
        )}
      </Td>
      <Td>
        <div className="flex gap-1.5 flex-wrap">
          <Button size="sm" onClick={() => setSelectedUser(user)}>
            View
          </Button>
          {user.status === "banned" ? (
            <>
              <Button
                size="sm"
                variant="success"
                onClick={() => onUnban(user.id)}
              >
                Unban
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => onDelete(user.id)}
              >
                Delete
              </Button>
            </>
          ) : (
            <Button size="sm" variant="danger" onClick={() => onBan(user.id)}>
              Ban
            </Button>
          )}
        </div>
      </Td>
    </Tr>
  );
}
