-- CreateTable
CREATE TABLE "KotItem" (
    "id" TEXT NOT NULL,
    "kotId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KotItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KotItem_kotId_idx" ON "KotItem"("kotId");

-- CreateIndex
CREATE INDEX "KotItem_productId_idx" ON "KotItem"("productId");

-- AddForeignKey
ALTER TABLE "KotItem" ADD CONSTRAINT "KotItem_kotId_fkey" FOREIGN KEY ("kotId") REFERENCES "Kot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KotItem" ADD CONSTRAINT "KotItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
