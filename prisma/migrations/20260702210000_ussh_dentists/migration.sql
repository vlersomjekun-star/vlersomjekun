-- Faza 3: importi i stomatologëve nga regjistri USSH.
-- cityId bëhet nullable (USSH s'ka qytet); licenseExpiry është E BRENDSHME
-- (kurrë publike, kurrë filtër — datat e vjetra = mungesë përditësimi, jo revokim).

-- AlterTable Doctor
ALTER TABLE "Doctor" ALTER COLUMN "cityId" DROP NOT NULL;
ALTER TABLE "Doctor" ADD COLUMN "alternativeLastName" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "licenseExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LocationSuggestion" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LocationSuggestion_doctorId_userId_key" ON "LocationSuggestion"("doctorId", "userId");

ALTER TABLE "LocationSuggestion" ADD CONSTRAINT "LocationSuggestion_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationSuggestion" ADD CONSTRAINT "LocationSuggestion_cityId_fkey"
    FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LocationSuggestion" ADD CONSTRAINT "LocationSuggestion_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
