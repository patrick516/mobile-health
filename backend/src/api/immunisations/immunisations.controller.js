import prisma from "../../config/db.js";

// GET /api/immunisations/schedules?memberId=
export const getSchedules = async (req, res, next) => {
  try {
    const { memberId } = req.query;

    const where = {
      ...(memberId ? { memberId } : {}),
      // Scope to CHW's zones
      ...(req.user.zoneIds && req.user.zoneIds.length > 0
        ? {
            member: {
              household: {
                village: {
                  zoneId: { in: req.user.zoneIds },
                },
              },
            },
          }
        : {}),
    };

    const schedules = await prisma.immunisationSchedule.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            dateOfBirth: true,
            household: {
              include: { village: true },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 500,
    });

    // Transform to match mobile expectations
    const data = schedules.map((s) => ({
      id: s.id,
      memberId: s.memberId,
      vaccineCode: s.vaccineCode,
      doseNumber: s.doseNumber,
      dueDate: s.dueDate,
      status: s.status,
      givenAt: s.givenAt,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/immunisations/due?zoneId= — children with vaccines due in next 14 days
export const getDue = async (req, res, next) => {
  try {
    const in14Days = new Date();
    in14Days.setDate(in14Days.getDate() + 14);

    const due = await prisma.immunisationSchedule.findMany({
      where: {
        status: { in: ["DUE", "OVERDUE"] },
        dueDate: { lte: in14Days },
        member: {
          status: "ACTIVE",
          ...(req.user.zoneIds && req.user.zoneIds.length > 0
            ? {
                household: { village: { zoneId: { in: req.user.zoneIds } } },
              }
            : {}),
        },
      },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            dateOfBirth: true,
            household: { include: { village: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    res.json({ success: true, data: due });
  } catch (err) {
    next(err);
  }
};

// POST /api/immunisations
export const recordImmunisation = async (req, res, next) => {
  try {
    const {
      localId,
      memberId,
      vaccineCode,
      doseNumber,
      givenAt,
      batchNumber,
      route,
      nextDueDate,
      facilityOrOutreach,
    } = req.body;

    if (!localId || !memberId || !vaccineCode || !doseNumber || !givenAt) {
      return res.status(400).json({
        success: false,
        message:
          "localId, memberId, vaccineCode, doseNumber and givenAt are required.",
      });
    }

    const immunisation = await prisma.immunisation.create({
      data: {
        localId,
        memberId,
        vaccineCode,
        doseNumber: parseInt(doseNumber),
        givenAt: new Date(givenAt),
        givenByUserId: req.user.id,
        batchNumber: batchNumber || null,
        route: route || null,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        facilityOrOutreach: facilityOrOutreach || null,
        syncedAt: new Date(),
      },
    });

    // Update schedule status to GIVEN
    await prisma.immunisationSchedule.updateMany({
      where: { memberId, vaccineCode, doseNumber: parseInt(doseNumber) },
      data: { status: "GIVEN", givenAt: new Date(givenAt) },
    });

    res.status(201).json({ success: true, data: immunisation });
  } catch (err) {
    next(err);
  }
};
