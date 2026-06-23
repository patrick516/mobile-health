/*
  Warnings:

  - A unique constraint covering the columns `[national_id]` on the table `household_members` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "household_members_national_id_key" ON "household_members"("national_id");
