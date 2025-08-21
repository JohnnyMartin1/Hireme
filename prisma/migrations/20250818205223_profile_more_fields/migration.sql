/*
  Warnings:

  - You are about to drop the column `age` on the `Profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "age",
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "certifications" TEXT[],
ADD COLUMN     "degreeType" TEXT,
ADD COLUMN     "desiredLocations" TEXT[],
ADD COLUMN     "desiredTitles" TEXT[],
ADD COLUMN     "github" TEXT,
ADD COLUMN     "gpa" DOUBLE PRECISION,
ADD COLUMN     "graduationYear" INTEGER,
ADD COLUMN     "languages" TEXT[],
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "locationCountry" TEXT,
ADD COLUMN     "major" TEXT,
ADD COLUMN     "minSalary" INTEGER,
ADD COLUMN     "openToRelocate" BOOLEAN DEFAULT false,
ADD COLUMN     "openToRemote" BOOLEAN DEFAULT true,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "portfolio" TEXT,
ADD COLUMN     "salaryCurrency" TEXT DEFAULT 'USD',
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "website" TEXT,
ADD COLUMN     "workAuth" TEXT,
ADD COLUMN     "workModes" TEXT[],
ADD COLUMN     "yearsExperience" INTEGER;
