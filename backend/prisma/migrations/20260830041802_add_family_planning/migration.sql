-- CreateEnum
CREATE TYPE "FpMethod" AS ENUM ('CONDOM', 'ORAL_CONTRACEPTIVE', 'INJECTABLE', 'IMPLANT', 'IUD', 'STERILISATION', 'NATURAL_FAMILY_PLANNING', 'OTHER');

-- CreateTable
CREATE TABLE "fp_visits" (
    "id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "visited_by_id" TEXT NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL,
    "method" "FpMethod" NOT NULL,
    "quantity_given" INTEGER,
    "next_follow_up_date" TIMESTAMP(3),
    "side_effects" JSONB,
    "referral_needed" BOOLEAN NOT NULL DEFAULT false,
    "counselling_given" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fp_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fp_visits_local_id_key" ON "fp_visits"("local_id");

-- AddForeignKey
ALTER TABLE "fp_visits" ADD CONSTRAINT "fp_visits_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "household_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fp_visits" ADD CONSTRAINT "fp_visits_visited_by_id_fkey" FOREIGN KEY ("visited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
