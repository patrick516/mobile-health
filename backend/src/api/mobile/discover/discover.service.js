import prisma from "../../../config/db.js";

const USER_CARD_SELECT = {
  id: true,
  name: true,
  age: true,
  gender: true,
  verified: true,
  profession: true,
  country: true,
  district: true,
  town: true,
  bio: true,
  interests: true,
  photoUrl: true,
  online: true,
  isPremium: true,
  photos: {
    select: { id: true, url: true, isMain: true },
    orderBy: [{ isMain: "desc" }, { order: "asc" }],
  },
  lifestyle: true,
};

// Get users the current user has already swiped on
const getSwipedIds = async (userId) => {
  const swipes = await prisma.swipe.findMany({
    where: { senderId: userId },
    select: { receiverId: true },
  });
  return swipes.map((s) => s.receiverId);
};

// Get users who blocked or are blocked by current user
const getBlockedIds = async (userId) => {
  const blocks = await prisma.block.findMany({
    where: {
      OR: [{ initiatorId: userId }, { targetId: userId }],
    },
    select: { initiatorId: true, targetId: true },
  });
  return blocks.map((b) =>
    b.initiatorId === userId ? b.targetId : b.initiatorId,
  );
};

export const getDiscover = async (currentUser, { page, limit, skip }) => {
  const swipedIds = await getSwipedIds(currentUser.id);
  const blockedIds = await getBlockedIds(currentUser.id);

  const excludeIds = [
    ...new Set([...swipedIds, ...blockedIds, currentUser.id]),
  ];

  // Show opposite gender by default
  const oppositeGender = currentUser.gender === "male" ? "female" : "male";

  // Check if user has preferences
  const preferences = await prisma.discoveryPreference.findUnique({
    where: { userId: currentUser.id },
  });

  const where = {
    id: { notIn: excludeIds },
    status: "active",
    gender: oppositeGender,
    ...(preferences?.minAge && { age: { gte: preferences.minAge } }),
    ...(preferences?.maxAge && {
      age: {
        gte: preferences.minAge ?? 18,
        lte: preferences.maxAge,
      },
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_CARD_SELECT,
      skip,
      take: limit,
      orderBy: [{ online: "desc" }, { createdAt: "desc" }],
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page };
};

export const getForYou = async (currentUser, { page, limit, skip }) => {
  const swipedIds = await getSwipedIds(currentUser.id);
  const blockedIds = await getBlockedIds(currentUser.id);

  const excludeIds = [
    ...new Set([...swipedIds, ...blockedIds, currentUser.id]),
  ];

  // For You = opposite gender + verified + premium first
  const oppositeGender = currentUser.gender === "male" ? "female" : "male";

  const where = {
    id: { notIn: excludeIds },
    status: "active",
    gender: oppositeGender,
    photoUrl: { not: null }, // must have a photo
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_CARD_SELECT,
      skip,
      take: limit,
      orderBy: [
        { isPremium: "desc" },
        { verified: "desc" },
        { online: "desc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page };
};
