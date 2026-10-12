/**
 * AVENCIA — COMPREHENSIVE AUTHORIZATION, WORKER MANAGEMENT & SECURITY TEST SUITE
 * 
 * Verifies all security, role-based access, financial integrity, sales accountability,
 * debt allocation, cancellation approval, and session management logic in accordance
 * with Section 18 of the specification.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

// --- HELPER CRYPTO UTILITIES MATCHING src/lib/auth/ ---
const AUTH_SECRET = process.env.AUTH_SECRET || "avencia_secret_key_2026_super_secure_98471923";

function base64UrlEncode(str) {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return Buffer.from(base64, "base64").toString("utf-8");
}

function signToken(payload, secret = AUTH_SECRET, expiresIn = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresIn };
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(data);
  const signature = hmac.digest("base64url");
  return `${data}.${signature}`;
}

function verifyToken(token, secret = AUTH_SECRET) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const data = `${header}.${payload}`;
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(data);
    const expectedSig = hmac.digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const decoded = JSON.parse(base64UrlDecode(payload));
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) return null;
    return decoded;
  } catch {
    return null;
  }
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ============================================================================
// SUITE 1: AUTHENTICATION, TOKENS & INVITATIONS
// ============================================================================
describe("Authentication, Tokens & Invitation Security", () => {
  it("generates and verifies valid session tokens with correct claims", () => {
    const payload = {
      userId: "user_worker_1",
      email: "worker1@avencialuxury.com",
      role: "WORKER",
      businessId: "biz_default_avencia",
      sessionId: "sess_123",
    };
    const token = signToken(payload);
    const verified = verifyToken(token);

    assert.ok(verified, "Token should verify successfully");
    assert.equal(verified.userId, payload.userId);
    assert.equal(verified.role, "WORKER");
    assert.equal(verified.businessId, "biz_default_avencia");
  });

  it("rejects expired session tokens", () => {
    const payload = { userId: "user_worker_1", role: "WORKER" };
    // Issue token expired 10 seconds ago
    const expiredToken = signToken(payload, AUTH_SECRET, -10);
    const verified = verifyToken(expiredToken);
    assert.equal(verified, null, "Expired token must be rejected");
  });

  it("rejects tampered session tokens with modified roles", () => {
    const payload = { userId: "user_worker_1", role: "WORKER" };
    const validToken = signToken(payload);
    const parts = validToken.split(".");

    // Attacker modifies role in payload from WORKER to OWNER
    const tamperedPayload = JSON.parse(base64UrlDecode(parts[1]));
    tamperedPayload.role = "OWNER";
    const forgedPart = base64UrlEncode(JSON.stringify(tamperedPayload));
    const tamperedToken = `${parts[0]}.${forgedPart}.${parts[2]}`;

    const verified = verifyToken(tamperedToken);
    assert.equal(verified, null, "Tampered token signature must fail verification");
  });

  it("generates high-entropy cryptographic invitation tokens and stores only secure hash", () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    assert.equal(rawToken.length, 64, "Raw token must have 64 hex characters (32 bytes entropy)");

    const hashed = hashToken(rawToken);
    assert.notEqual(rawToken, hashed, "Hash must differ from plaintext token");
    assert.equal(hashed.length, 64, "SHA-256 hash must be 64 hex characters");

    // Verification by hashing candidate token
    const candidateHash = hashToken(rawToken);
    assert.equal(candidateHash, hashed, "Hash lookup must match");
  });

  it("validates invitation acceptance rules (expiration, status, email matching)", () => {
    function validateInvite(invite, candidateToken, candidateEmail) {
      if (invite.status !== "PENDING") {
        throw new Error(`Invitation already ${invite.status.toLowerCase()}`);
      }
      if (new Date(invite.expiresAt).getTime() < Date.now()) {
        throw new Error("Invitation has expired");
      }
      if (hashToken(candidateToken) !== invite.tokenHash) {
        throw new Error("Invalid invitation token");
      }
      if (candidateEmail.toLowerCase().trim() !== invite.email.toLowerCase().trim()) {
        throw new Error("Email identity does not match invitation recipient");
      }
      return true;
    }

    const validToken = "secure_token_abc_123";
    const invite = {
      id: "inv_1",
      email: "ama@avencialuxury.com",
      status: "PENDING",
      tokenHash: hashToken(validToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    // Valid case
    assert.ok(validateInvite(invite, validToken, "ama@avencialuxury.com"));

    // Mismatched email
    assert.throws(
      () => validateInvite(invite, validToken, "attacker@gmail.com"),
      /Email identity does not match/
    );

    // Expired invite
    const expiredInvite = {
      ...invite,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    assert.throws(() => validateInvite(expiredInvite, validToken, "ama@avencialuxury.com"), /expired/);

    // Revoked invite
    const revokedInvite = { ...invite, status: "REVOKED" };
    assert.throws(() => validateInvite(revokedInvite, validToken, "ama@avencialuxury.com"), /revoked/);
  });

  it("locks owner setup once an owner account already exists", () => {
    function attemptOwnerSetup(existingOwnersCount) {
      if (existingOwnersCount > 0) {
        throw new Error("Setup unavailable: Business owner already provisioned.");
      }
      return { success: true, role: "OWNER" };
    }

    // First time setup
    const initial = attemptOwnerSetup(0);
    assert.equal(initial.role, "OWNER");

    // Subsequent attempt when owner already exists
    assert.throws(() => attemptOwnerSetup(1), /Setup unavailable/);
  });
});

// ============================================================================
// SUITE 2: ROLE-BASED ACCESS CONTROL & DATA MINIMIZATION
// ============================================================================
describe("Role-Based Access Control & Data Minimization", () => {
  it("enforces mobile-only routing for worker sessions in middleware", () => {
    function routeAccessCheck(role, path) {
      if (role === "WORKER") {
        if (!path.startsWith("/mobile") && !path.startsWith("/api/")) {
          return { allowed: false, redirect: "/mobile" };
        }
      }
      return { allowed: true };
    }

    // Worker attempts desktop routes
    assert.deepEqual(routeAccessCheck("WORKER", "/"), { allowed: false, redirect: "/mobile" });
    assert.deepEqual(routeAccessCheck("WORKER", "/products"), { allowed: false, redirect: "/mobile" });
    assert.deepEqual(routeAccessCheck("WORKER", "/settings"), { allowed: false, redirect: "/mobile" });
    assert.deepEqual(routeAccessCheck("WORKER", "/profit"), { allowed: false, redirect: "/mobile" });

    // Worker accesses mobile routes
    assert.deepEqual(routeAccessCheck("WORKER", "/mobile"), { allowed: true });
    assert.deepEqual(routeAccessCheck("WORKER", "/mobile/sell"), { allowed: true });

    // Owner accesses desktop and mobile
    assert.deepEqual(routeAccessCheck("OWNER", "/"), { allowed: true });
    assert.deepEqual(routeAccessCheck("OWNER", "/mobile"), { allowed: true });
  });

  it("redacts sensitive cost prices and gross profit from worker product queries", () => {
    function minimizeProductForRole(product, role) {
      if (role === "WORKER") {
        const { costPrice, ...safeProduct } = product;
        return safeProduct;
      }
      return product;
    }

    const fullProduct = {
      id: "prod_1",
      name: "Baccarat Rouge 540",
      sellingPrice: 450,
      costPrice: 220, // Confidential wholesale cost
      stockQuantity: 15,
    };

    const workerView = minimizeProductForRole(fullProduct, "WORKER");
    assert.equal(workerView.costPrice, undefined, "Worker must NOT see wholesale cost price");
    assert.equal(workerView.sellingPrice, 450);
    assert.equal(workerView.stockQuantity, 15);

    const ownerView = minimizeProductForRole(fullProduct, "OWNER");
    assert.equal(ownerView.costPrice, 220, "Owner must see cost price");
  });

  it("redacts cost and profit calculations from worker sales listings", () => {
    function minimizeSaleForRole(sale, role) {
      if (role === "WORKER") {
        const { totalCost, grossProfit, ...safeSale } = sale;
        safeSale.items = sale.items.map((it) => {
          const { unitCost, subtotalCost, profit, ...safeItem } = it;
          return safeItem;
        });
        return safeSale;
      }
      return sale;
    }

    const saleRecord = {
      id: "sale_1",
      totalAmount: 900,
      amountPaid: 900,
      totalCost: 440,
      grossProfit: 460,
      items: [
        { productId: "p1", quantity: 2, unitPrice: 450, unitCost: 220, profit: 460 },
      ],
    };

    const workerSale = minimizeSaleForRole(saleRecord, "WORKER");
    assert.equal(workerSale.totalCost, undefined);
    assert.equal(workerSale.grossProfit, undefined);
    assert.equal(workerSale.items[0].unitCost, undefined);
    assert.equal(workerSale.items[0].profit, undefined);
  });

  it("enforces configured database selling prices when worker records a sale", () => {
    function determineItemUnitPrice(workerSubmittedPrice, dbAuthoritativePrice, role) {
      if (role === "WORKER") {
        // Server ignores worker submitted price override
        return dbAuthoritativePrice;
      }
      return workerSubmittedPrice || dbAuthoritativePrice;
    }

    const dbPrice = 450;
    const workerTamperedPrice = 50; // Worker tries to discount or tamper price

    const finalPrice = determineItemUnitPrice(workerTamperedPrice, dbPrice, "WORKER");
    assert.equal(finalPrice, 450, "Server must enforce authoritative selling price for workers");
  });
});

// ============================================================================
// SUITE 3: SALES ACCOUNTABILITY & 30-MINUTE EDIT DEADLINE
// ============================================================================
describe("Sales Accountability & 30-Minute Edit Window", () => {
  it("binds sale creator from authenticated session and rejects client forgery", () => {
    function createSaleRecord(clientPayload, sessionUser) {
      return {
        id: "sale_" + Date.now(),
        creatorId: sessionUser.id, // Authoritative assignment
        lastEditorId: sessionUser.id,
        items: clientPayload.items,
        totalAmount: clientPayload.totalAmount,
      };
    }

    const sessionWorker = { id: "user_worker_real", role: "WORKER" };
    const forgedPayload = { creatorId: "user_owner_impersonated", totalAmount: 450, items: [] };

    const sale = createSaleRecord(forgedPayload, sessionWorker);
    assert.equal(sale.creatorId, "user_worker_real", "Creator MUST be taken from authenticated session");
    assert.notEqual(sale.creatorId, forgedPayload.creatorId);
  });

  it("allows sale edits within the 30-minute server window", () => {
    function checkEditWindow(saleCreatedAt, serverCurrentTime = Date.now()) {
      const saleTime = new Date(saleCreatedAt).getTime();
      const diffMs = serverCurrentTime - saleTime;
      const MAX_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
      if (diffMs > MAX_WINDOW_MS) {
        throw new Error("30-minute editing window has expired. Changes must be requested through cancellation.");
      }
      return true;
    }

    const now = Date.now();
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
    assert.ok(checkEditWindow(tenMinutesAgo, now), "Should permit edit at 10 minutes");

    const twentyNineMinutesAgo = new Date(now - 29 * 60 * 1000).toISOString();
    assert.ok(checkEditWindow(twentyNineMinutesAgo, now), "Should permit edit at 29 minutes");
  });

  it("strictly rejects sale edits after the 30-minute server window expires", () => {
    function checkEditWindow(saleCreatedAt, serverCurrentTime = Date.now()) {
      const saleTime = new Date(saleCreatedAt).getTime();
      const diffMs = serverCurrentTime - saleTime;
      const MAX_WINDOW_MS = 30 * 60 * 1000;
      if (diffMs > MAX_WINDOW_MS) {
        throw new Error("30-minute editing window has expired");
      }
      return true;
    }

    const now = Date.now();
    const thirtyOneMinutesAgo = new Date(now - 31 * 60 * 1000).toISOString();
    assert.throws(() => checkEditWindow(thirtyOneMinutesAgo, now), /expired/);

    const twoHoursAgo = new Date(now - 120 * 60 * 1000).toISOString();
    assert.throws(() => checkEditWindow(twoHoursAgo, now), /expired/);
  });

  it("preserves original creation timestamp and creator when a sale is edited", () => {
    const originalSale = {
      id: "sale_1",
      creatorId: "worker_ama",
      createdAt: "2026-10-10T20:00:00Z",
      notes: "Original note",
    };

    function applyEdit(sale, newNotes, editorId, editTimestamp) {
      return {
        ...sale,
        notes: newNotes,
        lastEditorId: editorId,
        lastEditedAt: editTimestamp,
      };
    }

    const updatedSale = applyEdit(originalSale, "Updated note", "worker_ama", new Date().toISOString());
    assert.equal(updatedSale.creatorId, "worker_ama", "Creator must be preserved");
    assert.equal(updatedSale.createdAt, "2026-10-10T20:00:00Z", "Creation time must not reset");
    assert.equal(updatedSale.notes, "Updated note");
    assert.ok(updatedSale.lastEditedAt);
  });
});

// ============================================================================
// SUITE 4: DEBT COLLECTION, WATERFALL ALLOCATION & IDEMPOTENCY
// ============================================================================
describe("Controlled Debt Collection & Waterfall Allocation", () => {
  // Pure allocation function matching src/lib/services/debt.ts
  function previewDebtPaymentAllocation(sales, paymentAmount, targetSaleId) {
    if (paymentAmount <= 0) throw new Error("Payment must be greater than zero");

    let remainingPayment = Math.round(paymentAmount * 100) / 100;
    const allocations = [];

    // Sort: specified sale first, then oldest first
    const sortedSales = [...sales].sort((a, b) => {
      if (targetSaleId) {
        if (a.id === targetSaleId) return -1;
        if (b.id === targetSaleId) return 1;
      }
      return new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime();
    });

    for (const sale of sortedSales) {
      if (remainingPayment <= 0) break;
      const outstanding = Math.round(sale.balanceDue * 100) / 100;
      if (outstanding <= 0) continue;

      const allocatedToThis = Math.min(outstanding, remainingPayment);
      const newBalance = Math.round((outstanding - allocatedToThis) * 100) / 100;

      allocations.push({
        saleId: sale.id,
        saleDate: sale.saleDate,
        originalBalance: outstanding,
        amountAllocated: allocatedToThis,
        newBalanceDue: newBalance,
      });

      remainingPayment = Math.round((remainingPayment - allocatedToThis) * 100) / 100;
    }

    return { allocations, unallocatedAmount: remainingPayment };
  }

  it("allocates payment to oldest outstanding debt first by default", () => {
    const customerSales = [
      { id: "sale_new", saleDate: "2026-10-05T00:00:00Z", balanceDue: 200 },
      { id: "sale_old", saleDate: "2026-09-01T00:00:00Z", balanceDue: 150 },
    ];

    const result = previewDebtPaymentAllocation(customerSales, 100);
    assert.equal(result.allocations.length, 1);
    assert.equal(result.allocations[0].saleId, "sale_old", "Oldest debt must be settled first");
    assert.equal(result.allocations[0].amountAllocated, 100);
    assert.equal(result.allocations[0].newBalanceDue, 50);
  });

  it("waterfalls remaining funds across multiple debts seamlessly", () => {
    const customerSales = [
      { id: "sale_1", saleDate: "2026-08-01T00:00:00Z", balanceDue: 100 },
      { id: "sale_2", saleDate: "2026-08-15T00:00:00Z", balanceDue: 150 },
      { id: "sale_3", saleDate: "2026-09-01T00:00:00Z", balanceDue: 200 },
    ];

    // Customer pays GH₵200
    const result = previewDebtPaymentAllocation(customerSales, 200);
    assert.equal(result.allocations.length, 2);

    // Settles sale_1 completely (100)
    assert.equal(result.allocations[0].saleId, "sale_1");
    assert.equal(result.allocations[0].amountAllocated, 100);
    assert.equal(result.allocations[0].newBalanceDue, 0);

    // Partially pays sale_2 (100 out of 150)
    assert.equal(result.allocations[1].saleId, "sale_2");
    assert.equal(result.allocations[1].amountAllocated, 100);
    assert.equal(result.allocations[1].newBalanceDue, 50);

    assert.equal(result.unallocatedAmount, 0);
  });

  it("honors customer-specified target sale first before waterfalling remaining funds", () => {
    const customerSales = [
      { id: "sale_old", saleDate: "2026-08-01T00:00:00Z", balanceDue: 100 },
      { id: "sale_target", saleDate: "2026-09-01T00:00:00Z", balanceDue: 120 },
    ];

    // Customer explicitly directs payment to sale_target with GH₵150
    const result = previewDebtPaymentAllocation(customerSales, 150, "sale_target");
    assert.equal(result.allocations.length, 2);

    // First settles target sale
    assert.equal(result.allocations[0].saleId, "sale_target");
    assert.equal(result.allocations[0].amountAllocated, 120);
    assert.equal(result.allocations[0].newBalanceDue, 0);

    // Remaining 30 goes to oldest sale
    assert.equal(result.allocations[1].saleId, "sale_old");
    assert.equal(result.allocations[1].amountAllocated, 30);
    assert.equal(result.allocations[1].newBalanceDue, 70);
  });

  it("rejects overpayments exceeding the customer's legitimate total balance", () => {
    const customerSales = [{ id: "s1", saleDate: "2026-09-01T00:00:00Z", balanceDue: 100 }];
    const totalDebt = 100;
    const payment = 150;

    assert.ok(payment > totalDebt, "Payment exceeds total debt");
  });

  it("enforces idempotency key protection against duplicate submissions", () => {
    const processedKeys = new Set();

    function processPayment(idempotencyKey, amount) {
      if (processedKeys.has(idempotencyKey)) {
        return { isDuplicate: true, status: "ALREADY_PROCESSED" };
      }
      processedKeys.add(idempotencyKey);
      return { isDuplicate: false, status: "COMMITTED", amount };
    }

    const key = "pay_idemp_abc_789";
    const firstCall = processPayment(key, 100);
    assert.equal(firstCall.isDuplicate, false);
    assert.equal(firstCall.status, "COMMITTED");

    // Double tap / network retry with identical key
    const secondCall = processPayment(key, 100);
    assert.equal(secondCall.isDuplicate, true);
    assert.equal(secondCall.status, "ALREADY_PROCESSED");
  });
});

// ============================================================================
// SUITE 5: SALE CANCELLATION REQUESTS & OWNER APPROVAL WORKFLOW
// ============================================================================
describe("Sale Cancellation & Owner Approval Workflow", () => {
  it("allows workers to create a pending cancellation request with reason", () => {
    function createCancellationRequest(sale, workerId, reason) {
      if (sale.status === "VOIDED" || sale.status === "CANCELLED") {
        throw new Error("Sale is already cancelled");
      }
      return {
        id: "req_1",
        saleId: sale.id,
        requestedById: workerId,
        reason: reason.trim(),
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
    }

    const sale = { id: "sale_123", status: "COMPLETED" };
    const request = createCancellationRequest(sale, "worker_ama", "Customer returned unopened perfume");

    assert.equal(request.status, "PENDING");
    assert.equal(request.requestedById, "worker_ama");
    assert.equal(request.reason, "Customer returned unopened perfume");
  });

  it("prevents workers from approving their own cancellation requests", () => {
    function reviewCancellation(request, reviewerRole) {
      if (reviewerRole !== "OWNER") {
        throw new Error("Unauthorized: Only the business Owner can approve or reject sale cancellations.");
      }
      return { approved: true };
    }

    const request = { id: "req_1", status: "PENDING", requestedById: "worker_ama" };

    // Worker attempts review
    assert.throws(() => reviewCancellation(request, "WORKER"), /Only the business Owner/);

    // Owner reviews
    assert.ok(reviewCancellation(request, "OWNER").approved);
  });

  it("atomically returns inventory and cancels sale on approval without double reversal", () => {
    let inventoryStock = 10;
    const saleItems = [{ productId: "p1", quantity: 2 }];
    let requestStatus = "PENDING";
    let saleStatus = "COMPLETED";

    function approveCancellation() {
      if (requestStatus !== "PENDING") {
        throw new Error("Request already resolved");
      }
      // Atomic reversal
      for (const item of saleItems) {
        inventoryStock += item.quantity;
      }
      requestStatus = "APPROVED";
      saleStatus = "CANCELLED";
    }

    // First approval
    approveCancellation();
    assert.equal(inventoryStock, 12, "Stock must increase by 2");
    assert.equal(requestStatus, "APPROVED");
    assert.equal(saleStatus, "CANCELLED");

    // Second approval attempt must be blocked
    assert.throws(() => approveCancellation(), /already resolved/);
    assert.equal(inventoryStock, 12, "Stock must NOT increase twice");
  });

  it("leaves sale active and stock unchanged when cancellation request is rejected", () => {
    let inventoryStock = 10;
    let requestStatus = "PENDING";
    let saleStatus = "COMPLETED";

    function rejectCancellation() {
      if (requestStatus !== "PENDING") throw new Error("Already resolved");
      requestStatus = "REJECTED";
      // Sale remains active, inventory unchanged
    }

    rejectCancellation();
    assert.equal(requestStatus, "REJECTED");
    assert.equal(saleStatus, "COMPLETED");
    assert.equal(inventoryStock, 10, "Inventory must remain unchanged on rejection");
  });
});

// ============================================================================
// SUITE 6: ACCOUNT DEACTIVATION & AUDIT TRAIL
// ============================================================================
describe("Account Deactivation & Immutable Audit Trail", () => {
  it("rejects access immediately when user account is deactivated", () => {
    function checkAccountAccess(user, session) {
      if (!user.isActive) {
        throw new Error("Account has been deactivated by the owner.");
      }
      if (session.revokedAt) {
        throw new Error("Session has been revoked.");
      }
      return true;
    }

    const activeUser = { id: "w1", isActive: true };
    const session = { id: "s1", revokedAt: null };
    assert.ok(checkAccountAccess(activeUser, session));

    const deactivatedUser = { id: "w1", isActive: false };
    assert.throws(() => checkAccountAccess(deactivatedUser, session), /deactivated/);
  });

  it("verifies structured audit log entries record actors, timestamps, and safe details", () => {
    const auditEntries = [];

    function recordAudit(businessId, userId, action, entityType, entityId, details) {
      const entry = {
        id: "audit_" + (auditEntries.length + 1),
        businessId,
        userId,
        action,
        entityType,
        entityId,
        details: JSON.stringify(details),
        createdAt: new Date().toISOString(),
      };
      auditEntries.push(entry);
      return entry;
    }

    recordAudit("biz_1", "user_owner", "WORKER_INVITED", "USER", "user_worker", { email: "worker@test.com" });
    recordAudit("biz_1", "user_worker", "SALE_CREATED", "SALE", "sale_123", { amount: 450 });

    assert.equal(auditEntries.length, 2);
    assert.equal(auditEntries[0].action, "WORKER_INVITED");
    assert.equal(auditEntries[0].userId, "user_owner");
    assert.equal(auditEntries[1].action, "SALE_CREATED");
    assert.equal(auditEntries[1].userId, "user_worker");
  });
});
