// src/api/mobile/reports/reports.service.js

import prisma from "../../../config/db.js";

export const reportUser = async (
  submitterId,
  subjectId,
  { reason, description },
) => {
  // Prevent reporting yourself
  if (submitterId === subjectId) {
    const err = new Error("You cannot report yourself");
    err.statusCode = 400;
    throw err;
  }

  // Check subject user exists
  const subject = await prisma.user.findUnique({ where: { id: subjectId } });
  if (!subject) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  // Save report — admin will see this in portal and can reply via email
  // submitter email is available via submitter relation for admin to reply to
  return prisma.report.create({
    data: {
      submitterId,
      subjectId,
      reason,
      description: description || null,
      reviewed: false, // admin marks this true after reviewing
    },
  });
};

export const blockUser = async (initiatorId, targetId) => {
  // Prevent blocking yourself
  if (initiatorId === targetId) {
    const err = new Error("You cannot block yourself");
    err.statusCode = 400;
    throw err;
  }

  // Check target exists
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  return prisma.block.upsert({
    where: { initiatorId_targetId: { initiatorId, targetId } },
    create: { initiatorId, targetId },
    update: {}, // already blocked — no-op
  });
};

export const getBlocked = async (userId) => {
  const blocks = await prisma.block.findMany({
    where: { initiatorId: userId },
    include: {
      target: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
          country: true,
          district: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return blocks.map((b) => ({
    ...b.target,
    blockedAt: b.createdAt,
  }));
};

export const unblockUser = async (initiatorId, targetId) => {
  const block = await prisma.block.findUnique({
    where: { initiatorId_targetId: { initiatorId, targetId } },
  });

  if (!block) {
    const err = new Error("Block not found");
    err.statusCode = 404;
    throw err;
  }

  return prisma.block.delete({
    where: { initiatorId_targetId: { initiatorId, targetId } },
  });
};
