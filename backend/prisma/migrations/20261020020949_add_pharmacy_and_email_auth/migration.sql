/*
  Warnings:

  - You are about to drop the column `parent_district_hospital_id` on the `facilities` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DrugTransactionType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AdjustmentReason" AS ENUM ('EXPIRED', 'DAMAGED', 'LOST', 'COUNT_CORRECTION', 'RETURNED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'DEPLETED', 'EXPIRED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "PharmacyRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'PARTIALLY_FULFILLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('CMST', 'NGO', 'PRIVATE', 'DONATION');

-- DropForeignKey
ALTER TABLE "facilities" DROP CONSTRAINT "facilities_parent_district_hospital_id_fkey";

-- AlterTable
ALTER TABLE "facilities" DROP COLUMN "parent_district_hospital_id";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email" TEXT,
ADD COLUMN     "password_hash" TEXT;

-- CreateTable
CREATE TABLE "drug_suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_batches" (
    "id" TEXT NOT NULL,
    "drug_name" TEXT NOT NULL,
    "drug_name_chichewa" TEXT,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "supplier_id" TEXT,
    "quantity_received" INTEGER NOT NULL,
    "quantity_remaining" INTEGER NOT NULL,
    "manufacture_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "minimum_stock" INTEGER NOT NULL DEFAULT 0,
    "reorder_point" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_transactions" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "transaction_type" "DrugTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantity_before" INTEGER NOT NULL,
    "quantity_after" INTEGER NOT NULL,
    "reason" "AdjustmentReason",
    "patient_name" TEXT,
    "patient_id" TEXT,
    "referral_id" TEXT,
    "request_id" TEXT,
    "performed_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_requests" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "referral_id" TEXT,
    "patient_name" TEXT NOT NULL,
    "patient_age" INTEGER,
    "diagnosis" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "fulfilled_by_id" TEXT,
    "status" "PharmacyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "fulfilled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_request_items" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "drug_name" TEXT NOT NULL,
    "quantity_requested" INTEGER NOT NULL,
    "quantity_fulfilled" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "drug_batches" ADD CONSTRAINT "drug_batches_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "drug_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_batches" ADD CONSTRAINT "drug_batches_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_batches" ADD CONSTRAINT "drug_batches_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_transactions" ADD CONSTRAINT "drug_transactions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "drug_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_transactions" ADD CONSTRAINT "drug_transactions_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_transactions" ADD CONSTRAINT "drug_transactions_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_transactions" ADD CONSTRAINT "drug_transactions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_transactions" ADD CONSTRAINT "drug_transactions_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "pharmacy_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_requests" ADD CONSTRAINT "pharmacy_requests_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_requests" ADD CONSTRAINT "pharmacy_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_requests" ADD CONSTRAINT "pharmacy_requests_fulfilled_by_id_fkey" FOREIGN KEY ("fulfilled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_request_items" ADD CONSTRAINT "pharmacy_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "pharmacy_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
