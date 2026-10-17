import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    include: {
      saleItems: {
        include: {
          product: true,
          batch: true,
        },
      },
      cancellationRequest: true,
      debtPayments: true,
    },
  });

  console.log(`Found ${sales.length} sales in DB.`);
  for (const s of sales) {
    console.log(`Sale ID: ${s.id}, Receipt: ${s.receiptNumber}, Status: ${s.status}, Total: ${s.totalAmount}`);
    if (s.cancellationRequest) {
      console.log(`  Cancellation Request: status=${s.cancellationRequest.status}, reason=${s.cancellationRequest.reason}`);
    }
    for (const item of s.saleItems) {
      console.log(`  Item: ${item.product?.name} (Qty: ${item.quantity}, Batch: ${item.batch?.reference})`);
    }
  }

  const batchItems = await prisma.batchItem.findMany({
    include: { product: true, batch: true },
  });
  console.log(`Total BatchItems: ${batchItems.length}`);
  for (const b of batchItems) {
    console.log(`  Batch ${b.batch.reference} - ${b.product.name}: Rem: ${b.quantityRemaining}/${b.quantity}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
