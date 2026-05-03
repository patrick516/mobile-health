import { Avatar } from "../ui/Avatar";
import type { User } from "../../types";

interface Props {
  user: Pick<
    User,
    | "name"
    | "email"
    | "initials"
    | "avatarColor"
    | "isOnline"
    | "verificationStatus"
  >;
  sub?: string;
  size?: "sm" | "md";
}

export function UserCell({ user, sub, size = "md" }: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar
        initials={user.initials}
        color={user.avatarColor}
        size={size}
        isOnline={user.isOnline}
        isVerified={user.verificationStatus === "verified"}
      />
      <div className="min-w-0">
        <p className="font-medium text-gray-900 text-sm leading-tight truncate">
          {user.name}
        </p>
        <p className="text-xs text-gray-400 truncate">{sub ?? user.email}</p>
      </div>
    </div>
  );
}
