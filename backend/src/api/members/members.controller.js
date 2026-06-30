import prisma from "../../config/db.js";
import { buildVillageScope } from "../../middleware/auth.js";

const VACCINE_SCHEDULE = [
  { code: "BCG", dose: 1, weeksAfterBirth: 0 },
  { code: "OPV0", dose: 1, weeksAfterBirth: 0 },
  { code: "OPV1", dose: 1, weeksAfterBirth: 6 },
  { code: "OPV2", dose: 2, weeksAfterBirth: 10 },
  { code: "OPV3", dose: 3, weeksAfterBirth: 14 },
  { code: "DPT1", dose: 1, weeksAfterBirth: 6 },
  { code: "DPT2", dose: 2, weeksAfterBirth: 10 },
  { code: "DPT3", dose: 3, weeksAfterBirth: 14 },
  { code: "PCV1", dose: 1, weeksAfterBirth: 6 },
  { code: "PCV2", dose: 2, weeksAfterBirth: 10 },
  { code: "PCV3", dose: 3, weeksAfterBirth: 14 },
  { code: "ROTA1", dose: 1, weeksAfterBirth: 6 },
  { code: "ROTA2", dose: 2, weeksAfterBirth: 10 },
  { code: "MEASLES1", dose: 1, weeksAfterBirth: 36 },
  { code: "MEASLES2", dose: 2, weeksAfterBirth: 60 },
  { code: "VITA1", dose: 1, weeksAfterBirth: 24 },
  { code: "DEWORM1", dose: 1, weeksAfterBirth: 48 },
];

function addWeeks(date, weeks) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

// GET /api/members?householdId=&taId=
export const getMembers = async (req, res, next) => {
  try {
    const { householdId, taId } = req.query;
    const villageScope = buildVillageScope(req.user, taId);
    const hasScope = Object.keys(villageScope).length > 0;

    const members = await prisma.householdMember.findMany({
      where: {
        ...(householdId ? { householdId } : {}),
        status: "ACTIVE",
        ...(!householdId && hasScope
          ? { household: { village: villageScope } }
          : {}),
      },
      include: {
        household: { include: { village: true } },
        immunisationSchedules: {
          where: { status: { in: ["DUE", "OVERDUE"] } },
        },
        ancVisits: { where: { status: { in: ["SCHEDULED", "OVERDUE"] } } },
      },
      orderBy: { fullName: "asc" },
    });
    res.json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
};

// GET /api/members/:id
export const getMember = async (req, res, next) => {
  try {
    const member = await prisma.householdMember.findUnique({
      where: { id: req.params.id },
      include: {
        household: {
          include: {
            village: { include: { zone: { include: { ta: true } } } },
          },
        },
        visits: { orderBy: { visitedAt: "desc" }, take: 10 },
        referrals: { orderBy: { createdAt: "desc" }, take: 5 },
        immunisationSchedules: { orderBy: { dueDate: "asc" } },
        immunisations: { orderBy: { givenAt: "desc" } },
        ancVisits: { orderBy: { ancNumber: "asc" } },
        drugDispenses: { orderBy: { dispensedAt: "desc" }, take: 10 },
      },
    });
    if (!member)
      return res
        .status(404)
        .json({ success: false, message: "Member not found." });

    // ── Enforce zone/TA/district scoping ──
    if (req.user.scopeLevel !== "ALL") {
      const scope = buildVillageScope(req.user);
      const allowed = await prisma.householdMember.findFirst({
        where: { id: member.id, household: { village: scope } },
        select: { id: true },
      });
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this member.",
        });
      }
    }

    res.json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
};

