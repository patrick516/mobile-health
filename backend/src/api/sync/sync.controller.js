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
          case "HOUSEHOLD": {
            await prisma.household.upsert({
              where: { localId },
              update: { ...payload, syncedAt: new Date() },
              create: {
                ...payload,
                localId,
                registeredByUserId: req.user.id,
                syncedAt: new Date(),
              },
            });
            break;
          }
          case "MEMBER": {
            await prisma.householdMember.upsert({
              where: { localId },
              update: { ...payload, syncedAt: new Date() },
              create: { ...payload, localId, syncedAt: new Date() },
            });
            break;
          }
          case "VISIT": {
            await prisma.visit.upsert({
              where: { localId },
              update: { ...payload, syncedAt: new Date() },
              create: {
                ...payload,
                localId,
                chwId: req.user.id,
                syncedAt: new Date(),
              },
            });
            break;
          }
          case "REFERRAL": {
            await prisma.referral.upsert({
              where: { localId },
              update: { ...payload, syncedAt: new Date() },
              create: {
                ...payload,
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
