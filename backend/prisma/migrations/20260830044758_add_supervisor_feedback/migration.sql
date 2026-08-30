-- CreateTable
CREATE TABLE "supervisor_feedback" (
    "id" TEXT NOT NULL,
    "ccw_id" TEXT NOT NULL,
    "supervisor_id" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "visits_count" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervisor_feedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "supervisor_feedback" ADD CONSTRAINT "supervisor_feedback_ccw_id_fkey" FOREIGN KEY ("ccw_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_feedback" ADD CONSTRAINT "supervisor_feedback_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
