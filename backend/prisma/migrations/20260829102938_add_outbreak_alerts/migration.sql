-- CreateEnum
CREATE TYPE "OutbreakStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "outbreak_alerts" (
    "id" TEXT NOT NULL,
    "village_id" TEXT NOT NULL,
    "symptom" TEXT NOT NULL,
    "case_count" INTEGER NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "status" "OutbreakStatus" NOT NULL DEFAULT 'ACTIVE',
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbreak_alerts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "outbreak_alerts" ADD CONSTRAINT "outbreak_alerts_village_id_fkey" FOREIGN KEY ("village_id") REFERENCES "villages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbreak_alerts" ADD CONSTRAINT "outbreak_alerts_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
