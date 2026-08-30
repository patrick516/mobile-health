-- CreateEnum
CREATE TYPE "PncStatus" AS ENUM ('SCHEDULED', 'ATTENDED', 'MISSED', 'OVERDUE');

-- AlterEnum
ALTER TYPE "SyncRecordType" ADD VALUE 'PNC_VISIT';

-- CreateTable
CREATE TABLE "pnc_visits" (
    "id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "pnc_number" INTEGER NOT NULL,
    "expected_date" TIMESTAMP(3) NOT NULL,
    "status" "PncStatus" NOT NULL DEFAULT 'SCHEDULED',
    "visited_date" TIMESTAMP(3),
    "visited_by_id" TEXT,
    "mother_temperature" DOUBLE PRECISION,
    "mother_blood_pressure" TEXT,
    "mother_breast_status" TEXT,
    "mother_uterus_status" TEXT,
    "mother_danger_signs" JSONB,
    "newborn_weight" DOUBLE PRECISION,
    "newborn_temperature" DOUBLE PRECISION,
    "newborn_cord_status" TEXT,
    "is_breastfeeding" BOOLEAN NOT NULL DEFAULT false,
    "newborn_danger_signs" JSONB,
    "referral_needed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pnc_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pnc_visits_local_id_key" ON "pnc_visits"("local_id");

-- CreateIndex
CREATE UNIQUE INDEX "pnc_visits_member_id_pnc_number_key" ON "pnc_visits"("member_id", "pnc_number");

-- AddForeignKey
ALTER TABLE "pnc_visits" ADD CONSTRAINT "pnc_visits_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "household_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pnc_visits" ADD CONSTRAINT "pnc_visits_visited_by_id_fkey" FOREIGN KEY ("visited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
