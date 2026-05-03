// src/api/admin/reports/reports.service.js

import prisma from "../../../config/db.js";
import { sendMail, reportReplyTemplate } from "../../../utils/mailer.js";

export const getAllReports = async ({ page, limit, skip, status, reason }) => {
  const where = {
    ...(status && { status }),
    ...(reason && { reason }),
  };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        submitter: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
        subject: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
        resolvedBy: { select: { id: true, name: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.count({ where }),
  ]);

  return { reports, total, page };
};

export const getReportById = async (id) => {
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      submitter: {
        select: { id: true, name: true, email: true, photoUrl: true },
      },
      subject: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          status: true,
          verified: true,
          photos: { select: { url: true, isMain: true } },
          reportsReceived: { select: { id: true, reason: true, status: true } },
        },
      },
      resolvedBy: { select: { id: true, name: true } },
    },
  });

  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }

  return report;
};

export const markReviewing = async (id, adminId) => {
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }

  return prisma.report.update({
    where: { id },
    data: { status: "reviewing", resolvedById: adminId },
  });
};

export const resolveReport = async (id, adminId, adminReply) => {
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      submitter: { select: { name: true, email: true } },
    },
  });

  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }

  // Update report in DB
  const updated = await prisma.report.update({
    where: { id },
    data: {
      status: "resolved",
      resolvedById: adminId,
      resolvedAt: new Date(),
      adminReply,
    },
  });

  // Send email reply to the reporter
  await sendMail({
    to: report.submitter.email,
    subject: "Update on your report — AnzathuConnect",
    html: reportReplyTemplate({
      reporterName: report.submitter.name,
      reason: report.reason,
      adminReply,
    }),
  });

  return updated;
};
