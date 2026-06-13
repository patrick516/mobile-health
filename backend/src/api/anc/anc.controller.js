import prisma from "../../config/db.js";

export const getAncSchedules = async (req, res, next) => {
  try {
    const where = {
      member: {
        isPregnant: true,
        status: "ACTIVE",
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

    console.log(`ANC visits found: ${ancVisits.length}`);

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
