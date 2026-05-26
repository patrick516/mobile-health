-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CCW', 'NURSE', 'DISTRICT_OFFICER', 'ADMIN');

-- CreateEnum
CREATE TYPE "StructureType" AS ENUM ('BRICK', 'MUD', 'IRON_SHEET', 'GRASS_THATCH', 'OTHER');

-- CreateEnum
CREATE TYPE "WaterSource" AS ENUM ('BOREHOLE', 'RIVER', 'PIPED', 'PROTECTED_WELL', 'UNPROTECTED_WELL', 'OTHER');

-- CreateEnum
CREATE TYPE "LatrineType" AS ENUM ('IMPROVED_PIT', 'TRADITIONAL_PIT', 'VIP', 'FLUSH_TOILET', 'NONE');

-- CreateEnum
CREATE TYPE "DistanceToFacility" AS ENUM ('UNDER_5KM', 'BETWEEN_5_10KM', 'OVER_10KM');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'DECEASED', 'RELOCATED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "HouseholdStatus" AS ENUM ('ACTIVE', 'VACANT', 'DEMOLISHED');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('HEAD', 'SPOUSE', 'CHILD', 'PARENT', 'OTHER_RELATIVE', 'NON_RELATIVE');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('ROUTINE', 'SICK', 'FOLLOW_UP', 'DRUG_DISPENSING_ONLY');

-- CreateEnum
CREATE TYPE "MuacStatus" AS ENUM ('NORMAL', 'MODERATE_MALNUTRITION', 'SEVERE_MALNUTRITION');

-- CreateEnum
CREATE TYPE "ReferralUrgency" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'OVERDUE', 'ARRIVED', 'TREATED', 'FEEDBACK_SENT', 'COMPLETED', 'MISSED');

-- CreateEnum
CREATE TYPE "ImmunisationStatus" AS ENUM ('DUE', 'GIVEN', 'OVERDUE', 'MISSED');

