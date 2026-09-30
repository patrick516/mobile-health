import prisma from "../../config/db.js";

export const exportDHIS2 = async (req, res, next) => {
  try {
    const {
      from,
      to,
      districtId: qDistrictId,
      taId: qTaId,
      zoneId: qZoneId,
    } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({ success: false, message: "from and to dates are required." });
    }

    // ─── Base filter: date range ───
    const visitWhere = {
      visitedAt: { gte: new Date(from), lte: new Date(to) },
    };

    // ─── Role-based scoping ───
    if (req.user.role === "SUPER_ADMIN") {
      // Country-wide by default; narrowed if filters are provided.
      // Precedence: zoneId > taId > districtId
      if (qZoneId) {
        visitWhere.member = {
          household: { village: { zone: { id: qZoneId } } },
        };
      } else if (qTaId) {
        visitWhere.member = {
          household: { village: { zone: { taId: qTaId } } },
        };
      } else if (qDistrictId) {
        visitWhere.member = {
          household: {
            village: { zone: { ta: { districtId: qDistrictId } } },
          },
        };
      }
    } else if (req.user.role === "ADMIN") {
      // Auto-scope to the admin's facility via the CHW's facility assignment.
      // Query params are IGNORED — an ADMIN cannot widen their scope.
      if (!req.user.facilityId) {
        return res.status(403).json({
          success: false,
          message: "Your account has no facility assigned.",
        });
      }
      visitWhere.chw = { facilityId: req.user.facilityId };
    } else if (req.user.role === "DISTRICT_OFFICER") {
      // Prefer district scope if their facility is a District Hospital.
      // Otherwise fall back to the TAs they're allocated to.
      if (req.user.districtId) {
        visitWhere.member = {
          household: {
            village: { zone: { ta: { districtId: req.user.districtId } } },
          },
        };
      } else if (req.user.taIds && req.user.taIds.length > 0) {
        visitWhere.member = {
          household: {
            village: { zone: { taId: { in: req.user.taIds } } },
          },
        };
      } else {
        // No scope — return nothing rather than leak everything.
        return res.status(403).json({
          success: false,
          message: "Your account has no district or TA allocation.",
        });
      }
    }

    const visits = await prisma.visit.findMany({
      where: visitWhere,
      include: {
        member: {
          include: {
            household: {
              include: {
                village: {
                  include: {
                    zone: { include: { ta: { include: { district: true } } } },
                  },
                },
              },
            },
          },
        },
        chw: {
          select: {
            fullName: true,
            facility: { select: { name: true, facilityType: true } },
          },
        },
        referrals: { select: { status: true, urgency: true } },
      },
    });

    const rows = visits.map((v) =>
      [
        v.id,
        v.visitedAt.toISOString().split("T")[0],
        v.member.fullName,
        v.member.sex,
        v.member.dateOfBirth?.toISOString().split("T")[0] || "",
        v.member.household.village.zone.ta.district.name,
        v.member.household.village.zone.ta.name,
        v.member.household.village.zone.name,
        v.member.household.village.name,
        v.member.household.householdNumber,
        v.chw.fullName,
        v.chw.facility?.name || "",
        v.visitType,
        JSON.stringify(v.symptoms || []),
        v.temperature || "",
        v.muacMm || "",
        v.muacStatus || "",
        v.referralNeeded ? "Yes" : "No",
        v.referrals.length > 0 ? v.referrals[0].status : "",
      ].join(","),
    );

    const header = [
      "visit_id",
      "date",
      "patient_name",
      "sex",
      "date_of_birth",
      "district",
      "traditional_authority",
      "zone",
      "village",
      "household_number",
      "chw_name",
      "facility",
      "visit_type",
      "symptoms",
      "temperature_c",
      "muac_mm",
      "muac_status",
      "referral_needed",
      "referral_status",
    ].join(",");

    const csv = [header, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="dhis2_export_${from}_${to}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
