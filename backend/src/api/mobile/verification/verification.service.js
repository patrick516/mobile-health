import prisma from "../../../config/db.js";

export const getMyVerification = async (userId) => {
  return prisma.verificationRequest.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      documentType: true,
      documentUrl: true,
      selfieUrl: true,
      rejectionReason: true,
      submittedAt: true,
      reviewedAt: true,
    },
  });
};

export const submitVerification = async (
  userId,
  documentType,
  documentUrl,
  selfieUrl,
) => {
  if (!documentType) {
    const err = new Error("Document type is required");
    err.statusCode = 400;
    throw err;
  }

  return prisma.verificationRequest.upsert({
    where: { userId },
    create: {
      userId,
      documentType,
      documentUrl,
      selfieUrl,
      status: "pending",
    },
    update: {
      documentType,
      documentUrl,
      selfieUrl,
      status: "pending",
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    },
  });
};
