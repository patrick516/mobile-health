// src/api/mobile/swipe/swipe.service.js

import prisma from "../../../config/db.js";
import { createNotification } from "../notifications/notifications.service.js";

export const likeUser = async (senderId, receiverId) => {
  // Prevent liking yourself
  if (senderId === receiverId) {
    const err = new Error("You cannot like yourself");
    err.statusCode = 400;
    throw err;
  }

  // Record the like
  await prisma.swipe.upsert({
    where: { senderId_receiverId: { senderId, receiverId } },
    create: { senderId, receiverId, action: "like" },
    update: { action: "like" },
  });

  // Notify receiver they got a like — only if they are Premium
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { isPremium: true },
  });

  if (receiver?.isPremium) {
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true },
    });
    await createNotification(receiverId, {
      type: "new_like",
      title: "Someone liked you 💜",
      body: `${sender.name} liked your profile`,
      refUserId: senderId,
    });
  }

  // Check for mutual like → create match
  const mutual = await prisma.swipe.findUnique({
    where: {
      senderId_receiverId: { senderId: receiverId, receiverId: senderId },
    },
  });

  if (mutual?.action === "like") {
    // Sort IDs for consistent unique constraint
    const [user1Id, user2Id] = [senderId, receiverId].sort();

    const match = await prisma.match.upsert({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      create: { user1Id, user2Id, conversation: { create: {} } },
      update: {},
      include: { conversation: true },
    });

    // Get both user names for notifications
    const [user1, user2] = await Promise.all([
      prisma.user.findUnique({
        where: { id: senderId },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: receiverId },
        select: { name: true },
      }),
    ]);

    // Notify both users of the match
    await Promise.all([
      createNotification(senderId, {
        type: "new_match",
        title: "It's a Match! 💜",
        body: `You and ${user2.name} liked each other`,
        refUserId: receiverId,
        refMatchId: match.id,
      }),
      createNotification(receiverId, {
        type: "new_match",
        title: "It's a Match! 💜",
        body: `You and ${user1.name} liked each other`,
        refUserId: senderId,
        refMatchId: match.id,
      }),
    ]);

    return { matched: true, match };
  }

  return { matched: false };
};

export const passUser = async (senderId, receiverId) => {
  // Prevent passing yourself
  if (senderId === receiverId) {
    const err = new Error("You cannot pass yourself");
    err.statusCode = 400;
    throw err;
  }

  return prisma.swipe.upsert({
    where: { senderId_receiverId: { senderId, receiverId } },
    create: { senderId, receiverId, action: "pass" },
    update: { action: "pass" },
  });
};

export const rewind = async (userId) => {
  // Get the last swipe this user made
  const last = await prisma.swipe.findFirst({
    where: { senderId: userId },
    orderBy: { createdAt: "desc" },
  });

  if (!last) {
    const err = new Error("Nothing to rewind");
    err.statusCode = 400;
    throw err;
  }

  // If the last swipe was a like and a match was created — remove the match too
  if (last.action === "like") {
    const [user1Id, user2Id] = [userId, last.receiverId].sort();
    const match = await prisma.match.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    if (match) {
      await prisma.match.delete({
        where: { user1Id_user2Id: { user1Id, user2Id } },
      });
    }
  }

  await prisma.swipe.delete({ where: { id: last.id } });
  return { rewound: { action: last.action, receiverId: last.receiverId } };
};
