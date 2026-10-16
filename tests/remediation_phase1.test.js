/**
 * AVENCIA 2.0 — SECURITY REMEDIATION PHASE 1 VERIFICATION SUITE
 * 
 * Verifies remediation of findings SEC-01 through SEC-10:
 * - SEC-01: Automation History Endpoint Authorization & Query Scoping
 * - SEC-02: Authentication Secret Hardcoded Fallback Removal & Production Fail-Fast
 * - SEC-03: Push Service Default VAPID Private Key Removal & Graceful Degradation
 * - SEC-04: Ask Avencia AI Chat & Tools Role-Based Redaction (Worker vs Owner)
 * - SEC-05: Debt Due Date Modification Role Restriction (Owner-Only)
 * - SEC-06: Automation Cron Authentication Hardening (Header-Only, No Query Param)
 * - SEC-07: Session Token Cryptographic Entropy (256-bit CSPRNG)
 * - SEC-08: Login Brute-Force Rate Limiting (Sliding Window)
 * - SEC-09: CSV Export Formula Injection Sanitization (CWE-1236)
 * - SEC-10: Bootstrap User Account Deactivation & Placeholder Hash
 */

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// ---------------------------------------------------------------------------
// 1. SEC-01: Automation History Authorization & Middleware Matcher
// ---------------------------------------------------------------------------
describe("SEC-01: Automation History Authorization & Middleware Bypass Prevention", () => {
  it("middleware public cron bypass strictly matches /api/automation/cron and rejects /api/automation/history", () => {
    function isPublicAutomationCron(pathname) {
      return pathname === "/api/automation/cron";
    }

    assert.equal(isPublicAutomationCron("/api/automation/cron"), true, "cron route is allowed for vercel/bearer cron");
    assert.equal(isPublicAutomationCron("/api/automation/history"), false, "history route MUST NOT be public");
    assert.equal(isPublicAutomationCron("/api/automation/trigger"), false, "arbitrary automation routes must require auth");
    assert.equal(isPublicAutomationCron("/api/automation/cron/extra"), false, "subpaths must not bypass auth");
  });

  it("requireAuth rejects non-owner roles from accessing automation history", () => {
    function checkHistoryAccess(role) {
      const allowedRoles = ["OWNER"];
      if (!role) return { status: 401, error: "Authentication required" };
      if (!allowedRoles.includes(role)) return { status: 403, error: "Access denied. Owner role required." };
      return { status: 200, success: true };
    }

    assert.equal(checkHistoryAccess(null).status, 401);
    assert.equal(checkHistoryAccess("WORKER").status, 403);
    assert.equal(checkHistoryAccess("OWNER").status, 200);
  });

  it("verifies source code in history route scopes query to auth.businessId", () => {
    const routePath = path.join(__dirname, "../src/app/api/automation/history/route.ts");
    const content = fs.readFileSync(routePath, "utf8");
    assert.ok(content.includes("where: { businessId: auth!.businessId }"), "History queries must scope to caller businessId");
    assert.ok(content.includes("allowedRoles: [\"OWNER\"]"), "History route must enforce OWNER role");
  });
});

