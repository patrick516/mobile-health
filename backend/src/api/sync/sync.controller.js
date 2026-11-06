import prisma from "../../config/db.js";

// Copy only the listed keys (blocks fields a hacked client might add)
const pick = (obj, keys) =>
  Object.fromEntries(
    keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]),
  );

// Find a member by server id OR the phone's local id (never matches an empty id)
const resolveMember = async (id) =>
  id
    ? prisma.householdMember.findFirst({
        where: { OR: [{ id }, { localId: id }] },
        select: { id: true },
      })
    : null;

// Phones send the wall material code as structureType; map it to a valid enum value
const STRUCTURE_MAP = { MUD_CLAY: "MUD", WOOD_TIMBER: "OTHER" };
const VALID_STRUCTURES = [
  "BRICK",
  "MUD",
  "IRON_SHEET",
  "GRASS_THATCH",
  "OTHER",
];
const toValidStructure = (value) => {
  const mapped = STRUCTURE_MAP[value] ?? value;
  return VALID_STRUCTURES.includes(mapped) ? mapped : "OTHER";
};

const HOUSEHOLD_FIELDS = [
  "householdNumber",
  "villageId",
  "headOfHouseholdName",
  "headPhone",
  "headNationalId",
  "consentGiven",
  "consentSignatureUrl",
  "structureType",
  "wallMaterial",
  "roofMaterial",
  "floorType",
  "hasElectricity",
  "waterSource",
  "latrinePresent",
  "latrineType",
  "handwashingFacility",
  "handwashingWithSoap",
  "distanceToFacility",
  "mosquitoNets",
  "numberOfRooms",
  "landmark",
  "gpsLat",
  "gpsLng",
];

const MEMBER_FIELDS = [
  "firstName",
  "lastName",
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
  "nationalId",
  "phone",
];

const IMMUNISATION_FIELDS = [
  "memberId",
  "vaccineCode",
  "doseNumber",
  "givenAt",
  "batchNumber",
  "route",
  "nextDueDate",
  "facilityOrOutreach",
];

const DRUG_DISPENSE_FIELDS = [
  "visitId",
  "memberId",
  "drugId",
  "quantityDispensed",
  "dispensedAt",
];

// NOTE: status/approvedById/fulfilledAt are deliberately excluded —
// a hacked client must not be able to self-fulfil stock requests.
const STOCK_REQUEST_FIELDS = ["drugId", "quantityRequested", "notes"];

