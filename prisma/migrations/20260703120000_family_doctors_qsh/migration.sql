-- Faza 6: qendra shëndetësore publike (QSH) + linkim mjekë familjes.
-- Portali i Mjekut të Familjes kërkon login e-Albania (SPA + WAF Incapsula) —
-- s'mund të skrapohet. Strategji: QSH nga OSM (emra reale), linkim manual
-- admini nga qark (asnjë guess automatik mjek→QSH).

-- CreateEnum
CREATE TYPE "SectorType" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "FamilyLinkStatus" AS ENUM ('LINKED', 'UNLINKED_FAMILY_DOCTOR');

-- AlterTable Clinic
ALTER TABLE "Clinic" ADD COLUMN "sectorType" "SectorType";

-- AlterTable Doctor
ALTER TABLE "Doctor" ADD COLUMN "familyLinkStatus" "FamilyLinkStatus";
