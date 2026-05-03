// src/api/mobile/premium/premium.service.js

import prisma from "../../../config/db.js";

export const getStatus = async (userId) => {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  // Auto-expire if past expiry date
  if (sub?.isActive && sub.expiresAt && sub.expiresAt < new Date()) {
    await prisma.$transaction([
      prisma.subscription.update({
        where: { userId },
        data: { isActive: false },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { isPremium: false },
      }),
    ]);
    return { isPremium: false, expiresAt: null, plan: null };
  }

  return {
    isPremium: sub?.isActive || false,
    expiresAt: sub?.expiresAt || null,
    plan: sub?.plan || null,
  };
};

export const subscribe = async (userId, { plan, payment_method }) => {
  // TODO: integrate real payment provider (Paystack, Flutterwave, etc.)
  const sessionId = crypto.randomUUID();

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan,
      paymentMethod: payment_method,
      paymentSessionId: sessionId,
      isActive: false,
    },
    update: {
      plan,
      paymentMethod: payment_method,
      paymentSessionId: sessionId,
      isActive: false,
    },
  });

  return {
    success: true,
    paymentUrl: `https://pay.provider.com/session/${sessionId}`,
    sessionId,
  };
};

export const verifyPayment = async (
  userId,
  { session_id, transaction_ref },
) => {
  const sub = await prisma.subscription.findUnique({ where: { userId } });

  if (!sub || sub.paymentSessionId !== session_id) {
    const err = new Error("Invalid payment session");
    err.statusCode = 400;
    throw err;
  }

  // monthly = 30 days, yearly = 365 days
  const days = sub.plan === "yearly" ? 365 : 30;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.subscription.update({
      where: { userId },
      data: {
        isActive: true,
        startedAt: new Date(),
        expiresAt,
        transactionRef: transaction_ref,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { isPremium: true },
    }),
  ]);

  return { isPremium: true, expiresAt, plan: sub.plan };
};

export const cancel = async (userId) => {
  const sub = await prisma.subscription.findUnique({ where: { userId } });

  if (!sub || !sub.isActive) {
    const err = new Error("No active subscription found");
    err.statusCode = 400;
    throw err;
  }

  await prisma.$transaction([
    prisma.subscription.update({
      where: { userId },
      data: { isActive: false, cancelledAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { isPremium: false },
    }),
  ]);
};
