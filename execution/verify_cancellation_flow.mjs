import { PrismaClient } from "@prisma/client";
import { requestSaleCancellation, reviewSaleCancellation, getCancellationRequests, createSale } from "../src/lib/services/sales.ts";

const prisma = new PrismaClient();

async function runTest() {
  console.log("=== Testing Sale Cancellation & Inventory Restoration Flow ===");

  const businessId = "biz_default_avencia";

  // 1. Find a worker and an active product/batch
  const worker = await prisma.user.findFirst({
    where: { role: "WORKER" },
  });
  const owner = await prisma.user.findFirst({
    where: { role: "OWNER" },
  });

  if (!worker || !owner) {
    throw new Error("Worker or Owner user not found");
  }

  const batchItem = await prisma.batchItem.findFirst({
    where: { quantityRemaining: { gt: 0 } },
    include: { product: true, batch: true },
  });

  if (!batchItem) {
    throw new Error("No available batch item found with stock");
  }

  const initialStock = batchItem.quantityRemaining;
  console.log(`Initial stock for ${batchItem.product.name}: ${initialStock}`);

  // 2. Create a test sale
  const sale = await createSale({
    businessId,
    creatorId: worker.id,
    paymentMethod: "CASH",
    items: [
      {
        productId: batchItem.productId,
        quantity: 1,
        unitPrice: Number(batchItem.product.sellingPrice),
      },
    ],
  });

  console.log(`Created test sale ${sale.id} for 1 unit.`);

  const afterSaleStock = (
    await prisma.batchItem.findUnique({ where: { id: batchItem.id } })
  ).quantityRemaining;
  console.log(`Stock after sale: ${afterSaleStock} (expected: ${initialStock - 1})`);
  if (afterSaleStock !== initialStock - 1) {
    throw new Error(`Stock decrement failed! Expected ${initialStock - 1}, got ${afterSaleStock}`);
  }

  // 3. Worker requests cancellation
  const cancelReason = "Customer changed mind before leaving store";
  const cancelReq = await requestSaleCancellation({
    saleId: sale.id,
    requester: { id: worker.id, role: worker.role },
    reason: cancelReason,
  });

  console.log(`Worker created cancellation request: status=${cancelReq.status}, reason="${cancelReq.reason}"`);

  // 4. Owner queries pending queue (what OP sees)
  const pendingRequests = await getCancellationRequests(businessId, "PENDING");
  const found = pendingRequests.find((r) => r.saleId === sale.id);
  if (!found) {
    throw new Error("Pending cancellation request not found in OP queue!");
  }
  console.log("Found in OP queue:", {
    requestId: found.id,
    saleId: found.saleId,
    requester: found.requester?.name,
    itemsToReturn: found.sale.saleItems.length,
  });

  // 5. Owner accepts cancellation (reviewSaleCancellation)
  const reviewResult = await reviewSaleCancellation({
    requestId: found.id,
    reviewerId: owner.id,
    decision: "APPROVE",
  });

  console.log(`Owner approved cancellation: requestStatus=${reviewResult.request.status}, saleStatus=${reviewResult.sale.status}`);

  // 6. Check that stock is restored
  const restoredStock = (
    await prisma.batchItem.findUnique({ where: { id: batchItem.id } })
  ).quantityRemaining;
  console.log(`Stock after cancellation approval: ${restoredStock} (expected: ${initialStock})`);
  if (restoredStock !== initialStock) {
    throw new Error(`Stock restoration failed! Expected ${initialStock}, got ${restoredStock}`);
  }

  // 7. Clean up test sale completely so DB has 0 test sales
  await prisma.$transaction(async (tx) => {
    await tx.saleCancellationRequest.deleteMany({ where: { saleId: sale.id } });
    await tx.saleItem.deleteMany({ where: { saleId: sale.id } });
    await tx.inventoryTransaction.deleteMany({ where: { referenceId: sale.id } });
    await tx.sale.delete({ where: { id: sale.id } });
  });

  console.log("Cleaned up test sale. Final stock verified:", restoredStock);
  console.log("=== ALL CANCELLATION FLOW TESTS PASSED! ===");
}

runTest()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
