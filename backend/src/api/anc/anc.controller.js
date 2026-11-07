import prisma from "../../config/db.js";
import { buildVillageScope, villageInScope } from "../../middleware/auth.js";

// GET /api/anc/schedules?taId=
export const getAncSchedules = async (req, res, next) => {
  try {
    const { taId } = req.query;
    const villageScope = buildVillageScope(req.user, taId);
    const hasScope = Object.keys(villageScope).length > 0;

    const where = {
      member: {
        isPregnant: true,
        status: "ACTIVE",
        ...(hasScope ? { household: { village: villageScope } } : {}),
        // CCW sees only ANC for members in their own registered households
        ...(req.user.role === "CCW"
          ? { household: { registeredByUserId: req.user.id } }
          : {}),
      },
    };

    const ancVisits = await prisma.ancVisit.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            localId: true,
            firstName: true,
            lastName: true,
            expectedDeliveryDate: true,
          },
        },
      },
      orderBy: { expectedDate: "asc" },
    });

    // Auto-mark overdue on read (same rule as the PNC tracker)
    const now = new Date();
    const data = ancVisits.map((a) => ({
      id: a.id,
      memberId: a.member?.localId || a.memberId,
      memberName: a.member
        ? `${a.member.firstName} ${a.member.lastName}`.trim()
        : null,
      expectedDeliveryDate: a.member?.expectedDeliveryDate || null,
      ancNumber: a.ancNumber,
      expectedDate: a.expectedDate,
      status:
        a.status === "SCHEDULED" && new Date(a.expectedDate) < now
          ? "OVERDUE"
          : a.status,
      attendedDate: a.attendedDate || null,
      notes: a.notes || null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("ANC schedules error:", err.message);
    next(err);
  }
};

// PATCH /api/anc/:id/record — nurse marks an ANC contact as attended
export const recordAncVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { attendedDate, notes } = req.body;

    const allowed = [
      "CCW",
      "NURSE",
      "DISTRICT_OFFICER",
      "ADMIN",
      "SUPER_ADMIN",
    ];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Cannot record ANC visits.",
      });
    }

    const existing = await prisma.ancVisit.findUnique({
      where: { id },
      include: {
        member: { select: { household: { select: { villageId: true } } } },
      },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "ANC visit not found." });
    }

    if (
      !(await villageInScope(req.user, existing.member.household.villageId))
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allocated to this zone.",
      });
    }

    const updated = await prisma.ancVisit.update({
      where: { id },
      data: {
        status: "ATTENDED",
        attendedDate: attendedDate ? new Date(attendedDate) : new Date(),
        ...(notes ? { notes: String(notes).slice(0, 500) } : {}),
        facilityId: req.user.facilityId ?? existing.facilityId,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};
