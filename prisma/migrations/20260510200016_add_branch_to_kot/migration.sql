-- AlterTable
ALTER TABLE "Kot" ADD COLUMN     "branchId" TEXT;

-- AddForeignKey
ALTER TABLE "Kot" ADD CONSTRAINT "Kot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
