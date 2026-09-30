import { getBusinessDayBounds, formatGhanaPhoneNumber } from "../utils";
import { buildWhatsAppMessage } from "./whatsapp";
import { WhatsAppMessageType } from "@prisma/client";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING AVENCIA 2.0 SALES, DEBT & WHATSAPP HARDENING TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST GROUP 1: Date Range & Timezone Boundaries (Inclusive)
  // ----------------------------------------------------
  console.log("--- Group 1: Date Bounds & Timezone Inclusion ---");
  const todayBounds = getBusinessDayBounds("Today");
  assert(todayBounds.startDate !== undefined && todayBounds.endDate !== undefined, "Today bounds returns start and end dates");
  if (todayBounds.startDate && todayBounds.endDate) {
    assert(todayBounds.startDate.getHours() === 0 && todayBounds.startDate.getMinutes() === 0 && todayBounds.startDate.getSeconds() === 0, "Start date starts at 00:00:00");
    assert(todayBounds.endDate.getHours() === 23 && todayBounds.endDate.getMinutes() === 59 && todayBounds.endDate.getSeconds() === 59, "End date ends at 23:59:59");
  }

  const customBounds = getBusinessDayBounds("Custom", "2026-09-01", "2026-09-29");
  if (customBounds.startDate && customBounds.endDate) {
    assert(customBounds.startDate.toISOString().startsWith("2026-09-01"), "Custom start date set to 2026-09-01");
    assert(customBounds.endDate.toISOString().startsWith("2026-09-29"), "Custom end date set to 2026-09-29");
    assert(customBounds.endDate.getMilliseconds() === 999, "Custom end date includes late-night 23:59:59.999");
  }

  // ----------------------------------------------------
  // TEST GROUP 2: Phone Number Normalization
  // ----------------------------------------------------
  console.log("\n--- Group 2: Ghana Phone Normalization ---");
  assert(formatGhanaPhoneNumber("0541234567") === "233541234567", "Local 054... converts to 23354...");
  assert(formatGhanaPhoneNumber("+233 54 123 4567") === "233541234567", "Formatted +233... cleans whitespace");
  assert(formatGhanaPhoneNumber("233541234567") === "233541234567", "233... remains valid");
  assert(formatGhanaPhoneNumber("12345") === null, "Invalid short phone number returns null");

  // ----------------------------------------------------
  // TEST GROUP 3: WhatsApp Message UTF-8 Clean Templates
  // ----------------------------------------------------
  console.log("\n--- Group 3: WhatsApp Message Encoding & Emojis ---");
  const reminderMsg = buildWhatsAppMessage(WhatsAppMessageType.PAYMENT_REMINDER, { customerName: "Ama Serwaa", outstandingBalance: 150.5 });
  assert(reminderMsg.includes("GH₵ 150.50") || reminderMsg.includes("GH₵150.50"), "Reminder includes exact formatted current balance GH₵ 150.50");
  assert(!reminderMsg.includes("\uFFFD"), "Reminder contains NO unicode replacement characters (\\uFFFD)");
  assert(reminderMsg.includes("👋") && reminderMsg.includes("🙏"), "Reminder preserves UTF-8 emojis cleanly");

  const settledMsg = buildWhatsAppMessage(WhatsAppMessageType.DEBT_SETTLED, { customerName: "Ama Serwaa" });
  assert(settledMsg.includes("fully settled"), "Debt settled message confirms full settlement");
  assert(!settledMsg.includes("\uFFFD"), "Settled message contains NO unicode replacement characters (\\uFFFD)");
  assert(settledMsg.includes("🎉") || settledMsg.includes("🙏"), "Settled message preserves UTF-8 emojis cleanly");

  const receiptMsg = buildWhatsAppMessage(WhatsAppMessageType.PAYMENT_RECEIPT, { customerName: "Kofi", paymentAmount: 200 });
  assert(receiptMsg.includes("200.00"), "Payment receipt includes exact payment amount 200.00");

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