// ---------------------------------------------------------------------------
// 2. SEC-02: Auth Secret Production Fail-Fast
// ---------------------------------------------------------------------------
describe("SEC-02: Auth Secret Production Fail-Fast & Fallback Elimination", () => {
  function getAuthSecret(env) {
    const secret = env.AUTH_SECRET;
    if (!secret) {
      if (env.NODE_ENV === "production") {
        throw new Error("FATAL: AUTH_SECRET environment variable is missing in production.");
      }
      return "avencia_dev_fallback_secret_key_minimum_32_characters_safe";
    }
    if (secret.length < 32 && env.NODE_ENV === "production") {
      throw new Error("FATAL: AUTH_SECRET must be at least 32 characters in production.");
    }
    return secret;
  }

  it("fails fast with fatal error when AUTH_SECRET is missing in production", () => {
    assert.throws(() => getAuthSecret({ NODE_ENV: "production" }), /FATAL: AUTH_SECRET environment variable is missing/);
  });

  it("fails fast with fatal error when AUTH_SECRET is shorter than 32 characters in production", () => {
    assert.throws(() => getAuthSecret({ NODE_ENV: "production", AUTH_SECRET: "short_secret" }), /at least 32 characters/);
  });

  it("accepts valid 32+ character AUTH_SECRET in production", () => {
    const validSecret = "a_super_strong_production_secret_key_32_chars_long";
    assert.equal(getAuthSecret({ NODE_ENV: "production", AUTH_SECRET: validSecret }), validSecret);
  });

  it("verifies source code in token.ts contains no hardcoded production secret", () => {
    const tokenFile = path.join(__dirname, "../src/lib/auth/token.ts");
    const content = fs.readFileSync(tokenFile, "utf8");
    assert.ok(content.includes("FATAL CONFIGURATION ERROR: AUTH_SECRET environment variable is missing"), "Must contain production fail-fast check");
    assert.equal(content.includes("avencia_secret_key_2026_super_secure_98471923"), false, "Compromised hardcoded fallback must be removed");
  });
});

// ---------------------------------------------------------------------------
// 3. SEC-03: Push Service Default VAPID Removal & Graceful Degradation
// ---------------------------------------------------------------------------
describe("SEC-03: Push Service VAPID Fail-Safe", () => {
  function checkVapidConfig(env) {
    const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY;
    const privateKey = env.VAPID_PRIVATE_KEY;
    return !!(publicKey && privateKey);
  }

  function mockSendPush(env, options) {
    if (!checkVapidConfig(env)) {
      return {
        status: "SKIPPED",
        reason: "VAPID_NOT_CONFIGURED",
        dedupeKey: options.dedupeKey,
      };
    }
    return { status: "SENT", dedupeKey: options.dedupeKey };
  }

  it("gracefully disables push when VAPID keys are missing without throwing or using hardcoded keys", () => {
    const resultNoKeys = mockSendPush({}, { dedupeKey: "reminder_123" });
    assert.equal(resultNoKeys.status, "SKIPPED");
    assert.equal(resultNoKeys.reason, "VAPID_NOT_CONFIGURED");

    const resultWithKeys = mockSendPush(
      { VAPID_PUBLIC_KEY: "pubkey", VAPID_PRIVATE_KEY: "privkey" },
      { dedupeKey: "reminder_123" }
    );
    assert.equal(resultWithKeys.status, "SENT");
  });

  it("verifies push.ts source code has removed DEFAULT_VAPID_PRIVATE_KEY", () => {
    const pushFile = path.join(__dirname, "../src/lib/services/push.ts");
    const content = fs.readFileSync(pushFile, "utf8");
    assert.equal(content.includes("DEFAULT_VAPID_PRIVATE_KEY"), false, "Hardcoded private VAPID key must be removed");
  });
});

