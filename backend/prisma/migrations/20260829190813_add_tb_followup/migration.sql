-- CreateEnum
CREATE TYPE "TbTreatmentCategory" AS ENUM ('CAT_I', 'CAT_II', 'MDR_TB', 'PEDIATRIC');

-- CreateEnum
CREATE TYPE "TbOutcome" AS ENUM ('CURED', 'TREATMENT_COMPLETED', 'TREATMENT_FAILED', 'DIED', 'LOST_TO_FOLLOW_UP', 'NOT_EVALUATED');

-- CreateEnum
CREATE TYPE "DotStatus" AS ENUM ('OBSERVED', 'MISSED', 'SELF_ADMINISTERED');

-- CreateTable
CREATE TABLE "tb_cases" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "registered_by_id" TEXT NOT NULL,
    "treatment_start_date" TIMESTAMP(3) NOT NULL,
    "treatment_category" "TbTreatmentCategory" NOT NULL,
    "facility_id" TEXT,
    "treatment_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "outcome" "TbOutcome",
    "outcome_date" TIMESTAMP(3),
    "notes" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_dot_visits" (
    "id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "tb_case_id" TEXT NOT NULL,
    "visited_by_id" TEXT NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL,
    "status" "DotStatus" NOT NULL DEFAULT 'OBSERVED',
    "drugs_given" JSONB,
    "missed_reason" TEXT,
    "notes" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tb_dot_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tb_dot_visits_local_id_key" ON "tb_dot_visits"("local_id");

-- AddForeignKey
ALTER TABLE "tb_cases" ADD CONSTRAINT "tb_cases_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "household_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_cases" ADD CONSTRAINT "tb_cases_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_cases" ADD CONSTRAINT "tb_cases_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_dot_visits" ADD CONSTRAINT "tb_dot_visits_tb_case_id_fkey" FOREIGN KEY ("tb_case_id") REFERENCES "tb_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_dot_visits" ADD CONSTRAINT "tb_dot_visits_visited_by_id_fkey" FOREIGN KEY ("visited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
