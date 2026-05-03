import { useUIStore } from "../../../store/uiStore";
import { Avatar, Badge, Button } from "../../../components/ui";
import { formatDate, timeAgo } from "../../../lib/utils";
import { PLAN_LABELS } from "../../../lib/constants";

export function UserDrawer() {
  const { selectedUser, setSelectedUser, showModal } = useUIStore();
  if (!selectedUser) return null;
  const u = selectedUser;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={() => setSelectedUser(null)}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-purple-100 z-50 overflow-y-auto shadow-2xl">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">User Profile</h2>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-sm text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1"
            >
              ✕ Close
            </button>
          </div>

          {/* Avatar + name */}
          <div className="text-center mb-5">
            <Avatar
              initials={u.initials}
              color={u.avatarColor}
              size="xl"
              isOnline={u.isOnline}
              className="mx-auto mb-3"
            />
            <h3 className="font-bold text-gray-900 text-lg">{u.name}</h3>
            <p className="text-sm text-gray-400">
              {u.gender === "male" ? "Male" : "Female"}, {u.age} ·{" "}
              {u.locationName}
            </p>
            <div className="flex justify-center gap-2 mt-2">
              <Badge
                variant={
                  u.verificationStatus === "verified" ? "success" : "warning"
                }
              >
                {u.verificationStatus === "verified"
                  ? "✅ Verified"
                  : u.verificationStatus}
              </Badge>
              {u.plan !== "free" && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-violet-700">
                  💎 {PLAN_LABELS[u.plan]}
                </span>
              )}
            </div>
          </div>

          {/* Photos */}
          {u.photos.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Profile Photos
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {u.photos.map((p) => (
                  <div
                    key={p.id}
                    className="relative aspect-square rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-2xl overflow-hidden group"
                  >
                    <span>🤳</span>
                    {p.isMain && (
                      <span className="absolute bottom-1 left-1 text-[9px] bg-fuchsia-600 text-white px-1 py-0.5 rounded font-bold uppercase">
                        Main
                      </span>
                    )}
                    <button className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {u.documents.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Documents
              </p>
              {u.documents.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2.5 p-2.5 border border-purple-100 rounded-lg mb-1.5 hover:border-fuchsia-300 cursor-pointer"
                >
                  <span className="text-2xl">🪪</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {d.filename}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {d.fileSizeMb} MB · {timeAgo(d.uploadedAt)}
                    </p>
                  </div>
                  <Button size="sm">👁 View</Button>
                </div>
              ))}
            </div>
          )}

          {/* Details */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Account Details
            </p>
            {[
              ["Email", u.email],
              ["Joined", formatDate(u.joinedAt)],
              [
                "Last active",
                u.isOnline ? "Online now" : timeAgo(u.lastActiveAt),
              ],
              ["Total matches", u.totalMatches],
              ["Messages sent", u.messagesSent],
              ["Reports filed", u.reportsFiled],
              ["Reports against", u.reportsAgainst],
            ].map(([k, v]) => (
              <div
                key={String(k)}
                className="flex justify-between py-2 border-b border-purple-50 last:border-0 text-sm"
              >
                <span className="text-gray-400">{k}</span>
                <span
                  className={`font-medium ${String(k) === "Last active" && u.isOnline ? "text-green-600" : "text-gray-900"}`}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button variant="primary" className="w-full justify-center">
              ✏️ Edit Profile
            </Button>
            <Button
              variant="outline"
              className="w-full justify-center"
              onClick={() => showModal("match")}
            >
              💞 Create Manual Match
            </Button>
            <Button variant="outline" className="w-full justify-center">
              💎 Grant / Revoke Premium
            </Button>
            <Button variant="danger" className="w-full justify-center">
              🚫 Ban User
            </Button>
            <Button
              variant="danger"
              className="w-full justify-center opacity-70"
            >
              🗑 Delete Account
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
