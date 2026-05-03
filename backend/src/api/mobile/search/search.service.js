// src/api/mobile/search/search.service.js

import prisma from "../../../config/db.js";

export const search = async (q, currentUserId, { page, limit, skip }) => {
  // Get all blocked user IDs in both directions
  const blocks = await prisma.block.findMany({
    where: {
      OR: [{ initiatorId: currentUserId }, { targetId: currentUserId }],
    },
    select: { initiatorId: true, targetId: true },
  });

  const blockedIds = blocks.map((b) =>
    b.initiatorId === currentUserId ? b.targetId : b.initiatorId,
  );

  // Exclude self and blocked users from results
  const excludeIds = [...new Set([...blockedIds, currentUserId])];

  const where = {
    id: { notIn: excludeIds },
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { profession: { contains: q, mode: "insensitive" } },
    ],
  };

  const [results, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        age: true,
        photoUrl: true,
        profession: true,
        country: true,
        district: true,
        town: true,
        verified: true,
        online: true,
        isPremium: true,
        lifestyle: {
          select: { relationshipGoal: true },
        },
      },
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.user.count({ where }),
  ]);

  return { results, total, page };
};
