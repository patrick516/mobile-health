// src/api/admin/verification/verification.service.js

import prisma from "../../../config/db.js";
import { sendMail } from "../../../utils/mailer.js";

export const getAllVerifications = async ({ page, limit, skip, status }) => {
  const where = {
    ...(status && { status }),
  };

  const [verifications, total] = await Promise.all([
    prisma.verificationRequest.findMany({
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
        reviewedBy: { select: { id: true, name: true } },
      },
      skip,
      take: limit,
      orderBy: { submittedAt: "desc" },
    }),
    prisma.verificationRequest.count({ where }),
  ]);

  return { verifications, total, page };
};

export const getVerificationById = async (id) => {
  const verification = await prisma.verificationRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          gender: true,
          country: true,
          district: true,
          dateOfBirth: true,
          photos: { select: { url: true, isMain: true, order: true } },
        },
      },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  if (!verification) {
    const err = new Error("Verification request not found");
    err.statusCode = 404;
    throw err;
  }

  return verification;
};

export const approveVerification = async (id, adminId) => {
  const verification = await prisma.verificationRequest.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!verification) {
    const err = new Error("Verification request not found");
    err.statusCode = 404;
    throw err;
  }

  // Update verification and mark user as verified
  const [updated] = await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id },
      data: {
        status: "approved",
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: verification.userId },
      data: { verified: true },
    }),
  ]);

  // Email user
  await sendMail({
    to: verification.user.email,
    subject: "Your identity has been verified ✅ — AnzathuConnect",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">Identity Verified 💜</h2>
        <p>Hi <strong>${verification.user.name}</strong>,</p>
        <p>Great news! Your identity verification has been <strong style="color: #059669;">approved</strong>.</p>
        <p>You now have a verified badge on your profile. This helps other users trust that you are a real person.</p>
        <p style="color: #6B7280; font-size: 13px;">— The AnzathuConnect Team</p>
      </div>
    `,
  });

  return { verification: updated };
};

export const rejectVerification = async (id, adminId, rejectionReason) => {
  const verification = await prisma.verificationRequest.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!verification) {
    const err = new Error("Verification request not found");
    err.statusCode = 404;
    throw err;
  }

  const updated = await prisma.verificationRequest.update({
    where: { id },
    data: {
      status: "rejected",
      reviewedById: adminId,
      reviewedAt: new Date(),
      rejectionReason,
    },
  });

  // Email user with rejection reason so they can resubmit
  await sendMail({
    to: verification.user.email,
    subject: "Verification update — AnzathuConnect",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">Verification Update</h2>
        <p>Hi <strong>${verification.user.name}</strong>,</p>
        <p>Unfortunately your identity verification was <strong style="color: #DC2626;">not approved</strong> for the following reason:</p>
        <div style="background: #FFF0F9; padding: 16px; border-left: 4px solid #E91E8C; margin: 16px 0;">
          <p style="margin: 0;">${rejectionReason}</p>
        </div>
        <p>Please resubmit your documents addressing the issue above.</p>
        <p style="color: #6B7280; font-size: 13px;">— The AnzathuConnect Team</p>
      </div>
    `,
  });

  return { verification: updated };
};
