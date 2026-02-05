-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "scheduledAllDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduledEnd" TIMESTAMP(3),
ADD COLUMN     "scheduledNotes" TEXT,
ADD COLUMN     "scheduledStart" TIMESTAMP(3);
