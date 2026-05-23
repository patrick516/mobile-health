// src/api/mobile/matches/matches.service.js

import prisma from "../../../config/db.js";
import { createNotification } from "../notifications/notifications.service.js";

const MATCH_USER_SELECT = {
  id: true,
  name: true,
  age: true,
  photoUrl: true,
  online: true,
  verified: true,
  profession: true,
  country: true,
  district: true,
  town: true,
};

export const getMatches = async (userId) => {
  const matches = await prisma.match.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: MATCH_USER_SELECT },
      user2: { select: MATCH_USER_SELECT },
      conversation: { select: { id: true } },
    },
    orderBy: { matchedAt: "desc" },
  });

  return matches.map((m) => ({
    id: m.id,
    matchedAt: m.matchedAt,
    conversationId: m.conversation?.id,
    user: m.user1Id === userId ? m.user2 : m.user1,
  }));
};

export const getMatchWithUser = async (userId, otherUserId) => {
  const [id1, id2] = [userId, otherUserId].sort();
  const match = await prisma.match.findUnique({
    where: { user1Id_user2Id: { user1Id: id1, user2Id: id2 } },
    include: { conversation: { select: { id: true } } },
  });
  return match ?? null;
};

export const getLikesReceived = async (userId) => {
  const likes = await prisma.swipe.findMany({
    where: { receiverId: userId, action: "like" },
    include: { sender: { select: MATCH_USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
  return likes.map((l) => ({ ...l.sender, likedAt: l.createdAt }));
};

export const getLikesSent = async (userId) => {
  const likes = await prisma.swipe.findMany({
    where: { senderId: userId, action: "like" },
    include: { receiver: { select: MATCH_USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
  return likes.map((l) => ({ ...l.receiver, likedAt: l.createdAt }));
};

/**
 * Called internally from admin service when admin manually creates a match
 * between two users who requested it
 */
export const createManualMatch = async (user1Id, user2Id) => {
  const [id1, id2] = [user1Id, user2Id].sort();

  const match = await prisma.match.upsert({
    where: { user1Id_user2Id: { user1Id: id1, user2Id: id2 } },
    create: { user1Id: id1, user2Id: id2, conversation: { create: {} } },
    update: {},
    include: { conversation: true },
  });

  const [user1, user2] = await Promise.all([
    prisma.user.findUnique({ where: { id: user1Id }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: user2Id }, select: { name: true } }),
  ]);

  // Notify both users
  await Promise.all([
    createNotification(user1Id, {
      type: "new_match",
      title: "It's a Match! 💜",
      body: `You and ${user2.name} have been matched`,
      refUserId: user2Id,
      refMatchId: match.id,
    }),
    createNotification(user2Id, {
      type: "new_match",
      title: "It's a Match! 💜",
      body: `You and ${user1.name} have been matched`,
      refUserId: user1Id,
      refMatchId: match.id,
    }),
  ]);

  return match;
};
