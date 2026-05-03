// prisma/seed.js

import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/db.js";

async function main() {
  const existing = await prisma.admin.findUnique({
    where: { email: "admin@anzathuconnect.com" },
  });

  if (existing) {
    console.log(" Admin already exists — skipping seed");
    return;
  }

  const hashed = await bcrypt.hash("Admin@1234", 12);

  const admin = await prisma.admin.create({
    data: {
      name: "Super Admin",
      email: "admin@anzathuconnect.com",
      password: hashed,
      role: "super_admin",
      isActive: true,
    },
  });

  console.log(" Admin seeded successfully:");
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Password: Admin@1234`);
  console.log(`   Role:     ${admin.role}`);
  console.log("    Change the password after first login!");
}

main()
  .catch((e) => {
    console.error(" Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