// POST /api/members
export const createMember = async (req, res, next) => {
  try {
    const {
      localId,
      householdId,
      fullName,
      dateOfBirth,
      estimatedAge,
      sex,
      relationshipToHead,
      isPregnant,
      lmpDate,
      chronicIllnesses,
      hasDisability,
      disabilityType,
      nationalId,
      phone,
    } = req.body;

    if (!localId || !householdId || !fullName || !sex || !relationshipToHead) {
      return res.status(400).json({
        success: false,
        message:
          "localId, householdId, fullName, sex, and relationshipToHead are required.",
      });
    }

    // ── Duplicate National ID check (members) ──
    if (nationalId && nationalId.trim() !== "") {
      const existingMember = await prisma.householdMember.findFirst({
        where: {
          nationalId: nationalId.trim(),
          status: "ACTIVE",
        },
        include: {
          household: {
            include: { village: { include: { zone: true } } },
          },
        },
      });

      if (existingMember && existingMember.localId !== localId) {
        return res.status(409).json({
          success: false,
          duplicate: true,
          message: `This National ID is already registered to ${existingMember.fullName} in household ${existingMember.household?.householdNumber || "unknown"} (${existingMember.household?.village?.name || "unknown village"}).`,
          existingMember: {
            id: existingMember.id,
            fullName: existingMember.fullName,
            householdNumber: existingMember.household?.householdNumber,
            village: existingMember.household?.village?.name,
          },
        });
      }
    }
    // Calculate expected delivery date if pregnant
    let expectedDeliveryDate = null;
    if (isPregnant && lmpDate) {
      const lmp = new Date(lmpDate);
      lmp.setDate(lmp.getDate() + 280); // 40 weeks
      expectedDeliveryDate = lmp;
    }

    const member = await prisma.householdMember.create({
      data: {
        localId,
        householdId,
        fullName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        estimatedAge: estimatedAge || null,
        sex,
        relationshipToHead,
        isPregnant: isPregnant || false,
        lmpDate: lmpDate ? new Date(lmpDate) : null,
        expectedDeliveryDate,
        chronicIllnesses: chronicIllnesses || null,
        hasDisability: hasDisability || false,
        disabilityType: disabilityType || null,
        nationalId: nationalId || null,
        phone: phone || null,
        syncedAt: new Date(),
      },
    });

    // Auto-create immunisation schedule for children under 5
    const dob = dateOfBirth ? new Date(dateOfBirth) : null;
    const ageYears = dob
      ? (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365)
      : estimatedAge;

    if (dob && ageYears !== null && ageYears < 5) {
      const schedules = VACCINE_SCHEDULE.map((v) => ({
        memberId: member.id,
        vaccineCode: v.code,
        doseNumber: v.dose,
        dueDate: addWeeks(dob, v.weeksAfterBirth),
        status: "DUE",
      }));
      await prisma.immunisationSchedule.createMany({
        data: schedules,
        skipDuplicates: true,
      });
    }

    // Auto-create ANC schedule if pregnant
    if (isPregnant && lmpDate) {
      const lmp = new Date(lmpDate);
      const ancSchedule = [
        { ancNumber: 1, weeksFromLmp: 16 },
        { ancNumber: 2, weeksFromLmp: 28 },
        { ancNumber: 3, weeksFromLmp: 32 },
        { ancNumber: 4, weeksFromLmp: 36 },
      ];
      const ancData = ancSchedule.map((a) => ({
        memberId: member.id,
        ancNumber: a.ancNumber,
        expectedDate: addWeeks(lmp, a.weeksFromLmp),
        status: "SCHEDULED",
      }));
      await prisma.ancVisit.createMany({ data: ancData, skipDuplicates: true });
    }

    res.status(201).json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/members/:id
export const updateMember = async (req, res, next) => {
  try {
    const allowed = [
      "fullName",
      "dateOfBirth",
      "estimatedAge",
      "sex",
      "relationshipToHead",
      "isPregnant",
      "lmpDate",
      "expectedDeliveryDate",
      "chronicIllnesses",
      "hasDisability",
      "disabilityType",
      "phone",
      "status",
      "archivedAt",
    ];
    const data = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    });

    const member = await prisma.householdMember.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
};