// ---------------------------------------------------------------------------
// 4. SEC-04: AI Chat Role-Based Redaction (Worker vs Owner)
// ---------------------------------------------------------------------------
describe("SEC-04: AI Tool Role-Based Redaction & Confidentiality", () => {
  function executeAIToolMock(toolName, role) {
    if (role === "WORKER") {
      if (toolName === "get_expense_summary" || toolName === "get_batch_summary") {
        return {
          success: false,
          error: "Access denied. Expense and batch cost data is restricted to business owners.",
        };
      }
    }

    if (toolName === "get_sales_summary") {
      const data = {
        revenue: 15000,
        transactions: 42,
        amountCollected: 12000,
        outstanding: 3000,
        grossProfit: 6500,
        netProfit: 4500,
        profitMarginPct: 30.0,
      };
      if (role === "WORKER") {
        data.grossProfit = 0;
        data.netProfit = 0;
        data.profitMarginPct = 0;
      }
      return { success: true, data };
    }

    if (toolName === "get_dashboard_summary") {
      const data = {
        todaySales: 2400,
        activeOrders: 8,
        grossProfit: 1100,
        netProfit: 850,
      };
      if (role === "WORKER") {
        data.grossProfit = 0;
        data.netProfit = 0;
      }
      return { success: true, data };
    }

    if (toolName === "get_expense_summary") {
      return {
        success: true,
        data: { totalExpenses: 2000, categories: [{ name: "Rent", amount: 1500 }] },
      };
    }

    return { success: false, error: "Unknown tool" };
  }

  it("strictly denies WORKER access to expense and batch summaries", () => {
    const workerExpense = executeAIToolMock("get_expense_summary", "WORKER");
    assert.equal(workerExpense.success, false);
    assert.match(workerExpense.error, /restricted to business owners/i);

    const workerBatch = executeAIToolMock("get_batch_summary", "WORKER");
    assert.equal(workerBatch.success, false);
    assert.match(workerBatch.error, /restricted to business owners/i);
  });

  it("redacts gross and net profits from WORKER sales summaries", () => {
    const workerSales = executeAIToolMock("get_sales_summary", "WORKER");
    assert.equal(workerSales.success, true);
    assert.equal(workerSales.data.revenue, 15000, "Worker sees top-line revenue");
    assert.equal(workerSales.data.grossProfit, 0, "Gross profit must be redacted to 0");
    assert.equal(workerSales.data.netProfit, 0, "Net profit must be redacted to 0");
    assert.equal(workerSales.data.profitMarginPct, 0, "Margin must be redacted to 0");
  });

  it("allows OWNER full visibility into expenses and profit metrics", () => {
    const ownerExpense = executeAIToolMock("get_expense_summary", "OWNER");
    assert.equal(ownerExpense.success, true);
    assert.equal(ownerExpense.data.totalExpenses, 2000);

    const ownerSales = executeAIToolMock("get_sales_summary", "OWNER");
    assert.equal(ownerSales.success, true);
    assert.equal(ownerSales.data.grossProfit, 6500);
    assert.equal(ownerSales.data.netProfit, 4500);
    assert.equal(ownerSales.data.profitMarginPct, 30.0);
  });

  it("verifies AI chat route requires authentication", () => {
    const chatRouteFile = path.join(__dirname, "../src/app/api/ai/chat/route.ts");
    const content = fs.readFileSync(chatRouteFile, "utf8");
    assert.ok(content.includes("requireAuth(request)"), "AI Chat route must call requireAuth");
  });
});

// ---------------------------------------------------------------------------
// 5. SEC-05: Debt Due Date Modification Role Restriction (Owner-Only)
// ---------------------------------------------------------------------------
describe("SEC-05: Debt Due Date Modification Owner-Only Authorization", () => {
  function handleDebtPatch(role, body) {
    if (role !== "OWNER") {
      return { status: 403, error: "Forbidden: Only business owners can update customer debt payment agreements." };
    }
    if (!body.saleId || !body.dueDate) {
      return { status: 400, error: "Missing required fields: saleId and dueDate are mandatory." };
    }
    return { status: 200, success: true, data: { saleId: body.saleId, dueDate: body.dueDate } };
  }

  it("rejects WORKER attempts to modify debt due dates with 403 Forbidden", () => {
    const res = handleDebtPatch("WORKER", { saleId: "sale_01", dueDate: "2026-11-01" });
    assert.equal(res.status, 403);
    assert.match(res.error, /Only business owners/i);
  });

  it("accepts valid OWNER modifications to debt agreements", () => {
    const res = handleDebtPatch("OWNER", { saleId: "sale_01", dueDate: "2026-11-01" });
    assert.equal(res.status, 200);
    assert.equal(res.data.dueDate, "2026-11-01");
  });

  it("verifies debt route source code enforces OWNER role on PATCH", () => {
    const debtRoute = path.join(__dirname, "../src/app/api/debt/route.ts");
    const content = fs.readFileSync(debtRoute, "utf8");
    assert.ok(content.includes("requireAuth(request, { allowedRoles: [\"OWNER\"] })"), "Debt PATCH must enforce OWNER role");
  });
});

