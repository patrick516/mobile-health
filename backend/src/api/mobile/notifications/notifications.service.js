// src/api/mobile/notifications/notifications.service.js

import prisma from "../../../config/db.js";
import Expo from "expo-server-sdk";

// Create a single Expo instance reused across all calls
const expo = new Expo();

export const getNotifications = (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

export const markOneRead = async (notificationId, userId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    const err = new Error("Notification not found");
    err.statusCode = 404;
    throw err;
  }

  if (notification.userId !== userId) {
    const err = new Error("Unauthorized");
    err.statusCode = 403;
    throw err;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
};

export const markAllRead = (userId) => {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
};

export const registerPushToken = (userId, { token, platform }) => {
  return prisma.pushToken.upsert({
    where: { token },
    create: { userId, token, platform },
    update: { userId, platform },
  });
};

/**
 * Internal helper — called from other services to create and push a notification
 * Types: new_match | new_message | new_like | profile_view
 */
export const createNotification = async (
  userId,
  { type, title, body, refUserId, refMatchId, refMsgId },
) => {
  // 1. Save notification to DB
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      refUserId: refUserId || null,
      refMatchId: refMatchId || null,
      refMsgId: refMsgId || null,
    },
  });

  // 2. Get all push tokens for this user
  const pushTokens = await prisma.pushToken.findMany({
    where: { userId },
  });

  if (pushTokens.length === 0) return notification;

  // 3. Build messages — filter out invalid tokens
  const messages = [];

  for (const { token } of pushTokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`[PUSH] Invalid Expo push token: ${token} — skipping`);
      continue;
    }

    messages.push({
      to: token,
      title,
      body,
      sound: "default",
      data: {
        type,
        refUserId: refUserId || null,
        refMatchId: refMatchId || null,
        refMsgId: refMsgId || null,
      },
    });
  }

  if (messages.length === 0) return notification;

  // 4. Chunk messages — Expo recommends max 100 per request
  const chunks = expo.chunkPushNotifications(messages);
  const receipts = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      receipts.push(...ticketChunk);
    } catch (err) {
      console.error("[PUSH] Failed to send push notification chunk:", err);
    }
  }

  // 5. Log any errors from Expo
  for (const receipt of receipts) {
    if (receipt.status === "error") {
      console.error(`[PUSH] Expo error: ${receipt.message}`);

      // If token is invalid remove it from DB so we don't keep sending to it
      if (receipt.details?.error === "DeviceNotRegistered") {
        const badToken = messages.find((m) => m.to === receipt.to)?.to;
        if (badToken) {
          await prisma.pushToken.deleteMany({ where: { token: badToken } });
          console.warn(`[PUSH] Removed invalid token: ${badToken}`);
        }
      }
    }
  }

  return notification;
};
