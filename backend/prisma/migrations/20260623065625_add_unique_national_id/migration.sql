/*
  Warnings:

  - A unique constraint covering the columns `[head_national_id]` on the table `households` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "households_head_national_id_key" ON "households"("head_national_id");
