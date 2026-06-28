-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_pin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pin_reset_at" TIMESTAMP(3),
ADD COLUMN     "pin_reset_by_id" TEXT;
