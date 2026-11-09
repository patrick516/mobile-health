import { randomUUID } from "node:crypto";
import prisma from "../../config/db.js";

const norm = (s) => (s || "").trim().toLowerCase();

export const getDrugs = async (req, res, next) => {
  try {
    // Mirror active inventory batches into the formulary so a drug received
    // at the pharmacy is immediately requestable and issuable everywhere.
    try {
      const batches = await prisma.drugBatch.findMany({
        where: { status: "ACTIVE" },
        select: { drugName: true, drugNameChichewa: true, unit: true },
        distinct: ["drugName"],
      });
      if (batches.length > 0) {
        const existing = await prisma.drug.findMany({
          select: { nameEnglish: true, nameChichewa: true },
        });
        const have = new Set();
        for (const d of existing) {
          if (d.nameEnglish) have.add(norm(d.nameEnglish));
          if (d.nameChichewa) have.add(norm(d.nameChichewa));
        }
        for (const b of batches) {
          const primary = (b.drugName || b.drugNameChichewa || "").trim();
          if (!primary) continue;
          if (have.has(norm(b.drugName)) || have.has(norm(b.drugNameChichewa)))
            continue;
          try {
            await prisma.drug.create({
              data: {
                drugCode: `DRG-${randomUUID().slice(0, 8).toUpperCase()}`,
                nameEnglish: b.drugName || b.drugNameChichewa,
                nameChichewa: b.drugNameChichewa || b.drugName || "",
                unit: b.unit || "tablet",
                minimumThreshold: 10,
              },
            });
            have.add(norm(b.drugName));
            have.add(norm(b.drugNameChichewa));
          } catch {
            // unique-code race — retried on the next call
          }
        }
      }
    } catch {
      // inventory unavailable — still serve the formulary
    }
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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            facility: { select: { name: true } },
          },
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
        // CCWs see only their own requests. Facility staff see their
        // facility's requests. Super Admin and facility-less staff see
        // only what they created themselves — CCW requests stay with
        // the facility that must fulfil them.
        ...(req.user.role === "CCW"
          ? { requestingUserId: req.user.id }
          : req.user.role !== "SUPER_ADMIN" && req.user.facilityId
            ? { requestingUser: { facilityId: req.user.facilityId } }
            : { requestingUserId: req.user.id }),
      },
      include: {
        drug: true,
        requestingUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            role: true,
          },
        },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Pharmacy balance per drug: how much the facility store (DrugBatch)
    // still holds, so the nurse/pharmacist can check availability before
    // approving — and escalate when the store is short.
    const wantPharmacy =
      !!req.user.facilityId &&
      req.user.role !== "CCW" &&
      req.user.role !== "SUPER_ADMIN";
    let batches = [];
    if (wantPharmacy) {
      batches = await prisma.drugBatch.findMany({
        where: { facilityId: req.user.facilityId, status: "ACTIVE" },
        select: {
          drugName: true,
          drugNameChichewa: true,
          quantityRemaining: true,
        },
      });
    }
    const norm = (s) => (s || "").trim().toLowerCase();
    const pharmacyQty = (drug) => {
      if (!wantPharmacy || !drug) return null;
      const names = [norm(drug.nameEnglish), norm(drug.nameChichewa)].filter(
        Boolean,
      );
      return batches
        .filter(
          (b) =>
            names.includes(norm(b.drugName)) ||
            names.includes(norm(b.drugNameChichewa)),
        )
        .reduce((sum, b) => sum + b.quantityRemaining, 0);
    };

    res.json({
      success: true,
      data: requests.map((r) => ({ ...r, pharmacyQty: pharmacyQty(r.drug) })),
    });
  } catch (err) {
    next(err);
  }
};

export const updateStockRequest = async (req, res, next) => {
  try {
    const { status, notes, dispensed } = req.body;
    if (status && !["APPROVED", "FULFILLED", "REJECTED"].includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    if (!status && !notes)
      return res
        .status(400)
        .json({ success: false, message: "status or notes is required." });
    if (req.user.role === "CCW")
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });

    // Approvals are handled by the facility team (nurse/pharmacist/admin)
    const target = await prisma.stockRequest.findUnique({
      where: { id: req.params.id },
      select: {
        status: true,
        drugId: true,
        quantityRequested: true,
        requestingUser: {
          select: { id: true, role: true, facilityId: true },
        },
      },
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

    // Fulfilling a CCW's request dispenses into their kit and draws the
    // facility batch down. The Issue Kit flow already moved the stock, so it
    // passes dispensed: true to skip this.
    if (
      status === "FULFILLED" &&
      target.status !== "FULFILLED" &&
      !dispensed &&
      target.requestingUser.role === "CCW"
    ) {
      const drug = await prisma.drug.findUnique({
        where: { id: target.drugId },
        select: { nameEnglish: true, nameChichewa: true },
      });
      const kitRow = await prisma.drugStock.findUnique({
        where: {
          userId_drugId: {
            userId: target.requestingUser.id,
            drugId: target.drugId,
          },
        },
      });
      if (kitRow) {
        await prisma.drugStock.update({
          where: { id: kitRow.id },
          data: { quantityCurrent: { increment: target.quantityRequested } },
        });
      } else {
        await prisma.drugStock.create({
          data: {
            userId: target.requestingUser.id,
            drugId: target.drugId,
            quantityCurrent: target.quantityRequested,
            quantityMinimum: 5,
          },
        });
      }
      if (drug && target.requestingUser.facilityId) {
        const n0 = drug.nameEnglish;
        const n1 = drug.nameChichewa || drug.nameEnglish;
        const batch = await prisma.drugBatch.findFirst({
          where: {
            facilityId: target.requestingUser.facilityId,
            status: "ACTIVE",
            OR: [
              { drugName: { equals: n0, mode: "insensitive" } },
              { drugName: { equals: n1, mode: "insensitive" } },
              { drugNameChichewa: { equals: n0, mode: "insensitive" } },
              { drugNameChichewa: { equals: n1, mode: "insensitive" } },
            ],
          },
          orderBy: { expiryDate: "asc" },
        });
        if (batch) {
          const remaining = Math.max(
            0,
            batch.quantityRemaining - target.quantityRequested,
          );
          await prisma.drugBatch.update({
            where: { id: batch.id },
            data: {
              quantityRemaining: remaining,
              ...(remaining === 0 ? { status: "DEPLETED" } : {}),
            },
          });
        }
      }
    }

    const data = {
      ...(status
        ? {
            status,
            approvedById: req.user.id,
            ...(status === "FULFILLED" ? { fulfilledAt: new Date() } : {}),
          }
        : {}),
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
