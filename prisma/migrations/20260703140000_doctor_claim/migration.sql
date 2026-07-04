-- Claim profili: mjeku mund të kërkojë të menaxhojë profilin e tij, por vetëm
-- pas aprovimit njerëzor nga admini (asnjë verifikim automatik identiteti —
-- nuk kemi akses te API-të e urdhrave profesionalë).

-- (ALTER TYPE AddressSource → shih migration-in e veçantë 20260703135900)

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable Doctor
ALTER TABLE "Doctor" ADD COLUMN "claimedByUserId" TEXT;
CREATE UNIQUE INDEX "Doctor_claimedByUserId_key" ON "Doctor"("claimedByUserId");
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_claimedByUserId_fkey"
    FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "DoctorClaim" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "DoctorClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DoctorClaim_doctorId_userId_key" ON "DoctorClaim"("doctorId", "userId");
CREATE INDEX "DoctorClaim_status_idx" ON "DoctorClaim"("status");

ALTER TABLE "DoctorClaim" ADD CONSTRAINT "DoctorClaim_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoctorClaim" ADD CONSTRAINT "DoctorClaim_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
