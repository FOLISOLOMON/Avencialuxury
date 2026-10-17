/**
 * restore_stock_and_clear_sales.mjs
 *
 * Restores all product/batch stock decremented by sales,
 * removes all sales and their associated line items, cancellation requests,
 * debt payments, and sale inventory transactions, and reactivates batches.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting stock restoration and sales removal...");

  const sales = await prisma.sale.findMany({
    include: {
      saleItems: true,
      cancellationRequest: true,
      debtPayments: true,
    },
  });

  console.log(`Found ${sales.length} sales to restore and remove.`);

  const batchStockToRestore = new Map(); // key: `${batchId}:${productId}` -> qty
  const affectedBatchIds = new Set();
  const saleIds = sales.map((s) => s.id);

  for (const sale of sales) {
    // Only restore stock if the sale was not already VOIDED or REFUNDED (which already restored stock)
    if (sale.status !== "VOIDED" && sale.status !== "REFUNDED") {
      for (const item of sale.saleItems) {
        const key = `${item.batchId}:${item.productId}`;
        const current = batchStockToRestore.get(key) || 0;
        batchStockToRestore.set(key, current + item.quantity);
        affectedBatchIds.add(item.batchId);
      }
    }
  }

  await prisma.$transaction(
    async (tx) => {
      // 1. Restore stock to batchItem
      for (const [key, qty] of batchStockToRestore.entries()) {
        const [batchId, productId] = key.split(":");
        const batchItem = await tx.batchItem.findFirst({
          where: { batchId, productId },
        });

        if (batchItem) {
          const oldStock = batchItem.quantityRemaining;
          const newStock = oldStock + qty;
          await tx.batchItem.update({
            where: { id: batchItem.id },
            data: { quantityRemaining: newStock },
          });
          console.log(`Restored ${qty} units to batchItem ${batchItem.id} (productId: ${productId}). Stock: ${oldStock} -> ${newStock}`);
        } else {
          console.warn(`Warning: BatchItem not found for batch ${batchId} and product ${productId}`);
        }
      }

      // 2. Reactivate batches if needed
      for (const batchId of affectedBatchIds) {
        const remainingItems = await tx.batchItem.findMany({
          where: { batchId },
          select: { quantityRemaining: true },
        });
        const totalRemaining = remainingItems.reduce((acc, i) => acc + i.quantityRemaining, 0);
        if (totalRemaining > 0) {
          await tx.batch.update({
            where: { id: batchId },
            data: { status: "ACTIVE" },
          });
          console.log(`Batch ${batchId} marked ACTIVE (total remaining stock: ${totalRemaining})`);
        }
      }

      // 3. Remove cancellation requests
      const delCancel = await tx.saleCancellationRequest.deleteMany({
        where: { saleId: { in: saleIds } },
      });
      console.log(`Deleted ${delCancel.count} cancellation requests.`);

      // 4. Remove debt payments
      const delDebt = await tx.debtPayment.deleteMany({
        where: { saleId: { in: saleIds } },
      });
      console.log(`Deleted ${delDebt.count} debt payments.`);

      // 5. Remove sale items
      const delItems = await tx.saleItem.deleteMany({
        where: { saleId: { in: saleIds } },
      });
      console.log(`Deleted ${delItems.count} sale items.`);

      // 6. Remove inventory transactions tied to these sales
      const delInv = await tx.inventoryTransaction.deleteMany({
        where: {
          OR: [
            { referenceId: { in: saleIds } },
            { type: "SALE" },
          ],
        },
      });
      console.log(`Deleted ${delInv.count} inventory transactions.`);

      // 7. Remove sales
      const delSales = await tx.sale.deleteMany({
        where: { id: { in: saleIds } },
      });
      console.log(`Deleted ${delSales.count} sales.`);
    },
    { maxWait: 15000, timeout: 30000 }
  );

  console.log("Successfully restored all stocks and removed all sales from DB!");
}

main()
  .catch((e) => {
    console.error("Error restoring stocks and clearing sales:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
