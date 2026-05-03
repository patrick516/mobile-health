import { delay } from "../lib/utils";
import { MOCK_NOTIFICATIONS } from "../lib/mockData";
import type { Notification, NotificationAudience } from "../types";

export async function fetchNotifications(): Promise<Notification[]> {
  await delay(300);
  return MOCK_NOTIFICATIONS;
  // REAL: return api.get<Notification[]>('/admin/notifications');
}

export async function sendBroadcast(data: {
  title: string;
  body: string;
  audience: NotificationAudience;
}): Promise<void> {
  await delay(600);
  MOCK_NOTIFICATIONS.unshift({
    id: `n${Date.now()}`,
    ...data,
    sentAt: new Date().toISOString(),
    deliveredCount: 0,
    status: "sent",
  });
  // REAL: return api.post('/admin/notifications/broadcast', data);
}
