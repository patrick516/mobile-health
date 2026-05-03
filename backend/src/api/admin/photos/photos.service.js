// src/api/admin/photos/photos.service.js

import prisma from "../../../config/db.js";

export const getUserPhotos = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  return prisma.userPhoto.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  });
};

export const removePhoto = async (photoId, adminId) => {
  const photo = await prisma.userPhoto.findUnique({ where: { id: photoId } });
  if (!photo) {
    const err = new Error("Photo not found");
    err.statusCode = 404;
    throw err;
  }

  // Mark as removed by admin rather than hard delete
  // so we have a record of moderation actions
  await prisma.userPhoto.update({
    where: { id: photoId },
    data: { removedByAdmin: true, removedAt: new Date() },
  });

  // If it was the main photo, promote the next photo
  if (photo.isMain) {
    const next = await prisma.userPhoto.findFirst({
      where: {
        userId: photo.userId,
        removedByAdmin: false,
        id: { not: photoId },
      },
      orderBy: { order: "asc" },
    });

    if (next) {
      await prisma.$transaction([
        prisma.userPhoto.update({
          where: { id: next.id },
          data: { isMain: true },
        }),
        prisma.user.update({
          where: { id: photo.userId },
          data: { photoUrl: next.url },
        }),
      ]);
    } else {
      // No more photos — clear main photo
      await prisma.user.update({
        where: { id: photo.userId },
        data: { photoUrl: null },
      });
    }
  }
};
