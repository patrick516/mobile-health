import prisma from "../../config/db.js";

// POST /api/sync — receives a batch of records from the mobile app
export const syncBatch = async (req, res, next) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No records provided." });
    }

    const confirmed = [];
    const failed = [];

    for (const record of records) {
      try {
        const { type, localId, payload } = record;

        switch (type) {
          case "VILLAGE": {
            await prisma.village.upsert({
              where: { id: payload.id || localId },
              update: {
                name: payload.name,
                updatedAt: new Date(),
              },
              create: {
                id: payload.id || localId,
                name: payload.name,
                zoneId: payload.zoneId,
                gpsLat: payload.gpsLat || null,
                gpsLng: payload.gpsLng || null,
                createdByUserId: req.user.id,
                isVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
            break;
          }

          case "HOUSEHOLD": {
            try {
              // Check if village exists on server
              const villageExists = await prisma.village.findFirst({
                where: { id: payload.villageId },
              });

              if (!villageExists) {
                failed.push({
                  localId,
                  reason: "Village not yet on server — will retry",
                });
                continue;
              }

              // Check if household with this number already exists
              const existingHousehold = await prisma.household.findUnique({
                where: { householdNumber: payload.householdNumber },
              });

              if (existingHousehold) {
                // Update existing instead of creating new
                await prisma.household.update({
                  where: { id: existingHousehold.id },
                  data: { ...payload, syncedAt: new Date() },
                });
              } else {
                await prisma.household.upsert({
                  where: { localId },
                  update: { ...payload, syncedAt: new Date() },
                  create: {
                    ...payload,
                    localId,
                    registeredByUserId: req.user.id,
                    syncedAt: new Date(),
                    householdNumber:
                      payload.householdNumber ||
                      payload.localId.substring(0, 8).toUpperCase(),
                  },
                });
              }
              break;
            } catch (err) {
              console.error(`[SYNC] Household error:`, err.message);
              failed.push({ localId, reason: err.message });
              continue;
            }
          }

          case "MEMBER": {
            console.log(
              "[SYNC DEBUG] Member payload:",
              JSON.stringify(
                {
                  localId,
                  householdId: payload.householdId,
                  fullName: payload.fullName,
                },
                null,
                2,
              ),
            );

            // Check if household exists before saving member
            const householdExists = await prisma.household.findFirst({
              where: {
                OR: [
                  { id: payload.householdId },
                  { localId: payload.householdId },
                ],
              },
            });

            console.log(
              "[SYNC DEBUG] Household exists?",
              householdExists ? "YES" : "NO",
            );

            if (!householdExists) {
              failed.push({
                localId,
                reason: "Household not yet on server — will retry",
              });
              continue;
            }

            const member = await prisma.householdMember.upsert({
              where: { localId },
              update: { ...payload, syncedAt: new Date() },
              create: { ...payload, localId, syncedAt: new Date() },
            });

            // Auto-create immunisation schedule for children under 5
            const dob = payload.dateOfBirth
              ? new Date(payload.dateOfBirth)
              : null;
            const ageYears = dob
              ? (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365)
              : payload.estimatedAge;

            if (dob && ageYears < 5) {
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

              for (const v of VACCINE_SCHEDULE) {
                const dueDate = new Date(dob);
                dueDate.setDate(dueDate.getDate() + v.weeksAfterBirth * 7);

                await prisma.immunisationSchedule.upsert({
                  where: {
                    memberId_vaccineCode_doseNumber: {
                      memberId: member.id,
                      vaccineCode: v.code,
                      doseNumber: v.dose,
                    },
                  },
                  update: {},
                  create: {
                    memberId: member.id,
                    vaccineCode: v.code,
                    doseNumber: v.dose,
                    dueDate,
                    status: dueDate < new Date() ? "OVERDUE" : "DUE",
                  },
                });
              }
              console.log(
                `[SYNC] Created immunisation schedule for child ${member.fullName}`,
              );
            }

            // Auto-create ANC schedule for pregnant women
            if (payload.isPregnant && payload.lmpDate) {
              const lmp = new Date(payload.lmpDate);
              const ancSchedule = [
                { ancNumber: 1, weeksFromLmp: 16 },
                { ancNumber: 2, weeksFromLmp: 28 },
                { ancNumber: 3, weeksFromLmp: 32 },
                { ancNumber: 4, weeksFromLmp: 36 },
              ];
              for (const a of ancSchedule) {
                const expectedDate = new Date(lmp);
                expectedDate.setDate(
                  expectedDate.getDate() + a.weeksFromLmp * 7,
                );
                await prisma.ancVisit.upsert({
                  where: {
                    memberId_ancNumber: {
                      memberId: member.id,
                      ancNumber: a.ancNumber,
                    },
                  },
                  update: {},
                  create: {
                    memberId: member.id,
                    ancNumber: a.ancNumber,
                    expectedDate,
                    status: "SCHEDULED",
                  },
                });
              }
              console.log(
                `[SYNC] Created ANC schedule for pregnant woman ${member.fullName}`,
              );
            }
            break;
          }

          case "VISIT": {
            const { dispenses, ...vp } = payload;

            // Resolve memberId from localId → server id
            const member = await prisma.householdMember.findFirst({
              where: {
                OR: [{ id: vp.memberId }, { localId: vp.memberId }],
              },
            });
            if (!member) {
              failed.push({
                localId,
                reason: "Member not yet on server — will retry",
              });
              continue;
            }

            // Resolve householdId from localId → server id
            const household = await prisma.household.findFirst({
              where: {
                OR: [{ id: vp.householdId }, { localId: vp.householdId }],
              },
            });
            if (!household) {
              failed.push({
                localId,
                reason: "Household not yet on server — will retry",
              });
              continue;
            }

            const visitData = {
              memberId: member.id,
              householdId: household.id,
              visitedAt: new Date(vp.visitedAt || vp.visited_at),
              visitType: vp.visitType || vp.visit_type,
              symptoms: vp.symptoms
                ? typeof vp.symptoms === "string"
                  ? JSON.parse(vp.symptoms)
                  : vp.symptoms
                : null,
              temperature: vp.temperature || null,
              muacMm: vp.muacMm || vp.muac_mm || null,
              muacStatus: vp.muacStatus || vp.muac_status || null,
              dangerSigns: vp.dangerSigns
                ? typeof vp.dangerSigns === "string"
                  ? JSON.parse(vp.dangerSigns)
                  : vp.dangerSigns
                : null,
              referralNeeded: vp.referralNeeded ?? vp.referral_needed ?? false,
              gpsLat: vp.gpsLat || vp.gps_lat || null,
              gpsLng: vp.gpsLng || vp.gps_lng || null,
              notes: vp.notes || null,
            };

            await prisma.visit.upsert({
              where: { localId },
              update: { ...visitData, syncedAt: new Date() },
              create: {
                ...visitData,
                localId,
                chwId: req.user.id,
                syncedAt: new Date(),
              },
            });
            break;
          }

          case "REFERRAL": {
            const rp = payload;

            // Resolve visitId from localId → server id
            const visit = await prisma.visit.findFirst({
              where: {
                OR: [{ id: rp.visitId }, { localId: rp.visitId }],
              },
            });
            if (!visit) {
              failed.push({
                localId,
                reason: "Visit not yet on server — will retry",
              });
              continue;
            }

            // Resolve memberId from localId → server id
            const member = await prisma.householdMember.findFirst({
              where: {
                OR: [{ id: rp.memberId }, { localId: rp.memberId }],
              },
            });
            if (!member) {
              failed.push({
                localId,
                reason: "Member not yet on server — will retry",
              });
              continue;
            }

            const referralData = {
              visitId: visit.id,
              memberId: member.id,
              destinationFacilityId: rp.destinationFacilityId || null,
              reason: rp.reason,
              urgency: rp.urgency,
              status: rp.status || "PENDING",
              dueBy: rp.dueBy ? new Date(rp.dueBy) : null,
            };

            await prisma.referral.upsert({
              where: { localId },
              update: { ...referralData, syncedAt: new Date() },
              create: {
                ...referralData,
                localId,
                referringUserId: req.user.id,
                syncedAt: new Date(),
              },
            });
            break;
          }

          case "IMMUNISATION": {
            await prisma.immunisation.upsert({
              where: { localId },
              update: { ...payload, syncedAt: new Date() },
              create: {
                ...payload,
                localId,
                givenByUserId: req.user.id,
                syncedAt: new Date(),
              },
            });
            await prisma.immunisationSchedule.updateMany({
              where: {
                memberId: payload.memberId,
                vaccineCode: payload.vaccineCode,
                doseNumber: payload.doseNumber,
              },
              data: { status: "GIVEN", givenAt: new Date(payload.givenAt) },
            });
            break;
          }

          case "DRUG_DISPENSE": {
            await prisma.drugDispense.upsert({
              where: { localId },
              update: { ...payload, syncedAt: new Date() },
              create: {
                ...payload,
                localId,
                dispensedById: req.user.id,
                syncedAt: new Date(),
              },
            });
            break;
          }

          case "STOCK_REQUEST": {
            const existing = await prisma.stockRequest.findFirst({
              where: {
                requestingUserId: req.user.id,
                drugId: payload.drugId,
                status: "PENDING",
              },
            });
            if (!existing) {
              await prisma.stockRequest.create({
                data: { ...payload, requestingUserId: req.user.id },
              });
            }
            break;
          }

          case "ANC_VISIT": {
            await prisma.ancVisit.upsert({
              where: {
                memberId_ancNumber: {
                  memberId: payload.memberId,
                  ancNumber: payload.ancNumber,
                },
              },
              update: { ...payload, syncedAt: new Date() },
              create: { ...payload, syncedAt: new Date() },
            });
            break;
          }

          default:
            failed.push({ localId, reason: `Unknown record type: ${type}` });
            continue;
        }

        confirmed.push(localId);
      } catch (err) {
        console.error(
          `[SYNC] Failed to process ${record.localId}:`,
          err.message,
        );
        failed.push({ localId: record.localId, reason: err.message });
      }
    }

    res.json({ success: true, confirmed, failed });
  } catch (err) {
    next(err);
  }
};
