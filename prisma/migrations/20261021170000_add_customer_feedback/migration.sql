-- CreateEnum
CREATE TYPE "FeedbackSource" AS ENUM ('PHONE', 'WHATSAPP', 'IN_PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('LONGEVITY', 'FRAGRANCE_SCENT', 'PROJECTION', 'PACKAGING', 'VALUE_FOR_MONEY', 'DELIVERY_SERVICE', 'POSITIVE_GENERAL', 'COMPLAINT', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'REVIEWING', 'FOLLOW_UP_NEEDED', 'RESOLVED');

-- CreateTable
CREATE TABLE "CustomerFeedback" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "productId" TEXT,
    "saleId" TEXT,
    "batchId" TEXT,
    "createdById" TEXT,
    "source" "FeedbackSource" NOT NULL DEFAULT 'OTHER',
    "category" "FeedbackCategory" NOT NULL DEFAULT 'OTHER',
    "comments" TEXT NOT NULL,
    "rating" INTEGER,
    "feedbackDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerFeedback_businessId_idx" ON "CustomerFeedback"("businessId");
CREATE INDEX "CustomerFeedback_businessId_feedbackDate_idx" ON "CustomerFeedback"("businessId", "feedbackDate");
CREATE INDEX "CustomerFeedback_businessId_productId_idx" ON "CustomerFeedback"("businessId", "productId");
CREATE INDEX "CustomerFeedback_businessId_customerId_idx" ON "CustomerFeedback"("businessId", "customerId");
CREATE INDEX "CustomerFeedback_businessId_status_idx" ON "CustomerFeedback"("businessId", "status");
CREATE INDEX "CustomerFeedback_businessId_createdById_idx" ON "CustomerFeedback"("businessId", "createdById");
CREATE INDEX "CustomerFeedback_businessId_category_idx" ON "CustomerFeedback"("businessId", "category");

-- AddForeignKey
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
