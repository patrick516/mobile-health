-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "growth_status" TEXT,
ADD COLUMN     "height_cm" DOUBLE PRECISION,
ADD COLUMN     "weight_kg" DOUBLE PRECISION,
ADD COLUMN     "z_score_hfa" DOUBLE PRECISION,
ADD COLUMN     "z_score_wfa" DOUBLE PRECISION,
ADD COLUMN     "z_score_wfh" DOUBLE PRECISION;
