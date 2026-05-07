/*
  Warnings:

  - A unique constraint covering the columns `[billNo]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `paymentMethod` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "discountAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL,
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "subTotal" DOUBLE PRECISION,
ADD COLUMN     "taxAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_billNo_key" ON "Order"("billNo");
