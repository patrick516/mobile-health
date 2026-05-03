import { useState } from "react";
import { Card, Badge, Button, Select } from "../../components/ui";
import { PageLayout } from "../../components/layout/PageLayout";
import { SectionHeader } from "../../components/shared/SectionHeader";
import { useNotifications } from "./hooks/useNotifications";
import { formatDate } from "../../lib/utils";
import type { NotificationAudience } from "../../types";

const AUDIENCE_LABELS: Record<string, string> = {
  all: "All Users (24,631)",
  premium: "Premium Users Only (4,433)",
  free: "Free Users (20,198)",
  unverified: "Unverified Users (8,867)",
  inactive: "Inactive 30+ days",
};

export function NotificationsPage() {
  const { notifications, loading, sending, broadcast } = useNotifications();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<NotificationAudience>("all");

  const handleSend = async () => {
    if (!title || !body) return;
    await broadcast({ title, body, audience });
    setTitle("");
    setBody("");
  };

  return (
    <PageLayout
      title="Push Notifications"
      subtitle="Broadcast messages to users"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Compose */}
        <Card>
          <SectionHeader title="Compose Notification" />
          <div className="space-y-3 mt-3">
            <Select
              label="Target Audience"
              value={audience}
              onChange={(e) =>
                setAudience(e.target.value as NotificationAudience)
              }
            >
              {Object.entries(AUDIENCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-purple-400 block mb-1">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title…"
                className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm outline-none focus:border-fuchsia-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-purple-400 block mb-1">
                Message
              </label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message…"
                className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 resize-none"
              />
            </div>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={handleSend}
              loading={sending}
              disabled={!title || !body}
            >
              🔔 Send Broadcast
            </Button>
          </div>
        </Card>

        <div className="space-y-5">
          {/* Preview */}
          <Card>
            <SectionHeader title="Preview" />
            <div className="mt-3 bg-gradient-to-br from-[#1a0d2e] to-[#2d1060] rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-md flex items-center justify-center text-xs">
                  💜
                </div>
                <span className="text-[11px] opacity-50">
                  AnzathuConnect · now
                </span>
              </div>
              <p className="text-sm font-semibold mb-1">
                {title || "Your notification title here"}
              </p>
              <p className="text-xs opacity-60">
                {body || "Your message body will appear here…"}
              </p>
            </div>
          </Card>

          {/* History */}
          <Card noPad>
            <SectionHeader title="Recent Broadcasts" />
            {loading ? (
              <div className="p-4 text-center text-gray-400 animate-pulse">
                Loading…
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="px-5 py-3.5 border-b border-purple-50 last:border-0 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {AUDIENCE_LABELS[n.audience]?.split("(")[0].trim()} ·{" "}
                      {formatDate(n.sentAt)} ·{" "}
                      {n.deliveredCount.toLocaleString()} delivered
                    </p>
                  </div>
                  <Badge variant="success">Sent</Badge>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
