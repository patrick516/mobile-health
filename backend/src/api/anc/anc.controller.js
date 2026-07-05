import prisma from "../../config/db.js";
import { buildVillageScope } from "../../middleware/auth.js";

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
            fullName: true,
            expectedDeliveryDate: true,
          },
        },
      },
      orderBy: { expectedDate: "asc" },
    });

    const data = ancVisits.map((a) => ({
      id: a.id,
      memberId: a.member?.localId || a.memberId,
      ancNumber: a.ancNumber,
      expectedDate: a.expectedDate,
      status: a.status,
      attendedDate: a.attendedDate || null,
      notes: a.notes || null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("ANC schedules error:", err.message);
    next(err);
  }
};
