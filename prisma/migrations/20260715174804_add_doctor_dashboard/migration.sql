-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'DISMISSED', 'RESOLVED');

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "languages" TEXT,
ADD COLUMN     "scheduleJson" JSONB,
ADD COLUMN     "websiteUrl1" TEXT,
ADD COLUMN     "websiteUrl2" TEXT,
ADD COLUMN     "yearsExp" INTEGER;

-- CreateTable
CREATE TABLE "DoctorReply" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorDispute" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorProfileLog" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT NOT NULL,

    CONSTRAINT "DoctorProfileLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorReply_reviewId_key" ON "DoctorReply"("reviewId");

-- CreateIndex
CREATE INDEX "DoctorReply_doctorId_idx" ON "DoctorReply"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorDispute_status_idx" ON "DoctorDispute"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorDispute_reviewId_doctorId_key" ON "DoctorDispute"("reviewId", "doctorId");

-- CreateIndex
CREATE INDEX "DoctorProfileLog_doctorId_changedAt_idx" ON "DoctorProfileLog"("doctorId", "changedAt");

-- AddForeignKey
ALTER TABLE "DoctorReply" ADD CONSTRAINT "DoctorReply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorReply" ADD CONSTRAINT "DoctorReply_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorDispute" ADD CONSTRAINT "DoctorDispute_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorDispute" ADD CONSTRAINT "DoctorDispute_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfileLog" ADD CONSTRAINT "DoctorProfileLog_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfileLog" ADD CONSTRAINT "DoctorProfileLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
