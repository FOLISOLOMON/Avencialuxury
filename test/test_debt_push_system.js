const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runTestSuite() {
  console.log("=== STARTING AVENCIA PUSH NOTIFICATION & DEBT REMINDER TEST SUITE ===\n");

  const businessId = "biz_default_avencia";
  let testCustomer = null;
  let testSales = [];

  try {
    // 0. Ensure Business & Settings
    let biz = await prisma.business.findUnique({ where: { id: businessId } });
    if (!biz) {
      throw new Error("Default business biz_default_avencia not found.");
    }

    await prisma.notificationSetting.upsert({
      where: { businessId },
      update: {
        pushEnabled: true,
        upcomingRemindersEnabled: true,
        upcomingDaysAdvance: 1,
        dueTodayEnabled: true,
        overdueEnabled: true,
        overdueIntervalDays: 3,
        showCustomerDetailsInPush: false,
        timezone: "Africa/Accra",
      },
      create: {
        businessId,
        pushEnabled: true,
        upcomingRemindersEnabled: true,
        upcomingDaysAdvance: 1,
        dueTodayEnabled: true,
        overdueEnabled: true,
        overdueIntervalDays: 3,
        showCustomerDetailsInPush: false,
        timezone: "Africa/Accra",
      },
    });

    // 1. Create a clean test customer
    testCustomer = await prisma.customer.create({
      data: {
        businessId,
        name: "Test Client Kofi",
        phone: "0241234567",
        email: "kofi.test@avencia.com",
      },
    });
    console.log("✓ Created test customer:", testCustomer.name, `(${testCustomer.id})`);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 2. Scenario A: Payment due tomorrow (Upcoming Reminder)
    const saleUpcoming = await prisma.sale.create({
      data: {
        businessId,
        customerId: testCustomer.id,
        saleDate: now,
        dueDate: tomorrow,
        subtotal: 500,
        discount: 0,
        totalAmount: 500,
        totalCost: 200,
        grossProfit: 300,
        paymentStatus: "UNPAID",
        status: "UNPAID",
        amountPaid: 0,
        balanceDue: 500,
      },
    });
    testSales.push(saleUpcoming.id);
    console.log("✓ Created Sale A: Due tomorrow (500 GHS unpaid)");

    // 3. Scenario B: Payment due today (Due Today Reminder)
    const saleDueToday = await prisma.sale.create({
      data: {
        businessId,
        customerId: testCustomer.id,
        saleDate: now,
        dueDate: today,
        subtotal: 300,
        discount: 0,
        totalAmount: 300,
        totalCost: 100,
        grossProfit: 200,
        paymentStatus: "PARTIAL",
        status: "PARTIAL",
        amountPaid: 100,
        balanceDue: 200, // partial payment of 100
      },
    });
    testSales.push(saleDueToday.id);
    console.log("✓ Created Sale B: Due today (300 GHS total, 100 paid, 200 balance)");

    // 4. Scenario C: Overdue payment (Overdue Reminder)
    const saleOverdue = await prisma.sale.create({
      data: {
        businessId,
        customerId: testCustomer.id,
        saleDate: yesterday,
        dueDate: yesterday,
        subtotal: 450,
        discount: 0,
        totalAmount: 450,
        totalCost: 150,
        grossProfit: 300,
        paymentStatus: "UNPAID",
        status: "UNPAID",
        amountPaid: 0,
        balanceDue: 450,
      },
    });
    testSales.push(saleOverdue.id);
    console.log("✓ Created Sale C: 1 day overdue (450 GHS unpaid)");

    // 5. Scenario D: Fully paid debt (Should NEVER qualify)
    const salePaid = await prisma.sale.create({
      data: {
        businessId,
        customerId: testCustomer.id,
        saleDate: yesterday,
        dueDate: yesterday,
        subtotal: 200,
        discount: 0,
        totalAmount: 200,
        totalCost: 100,
        grossProfit: 100,
        paymentStatus: "PAID",
        status: "COMPLETED",
        amountPaid: 200,
        balanceDue: 0,
      },
    });
    testSales.push(salePaid.id);
    console.log("✓ Created Sale D: Fully paid (balanceDue = 0)");

    // 6. Scenario E: Sale without dueDate (Should NOT have invented due date and NEVER qualify)
    const saleNoDueDate = await prisma.sale.create({
      data: {
        businessId,
        customerId: testCustomer.id,
        saleDate: yesterday,
        dueDate: null,
        subtotal: 250,
        discount: 0,
        totalAmount: 250,
        totalCost: 100,
        grossProfit: 150,
        paymentStatus: "UNPAID",
        status: "UNPAID",
        amountPaid: 0,
        balanceDue: 250,
      },
    });
    testSales.push(saleNoDueDate.id);
    console.log("✓ Created Sale E: Unpaid with dueDate = null (No invented due date)");

    // 7. Scenario F: Voided sale (Should NEVER qualify)
    const saleVoided = await prisma.sale.create({
      data: {
        businessId,
        customerId: testCustomer.id,
        saleDate: yesterday,
        dueDate: yesterday,
        subtotal: 400,
        discount: 0,
        totalAmount: 400,
        totalCost: 100,
        grossProfit: 300,
        paymentStatus: "UNPAID",
        status: "VOIDED",
        amountPaid: 0,
        balanceDue: 400,
      },
    });
    testSales.push(saleVoided.id);
    console.log("✓ Created Sale F: VOIDED sale (balanceDue = 400, but VOIDED)");

    // Run the debt reminder scan via API or service
    console.log("\n--- EXECUTING SCAN 1 ---");
    const scanResponse = await fetch("http://localhost:3000/api/automation/cron?task=debts&businessId=" + businessId, {
      headers: {
        Authorization: "Bearer avencia_cron_scheduler_secret_key_2026",
      },
    });
    const scanJson = await scanResponse.json();
    console.log("Scan 1 Response:", JSON.stringify(scanJson.results?.debts, null, 2));

    const scanResult = scanJson.results?.debts?.[0] || {};
    if (scanResult.scannedDebtsCount < 3) {
      throw new Error(`Expected at least 3 qualifying credit sales, got ${scanResult.scannedDebtsCount}`);
    }

    // Check delivery logs
    const logs = await prisma.pushDeliveryLog.findMany({
      where: {
        businessId,
        saleId: { in: testSales },
      },
    });
    console.log(`\n✓ Generated ${logs.length} PushDeliveryLog records for test sales:`);
    for (const l of logs) {
      console.log(`  - [${l.notificationType}] Sale: ${l.saleId} | DedupeKey: ${l.dedupeKey} | Status: ${l.status}`);
    }

    // Verify Sale D (Paid), Sale E (No dueDate), Sale F (Voided) generated ZERO logs
    const invalidLogs = logs.filter(
      (l) => l.saleId === salePaid.id || l.saleId === saleNoDueDate.id || l.saleId === saleVoided.id
    );
    if (invalidLogs.length > 0) {
      throw new Error("ERROR: Ineligible sales (Paid, No Due Date, or Voided) generated reminder logs!");
    }
    console.log("✓ Verified: Fully paid, null due date, and voided sales were completely excluded.");

    // 8. Scenario: Duplicate Prevention / Idempotency Test
    console.log("\n--- EXECUTING SCAN 2 (IDEMPOTENCY TEST) ---");
    const scanResponse2 = await fetch("http://localhost:3000/api/automation/cron?task=debts&businessId=" + businessId, {
      headers: {
        Authorization: "Bearer avencia_cron_scheduler_secret_key_2026",
      },
    });
    const scanJson2 = await scanResponse2.json();
    console.log("Scan 2 Result:", JSON.stringify(scanJson2.results?.debts, null, 2));

    const totalLogsAfter = await prisma.pushDeliveryLog.count({
      where: {
        businessId,
        saleId: { in: testSales },
      },
    });
    if (totalLogsAfter !== logs.length) {
      throw new Error(`Idempotency failure: Log count grew from ${logs.length} to ${totalLogsAfter}!`);
    }
    console.log("✓ Verified: Second scan did NOT duplicate any notifications (count stayed at " + totalLogsAfter + ").");

    console.log("\n=== ALL TEST SCENARIOS PASSED WITH 100% SUCCESS ===");
  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exitCode = 1;
  } finally {
    // Cleanup test records
    console.log("\nCleaning up test records...");
    if (testSales.length > 0) {
      await prisma.pushDeliveryLog.deleteMany({ where: { saleId: { in: testSales } } });
      await prisma.notification.deleteMany({ where: { entityId: { in: testSales } } });
      await prisma.sale.deleteMany({ where: { id: { in: testSales } } });
    }
    if (testCustomer) {
      await prisma.customer.delete({ where: { id: testCustomer.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    console.log("Cleaned up successfully.");
  }
}

runTestSuite();
