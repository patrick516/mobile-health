// src/api/admin/users/users.service.js

import prisma from "../../../config/db.js";

export const getAllUsers = async ({ page, limit, skip, filters }) => {
  const { search, gender, isPremium, verified, status, country } = filters;

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(gender && { gender }),
    ...(country && { country }),
    ...(isPremium !== undefined && { isPremium: isPremium === "true" }),
    ...(verified !== undefined && { verified: verified === "true" }),
    ...(status && { status }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        gender: true,
        age: true,
        verified: true,
        isPremium: true,
        online: true,
        status: true,
        country: true,
        district: true,
        town: true,
        photoUrl: true,
        createdAt: true,
        lastSeenAt: true,
        _count: {
          select: {
            photos: true,
            matchesAsUser1: true,
            matchesAsUser2: true,
            reportsReceived: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page };
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      photos: true,
      lifestyle: true,
      subscription: true,
      verificationRequest: true,
      _count: {
        select: {
          sentSwipes: true,
          matchesAsUser1: true,
          matchesAsUser2: true,
          reportsReceived: true,
          reportsSubmitted: true,
        },
      },
    },
  });

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const { password, ...safe } = user;
  return safe;
};

export const updateUser = (id, data) => {
  const { name, bio, profession, country, district, town, gender } = data;
  return prisma.user.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(bio && { bio }),
      ...(profession && { profession }),
      ...(country && { country }),
      ...(district && { district }),
      ...(town && { town }),
      ...(gender && { gender }),
    },
  });
};

export const verifyUser = (id) => {
  return prisma.user.update({
    where: { id },
    data: { verified: true },
  });
};

export const suspendUser = (id, days = 7, reason) => {
  const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return prisma.user.update({
    where: { id },
    data: { status: "suspended", suspendedUntil, bannedReason: reason || null },
  });
};

export const banUser = (id, reason) => {
  return prisma.user.update({
    where: { id },
    data: { status: "banned", bannedReason: reason || null },
  });
};

export const unbanUser = (id) => {
  return prisma.user.update({
    where: { id },
    data: { status: "active", bannedReason: null, suspendedUntil: null },
  });
};

export const deleteUser = (id) => {
  return prisma.user.delete({ where: { id } });
};

export const grantPremium = async (id, plan = "monthly", days = 30) => {
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { userId: id },
      create: {
        userId: id,
        plan,
        isActive: true,
        startedAt: new Date(),
        expiresAt,
        grantedByAdmin: true,
      },
      update: {
        plan,
        isActive: true,
        startedAt: new Date(),
        expiresAt,
        grantedByAdmin: true,
      },
    }),
    prisma.user.update({ where: { id }, data: { isPremium: true } }),
  ]);

  return { isPremium: true, expiresAt, plan };
};

export const revokePremium = async (id) => {
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { userId: id },
      data: { isActive: false, cancelledAt: new Date() },
    }),
    prisma.user.update({ where: { id }, data: { isPremium: false } }),
  ]);
};
