-- CreateEnum
CREATE TYPE "KotStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED');

-- CreateTable
CREATE TABLE "Kot" (
    "id" TEXT NOT NULL,
    "kotNo" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "KotStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kot_kotNo_key" ON "Kot"("kotNo");

-- CreateIndex
CREATE INDEX "Kot_orderId_idx" ON "Kot"("orderId");

-- AddForeignKey
ALTER TABLE "Kot" ADD CONSTRAINT "Kot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
