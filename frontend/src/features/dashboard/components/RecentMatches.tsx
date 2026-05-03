import { timeAgo } from "../../../lib/utils";
import { useUIStore } from "../../../store/uiStore";
import type { Match } from "../../../types";

interface Props {
  matches: Match[];
}

export function RecentMatches({ matches }: Props) {
  const { setActivePage } = useUIStore();
  return (
    <div>
      {matches.slice(0, 4).map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 px-5 py-3 border-b border-purple-50 last:border-0"
        >
          <div className="flex -space-x-2 flex-shrink-0">
            {[
              { initials: m.user1Initials, color: m.user1AvatarColor },
              { initials: m.user2Initials, color: m.user2AvatarColor },
            ].map((u, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white"
                style={{ background: u.color }}
              >
                {u.initials}
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {m.user1Name} & {m.user2Name}
            </p>
            <p className="text-xs text-gray-400">
              {m.locationName} · {timeAgo(m.createdAt)}
            </p>
          </div>
          {m.type === "manual" && (
            <span className="text-[10px] px-2 py-0.5 bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 rounded-full font-semibold">
              Manual
            </span>
          )}
          <span className="text-base">💜</span>
        </div>
      ))}
      <div className="px-5 py-3 border-t border-purple-100">
        <button
          onClick={() => setActivePage("matches")}
          className="text-xs text-fuchsia-600 font-medium hover:underline"
        >
          View all matches →
        </button>
      </div>
    </div>
  );
}
