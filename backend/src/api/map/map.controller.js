import prisma from "../../config/db.js";
import { buildVillageScope } from "../../middleware/auth.js";

// GET /api/map/events?from=&to=&type=&taId=
export const getMapEvents = async (req, res, next) => {
  try {
    const { from, to, type, taId } = req.query;

    const dateFilter =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          }
        : undefined;

    const villageScope = buildVillageScope(req.user, taId);
    const hasScope = Object.keys(villageScope).length > 0;

    const events = [];

    if (!type || type === "visit") {
      const visits = await prisma.visit.findMany({
        where: {
          gpsLat: { not: null },
          gpsLng: { not: null },
          ...(dateFilter ? { visitedAt: dateFilter } : {}),
          ...(hasScope
            ? {
                member: { household: { village: villageScope } },
              }
            : {}),
        },
        select: {
          id: true,
          gpsLat: true,
          gpsLng: true,
          visitedAt: true,
          visitType: true,
          referralNeeded: true,
          muacStatus: true,
          member: { select: { fullName: true } },
        },
        take: 2000,
      });

      visits.forEach((v) =>
        events.push({
          id: v.id,
          type: "visit",
          lat: v.gpsLat,
          lng: v.gpsLng,
          timestamp: v.visitedAt,
          label: v.member.fullName,
          meta: {
            visitType: v.visitType,
            referralNeeded: v.referralNeeded,
            muacStatus: v.muacStatus,
          },
          colour: v.referralNeeded
            ? v.muacStatus === "SEVERE_MALNUTRITION"
              ? "red"
              : "yellow"
            : "green",
        }),
      );
    }

    if (!type || type === "household") {
      const households = await prisma.household.findMany({
        where: {
          gpsLat: { not: null },
          gpsLng: { not: null },
          status: "ACTIVE",
          ...(hasScope ? { village: villageScope } : {}),
        },
        select: {
          id: true,
          gpsLat: true,
          gpsLng: true,
          householdNumber: true,
          headOfHouseholdName: true,
          _count: { select: { members: true } },
        },
        take: 2000,
      });

      households.forEach((h) =>
        events.push({
          id: h.id,
          type: "household",
          lat: h.gpsLat,
          lng: h.gpsLng,
          label: h.headOfHouseholdName,
          meta: {
            householdNumber: h.householdNumber,
            memberCount: h._count.members,
          },
          colour: "blue",
        }),
      );
    }

    if (!type || type === "referral") {
      const referrals = await prisma.referral.findMany({
        where: {
          status: { in: ["PENDING", "OVERDUE"] },
          visit: { gpsLat: { not: null } },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
          ...(hasScope
            ? { member: { household: { village: villageScope } } }
            : {}),
        },
        include: {
          visit: { select: { gpsLat: true, gpsLng: true } },
          member: { select: { fullName: true } },
        },
        take: 500,
      });

      referrals.forEach((r) =>
        events.push({
          id: r.id,
          type: "referral",
          lat: r.visit.gpsLat,
          lng: r.visit.gpsLng,
          label: r.member.fullName,
          meta: { urgency: r.urgency, status: r.status, reason: r.reason },
          colour: r.urgency === "EMERGENCY" ? "red" : "yellow",
        }),
      );
    }

    res.json({ success: true, data: events, total: events.length });
  } catch (err) {
    next(err);
  }
};
