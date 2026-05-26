import prisma from "../../config/db.js";

export const exportDHIS2 = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({ success: false, message: "from and to dates are required." });
    }

    const visits = await prisma.visit.findMany({
      where: { visitedAt: { gte: new Date(from), lte: new Date(to) } },
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
        chw: { select: { fullName: true } },
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
