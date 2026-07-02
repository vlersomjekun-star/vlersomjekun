-- Faza 2: pasurimi nga faqet e klinikave private.
-- DoctorClinicMatch = staging: asgjë nuk shkruhet te Doctor pa kaluar këtu.
-- photoSourceUrl = vetëm referencë e brendshme; imazhet NUK shkarkohen/ripublikohen.

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('AUTO_MATCHED', 'NEEDS_REVIEW', 'CONFIRMED', 'REJECTED', 'NEW_DOCTOR');

-- AlterTable Doctor
ALTER TABLE "Doctor" ADD COLUMN "photoSourceUrl" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "subSpecialty" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "enrichedAt" TIMESTAMP(3);

-- AlterTable Clinic
ALTER TABLE "Clinic" ADD COLUMN "source" TEXT;

-- CreateTable
CREATE TABLE "DoctorClinicMatch" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT,
    "clinicId" TEXT NOT NULL,
    "scrapedFirstName" TEXT NOT NULL,
    "scrapedLastName" TEXT NOT NULL,
    "scrapedSpecialty" TEXT,
    "scrapedTitle" TEXT,
    "photoSourceUrl" TEXT,
    "profileUrl" TEXT,
    "matchStatus" "MatchStatus" NOT NULL,
    "matchScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorClinicMatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DoctorClinicMatch_clinicId_scrapedFirstName_scrapedLastName_key"
    ON "DoctorClinicMatch"("clinicId", "scrapedFirstName", "scrapedLastName");
CREATE INDEX "DoctorClinicMatch_matchStatus_idx" ON "DoctorClinicMatch"("matchStatus");

ALTER TABLE "DoctorClinicMatch" ADD CONSTRAINT "DoctorClinicMatch_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DoctorClinicMatch" ADD CONSTRAINT "DoctorClinicMatch_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
