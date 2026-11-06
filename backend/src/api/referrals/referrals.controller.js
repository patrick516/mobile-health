import prisma from "../../config/db.js";
import { sendSms } from "../../utils/sms.js";
import { buildVillageScope } from "../../middleware/auth.js";

// GET /api/referrals?status=&urgency=&chwId=&from=&to=&taId=
export const getReferrals = async (req, res, next) => {
  try {
    const {
      status,
      urgency,
      chwId,
      from,
      to,
      taId,
      page = 1,
      limit = 50,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const villageScope = buildVillageScope(req.user, taId);
    const hasScope = Object.keys(villageScope).length > 0;

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
      ...(hasScope ? { member: { household: { village: villageScope } } } : {}),
    };

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              sex: true,
              dateOfBirth: true,
              estimatedAge: true,
            },
          },
          referringUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        destinationFacility: true,
        visit: true,
      },
    });
    if (!referral)
      return res
        .status(404)
        .json({ success: false, message: "Referral not found." });

    // ── Enforce zone/TA/district scoping ──
    if (req.user.scopeLevel !== "ALL") {
      const scope = buildVillageScope(req.user);
      const allowed = await prisma.referral.findFirst({
        where: { id: referral.id, member: { household: { village: scope } } },
        select: { id: true },
      });
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this referral.",
        });
      }
    }

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
        const patientName =
          `${referral.member.firstName} ${referral.member.lastName}`.trim();
        await sendSms(
          household.headPhone,
          `MobileHealth Alert: ${patientName} has been referred to ${facility}. Please go as soon as possible.`,
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
    const { status, diagnosis, treatmentGiven, feedbackNote, medications } =
      req.body;

    // Medication the nurse prescribes (blank rows are ignored)
    const meds = (Array.isArray(medications) ? medications : [])
      .slice(0, 20)
      .map((m) => ({
        drugName: String(m?.drugName || "").trim(),
        quantityRequested: parseInt(m?.quantityRequested),
        notes: m?.notes ? String(m.notes).trim().slice(0, 200) : null,
      }))
      .filter((m) => m.drugName && m.quantityRequested > 0);

    if (meds.length > 0 && status !== "TREATED")
      return res.status(400).json({
        success: false,
        message:
          "Medication can only be prescribed when marking the referral as treated.",
      });
    if (meds.length > 0 && !req.user.facilityId)
      return res.status(400).json({
        success: false,
        message:
          "Your account has no facility, so a prescription cannot be sent to a pharmacy.",
      });

    const current = await prisma.referral.findUnique({
      where: { id: req.params.id },
    });
    if (!current)
      return res
        .status(404)
        .json({ success: false, message: "Referral not found." });

    // Scope: the user's area, or the facility the patient was referred to
    if (req.user.scopeLevel !== "ALL") {
      const inScope = await prisma.referral.findFirst({
        where: {
          id: current.id,
          OR: [
            { member: { household: { village: buildVillageScope(req.user) } } },
            ...(req.user.facilityId
              ? [{ destinationFacilityId: req.user.facilityId }]
              : []),
          ],
        },
        select: { id: true },
      });
      if (!inScope) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this referral.",
        });
      }
    }
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

    // Referral update + prescription happen together, or not at all
    const referral = await prisma.$transaction(async (tx) => {
      const updated = await tx.referral.update({
        where: { id: req.params.id },
        data,
        include: {
          member: true,
          referringUser: {
            select: { phoneNumber: true, firstName: true, lastName: true },
          },
        },
      });

      if (meds.length > 0) {
        // Never send a second pending prescription for the same referral
        const existing = await tx.pharmacyRequest.findFirst({
          where: { referralId: updated.id, status: "PENDING" },
          select: { id: true },
        });

        if (!existing) {
          const m = updated.member;
          const patientAge = m.dateOfBirth
            ? Math.floor(
                (Date.now() - new Date(m.dateOfBirth).getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000),
              )
            : (m.estimatedAge ?? null);

          await tx.pharmacyRequest.create({
            data: {
              facilityId: req.user.facilityId,
              referralId: updated.id,
              patientName: `${m.firstName} ${m.lastName}`.trim(),
              patientAge,
              diagnosis: diagnosis || updated.diagnosis || null,
              requestedById: req.user.id,
              items: { create: meds },
            },
          });
        }
      }

      return updated;
    });

    res.json({ success: true, data: referral });
  } catch (err) {
    next(err);
  }
};
