import prisma from "../../../config/db.js";

const PUBLIC_FIELDS = {
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
  lifestyle: true,
  createdAt: true,
};

export const getMe = (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...PUBLIC_FIELDS,
      email: true,
      dateOfBirth: true,
      preferences: true,
    },
  });
};

export const updateMe = (userId, data) => {
  const { name, bio, profession, date_of_birth, country, district, town } =
    data;
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(bio && { bio }),
      ...(profession && { profession }),
      ...(date_of_birth && { dateOfBirth: new Date(date_of_birth) }),
      ...(country && { country }),
      ...(district && { district }),
      ...(town && { town }),
    },
    select: PUBLIC_FIELDS,
  });
};

export const updateLifestyle = async (userId, data) => {
  return prisma.lifestyle.upsert({
    where: { userId },
    create: { userId, ...data },
    update: { ...data },
  });
};

export const updateInterests = (userId, interests) => {
  return prisma.user.update({
    where: { id: userId },
    data: { interests },
    select: PUBLIC_FIELDS,
  });
};

export const getUserById = async (id, requestingUserId) => {
  // Check if requesting user is blocked
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { initiatorId: requestingUserId, targetId: id },
        { initiatorId: id, targetId: requestingUserId },
      ],
    },
  });
  if (block) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: PUBLIC_FIELDS,
  });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
};

export const deleteMe = (userId) => {
  return prisma.user.delete({ where: { id: userId } });
};