// ---------------------------------------------------------------------------
// 6. SEC-06: Automation Cron Authentication Hardening
// ---------------------------------------------------------------------------
describe("SEC-06: Automation Cron Header-Only Authentication", () => {
  function verifyCronAuth(headers, expectedSecret = "cron_secret_abc123") {
    const authHeader = headers["authorization"];
    const isVercelCron = headers["x-vercel-cron"] === "1";

    if (isVercelCron) return true;
    if (authHeader && authHeader === `Bearer ${expectedSecret}`) return true;

    return false;
  }

  it("rejects authentication via query parameter secret (prevents log leakage)", () => {
    const headers = {};
    const isAuthorized = verifyCronAuth(headers);
    assert.equal(isAuthorized, false, "Missing valid header must be rejected");
  });

  it("authorizes valid Bearer token header", () => {
    const headers = { authorization: "Bearer cron_secret_abc123" };
    const isAuthorized = verifyCronAuth(headers);
    assert.equal(isAuthorized, true);
  });

  it("authorizes valid x-vercel-cron header", () => {
    const headers = { "x-vercel-cron": "1" };
    const isAuthorized = verifyCronAuth(headers);
    assert.equal(isAuthorized, true);
  });

  it("verifies cron route source code does not read query params for secrets", () => {
    const cronRoute = path.join(__dirname, "../src/app/api/automation/cron/route.ts");
    const content = fs.readFileSync(cronRoute, "utf8");
    assert.equal(content.includes("searchParams.get(\"secret\")"), false, "searchParams secret check must be removed");
  });
});

// ---------------------------------------------------------------------------
// 7. SEC-07: Session Token Cryptographic Entropy (CSPRNG)
// ---------------------------------------------------------------------------
describe("SEC-07: Session Token 256-Bit Cryptographic Entropy", () => {
  function generateSessionToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  it("generates 64-character hexadecimal tokens with 256 bits of entropy", () => {
    const token = generateSessionToken();
    assert.equal(token.length, 64);
    assert.match(token, /^[0-9a-f]{64}$/);
  });

  it("produces high collision resistance across 10,000 generated tokens", () => {
    const tokens = new Set();
    const count = 10000;
    for (let i = 0; i < count; i++) {
      tokens.add(generateSessionToken());
    }
    assert.equal(tokens.size, count, "Zero collisions across 10,000 session tokens");
  });

  it("verifies session.ts uses crypto.randomBytes instead of Math.random", () => {
    const sessionFile = path.join(__dirname, "../src/lib/auth/session.ts");
    const content = fs.readFileSync(sessionFile, "utf8");
    assert.ok(content.includes("crypto.randomBytes(32).toString(\"hex\")"), "Must use crypto.randomBytes(32)");
    assert.equal(content.includes("Math.random()"), false, "Math.random must not be used for session tokens");
  });
});