-- CreateEnum
CREATE TYPE "AncStatus" AS ENUM ('SCHEDULED', 'ATTENDED', 'MISSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "StockRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'FULFILLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SyncRecordType" AS ENUM ('HOUSEHOLD', 'MEMBER', 'VISIT', 'REFERRAL', 'IMMUNISATION', 'DRUG_DISPENSE', 'STOCK_REQUEST', 'ANC_VISIT');

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traditional_authorities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traditional_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ta_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "villages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "created_by_user_id" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "canonical_village_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "villages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_zone_allocations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "allocated_by_id" TEXT NOT NULL,
    "allocated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_zone_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ta_allocations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ta_id" TEXT NOT NULL,
    "allocated_by_id" TEXT NOT NULL,
    "allocated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_ta_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "households" (
    "id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "household_number" TEXT NOT NULL,
    "village_id" TEXT NOT NULL,
    "head_of_household_name" TEXT NOT NULL,
    "head_phone" TEXT,
    "structure_type" "StructureType" NOT NULL,
    "water_source" "WaterSource" NOT NULL,
    "latrine_present" BOOLEAN NOT NULL,
    "latrine_type" "LatrineType",
    "handwashing_facility" BOOLEAN NOT NULL,
    "handwashing_with_soap" BOOLEAN,
    "distance_to_facility" "DistanceToFacility" NOT NULL,
    "mosquito_nets" TEXT,
    "number_of_rooms" INTEGER,
    "landmark" TEXT,
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "registered_by_user_id" TEXT NOT NULL,
    "status" "HouseholdStatus" NOT NULL DEFAULT 'ACTIVE',
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "estimated_age" INTEGER,
    "sex" "Sex" NOT NULL,
    "relationship_to_head" "Relationship" NOT NULL,
    "is_pregnant" BOOLEAN NOT NULL DEFAULT false,
    "lmp_date" TIMESTAMP(3),
    "expected_delivery_date" TIMESTAMP(3),
    "chronic_illnesses" JSONB,
    "has_disability" BOOLEAN NOT NULL DEFAULT false,
    "disability_type" TEXT,
    "phone" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "archived_at" TIMESTAMP(3),
    "assigned_ccw_id" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "chw_id" TEXT NOT NULL,
    "visited_at" TIMESTAMP(3) NOT NULL,
    "visit_type" "VisitType" NOT NULL,
    "symptoms" JSONB,
    "temperature" DOUBLE PRECISION,
    "muac_mm" INTEGER,
    "muac_status" "MuacStatus",
    "danger_signs" JSONB,
    "referral_needed" BOOLEAN NOT NULL DEFAULT false,
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "notes" TEXT,
    "conflict_flag" BOOLEAN NOT NULL DEFAULT false,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "referring_user_id" TEXT NOT NULL,
    "destination_facility_id" TEXT,
    "reason" TEXT NOT NULL,
    "urgency" "ReferralUrgency" NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "due_by" TIMESTAMP(3),
    "arrived_at" TIMESTAMP(3),
    "treated_at" TIMESTAMP(3),
    "diagnosis" TEXT,
    "treatment_given" TEXT,
    "feedback_note" TEXT,
    "resolved_at" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "immunisations" (
    "id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "vaccine_code" TEXT NOT NULL,
    "dose_number" INTEGER NOT NULL,
    "given_at" TIMESTAMP(3) NOT NULL,
    "given_by_user_id" TEXT NOT NULL,
    "batch_number" TEXT,
    "route" TEXT,
    "next_due_date" TIMESTAMP(3),
    "facility_or_outreach" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "immunisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "immunisation_schedules" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "vaccine_code" TEXT NOT NULL,
    "dose_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "ImmunisationStatus" NOT NULL DEFAULT 'DUE',
    "given_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "immunisation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anc_visits" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "anc_number" INTEGER NOT NULL,
    "expected_date" TIMESTAMP(3) NOT NULL,
    "status" "AncStatus" NOT NULL DEFAULT 'SCHEDULED',
    "attended_date" TIMESTAMP(3),
    "facility_id" TEXT,
    "notes" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anc_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drugs" (
    "id" TEXT NOT NULL,
    "drug_code" TEXT NOT NULL,
    "name_english" TEXT NOT NULL,
    "name_chichewa" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "minimum_threshold" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_stock" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "quantity_current" INTEGER NOT NULL,
    "quantity_minimum" INTEGER NOT NULL,
    "last_restocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_dispenses" (
    "id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "quantity_dispensed" INTEGER NOT NULL,
    "dispensed_by_id" TEXT NOT NULL,
    "dispensed_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_dispenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_requests" (
    "id" TEXT NOT NULL,
    "requesting_user_id" TEXT NOT NULL,
    "drug_id" TEXT NOT NULL,
    "quantity_requested" INTEGER NOT NULL,
    "status" "StockRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_id" TEXT,
    "fulfilled_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "record_type" "SyncRecordType" NOT NULL,
    "winning_payload" JSONB NOT NULL,
    "losing_payload" JSONB NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "device_id" TEXT,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "districts_name_region_id_key" ON "districts"("name", "region_id");

-- CreateIndex
CREATE UNIQUE INDEX "traditional_authorities_name_district_id_key" ON "traditional_authorities"("name", "district_id");

-- CreateIndex
CREATE UNIQUE INDEX "zones_name_ta_id_key" ON "zones"("name", "ta_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "user_zone_allocations_user_id_zone_id_key" ON "user_zone_allocations"("user_id", "zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_ta_allocations_user_id_ta_id_key" ON "user_ta_allocations"("user_id", "ta_id");

-- CreateIndex
CREATE UNIQUE INDEX "households_local_id_key" ON "households"("local_id");

-- CreateIndex
CREATE UNIQUE INDEX "households_household_number_key" ON "households"("household_number");

-- CreateIndex
CREATE UNIQUE INDEX "household_members_local_id_key" ON "household_members"("local_id");

-- CreateIndex
CREATE UNIQUE INDEX "visits_local_id_key" ON "visits"("local_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_local_id_key" ON "referrals"("local_id");

-- CreateIndex
CREATE UNIQUE INDEX "immunisations_local_id_key" ON "immunisations"("local_id");

-- CreateIndex
CREATE UNIQUE INDEX "immunisation_schedules_member_id_vaccine_code_dose_number_key" ON "immunisation_schedules"("member_id", "vaccine_code", "dose_number");

-- CreateIndex
CREATE UNIQUE INDEX "anc_visits_member_id_anc_number_key" ON "anc_visits"("member_id", "anc_number");

-- CreateIndex
CREATE UNIQUE INDEX "drugs_drug_code_key" ON "drugs"("drug_code");

-- CreateIndex
CREATE UNIQUE INDEX "drug_stock_user_id_drug_id_key" ON "drug_stock"("user_id", "drug_id");

-- CreateIndex
CREATE UNIQUE INDEX "drug_dispenses_local_id_key" ON "drug_dispenses"("local_id");

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traditional_authorities" ADD CONSTRAINT "traditional_authorities_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_ta_id_fkey" FOREIGN KEY ("ta_id") REFERENCES "traditional_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "villages" ADD CONSTRAINT "villages_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "villages" ADD CONSTRAINT "villages_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "villages" ADD CONSTRAINT "villages_canonical_village_id_fkey" FOREIGN KEY ("canonical_village_id") REFERENCES "villages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_zone_allocations" ADD CONSTRAINT "user_zone_allocations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_zone_allocations" ADD CONSTRAINT "user_zone_allocations_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_zone_allocations" ADD CONSTRAINT "user_zone_allocations_allocated_by_id_fkey" FOREIGN KEY ("allocated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ta_allocations" ADD CONSTRAINT "user_ta_allocations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ta_allocations" ADD CONSTRAINT "user_ta_allocations_ta_id_fkey" FOREIGN KEY ("ta_id") REFERENCES "traditional_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ta_allocations" ADD CONSTRAINT "user_ta_allocations_allocated_by_id_fkey" FOREIGN KEY ("allocated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_village_id_fkey" FOREIGN KEY ("village_id") REFERENCES "villages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_registered_by_user_id_fkey" FOREIGN KEY ("registered_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_assigned_ccw_id_fkey" FOREIGN KEY ("assigned_ccw_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "household_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_chw_id_fkey" FOREIGN KEY ("chw_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "household_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referring_user_id_fkey" FOREIGN KEY ("referring_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_destination_facility_id_fkey" FOREIGN KEY ("destination_facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immunisations" ADD CONSTRAINT "immunisations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "household_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immunisations" ADD CONSTRAINT "immunisations_given_by_user_id_fkey" FOREIGN KEY ("given_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immunisation_schedules" ADD CONSTRAINT "immunisation_schedules_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "household_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anc_visits" ADD CONSTRAINT "anc_visits_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "household_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_stock" ADD CONSTRAINT "drug_stock_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_stock" ADD CONSTRAINT "drug_stock_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_dispenses" ADD CONSTRAINT "drug_dispenses_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_dispenses" ADD CONSTRAINT "drug_dispenses_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "household_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_dispenses" ADD CONSTRAINT "drug_dispenses_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_dispenses" ADD CONSTRAINT "drug_dispenses_dispensed_by_id_fkey" FOREIGN KEY ("dispensed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_requests" ADD CONSTRAINT "stock_requests_requesting_user_id_fkey" FOREIGN KEY ("requesting_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_requests" ADD CONSTRAINT "stock_requests_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_requests" ADD CONSTRAINT "stock_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
