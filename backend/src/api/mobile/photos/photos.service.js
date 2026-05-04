import prisma from "../../../config/db.js";
import cloudinary from "../../../config/cloudinary.js";

export const uploadPhoto = async (userId, fileUrl, isMain = false) => {
  // If isMain, unset all other main photos first
  if (isMain) {
    await prisma.userPhoto.updateMany({
      where: { userId },
      data: { isMain: false },
    });
  }

  // If user has no photos yet, make this one main automatically
  const existingCount = await prisma.userPhoto.count({ where: { userId } });
  const shouldBeMain = isMain || existingCount === 0;

  const photo = await prisma.userPhoto.create({
    data: {
      userId,
      url: fileUrl,
      isMain: shouldBeMain,
      order: existingCount,
    },
  });

  // Update user's photoUrl if this is the main photo
  if (shouldBeMain) {
    await prisma.user.update({
      where: { id: userId },
      data: { photoUrl: fileUrl },
    });
  }

  return photo;
};

export const getMyPhotos = (userId) => {
  return prisma.userPhoto.findMany({
    where: { userId },
    orderBy: [{ isMain: "desc" }, { order: "asc" }],
  });
};

export const deletePhoto = async (userId, photoId) => {
  const photo = await prisma.userPhoto.findFirst({
    where: { id: photoId, userId },
  });

  if (!photo) {
    const err = new Error("Photo not found");
    err.statusCode = 404;
    throw err;
  }

  // Delete from Cloudinary
  const publicId = photo.url.split("/").pop()?.split(".")[0];
  if (publicId) {
    await cloudinary.uploader.destroy(
      `${process.env.CLOUDINARY_FOLDER}/${publicId}`,
    );
  }

  await prisma.userPhoto.delete({ where: { id: photoId } });

  // If deleted photo was main, set the next one as main
  if (photo.isMain) {
    const next = await prisma.userPhoto.findFirst({
      where: { userId },
      orderBy: { order: "asc" },
    });
    if (next) {
      await prisma.userPhoto.update({
        where: { id: next.id },
        data: { isMain: true },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { photoUrl: next.url },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { photoUrl: null },
      });
    }
  }
};

export const setMainPhoto = async (userId, photoId) => {
  const photo = await prisma.userPhoto.findFirst({
    where: { id: photoId, userId },
  });

  if (!photo) {
    const err = new Error("Photo not found");
    err.statusCode = 404;
    throw err;
  }

  // Unset all main photos
  await prisma.userPhoto.updateMany({
    where: { userId },
    data: { isMain: false },
  });

  // Set this as main
  const updated = await prisma.userPhoto.update({
    where: { id: photoId },
    data: { isMain: true },
  });

  // Update user's photoUrl
  await prisma.user.update({
    where: { id: userId },
    data: { photoUrl: photo.url },
  });

  return updated;
};
