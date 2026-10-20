/*
  Warnings:

  - You are about to drop the column `full_name` on the `household_members` table. All the data in the column will be lost.
  - You are about to drop the column `full_name` on the `users` table. All the data in the column will be lost.
  - Added the required column `first_name` to the `household_members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `household_members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PHARMACIST';

-- AlterTable
ALTER TABLE "household_members" DROP COLUMN "full_name",
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "full_name",
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT;
