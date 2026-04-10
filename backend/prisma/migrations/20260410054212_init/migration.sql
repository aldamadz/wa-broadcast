-- CreateTable
CREATE TABLE "WaTemplate" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaTemplate_pkey" PRIMARY KEY ("id")
);
