/*
  Warnings:

  - You are about to drop the column `customFrequencyId` on the `Chore` table. All the data in the column will be lost.
  - You are about to drop the column `difficulty` on the `Chore` table. All the data in the column will be lost.
  - You are about to drop the column `frequency` on the `Chore` table. All the data in the column will be lost.
  - You are about to drop the column `rankPointsId` on the `Chore` table. All the data in the column will be lost.
  - You are about to drop the `ChoreRankPoints` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomFrequency` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `frequencyId` to the `Chore` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rankId` to the `Chore` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Chore" DROP CONSTRAINT "Chore_customFrequencyId_fkey";

-- DropForeignKey
ALTER TABLE "Chore" DROP CONSTRAINT "Chore_rankPointsId_fkey";

-- DropForeignKey
ALTER TABLE "ChoreRankPoints" DROP CONSTRAINT "ChoreRankPoints_householdId_fkey";

-- DropForeignKey
ALTER TABLE "CustomFrequency" DROP CONSTRAINT "CustomFrequency_householdId_fkey";

-- AlterTable
ALTER TABLE "Chore" DROP COLUMN "customFrequencyId",
DROP COLUMN "difficulty",
DROP COLUMN "frequency",
DROP COLUMN "rankPointsId",
ADD COLUMN     "frequencyId" TEXT NOT NULL,
ADD COLUMN     "rankId" TEXT NOT NULL;

-- DropTable
DROP TABLE "ChoreRankPoints";

-- DropTable
DROP TABLE "CustomFrequency";

-- DropEnum
DROP TYPE "ChoreFrequency";

-- DropEnum
DROP TYPE "ChoreRank";

-- CreateTable
CREATE TABLE "ChoreFrequency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "daysInterval" INTEGER NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "householdId" TEXT NOT NULL,

    CONSTRAINT "ChoreFrequency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreRank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "pointValue" INTEGER NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "householdId" TEXT NOT NULL,

    CONSTRAINT "ChoreRank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChoreFrequency_name_householdId_key" ON "ChoreFrequency"("name", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreRank_name_householdId_key" ON "ChoreRank"("name", "householdId");

-- AddForeignKey
ALTER TABLE "ChoreFrequency" ADD CONSTRAINT "ChoreFrequency_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreRank" ADD CONSTRAINT "ChoreRank_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chore" ADD CONSTRAINT "Chore_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "ChoreRank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chore" ADD CONSTRAINT "Chore_frequencyId_fkey" FOREIGN KEY ("frequencyId") REFERENCES "ChoreFrequency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
