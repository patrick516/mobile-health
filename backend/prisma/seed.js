import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(" Seeding MobileHealth Malawi database (Super Admin only)...");

  const phoneNumber = process.env.SEED_SUPER_ADMIN_PHONE ?? "0999000000";
  const pin = process.env.SEED_SUPER_ADMIN_PIN ?? "1234";
  const fullName = process.env.SEED_SUPER_ADMIN_NAME ?? "Super Administrator";

  const pinHash = await bcrypt.hash(pin, 12);

  const superAdmin = await prisma.user.upsert({
    where: { phoneNumber },
    update: {},
    create: {
      fullName,
      phoneNumber,
      pinHash,
      role: "SUPER_ADMIN",
      isActive: true,
      mustChangePin: true, // force PIN change on first login since this is a real credential
    },
  });

  console.log(" Super Admin created:");
  console.log("─────────────────────────────────────");
  console.log(`Name:  ${superAdmin.fullName}`);
  console.log(`Phone: ${superAdmin.phoneNumber}`);
  console.log(`PIN:   ${pin}  (must be changed on first login)`);
  console.log("─────────────────────────────────────");

  console.log("\n Seed complete!");
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
