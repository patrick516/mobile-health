// src/api/admin/matches/matches.service.js

import prisma from "../../../config/db.js";
import { createNotification } from "../../mobile/notifications/notifications.service.js";

const USER_SELECT = {
  id: true,
  name: true,
  photoUrl: true,
  country: true,
  district: true,
  verified: true,
};

export const getAllMatches = async ({ page, limit, skip }) => {
  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      include: {
        user1: { select: USER_SELECT },
        user2: { select: USER_SELECT },
        createdByAdmin: { select: { id: true, name: true } },
      },
      skip,
      take: limit,
      orderBy: { matchedAt: "desc" },
    }),
    prisma.match.count(),
  ]);

  return { matches, total, page };
};

export const createManualMatch = async (user1Id, user2Id, adminId) => {
  // Check both users exist
  const [user1, user2] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user1Id },
      select: { id: true, name: true },
    }),
    prisma.user.findUnique({
      where: { id: user2Id },
      select: { id: true, name: true },
    }),
  ]);

  if (!user1) {
    const err = new Error("User 1 not found");
    err.statusCode = 404;
    throw err;
  }
  if (!user2) {
    const err = new Error("User 2 not found");
    err.statusCode = 404;
    throw err;
  }

  // Sort IDs for consistent unique constraint
  const [id1, id2] = [user1Id, user2Id].sort();

  const match = await prisma.match.upsert({
    where: { user1Id_user2Id: { user1Id: id1, user2Id: id2 } },
    create: {
      user1Id: id1,
      user2Id: id2,
      createdByAdminId: adminId,
      conversation: { create: {} },
    },
    update: {},
    include: { conversation: true },
  });

  // Notify both users via push
  await Promise.all([
    createNotification(user1Id, {
      type: "new_match",
      title: "It's a Match! 💜",
      body: `You have been matched with ${user2.name}`,
      refUserId: user2Id,
      refMatchId: match.id,
    }),
    createNotification(user2Id, {
      type: "new_match",
      title: "It's a Match! 💜",
      body: `You have been matched with ${user1.name}`,
      refUserId: user1Id,
      refMatchId: match.id,
    }),
  ]);

  return match;
};

export const dissolveMatch = async (id) => {
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) {
    const err = new Error("Match not found");
    err.statusCode = 404;
    throw err;
  }
  return prisma.match.delete({ where: { id } });
};
