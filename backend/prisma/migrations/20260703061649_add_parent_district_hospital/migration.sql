-- AlterTable
ALTER TABLE "facilities" ADD COLUMN     "parent_district_hospital_id" TEXT;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_parent_district_hospital_id_fkey" FOREIGN KEY ("parent_district_hospital_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
