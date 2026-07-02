-- Migrimi: nga OTP SMS te llogaritë e përdoruesve.
-- Reviews ekzistuese (me phoneHash) i kalojnë user-it placeholder 'legacy-otp-user':
-- nickname-i i tyre origjinal ruhet në Review.nickname (snapshot), kështu që në UI
-- nuk ndryshon asgjë. User-i legacy nuk mund të logohet (s'ka password).

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('CREDENTIALS', 'GOOGLE');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED');
CREATE TYPE "CommentStatus" AS ENUM ('PUBLISHED', 'REMOVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "nickname" TEXT,
    "emailVerified" TIMESTAMP(3),
    "provider" "AuthProvider" NOT NULL DEFAULT 'CREDENTIALS',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ReviewComment" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewComment_reviewId_status_idx" ON "ReviewComment"("reviewId", "status");

ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: user legacy për reviews ekzistuese
INSERT INTO "User" ("id", "email", "nickname", "emailVerified", "provider", "status")
VALUES ('legacy-otp-user', 'legacy@vlersomjekun.al', 'Legacy', CURRENT_TIMESTAMP, 'CREDENTIALS', 'ACTIVE')
ON CONFLICT ("id") DO NOTHING;

-- AlterTable Review: shto userId (backfill me legacy), hiq phoneHash
ALTER TABLE "Review" ADD COLUMN "userId" TEXT;
UPDATE "Review" SET "userId" = 'legacy-otp-user' WHERE "userId" IS NULL;
ALTER TABLE "Review" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Review_userId_createdAt_idx" ON "Review"("userId", "createdAt");

DROP INDEX IF EXISTS "Review_phoneHash_idx";
ALTER TABLE "Review" DROP COLUMN "phoneHash";

-- AlterTable Report: reviewId opsional + mbështetje për komente
ALTER TABLE "Report" ALTER COLUMN "reviewId" DROP NOT NULL;
ALTER TABLE "Report" ADD COLUMN "commentId" TEXT;
ALTER TABLE "Report" ADD CONSTRAINT "Report_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "ReviewComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable OTP
DROP TABLE IF EXISTS "OtpRequest";
