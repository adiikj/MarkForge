-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "prevTokenHash" TEXT,
ADD COLUMN     "rotatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Session_prevTokenHash_key" ON "Session"("prevTokenHash");

