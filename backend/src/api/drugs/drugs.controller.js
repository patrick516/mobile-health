import prisma from "../../config/db.js";

export const getDrugs = async (req, res, next) => {
  try {
    const drugs = await prisma.drug.findMany({
      where: { isActive: true },
      orderBy: { nameEnglish: "asc" },
    });
    res.json({ success: true, data: drugs });
  } catch (err) {
    next(err);
  }
};

export const getStock = async (req, res, next) => {
  try {
    // CCW: only their own stock. Super Admin: everything.
    // Everyone else: stock held by staff of their own facility.
    const where =
      req.user.role === "CCW"
        ? { userId: req.user.id }
        : req.user.role === "SUPER_ADMIN"
          ? {}
          : req.user.facilityId
            ? { user: { facilityId: req.user.facilityId } }
            : { userId: req.user.id };

    const stock = await prisma.drugStock.findMany({
      where,
      include: {
        drug: true,
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { drug: { nameEnglish: "asc" } },
    });
    res.json({ success: true, data: stock });
  } catch (err) {
    next(err);
  }
};

export const updateStock = async (req, res, next) => {
  try {
    const { drugId } = req.params;
    const { quantityCurrent, userId } = req.body;

    if (!Number.isInteger(quantityCurrent) || quantityCurrent < 0)
      return res.status(400).json({
        success: false,
        message: "quantityCurrent must be a whole number, 0 or more.",
      });

    // Admin can set stock for users in their own facility; others only
    // for themselves. Super Admin may target anyone.
    let targetUserId = req.user.id;
    if (userId && userId !== req.user.id) {
      const isSuperAdmin = req.user.role === "SUPER_ADMIN";
      const isAdmin = req.user.role === "ADMIN";
      if (!isSuperAdmin && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own stock.",
        });
      }
      if (isAdmin && !isSuperAdmin) {
        if (!req.user.facilityId) {
          return res.status(403).json({
            success: false,
            message:
              "You are not assigned to a facility, so you cannot set stock for other users.",
          });
        }
        const target = await prisma.user.findUnique({
          where: { id: userId },
          select: { facilityId: true },
        });
        if (!target || target.facilityId !== req.user.facilityId) {
          return res.status(403).json({
            success: false,
            message: "You can only set stock for users in your own facility.",
          });
        }
      }
      targetUserId = userId;
    }

    const stock = await prisma.drugStock.upsert({
      where: { userId_drugId: { userId: targetUserId, drugId } },
      update: { quantityCurrent, lastRestockedAt: new Date() },
      create: {
        userId: targetUserId,
        drugId,
        quantityCurrent,
        quantityMinimum: 5,
        lastRestockedAt: new Date(),
      },
      include: { drug: true },
    });
    res.json({ success: true, data: stock });
  } catch (err) {
    next(err);
  }
};

export const createStockRequest = async (req, res, next) => {
  try {
    const { drugId, quantityRequested, notes } = req.body;
    if (!drugId || !quantityRequested) {
      return res.status(400).json({
        success: false,
        message: "drugId and quantityRequested are required.",
      });
    }
    const request = await prisma.stockRequest.create({
      data: {
        requestingUserId: req.user.id,
        drugId,
        quantityRequested: parseInt(quantityRequested),
        notes: notes || null,
      },
      include: { drug: true },
    });
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

export const getStockRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const requests = await prisma.stockRequest.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(req.user.role === "CCW"
          ? { requestingUserId: req.user.id }
          : req.user.role !== "SUPER_ADMIN"
            ? req.user.facilityId
              ? { requestingUser: { facilityId: req.user.facilityId } }
              : { requestingUserId: req.user.id }
            : {}),
      },
      include: {
        drug: true,
        requestingUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
};

export const updateStockRequest = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!["APPROVED", "FULFILLED", "REJECTED"].includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    if (req.user.role === "CCW")
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });

    // Only requests from your own facility's staff (Super Admin: any)
    if (req.user.role !== "SUPER_ADMIN") {
      const target = await prisma.stockRequest.findUnique({
        where: { id: req.params.id },
        select: { requestingUser: { select: { facilityId: true } } },
      });
      if (
        !target ||
        !req.user.facilityId ||
        target.requestingUser.facilityId !== req.user.facilityId
      ) {
        return res
          .status(404)
          .json({ success: false, message: "Request not found." });
      }
    }
    const data = {
      status,
      approvedById: req.user.id,
      ...(status === "FULFILLED" ? { fulfilledAt: new Date() } : {}),
      ...(notes ? { notes } : {}),
    };
    const request = await prisma.stockRequest.update({
      where: { id: req.params.id },
      data,
      include: {
        drug: true,
        requestingUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};
