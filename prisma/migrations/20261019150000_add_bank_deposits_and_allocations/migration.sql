-- CreateTable BankDeposit
CREATE TABLE "BankDeposit" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdById" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "depositDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable DepositAllocation
CREATE TABLE "DepositAllocation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "collectionType" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepositAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankDeposit_idempotencyKey_key" ON "BankDeposit"("idempotencyKey");
CREATE INDEX "BankDeposit_businessId_idx" ON "BankDeposit"("businessId");
CREATE INDEX "BankDeposit_businessId_depositDate_idx" ON "BankDeposit"("businessId", "depositDate");
CREATE INDEX "BankDeposit_businessId_createdAt_idx" ON "BankDeposit"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "DepositAllocation_businessId_idx" ON "DepositAllocation"("businessId");
CREATE INDEX "DepositAllocation_depositId_idx" ON "DepositAllocation"("depositId");
CREATE INDEX "DepositAllocation_collectionType_collectionId_idx" ON "DepositAllocation"("collectionType", "collectionId");
CREATE INDEX "DepositAllocation_businessId_collectionDate_idx" ON "DepositAllocation"("businessId", "collectionDate");

-- AddForeignKey
ALTER TABLE "BankDeposit" ADD CONSTRAINT "BankDeposit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankDeposit" ADD CONSTRAINT "BankDeposit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositAllocation" ADD CONSTRAINT "DepositAllocation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepositAllocation" ADD CONSTRAINT "DepositAllocation_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "BankDeposit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
