-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "ip_address" TEXT,
    "device_id" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_lockouts" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "locked_until" TIMESTAMP(3),
    "lockout_count" INTEGER NOT NULL DEFAULT 0,
    "last_lockout_at" TIMESTAMP(3),
    "is_permanent" BOOLEAN NOT NULL DEFAULT false,
    "unlocked_at" TIMESTAMP(3),
    "unlocked_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_lockouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "login_lockouts_phone_number_key" ON "login_lockouts"("phone_number");
