import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding MobileHealth Malawi database...");

  //  REGIONS
  const southern = await prisma.region.upsert({
    where: { name: "Southern Region" },
    update: {},
    create: { name: "Southern Region" },
  });
  const central = await prisma.region.upsert({
    where: { name: "Central Region" },
    update: {},
    create: { name: "Central Region" },
  });
  const northern = await prisma.region.upsert({
    where: { name: "Northern Region" },
    update: {},
    create: { name: "Northern Region" },
  });
  console.log(" Regions seeded");

  //  DISTRICTS
  const blantyre = await prisma.district.upsert({
    where: { name_regionId: { name: "Blantyre", regionId: southern.id } },
    update: {},
    create: { name: "Blantyre", regionId: southern.id },
  });
  const zomba = await prisma.district.upsert({
    where: { name_regionId: { name: "Zomba", regionId: southern.id } },
    update: {},
    create: { name: "Zomba", regionId: southern.id },
  });
  const lilongwe = await prisma.district.upsert({
    where: { name_regionId: { name: "Lilongwe", regionId: central.id } },
    update: {},
    create: { name: "Lilongwe", regionId: central.id },
  });
  const mzimba = await prisma.district.upsert({
    where: { name_regionId: { name: "Mzimba", regionId: northern.id } },
    update: {},
    create: { name: "Mzimba", regionId: northern.id },
  });
  console.log("Districts seeded");

  //  TRADITIONAL AUTHORITIES
  const taKapeni = await prisma.traditionalAuthority.upsert({
    where: { name_districtId: { name: "TA Kapeni", districtId: blantyre.id } },
    update: {},
    create: { name: "TA Kapeni", districtId: blantyre.id },
  });
  const taNdindi = await prisma.traditionalAuthority.upsert({
    where: { name_districtId: { name: "TA Ndindi", districtId: zomba.id } },
    update: {},
    create: { name: "TA Ndindi", districtId: zomba.id },
  });
  const taLilongwe = await prisma.traditionalAuthority.upsert({
    where: {
      name_districtId: { name: "TA Lilongwe", districtId: lilongwe.id },
    },
    update: {},
    create: { name: "TA Lilongwe", districtId: lilongwe.id },
  });
  console.log(" Traditional Authorities seeded");

  //  ZONES
  const zone1 = await prisma.zone.upsert({
    where: { name_taId: { name: "Kapeni Zone 1", taId: taKapeni.id } },
    update: {},
    create: { name: "Kapeni Zone 1", taId: taKapeni.id },
  });
  const zone2 = await prisma.zone.upsert({
    where: { name_taId: { name: "Kapeni Zone 2", taId: taKapeni.id } },
    update: {},
    create: { name: "Kapeni Zone 2", taId: taKapeni.id },
  });
  const zone3 = await prisma.zone.upsert({
    where: { name_taId: { name: "Ndindi Zone 1", taId: taNdindi.id } },
    update: {},
    create: { name: "Ndindi Zone 1", taId: taNdindi.id },
  });
  console.log(" Zones seeded");

  //  FACILITIES
  await prisma.facility.upsert({
    where: {
      id:
        (
          await prisma.facility.findFirst({
            where: { name: "Kapeni Health Centre" },
          })
        )?.id ?? "00000000-0000-0000-0000-000000000001",
    },
    update: {},
    create: { name: "Kapeni Health Centre", gpsLat: -15.8167, gpsLng: 35.0167 },
  });
  await prisma.facility.upsert({
    where: {
      id:
        (
          await prisma.facility.findFirst({
            where: { name: "Queen Elizabeth Central Hospital" },
          })
        )?.id ?? "00000000-0000-0000-0000-000000000002",
    },
    update: {},
    create: {
      name: "Queen Elizabeth Central Hospital",
      gpsLat: -15.7861,
      gpsLng: 35.0058,
    },
  });
  console.log(" Facilities seeded");

  //  DRUGS
  const drugs = [
    {
      drugCode: "ORS",
      nameEnglish: "Oral Rehydration Salts",
      nameChichewa: "Mankhwala a Kupsomola",
      unit: "sachet",
      minimumThreshold: 20,
    },
    {
      drugCode: "ZINC",
      nameEnglish: "Zinc Tablets",
      nameChichewa: "Zinc",
      unit: "tablet",
      minimumThreshold: 30,
    },
    {
      drugCode: "AMOX",
      nameEnglish: "Amoxicillin 250mg",
      nameChichewa: "Amoxicillin",
      unit: "tablet",
      minimumThreshold: 50,
    },
    {
      drugCode: "PARA",
      nameEnglish: "Paracetamol 500mg",
      nameChichewa: "Paracetamol",
      unit: "tablet",
      minimumThreshold: 50,
    },
    {
      drugCode: "MALRDT",
      nameEnglish: "Malaria RDT Kit",
      nameChichewa: "Kachitidwe ka Malungo",
      unit: "kit",
      minimumThreshold: 10,
    },
    {
      drugCode: "COART",
      nameEnglish: "Coartem (AL) 6-dose",
      nameChichewa: "Coartem",
      unit: "pack",
      minimumThreshold: 15,
    },
    {
      drugCode: "VITA",
      nameEnglish: "Vitamin A Supplement",
      nameChichewa: "Vitamin A",
      unit: "capsule",
      minimumThreshold: 20,
    },
    {
      drugCode: "MEBEN",
      nameEnglish: "Mebendazole 500mg",
      nameChichewa: "Mebendazole",
      unit: "tablet",
      minimumThreshold: 20,
    },
    {
      drugCode: "FESO4",
      nameEnglish: "Ferrous Sulphate",
      nameChichewa: "Chitsulo",
      unit: "tablet",
      minimumThreshold: 30,
    },
    {
      drugCode: "FOLAC",
      nameEnglish: "Folic Acid",
      nameChichewa: "Folic Acid",
      unit: "tablet",
      minimumThreshold: 30,
    },
  ];

  for (const drug of drugs) {
    await prisma.drug.upsert({
      where: { drugCode: drug.drugCode },
      update: {},
      create: drug,
    });
  }
  console.log(" Drugs seeded");

  //  ADMIN USER
  const adminPin = await bcrypt.hash("1234", 12);
  const admin = await prisma.user.upsert({
    where: { phoneNumber: "0999000001" },
    update: {},
    create: {
      fullName: "System Administrator",
      phoneNumber: "0999000001",
      pinHash: adminPin,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(" Admin user created — Phone: 0999000001 | PIN: 1234");

  //  NURSE USER
  const nursePin = await bcrypt.hash("1234", 12);
  const nurse = await prisma.user.upsert({
    where: { phoneNumber: "0999000002" },
    update: {},
    create: {
      fullName: "Grace Phiri",
      phoneNumber: "0999000002",
      pinHash: nursePin,
      role: "NURSE",
      isActive: true,
    },
  });
  console.log(" Nurse user created — Phone: 0999000002 | PIN: 1234");

  // ─── DISTRICT OFFICER
  const dhoPin = await bcrypt.hash("1234", 12);
  const dho = await prisma.user.upsert({
    where: { phoneNumber: "0999000003" },
    update: {},
    create: {
      fullName: "James Banda",
      phoneNumber: "0999000003",
      pinHash: dhoPin,
      role: "DISTRICT_OFFICER",
      isActive: true,
    },
  });
  console.log(" District Officer created — Phone: 0999000003 | PIN: 1234");

  //  CCW USERS
  const ccwPin = await bcrypt.hash("1234", 12);
  const ccw1 = await prisma.user.upsert({
    where: { phoneNumber: "0999000004" },
    update: {},
    create: {
      fullName: "Mary Tembo",
      phoneNumber: "0999000004",
      pinHash: ccwPin,
      role: "CCW",
      isActive: true,
    },
  });
  const ccw2 = await prisma.user.upsert({
    where: { phoneNumber: "0999000005" },
    update: {},
    create: {
      fullName: "Peter Mwale",
      phoneNumber: "0999000005",
      pinHash: ccwPin,
      role: "CCW",
      isActive: true,
    },
  });
  console.log(
    " CCW users created — Phones: 0999000004, 0999000005 | PIN: 1234",
  );

  //  ALLOCATIONS OF CCWs TO ZONES
  await prisma.userZoneAllocation.upsert({
    where: { userId_zoneId: { userId: ccw1.id, zoneId: zone1.id } },
    update: {},
    create: { userId: ccw1.id, zoneId: zone1.id, allocatedById: admin.id },
  });
  await prisma.userZoneAllocation.upsert({
    where: { userId_zoneId: { userId: ccw2.id, zoneId: zone2.id } },
    update: {},
    create: { userId: ccw2.id, zoneId: zone2.id, allocatedById: admin.id },
  });
  console.log(" Zone allocations done");

  //  DRUG STOCK FOR CCWs
  const allDrugs = await prisma.drug.findMany();
  for (const ccw of [ccw1, ccw2]) {
    for (const drug of allDrugs) {
      await prisma.drugStock.upsert({
        where: { userId_drugId: { userId: ccw.id, drugId: drug.id } },
        update: {},
        create: {
          userId: ccw.id,
          drugId: drug.id,
          quantityCurrent: 25,
          quantityMinimum: drug.minimumThreshold,
        },
      });
    }
  }
  console.log(" Drug stock initialised for CCWs");

  console.log("\n Seed complete!");
  console.log("─────────────────────────────────────");
  console.log("Login credentials (all use PIN: 1234)");
  console.log("Admin:           0999000001");
  console.log("Nurse:           0999000002");
  console.log("District Officer: 0999000003");
  console.log("CCW 1:           0999000004");
  console.log("CCW 2:           0999000005");
  console.log("─────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(" Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

//   ─(patrics㉿kali)-[~/Desktop/INCLUDES/PROJECTS/MOB-HEALTH/mob-health/backend]
// └─$ npm run seed

// > backend@1.0.0 seed
// > node prisma/seed.js

// 🌱 Seeding MobileHealth Malawi database...
// ✅ Regions seeded
// ✅ Districts seeded
// ✅ Traditional Authorities seeded
// ✅ Zones seeded
// ✅ Facilities seeded
// ✅ Drugs seeded
// ✅ Admin user created — Phone: 0999000001 | PIN: 1234
// ✅ Nurse user created — Phone: 0999000002 | PIN: 1234
// ✅ District Officer created — Phone: 0999000003 | PIN: 1234
// ✅ CCW users created — Phones: 0999000004, 0999000005 | PIN: 1234
// ✅ Zone allocations done
// ✅ Drug stock initialised for CCWs

// 🎉 Seed complete!
// ─────────────────────────────────────
// Login credentials (all use PIN: 1234)
// Admin:           0999000001
// Nurse:           0999000002
// District Officer: 0999000003
// CCW 1:           0999000004
// CCW 2:           0999000005
// ─────────────────────────────────────