const ANC_VISIT_FIELDS = [
  "memberId",
  "ancNumber",
  "expectedDate",
  "status",
  "attendedDate",
  "facilityId",
  "notes",
];
function normalizeMemberPayload(payload) {
  const out = { ...payload };

  if (!out.firstName && !out.lastName && out.fullName) {
    const parts = String(out.fullName).trim().split(/\s+/);
    out.firstName = parts[0] || "";
    out.lastName = parts.slice(1).join(" ") || "";
  }

  // Prisma will reject unknown fields — strip legacy `fullName`
  delete out.fullName;

  return out;
}

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

        console.log(
          `[SYNC] Processing record: type=${type}, localId=${localId}`,
        );

        switch (type) {
          case "VILLAGE": {
            if (
              req.user.role === "CCW" &&
              !req.user.zoneIds.includes(payload.zoneId)
            ) {
              failed.push({
                localId,
                reason: "You are not allocated to this zone.",
              });
              continue;
            }
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

              if (
                req.user.role === "CCW" &&
                !req.user.zoneIds.includes(villageExists.zoneId)
              ) {
                failed.push({
                  localId,
                  reason: "This village is outside your allocated zones.",
                });
                continue;
              }

              // ── Duplicate National ID check ──
              if (
                payload.headNationalId &&
                payload.headNationalId.trim() !== ""
              ) {
                const dupNationalId = await prisma.household.findFirst({
                  where: {
                    headNationalId: payload.headNationalId.trim(),
                    status: "ACTIVE",
                    localId: { not: localId },
                  },
                  include: { village: true },
                });

                if (dupNationalId) {
                  failed.push({
                    localId,
                    reason: `Duplicate National ID — already registered to ${dupNationalId.headOfHouseholdName} (${dupNationalId.householdNumber}) in ${dupNationalId.village?.name || "another village"}. This record will NOT retry automatically — review on the portal.`,
                    duplicate: true,
                  });
                  continue;
                }
              }

              const fields = pick(payload, HOUSEHOLD_FIELDS);
              fields.structureType = toValidStructure(
                fields.structureType ?? fields.wallMaterial,
              );

              // Number already used by a DIFFERENT household? Make this one unique.
              const numberOwner = fields.householdNumber
                ? await prisma.household.findUnique({
                    where: { householdNumber: fields.householdNumber },
                    select: { localId: true },
                  })
                : null;
              if (numberOwner && numberOwner.localId !== localId) {
                fields.householdNumber = `${fields.householdNumber}-${localId.substring(0, 4).toUpperCase()}`;
              }

              await prisma.household.upsert({
                where: { localId },
                update: { ...fields, syncedAt: new Date() },
                create: {
                  ...fields,
                  localId,
                  registeredByUserId: req.user.id,
                  syncedAt: new Date(),
                  householdNumber:
                    fields.householdNumber ||
                    localId.substring(0, 8).toUpperCase(),
                },
              });
              break;
            } catch (err) {
              console.error(`[SYNC] Household error:`, err.message);
              failed.push({ localId, reason: err.message });
              continue;
            }
          }

          case "MEMBER": {
            // ── Normalize name fields (handle old APK payloads) ──
            const memberPayload = normalizeMemberPayload(payload);

            console.log(
              "[SYNC DEBUG] Member payload:",
              JSON.stringify(
                {
                  localId,
                  householdId: memberPayload.householdId,
                  firstName: memberPayload.firstName,
                  lastName: memberPayload.lastName,
                },
                null,
                2,
              ),
            );

            const householdExists = await prisma.household.findFirst({
              where: {
                OR: [
                  { id: memberPayload.householdId },
                  { localId: memberPayload.householdId },
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

            // ── Duplicate National ID check ──
            if (
              memberPayload.nationalId &&
              memberPayload.nationalId.trim() !== ""
            ) {
              const dupMember = await prisma.householdMember.findFirst({
                where: {
                  nationalId: memberPayload.nationalId.trim(),
                  status: "ACTIVE",
                  localId: { not: localId },
                },
                include: { household: true },
              });

              if (dupMember) {
                const dupName =
                  `${dupMember.firstName} ${dupMember.lastName}`.trim();
                failed.push({
                  localId,
                  reason: `Duplicate National ID — already registered to ${dupName} in household ${dupMember.household?.householdNumber || "unknown"}. This record will NOT retry automatically — review on the portal.`,
                  duplicate: true,
                });
                continue;
              }
            }

            const memberFields = {
              ...pick(memberPayload, MEMBER_FIELDS),
              householdId: householdExists.id,
            };
            const member = await prisma.householdMember.upsert({
              where: { localId },
              update: { ...memberFields, syncedAt: new Date() },
              create: { ...memberFields, localId, syncedAt: new Date() },
            });
            const dob = memberPayload.dateOfBirth
              ? new Date(memberPayload.dateOfBirth)
              : null;
            const ageYears = dob
              ? (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365)
              : memberPayload.estimatedAge;

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
                `[SYNC] Created immunisation schedule for child ${member.firstName} ${member.lastName}`,
              );
            }

            if (memberPayload.isPregnant && memberPayload.lmpDate) {
              const lmp = new Date(memberPayload.lmpDate);
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
                `[SYNC] Created ANC schedule for pregnant woman ${member.firstName} ${member.lastName}`,
              );
            }
            break;
          }

          case "VISIT": {
            const { dispenses, ...vp } = payload;

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
              weightKg: vp.weightKg ?? null,
              heightCm: vp.heightCm ?? null,
              zScoreWfa: vp.zScoreWfa ?? null,
              zScoreHfa: vp.zScoreHfa ?? null,
              zScoreWfh: vp.zScoreWfh ?? null,
              growthStatus: vp.growthStatus || null,
            };

            const savedVisit = await prisma.visit.upsert({
              where: { localId },
              update: { ...visitData, syncedAt: new Date() },
              create: {
                ...visitData,
                localId,
                chwId: req.user.id,
                syncedAt: new Date(),
              },
            });

            // Drugs handed out during the visit
            for (const d of dispenses || []) {
              if (!d.localId) continue;
              const already = await prisma.drugDispense.findUnique({
                where: { localId: d.localId },
                select: { id: true },
              });
              if (already) continue; // retry: never count twice

              await prisma.drugDispense.create({
                data: {
                  localId: d.localId,
                  visitId: savedVisit.id,
                  memberId: member.id,
                  drugId: d.drugId,
                  quantityDispensed: d.quantity,
                  dispensedById: req.user.id,
                  dispensedAt: visitData.visitedAt,
                  syncedAt: new Date(),
                },
              });
              await prisma.drugStock.updateMany({
                where: { userId: req.user.id, drugId: d.drugId },
                data: { quantityCurrent: { decrement: d.quantity } },
              });
            }
            break;
          }

          case "REFERRAL": {
            console.log(
              `[SYNC] Processing REFERRAL update:`,
              JSON.stringify(
                {
                  localId,
                  payload: {
                    id: payload.id,
                    visitId: payload.visitId,
                    memberId: payload.memberId,
                    reason: payload.reason,
                    urgency: payload.urgency,
                    status: payload.status,
                    dueBy: payload.dueBy,
                  },
                },
                null,
                2,
              ),
            );

            const rp = payload;

            const visit = await prisma.visit.findFirst({
              where: {
                OR: [{ id: rp.visitId }, { localId: rp.visitId }],
              },
            });
            if (!visit) {
              console.log(
                `[SYNC] REFERRAL failed: Visit not found for ${rp.visitId}`,
              );
              failed.push({
                localId,
                reason: "Visit not yet on server — will retry",
              });
              continue;
            }

            const member = await prisma.householdMember.findFirst({
              where: {
                OR: [{ id: rp.memberId }, { localId: rp.memberId }],
              },
            });
            if (!member) {
              console.log(
                `[SYNC] REFERRAL failed: Member not found for ${rp.memberId}`,
              );
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

            console.log(
              `[SYNC] Updating referral to status: ${referralData.status}`,
            );

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
            const fields = pick(payload, IMMUNISATION_FIELDS);
            await prisma.immunisation.upsert({
              where: { localId },
              update: { ...fields, syncedAt: new Date() },
              create: {
                ...fields,
                localId,
                givenByUserId: req.user.id,
                syncedAt: new Date(),
              },
            });
            await prisma.immunisationSchedule.updateMany({
              where: {
                memberId: fields.memberId,
                vaccineCode: fields.vaccineCode,
                doseNumber: fields.doseNumber,
              },
              data: { status: "GIVEN", givenAt: new Date(fields.givenAt) },
            });
            break;
          }

          case "DRUG_DISPENSE": {
            const fields = pick(payload, DRUG_DISPENSE_FIELDS);
            await prisma.drugDispense.upsert({
              where: { localId },
              update: { ...fields, syncedAt: new Date() },
              create: {
                ...fields,
                localId,
                dispensedById: req.user.id,
                syncedAt: new Date(),
              },
            });
            break;
          }

          case "STOCK_REQUEST": {
            const fields = pick(payload, STOCK_REQUEST_FIELDS);
            const existing = await prisma.stockRequest.findFirst({
              where: {
                requestingUserId: req.user.id,
                drugId: fields.drugId,
                status: "PENDING",
              },
            });
            if (!existing) {
              await prisma.stockRequest.create({
                data: { ...fields, requestingUserId: req.user.id },
              });
            }
            break;
          }

          case "ANC_VISIT": {
            const fields = pick(payload, ANC_VISIT_FIELDS);
            await prisma.ancVisit.upsert({
              where: {
                memberId_ancNumber: {
                  memberId: fields.memberId,
                  ancNumber: fields.ancNumber,
                },
              },
              update: { ...fields, syncedAt: new Date() },
              create: { ...fields, syncedAt: new Date() },
            });
            break;
          }
          case "FP_VISIT": {
            const fpMember = await resolveMember(payload.memberId);
            if (!fpMember) {
              failed.push({
                localId,
                reason: "Member not yet on server — will retry",
              });
              continue;
            }
            const fpData = {
              memberId: fpMember.id,
              visitDate: new Date(payload.visitDate),
              method: payload.method,
              quantityGiven: payload.quantityGiven ?? null,
              nextFollowUpDate: payload.nextFollowUpDate
                ? new Date(payload.nextFollowUpDate)
                : null,
              sideEffects: payload.sideEffects ?? undefined,
              referralNeeded: payload.referralNeeded ?? false,
              counsellingGiven: payload.counsellingGiven ?? true,
              notes: payload.notes || null,
            };
            await prisma.fpVisit.upsert({
              where: { localId },
              update: { ...fpData, syncedAt: new Date() },
              create: {
                ...fpData,
                localId,
                visitedById: req.user.id,
                syncedAt: new Date(),
              },
            });
            break;
          }

          case "TB_DOT_VISIT": {
            const tbCase = payload.tbCaseId
              ? await prisma.tbCase.findUnique({
                  where: { id: payload.tbCaseId },
                  select: { id: true },
                })
              : null;
            if (!tbCase) {
              failed.push({
                localId,
                reason: "TB case not yet on server — will retry",
              });
              continue;
            }
            const dotData = {
              tbCaseId: tbCase.id,
              visitDate: new Date(payload.visitDate),
              status: payload.status || "OBSERVED",
              drugsGiven: payload.drugsGiven ?? undefined,
              missedReason: payload.missedReason || null,
              notes: payload.notes || null,
            };
            await prisma.tbDotVisit.upsert({
              where: { localId },
              update: { ...dotData, syncedAt: new Date() },
              create: {
                ...dotData,
                localId,
                visitedById: req.user.id,
                syncedAt: new Date(),
              },
            });
            break;
          }

          case "PNC_VISIT": {
            const pncMember = await resolveMember(payload.memberId);
            if (!pncMember) {
              failed.push({
                localId,
                reason: "Member not yet on server — will retry",
              });
              continue;
            }
            const pncNumber = parseInt(payload.pncNumber);
            if (![1, 2, 3, 4].includes(pncNumber) || !payload.expectedDate) {
              failed.push({
                localId,
                reason: "PNC visit needs pncNumber (1 to 4) and expectedDate.",
              });
              continue;
            }

            // Only a visit that was really done carries an assessment
            const attended =
              payload.status === "ATTENDED" && payload.visitedDate;
            const assessment = attended
              ? {
                  status: "ATTENDED",
                  visitedDate: new Date(payload.visitedDate),
                  visitedById: req.user.id,
                  motherTemperature: payload.motherTemperature ?? null,
                  motherBloodPressure: payload.motherBloodPressure ?? null,
                  motherBreastStatus: payload.motherBreastStatus ?? null,
                  motherUterusStatus: payload.motherUterusStatus ?? null,
                  motherDangerSigns: payload.motherDangerSigns ?? undefined,
                  newbornWeight: payload.newbornWeight ?? null,
                  newbornTemperature: payload.newbornTemperature ?? null,
                  newbornCordStatus: payload.newbornCordStatus ?? null,
                  isBreastfeeding: payload.isBreastfeeding ?? false,
                  newbornDangerSigns: payload.newbornDangerSigns ?? undefined,
                  referralNeeded: payload.referralNeeded ?? false,
                  notes: payload.notes || null,
                }
              : {};

            const pncKey = {
              memberId_pncNumber: { memberId: pncMember.id, pncNumber },
            };
            const alreadyThere = await prisma.pncVisit.findUnique({
              where: pncKey,
              select: { id: true },
            });

            await prisma.pncVisit.upsert({
              where: pncKey,
              update: { ...assessment, syncedAt: new Date() },
              create: {
                localId,
                memberId: pncMember.id,
                pncNumber,
                expectedDate: new Date(payload.expectedDate),
                ...assessment,
                syncedAt: new Date(),
              },
            });

            // First time this woman gets a postnatal schedule: she has delivered
            if (!alreadyThere) {
              await prisma.householdMember.update({
                where: { id: pncMember.id },
                data: { isPregnant: false },
              });
            }
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
