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
    const { userId } = req.query;
    const targetUser = userId || req.user.id;

    // Admin sees all stock, others see only their own
    const where = ["ADMIN", "NURSE", "DISTRICT_OFFICER"].includes(req.user.role)
      ? {} // Admin sees everyone
      : { userId: req.user.id }; // CCW sees only own

    const stock = await prisma.drugStock.findMany({
      where,
      include: {
        drug: true,
        user: { select: { id: true, fullName: true, role: true } },
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
    const { quantityCurrent } = req.body;

    const stock = await prisma.drugStock.upsert({
      where: { userId_drugId: { userId: req.user.id, drugId } },
      update: { quantityCurrent },
      create: {
        userId: req.user.id,
        drugId,
        quantityCurrent,
        quantityMinimum: 5,
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
        ...(["CCW"].includes(req.user.role)
          ? { requestingUserId: req.user.id }
          : {}),
      },
      include: {
        drug: true,
        requestingUser: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
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
        requestingUser: { select: { id: true, fullName: true } },
      },
    });
    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};
