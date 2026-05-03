import { useState, useEffect, useCallback } from "react";
import {
  fetchNotifications,
  sendBroadcast,
} from "../../../services/notificationsService";
import type { Notification, NotificationAudience } from "../../../types";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchNotifications()
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const broadcast = async (data: {
    title: string;
    body: string;
    audience: NotificationAudience;
  }) => {
    setSending(true);
    try {
      await sendBroadcast(data);
      load();
    } finally {
      setSending(false);
    }
  };

  return { notifications, loading, sending, broadcast, reload: load };
}
