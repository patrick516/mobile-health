import prisma from "../../config/db.js";

// ─── STOCK RECEIVING ─────────────────────────────────────────────────────────

// GET /api/pharmacy/batches — list all batches for this facility
export const getBatches = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const facilityId = req.user.facility?.id;
    if (!facilityId)
      return res
        .status(403)
        .json({ success: false, message: "No facility assigned." });

    const batches = await prisma.drugBatch.findMany({
      where: {
        facilityId,
        ...(status ? { status } : {}),
        ...(search
          ? { drugName: { contains: search, mode: "insensitive" } }
          : {}),
      },
      include: {
        supplier: true,
        receivedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { expiryDate: "asc" },
    });
    res.json({ success: true, data: batches });
  } catch (err) {
    next(err);
  }
};

// POST /api/pharmacy/batches — receive new stock batch
export const receiveBatch = async (req, res, next) => {
  try {
    const facilityId = req.user.facility?.id;
    if (!facilityId)
      return res
        .status(403)
        .json({ success: false, message: "No facility assigned." });

    const {
      drugName,
      drugNameChichewa,
      category,
      unit,
      batchNumber,
      supplierId,
      quantityReceived,
      manufactureDate,
      expiryDate,
      minimumStock,
      reorderPoint,
      notes,
    } = req.body;

    if (
      !drugName ||
      !category ||
      !unit ||
      !batchNumber ||
      !quantityReceived ||
      !expiryDate
    )
      return res.status(400).json({
        success: false,
        message:
          "drugName, category, unit, batchNumber, quantityReceived and expiryDate are required.",
      });

    const batch = await prisma.drugBatch.create({
      data: {
        drugName,
        drugNameChichewa: drugNameChichewa || null,
        category,
        unit,
        batchNumber,
        supplierId: supplierId || null,
        quantityReceived: parseInt(quantityReceived),
        quantityRemaining: parseInt(quantityReceived),
        manufactureDate: manufactureDate ? new Date(manufactureDate) : null,
        expiryDate: new Date(expiryDate),
        receivedById: req.user.id,
        facilityId,
        minimumStock: parseInt(minimumStock) || 0,
        reorderPoint: parseInt(reorderPoint) || 0,
        notes: notes || null,
      },
    });

    // Record IN transaction
    await prisma.drugTransaction.create({
      data: {
        batchId: batch.id,
        facilityId,
        transactionType: "IN",
        quantity: parseInt(quantityReceived),
        quantityBefore: 0,
        quantityAfter: parseInt(quantityReceived),
        performedById: req.user.id,
        notes: `Initial stock receipt — batch ${batchNumber}`,
      },
    });

    res.status(201).json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
};

// ─── DISPENSING ──────────────────────────────────────────────────────────────

// POST /api/pharmacy/dispense — dispense drug using FEFO logic
export const dispense = async (req, res, next) => {
  try {
    const facilityId = req.user.facility?.id;
    if (!facilityId)
      return res
        .status(403)
        .json({ success: false, message: "No facility assigned." });

    const { drugName, quantity, patientName, patientId, requestId, notes } =
      req.body;

    if (!drugName || !quantity || !patientName)
      return res.status(400).json({
        success: false,
        message: "drugName, quantity and patientName are required.",
      });

    const qty = parseInt(quantity);

    // FEFO — get active batches for this drug ordered by earliest expiry first
    const batches = await prisma.drugBatch.findMany({
      where: {
        facilityId,
        drugName: { equals: drugName, mode: "insensitive" },
        status: "ACTIVE",
        quantityRemaining: { gt: 0 },
      },
      orderBy: { expiryDate: "asc" },
    });

    const totalAvailable = batches.reduce(
      (sum, b) => sum + b.quantityRemaining,
      0,
    );
    if (totalAvailable < qty)
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${totalAvailable}, Requested: ${qty}`,
      });

    // Deduct from batches using FEFO
    let remaining = qty;
    const transactions = [];

    for (const batch of batches) {
      if (remaining <= 0) break;
      const deduct = Math.min(remaining, batch.quantityRemaining);
      const newQty = batch.quantityRemaining - deduct;

      await prisma.drugBatch.update({
        where: { id: batch.id },
        data: {
          quantityRemaining: newQty,
          status: newQty === 0 ? "DEPLETED" : "ACTIVE",
        },
      });

      const tx = await prisma.drugTransaction.create({
        data: {
          batchId: batch.id,
          facilityId,
          transactionType: "OUT",
          quantity: deduct,
          quantityBefore: batch.quantityRemaining,
          quantityAfter: newQty,
          patientName,
          patientId: patientId || null,
          requestId: requestId || null,
          performedById: req.user.id,
          notes: notes || null,
        },
      });

      transactions.push(tx);
      remaining -= deduct;
    }

    res.status(201).json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
};

// ─── ADJUSTMENTS ─────────────────────────────────────────────────────────────

// POST /api/pharmacy/adjustments — record stock adjustment
export const recordAdjustment = async (req, res, next) => {
  try {
    const facilityId = req.user.facility?.id;
    if (!facilityId)
      return res
        .status(403)
        .json({ success: false, message: "No facility assigned." });

    const { batchId, quantity, reason, notes } = req.body;

    if (!batchId || !quantity || !reason)
      return res.status(400).json({
        success: false,
        message: "batchId, quantity and reason are required.",
      });

    const batch = await prisma.drugBatch.findUnique({ where: { id: batchId } });
    if (!batch)
      return res
        .status(404)
        .json({ success: false, message: "Batch not found." });

    const qty = parseInt(quantity);
    const newQty = Math.max(0, batch.quantityRemaining + qty);

    await prisma.drugBatch.update({
      where: { id: batchId },
      data: {
        quantityRemaining: newQty,
        status: newQty === 0 ? "DEPLETED" : "ACTIVE",
      },
    });

    const tx = await prisma.drugTransaction.create({
      data: {
        batchId,
        facilityId,
        transactionType: "ADJUSTMENT",
        quantity: Math.abs(qty),
        quantityBefore: batch.quantityRemaining,
        quantityAfter: newQty,
        reason,
        performedById: req.user.id,
        notes: notes || null,
      },
    });

    res.status(201).json({ success: true, data: tx });
  } catch (err) {
    next(err);
  }
};

// ─── PHARMACY REQUESTS ───────────────────────────────────────────────────────

// GET /api/pharmacy/requests — list all requests for this facility
export const getRequests = async (req, res, next) => {
  try {
    const facilityId = req.user.facility?.id;
    if (!facilityId)
      return res
        .status(403)
        .json({ success: false, message: "No facility assigned." });

    const { status } = req.query;
    const requests = await prisma.pharmacyRequest.findMany({
      where: {
        facilityId,
        ...(status ? { status } : {}),
      },
      include: {
        items: true,
        requestedBy: {
          select: { firstName: true, lastName: true, role: true },
        },
        fulfilledBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
};

// POST /api/pharmacy/requests — create a new pharmacy request
export const createRequest = async (req, res, next) => {
  try {
    const facilityId = req.user.facility?.id;
    if (!facilityId)
      return res
        .status(403)
        .json({ success: false, message: "No facility assigned." });

    const { patientName, patientAge, diagnosis, referralId, notes, items } =
      req.body;

    if (!patientName || !items || items.length === 0)
      return res.status(400).json({
        success: false,
        message: "patientName and at least one item are required.",
      });

    const request = await prisma.pharmacyRequest.create({
      data: {
        facilityId,
        patientName,
        patientAge: patientAge ? parseInt(patientAge) : null,
        diagnosis: diagnosis || null,
        referralId: referralId || null,
        requestedById: req.user.id,
        notes: notes || null,
        items: {
          create: items.map((item) => ({
            drugName: item.drugName,
            quantityRequested: parseInt(item.quantityRequested),
            notes: item.notes || null,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/pharmacy/requests/:id/fulfill — fulfill a pharmacy request
export const fulfillRequest = async (req, res, next) => {
  try {
    const facilityId = req.user.facility?.id;
    if (!facilityId)
      return res
        .status(403)
        .json({ success: false, message: "No facility assigned." });

    const request = await prisma.pharmacyRequest.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found." });

    const { fulfilledItems, notes } = req.body;
    // fulfilledItems: [{ itemId, quantityFulfilled }]

    let allFulfilled = true;
    for (const fi of fulfilledItems) {
      const item = request.items.find((i) => i.id === fi.itemId);
      if (!item) continue;

      await prisma.pharmacyRequestItem.update({
        where: { id: fi.itemId },
        data: { quantityFulfilled: parseInt(fi.quantityFulfilled) },
      });

      if (parseInt(fi.quantityFulfilled) < item.quantityRequested)
        allFulfilled = false;

      // Dispense stock using FEFO if quantity > 0
      if (parseInt(fi.quantityFulfilled) > 0) {
        const batches = await prisma.drugBatch.findMany({
          where: {
            facilityId,
            drugName: { equals: item.drugName, mode: "insensitive" },
            status: "ACTIVE",
            quantityRemaining: { gt: 0 },
          },
          orderBy: { expiryDate: "asc" },
        });

        let remaining = parseInt(fi.quantityFulfilled);
        for (const batch of batches) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, batch.quantityRemaining);
          const newQty = batch.quantityRemaining - deduct;

          await prisma.drugBatch.update({
            where: { id: batch.id },
            data: {
              quantityRemaining: newQty,
              status: newQty === 0 ? "DEPLETED" : "ACTIVE",
            },
          });

          await prisma.drugTransaction.create({
            data: {
              batchId: batch.id,
              facilityId,
              transactionType: "OUT",
              quantity: deduct,
              quantityBefore: batch.quantityRemaining,
              quantityAfter: newQty,
              patientName: request.patientName,
              requestId: request.id,
              performedById: req.user.id,
            },
          });

          remaining -= deduct;
        }
      }
    }

    const updated = await prisma.pharmacyRequest.update({
      where: { id: req.params.id },
      data: {
        status: allFulfilled ? "FULFILLED" : "PARTIALLY_FULFILLED",
        fulfilledById: req.user.id,
        fulfilledAt: new Date(),
        notes: notes || request.notes,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ─── ALERTS & REPORTS ────────────────────────────────────────────────────────

// GET /api/pharmacy/alerts — expiry and low stock alerts
export const getAlerts = async (req, res, next) => {
  try {
    const facilityId = req.user.facility?.id;
    if (!facilityId)
      return res
        .status(403)
        .json({ success: false, message: "No facility assigned." });

    const in90Days = new Date();
    in90Days.setDate(in90Days.getDate() + 90);

    const [expiringBatches, lowStockBatches] = await Promise.all([
      prisma.drugBatch.findMany({
        where: {
          facilityId,
          status: "ACTIVE",
          expiryDate: { lte: in90Days },
        },
        orderBy: { expiryDate: "asc" },
      }),
      prisma.drugBatch.findMany({
        where: {
          facilityId,
          status: "ACTIVE",
          quantityRemaining: { lte: prisma.drugBatch.fields.reorderPoint },
        },
      }),
    ]);

    // Low stock: quantity <= reorderPoint
    const lowStock = await prisma.$queryRaw`
      SELECT * FROM drug_batches
      WHERE facility_id = ${facilityId}
        AND status = 'ACTIVE'
        AND quantity_remaining <= reorder_point
      ORDER BY quantity_remaining ASC
    `;

    res.json({
      success: true,
      data: {
        expiring: expiringBatches,
        lowStock,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/pharmacy/transactions — transaction log
export const getTransactions = async (req, res, next) => {
  try {
    const facilityId = req.user.facility?.id;
    if (!facilityId)
      return res
        .status(403)
        .json({ success: false, message: "No facility assigned." });

    const { from, to, type, drugName } = req.query;

    const transactions = await prisma.drugTransaction.findMany({
      where: {
        facilityId,
        ...(type ? { transactionType: type } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
        ...(drugName
          ? { batch: { drugName: { contains: drugName, mode: "insensitive" } } }
          : {}),
      },
      include: {
        batch: { select: { drugName: true, batchNumber: true, unit: true } },
        performedBy: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    res.json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
};

// GET /api/pharmacy/suppliers — list suppliers
export const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await prisma.drugSupplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: suppliers });
  } catch (err) {
    next(err);
  }
};

// POST /api/pharmacy/suppliers — create supplier
export const createSupplier = async (req, res, next) => {
  try {
    const { name, type, contactName, phone, email } = req.body;
    if (!name || !type)
      return res
        .status(400)
        .json({ success: false, message: "name and type are required." });

    const supplier = await prisma.drugSupplier.create({
      data: {
        name,
        type,
        contactName: contactName || null,
        phone: phone || null,
        email: email || null,
      },
    });
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
};
