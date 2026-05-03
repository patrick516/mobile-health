// src/api/admin/notifications/notifications.service.js

import prisma from "../../../config/db.js";
import Expo from "expo-server-sdk";

const expo = new Expo();

export const getBroadcasts = () => {
  return prisma.broadcastNotification.findMany({
    include: { admin: { select: { id: true, name: true } } },
    orderBy: { sentAt: "desc" },
  });
};

export const sendBroadcast = async (
  adminId,
  { title, body, targetGender, targetCountry, isPremiumOnly },
) => {
  // Build user filter
  const userWhere = {
    status: "active",
    ...(targetGender && { gender: targetGender }),
    ...(targetCountry && { country: targetCountry }),
    ...(isPremiumOnly && { isPremium: true }),
  };

  // Get all matching users with their push tokens
  const users = await prisma.user.findMany({
    where: userWhere,
    include: { pushTokens: true },
  });

  // Build expo messages
  const messages = [];
  for (const user of users) {
    for (const { token } of user.pushTokens) {
      if (!Expo.isExpoPushToken(token)) continue;
      messages.push({
        to: token,
        title,
        body,
        sound: "default",
        data: { type: "broadcast" },
      });
    }
  }

  // Send in chunks
  let totalSent = 0;
  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      totalSent += tickets.filter((t) => t.status === "ok").length;

      // Remove invalid tokens
      for (const ticket of tickets) {
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          await prisma.pushToken.deleteMany({ where: { token: ticket.to } });
        }
      }
    } catch (err) {
      console.error("[BROADCAST] Chunk failed:", err);
    }
  }

  // Save broadcast record
  const broadcast = await prisma.broadcastNotification.create({
    data: {
      adminId,
      title,
      body,
      targetGender: targetGender || null,
      targetCountry: targetCountry || null,
      isPremiumOnly: isPremiumOnly || false,
      totalSent,
    },
  });

  return { broadcast, totalSent };
};
