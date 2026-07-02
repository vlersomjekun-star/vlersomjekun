-- Fusha për importin masiv nga regjistri publik i UMSH.
-- SHËNIM privacy: datelindja dhe atësia NUK importohen kurrë (Ligji 9887).

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F');

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN "gender" "Gender";
ALTER TABLE "Doctor" ADD COLUMN "source" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "sourceKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_sourceKey_key" ON "Doctor"("sourceKey");