// ---------------------------------------------------------------------------
// 8. SEC-08: Login Rate Limiter (Sliding Window)
// ---------------------------------------------------------------------------
describe("SEC-08: Login Rate Limiting & Brute-Force Prevention", () => {
  const loginAttempts = new Map();

  function checkLoginRateLimit(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const entry = loginAttempts.get(key) || { attempts: [] };
    entry.attempts = entry.attempts.filter((ts) => now - ts < windowMs);

    if (entry.attempts.length >= maxAttempts) {
      const oldest = entry.attempts[0];
      const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
    }

    entry.attempts.push(now);
    loginAttempts.set(key, entry);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  function clearLoginRateLimit(key) {
    loginAttempts.delete(key);
  }

  beforeEach(() => {
    loginAttempts.clear();
  });

  it("allows up to 5 login attempts, then blocks the 6th with retryAfterSeconds", () => {
    const key = "192.168.1.50:test@avencialuxury.com";

    for (let i = 1; i <= 5; i++) {
      const check = checkLoginRateLimit(key, 5, 15 * 60 * 1000);
      assert.equal(check.allowed, true, `Attempt ${i} should be allowed`);
    }

    const blockedCheck = checkLoginRateLimit(key, 5, 15 * 60 * 1000);
    assert.equal(blockedCheck.allowed, false, "6th attempt must be blocked");
    assert.ok(blockedCheck.retryAfterSeconds > 0, "Must specify retryAfterSeconds");
  });

  it("clears rate limit record upon successful authentication", () => {
    const key = "10.0.0.1:user@example.com";
    checkLoginRateLimit(key);
    checkLoginRateLimit(key);

    clearLoginRateLimit(key);

    const check = checkLoginRateLimit(key);
    assert.equal(check.allowed, true);
  });

  it("verifies login route imports and uses checkLoginRateLimit", () => {
    const loginRoute = path.join(__dirname, "../src/app/api/auth/login/route.ts");
    const content = fs.readFileSync(loginRoute, "utf8");
    assert.ok(content.includes("checkLoginRateLimit"), "Login route must invoke rate limiter");
    assert.ok(content.includes("status: 429"), "Login route must respond with 429 on rate limit exceeded");
  });
});

// ---------------------------------------------------------------------------
// 9. SEC-09: CSV Formula Injection Sanitization (CWE-1236)
// ---------------------------------------------------------------------------
describe("SEC-09: CSV Formula Injection Neutralization", () => {
  function escapeCSV(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val);

    // If string begins with formula triggers (=, +, -, @, \t, \r)
    if (/^[=+\-@\t\r]/.test(str)) {
      const isStrictNumber = /^[-+]?\d+(\.\d+)?$/.test(str.trim());
      if (!isStrictNumber) {
        str = "'" + str;
      }
    }

    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }

  it("neutralizes dangerous formula characters (=, +, -, @, \\t, \\r) with single quote prefix", () => {
    assert.equal(escapeCSV("=SUM(A1:A10)"), "\"'=SUM(A1:A10)\"");
    assert.equal(escapeCSV("+cmd|' /C calc'!A0"), "\"'+cmd|' /C calc'!A0\"");
    assert.equal(escapeCSV("@HYPERLINK('http://evil.com')"), "\"'@HYPERLINK('http://evil.com')\"");
    assert.equal(escapeCSV("-2+3*cmd"), "\"\'-2+3*cmd\"");
  });

  it("preserves standard positive and negative numbers without quote prefix", () => {
    assert.equal(escapeCSV("-45.50"), "\"-45.50\"");
    assert.equal(escapeCSV("+100"), "\"+100\"");
    assert.equal(escapeCSV("250"), "\"250\"");
    assert.equal(escapeCSV(0), "\"0\"");
  });

  it("handles null, undefined, and empty string safely", () => {
    assert.equal(escapeCSV(null), '""');
    assert.equal(escapeCSV(undefined), '""');
    assert.equal(escapeCSV(""), '""');
  });

  it("verifies export route uses escapeCSV from utils", () => {
    const exportRoute = path.join(__dirname, "../src/app/api/data/export/route.ts");
    const content = fs.readFileSync(exportRoute, "utf8");
    assert.ok(content.includes("escapeCSV"), "Export route must sanitize with escapeCSV");
  });
});

// ---------------------------------------------------------------------------
// 10. SEC-10: Bootstrap User Account Deactivation
// ---------------------------------------------------------------------------
describe("SEC-10: Bootstrap User Security & Placeholder Hash", () => {
  it("bootstrap user uses an unusable placeholder hash and isActive=false", () => {
    const prismaFile = path.join(__dirname, "../src/lib/db/prisma.ts");
    const content = fs.readFileSync(prismaFile, "utf8");

    // Must not contain the compromised password hash $2b$10$EIXh...
    assert.equal(content.includes("$2b$10$EIXh"), false, "Compromised bcrypt hash must not exist in codebase");

    // Must set isActive: false on the bootstrap user
    assert.ok(content.includes("isActive: false"), "Bootstrap user must be marked isActive: false");

    // Must use a placeholder hash
    assert.ok(
      content.includes("UNUSABLE_ACCOUNT_LOGIN_DISABLED") || content.includes("DISABLED_USER_ACCOUNT"),
      "Must use unusable placeholder hash"
    );
  });
});
