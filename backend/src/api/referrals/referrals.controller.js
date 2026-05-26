import prisma from "../../config/db.js";
import { sendSms } from "../../utils/sms.js";

// GET /api/referrals?status=&urgency=&chwId=&from=&to=
export const getReferrals = async (req, res, next) => {
  try {
    const {
      status,
      urgency,
      chwId,
      from,
      to,
      page = 1,
      limit = 50,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(status ? { status } : {}),
      ...(urgency ? { urgency } : {}),
      ...(chwId ? { referringUserId: chwId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              sex: true,
              dateOfBirth: true,
              estimatedAge: true,
            },
          },
          referringUser: {
            select: { id: true, fullName: true, phoneNumber: true },
          },
          destinationFacility: true,
          visit: {
            select: {
              id: true,
              visitedAt: true,
              symptoms: true,
              muacStatus: true,
            },
          },
        },
        orderBy: [{ urgency: "asc" }, { createdAt: "desc" }],
        skip,
        take: parseInt(limit),
      }),
      prisma.referral.count({ where }),
    ]);

    res.json({
      success: true,
      data: referrals,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/referrals/:id
export const getReferral = async (req, res, next) => {
  try {
    const referral = await prisma.referral.findUnique({
      where: { id: req.params.id },
      include: {
        member: true,
        referringUser: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
        destinationFacility: true,
        visit: true,
      },
    });
    if (!referral)
      return res
        .status(404)
        .json({ success: false, message: "Referral not found." });
    res.json({ success: true, data: referral });
  } catch (err) {
    next(err);
  }
};

// POST /api/referrals
export const createReferral = async (req, res, next) => {
  try {
    const {
      localId,
      visitId,
      memberId,
      destinationFacilityId,
      reason,
      urgency,
      dueBy,
      smsToFamily,
    } = req.body;

    if (!localId || !visitId || !memberId || !reason || !urgency) {
      return res.status(400).json({
        success: false,
        message: "localId, visitId, memberId, reason and urgency are required.",
      });
    }

    const referral = await prisma.referral.create({
      data: {
        localId,
        visitId,
        memberId,
        referringUserId: req.user.id,
        destinationFacilityId: destinationFacilityId || null,
        reason,
        urgency,
        status: "PENDING",
        dueBy: dueBy ? new Date(dueBy) : null,
        syncedAt: new Date(),
      },
      include: {
        member: true,
        destinationFacility: true,
      },
    });

    // SMS to family head if phone available and requested
    if (smsToFamily && referral.member) {
      const household = await prisma.household.findFirst({
        where: { members: { some: { id: memberId } } },
      });
      if (household?.headPhone) {
        const facility =
          referral.destinationFacility?.name || "the nearest health facility";
        await sendSms(
          household.headPhone,
          `MobileHealth Alert: ${referral.member.fullName} has been referred to ${facility}. Please go as soon as possible.`,
        );
      }
    }

    res.status(201).json({ success: true, data: referral });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/referrals/:id — Nurse updates status + sends feedback to CHW
export const updateReferral = async (req, res, next) => {
  try {
    const { status, diagnosis, treatmentGiven, feedbackNote } = req.body;

    const current = await prisma.referral.findUnique({
      where: { id: req.params.id },
    });
    if (!current)
      return res
        .status(404)
        .json({ success: false, message: "Referral not found." });

    const data = {
      ...(status ? { status } : {}),
      ...(diagnosis ? { diagnosis } : {}),
      ...(treatmentGiven ? { treatmentGiven } : {}),
      ...(feedbackNote ? { feedbackNote } : {}),
      ...(status === "ARRIVED" ? { arrivedAt: new Date() } : {}),
      ...(status === "TREATED" ? { treatedAt: new Date() } : {}),
      ...(status === "FEEDBACK_SENT" ? {} : {}),
      ...(["COMPLETED", "MISSED"].includes(status)
        ? { resolvedAt: new Date() }
        : {}),
    };

    const referral = await prisma.referral.update({
      where: { id: req.params.id },
      data,
      include: {
        member: true,
        referringUser: { select: { phoneNumber: true, fullName: true } },
      },
    });

    res.json({ success: true, data: referral });
  } catch (err) {
    next(err);
  }
};
