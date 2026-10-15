/**
 * clear_business_data.mjs
 *
 * Wipes all transactional/business data while KEEPING:
 *   User, Business, Session, Setting, NotificationSetting, PushSubscription,
 *   WorkerInvitation, PasswordResetToken
 *
 * Usage:
 *   node execution/clear_business_data.mjs           -> dry run (counts only)
 *   node execution/clear_business_data.mjs --confirm -> actually deletes
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM = process.argv.includes("--confirm");

// Ordered child -> parent so FK "Restrict" relations never block deletes.
const TABLES = [
  "saleCancellationRequest",
  "debtPayment",
  "saleItem",
  "sale",
  "inventoryTransaction",
  "batchItem",
  "expense",
  "batch",
  "product",
  "supplier",
  "whatsAppLog",
  "customer",
  "profitAllocation",
  "savingsTransaction",
  "notification",
  "automationExecution",
  "pushDeliveryLog",
  "auditLog",
];

async function main() {
  console.log(CONFIRM ? "DELETING business data..." : "DRY RUN (pass --confirm to delete)");
  if (!CONFIRM) {
    for (const t of TABLES) console.log(`${t.padEnd(26)} ${await prisma[t].count()}`);
    return;
  }
  const results = await prisma.$transaction(TABLES.map((t) => prisma[t].deleteMany({})));
  TABLES.forEach((t, i) => console.log(`${t.padEnd(26)} deleted ${results[i].count}`));
  console.log("Done. Users:", await prisma.user.count(), "| Businesses:", await prisma.business.count());
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
