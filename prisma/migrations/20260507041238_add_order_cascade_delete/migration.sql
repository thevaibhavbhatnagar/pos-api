/*
  Warnings:

  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_branchId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropTable
DROP TABLE "Order";

-- CreateTable
CREATE TABLE "Orders" (
    "id" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "subTotal" DOUBLE PRECISION,
    "discountAmount" DOUBLE PRECISION DEFAULT 0,
    "taxAmount" DOUBLE PRECISION DEFAULT 0,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "branchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Orders_billNo_key" ON "Orders"("billNo");

-- CreateIndex
CREATE INDEX "Orders_branchId_idx" ON "Orders"("branchId");

-- CreateIndex
CREATE INDEX "Orders_createdAt_idx" ON "Orders"("createdAt");

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
