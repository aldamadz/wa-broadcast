/*
  Warnings:

  - Added the required column `updatedAt` to the `WaTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WaTemplate" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "WaTemplateHistory" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaTemplateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaTemplateHistory_templateId_idx" ON "WaTemplateHistory"("templateId");

-- CreateIndex
CREATE INDEX "WaTemplateHistory_createdAt_idx" ON "WaTemplateHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "WaTemplateHistory" ADD CONSTRAINT "WaTemplateHistory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
