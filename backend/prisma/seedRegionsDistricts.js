// prisma/seedRegionsDistricts.js
// Seeds all 28 official Malawi districts across 3 regions.
// Safe to re-run — uses upsert, no duplicates.
// Run with: node prisma/seedRegionsDistricts.js

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "@prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DATA = {
  "Northern Region": [
    "Chitipa",
    "Karonga",
    "Likoma",
    "Mzimba",
    "Nkhata Bay",
    "Rumphi",
  ],
  "Central Region": [
    "Dedza",
    "Dowa",
    "Kasungu",
    "Lilongwe",
    "Mchinji",
    "Nkhotakota",
    "Ntcheu",
    "Ntchisi",
    "Salima",
  ],
  "Southern Region": [
    "Balaka",
    "Blantyre",
    "Chikwawa",
    "Chiradzulu",
    "Machinga",
    "Mangochi",
    "Mulanje",
    "Mwanza",
    "Neno",
    "Nsanje",
    "Phalombe",
    "Thyolo",
    "Zomba",
  ],
};

async function main() {
  console.log("🌍 Seeding all 28 Malawi districts...");

  for (const [regionName, districts] of Object.entries(DATA)) {
    const region = await prisma.region.upsert({
      where: { name: regionName },
      update: {},
      create: { name: regionName },
    });
    console.log(`✅ Region: ${regionName}`);

    for (const districtName of districts) {
      await prisma.district.upsert({
        where: { name_regionId: { name: districtName, regionId: region.id } },
        update: {},
        create: { name: districtName, regionId: region.id },
      });
      console.log(`   ↳ District: ${districtName}`);
    }
  }

  const totalRegions = await prisma.region.count();
  const totalDistricts = await prisma.district.count();
  console.log("─────────────────────────────────────");
  console.log(
    `🎉 Done — ${totalRegions} regions, ${totalDistricts} districts in database.`,
  );
}

main()
  .catch((e) => {
    console.error(" Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
