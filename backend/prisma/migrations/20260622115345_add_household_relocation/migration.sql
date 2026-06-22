/*
  Warnings:

  - A unique constraint covering the columns `[relocated_to_household_id]` on the table `households` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "HouseholdStatus" ADD VALUE 'RELOCATED';

-- AlterTable
ALTER TABLE "household_members" ADD COLUMN     "national_id" TEXT;

-- AlterTable
ALTER TABLE "households" ADD COLUMN     "consent_given" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consent_signature_url" TEXT,
ADD COLUMN     "head_national_id" TEXT,
ADD COLUMN     "relocated_at" TIMESTAMP(3),
ADD COLUMN     "relocated_to_household_id" TEXT,
ADD COLUMN     "relocation_reason" TEXT;

-- CreateTable
CREATE TABLE "unknown_login_attempts" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "first_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unknown_login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unknown_login_attempts_phone_number_key" ON "unknown_login_attempts"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "households_relocated_to_household_id_key" ON "households"("relocated_to_household_id");

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_relocated_to_household_id_fkey" FOREIGN KEY ("relocated_to_household_id") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_lockouts" ADD CONSTRAINT "login_lockouts_phone_number_fkey" FOREIGN KEY ("phone_number") REFERENCES "users"("phone_number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_lockouts" ADD CONSTRAINT "login_lockouts_unlocked_by_id_fkey" FOREIGN KEY ("unlocked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
