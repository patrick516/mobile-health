import { api } from "../lib/apiClient";
import type { Notification, NotificationAudience } from "../types";

export async function fetchNotifications(): Promise<Notification[]> {
  const res = await api.get<{ broadcasts: any[] }>(
    "/admin/notifications/broadcasts",
  );

  return res.broadcasts.map((b: any) => ({
    id: b.id,
    title: b.title,
    body: b.body,
    audience: b.isPremiumOnly
      ? "premium"
      : b.targetGender || b.targetCountry
        ? "all"
        : "all",
    sentAt: b.sentAt,
    deliveredCount: b.totalSent ?? 0,
    status: "sent" as const,
  }));
}

export async function sendBroadcast(data: {
  title: string;
  body: string;
  audience: NotificationAudience;
}): Promise<void> {
  await api.post("/admin/notifications/broadcast", {
    title: data.title,
    body: data.body,
    isPremiumOnly: data.audience === "premium",
  });
}
