-- AlterTable
ALTER TABLE "Chore" ADD COLUMN     "customFrequencyId" TEXT,
ALTER COLUMN "frequency" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CustomFrequency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "daysInterval" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "householdId" TEXT NOT NULL,

    CONSTRAINT "CustomFrequency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomFrequency_name_householdId_key" ON "CustomFrequency"("name", "householdId");

-- AddForeignKey
ALTER TABLE "CustomFrequency" ADD CONSTRAINT "CustomFrequency_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chore" ADD CONSTRAINT "Chore_customFrequencyId_fkey" FOREIGN KEY ("customFrequencyId") REFERENCES "CustomFrequency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
