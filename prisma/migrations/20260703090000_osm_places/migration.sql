-- Faza 4: pasurimi gjeografik.
-- OSM (ODbL) = import masiv i ligjshëm me atribuim; Google Places = VETËM assist-mode
-- manual nga admini (bulk import ndalohet nga Google Maps Platform ToS).

-- (ALTER TYPE MatchStatus → shih migration-in e veçantë 20260703085900)

-- CreateEnum
CREATE TYPE "AddressSource" AS ENUM ('OSM', 'PLACES_VERIFIED', 'USER', 'ADMIN', 'CLINIC_SITE');

-- AlterTable Doctor
ALTER TABLE "Doctor" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Doctor" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "Doctor" ADD COLUMN "addressSource" "AddressSource";
ALTER TABLE "Doctor" ADD COLUMN "googlePlaceId" TEXT;

-- AlterTable Clinic
ALTER TABLE "Clinic" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Clinic" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "Clinic" ADD COLUMN "addressSource" "AddressSource";
ALTER TABLE "Clinic" ADD COLUMN "googlePlaceId" TEXT;

-- CreateTable
CREATE TABLE "OsmCandidate" (
    "id" TEXT NOT NULL,
    "osmId" TEXT NOT NULL,
    "osmType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amenity" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "cityGuess" TEXT,
    "matchedDoctorId" TEXT,
    "matchedClinicId" TEXT,
    "matchStatus" "MatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OsmCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OsmCandidate_osmId_key" ON "OsmCandidate"("osmId");
CREATE INDEX "OsmCandidate_matchStatus_idx" ON "OsmCandidate"("matchStatus");

ALTER TABLE "OsmCandidate" ADD CONSTRAINT "OsmCandidate_matchedDoctorId_fkey"
    FOREIGN KEY ("matchedDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OsmCandidate" ADD CONSTRAINT "OsmCandidate_matchedClinicId_fkey"
    FOREIGN KEY ("matchedClinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PlacesQuota" (
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlacesQuota_pkey" PRIMARY KEY ("date")
);
