-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('DISTRICT_HOSPITAL', 'TA_HOSPITAL', 'CLINIC');

-- AlterTable
ALTER TABLE "facilities" ADD COLUMN     "district_id" TEXT,
ADD COLUMN     "facility_type" "FacilityType",
ADD COLUMN     "ta_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "facility_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_ta_id_fkey" FOREIGN KEY ("ta_id") REFERENCES "traditional_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
