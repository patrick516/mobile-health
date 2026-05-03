// src/api/admin/subscriptions/subscriptions.service.js

import prisma from "../../../config/db.js";

export const getAllSubscriptions = async ({
  page,
  limit,
  skip,
  isActive,
  grantedByAdmin,
  plan,
}) => {
  const where = {
    ...(isActive !== undefined && { isActive: isActive === "true" }),
    ...(grantedByAdmin !== undefined && {
      grantedByAdmin: grantedByAdmin === "true",
    }),
    ...(plan && { plan }),
  };

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            gender: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscription.count({ where }),
  ]);

  return { subscriptions, total, page };
};

export const getSubscriptionByUserId = async (userId) => {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!subscription) {
    const err = new Error("No subscription found for this user");
    err.statusCode = 404;
    throw err;
  }

  return subscription;
};
