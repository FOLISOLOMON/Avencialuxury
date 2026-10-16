import crypto from "crypto";

export interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  status?: number;
}

// In-memory sliding rate limiter map (for dev, test, and fallback)
const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Extracts client IP from request headers safely
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
}

/**
 * Hash an identifier (email, IP) with SHA-256 to avoid storing raw sensitive identifiers
 */
export function hashIdentifier(val: string): string {
  return crypto.createHash("sha256").update(val.toLowerCase().trim()).digest("hex").slice(0, 32);
}

/**
 * Scopes rate-limiting keys with hashed identifiers to prevent PII / email exposure in storage
 */
export function getRateLimitKey(request: Request, email?: string): string {
  const ip = getClientIp(request);
  return email ? `login:${ip}:${hashIdentifier(email)}` : `ip:${ip}`;
}

/**
 * Atomic SQL statements for PostgreSQL rate limiting
 */
export const POSTGRES_RATE_LIMIT_SQL = {
  // Concurrency-safe atomic upsert with row-level lock
  upsert: `
    INSERT INTO "RateLimit" ("key", "count", "resetAt", "updatedAt")
    VALUES ($1, 1, $2, NOW())
    ON CONFLICT ("key") DO UPDATE
    SET "count" = CASE 
      WHEN "RateLimit"."resetAt" < NOW() THEN 1 
      ELSE "RateLimit"."count" + 1 
    END,
    "resetAt" = CASE 
      WHEN "RateLimit"."resetAt" < NOW() THEN $2 
      ELSE "RateLimit"."resetAt" 
    END,
    "updatedAt" = NOW()
    RETURNING "count", "resetAt";
  `,
  // Non-destructive read check
  check: `SELECT "count", "resetAt" FROM "RateLimit" WHERE "key" = $1;`,
  // Immediate reset upon successful authentication
  clear: `DELETE FROM "RateLimit" WHERE "key" = $1;`,
  // Non-premature cleanup query (only deletes records older than 1 hour post-expiration)
  cleanup: `DELETE FROM "RateLimit" WHERE "resetAt" < NOW() - INTERVAL '1 hour';`,
};

/**
 * Checks in-memory sliding window rate limit
 */
export function checkGenericRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (entry.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Records an attempt in the in-memory store
 */
export function recordGenericAttempt(key: string, windowMs: number): void {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    entry.count += 1;
  }
}

/**
 * Clears an entry from the in-memory store
 */
export function clearRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

let prismaModule: any = null;
async function getPrisma() {
  if (!prismaModule) {
    try {
      prismaModule = (await import("@/lib/db/prisma")).prisma;
    } catch {
      try {
        prismaModule = (await import("../db/prisma")).prisma;
      } catch {
        prismaModule = null;
      }
    }
  }
  return prismaModule;
}

/**
 * Evaluates whether PostgreSQL-backed rate limiting should be used
 */
export function isPostgresStoreEnabled(): boolean {
  // Enabled in production by default, or when explicitly requested via AVENCIA_RATE_LIMIT_STORE=postgres
  if (process.env.AVENCIA_RATE_LIMIT_STORE === "postgres") return true;
  if (process.env.AVENCIA_RATE_LIMIT_STORE === "memory") return false;
  return process.env.NODE_ENV === "production";
}

/**
 * Production PostgreSQL atomic rate check with strict fail-closed behavior
 */
export async function checkPostgresRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isPostgresStoreEnabled()) {
    return checkGenericRateLimit(key, maxAttempts, windowMs);
  }

  try {
    const prisma = await getPrisma();
    if (!prisma) {
      throw new Error("Prisma client unavailable");
    }

    const rows = (await prisma.$queryRawUnsafe(
      POSTGRES_RATE_LIMIT_SQL.check,
      key
    )) as { count: number; resetAt: Date }[];

    if (!rows || rows.length === 0) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const { count, resetAt } = rows[0];
    const now = Date.now();
    const resetTime = new Date(resetAt).getTime();

    if (resetTime < now) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (count >= maxAttempts) {
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err: any) {
    console.error("[RateLimit] PostgreSQL rate check error:", err.message);
    if (isProduction) {
      // In production, strictly fail closed with 503 Service Unavailable
      return { allowed: false, retryAfterSeconds: 60, status: 503 };
    }
    // In non-production, fall back to in-memory store
    return checkGenericRateLimit(key, maxAttempts, windowMs);
  }
}

/**
 * Production PostgreSQL atomic record attempt
 */
export async function recordPostgresAttempt(
  key: string,
  windowMs: number
): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isPostgresStoreEnabled()) {
    recordGenericAttempt(key, windowMs);
    return;
  }

  try {
    const prisma = await getPrisma();
    if (!prisma) {
      throw new Error("Prisma client unavailable");
    }

    const resetAt = new Date(Date.now() + windowMs);
    await prisma.$queryRawUnsafe(POSTGRES_RATE_LIMIT_SQL.upsert, key, resetAt);
  } catch (err: any) {
    console.error("[RateLimit] PostgreSQL record attempt error:", err.message);
    if (isProduction) {
      // In production, log error; do not silently degrade to local state
      return;
    }
    recordGenericAttempt(key, windowMs);
  }
}

/**
 * Production PostgreSQL clear entry
 */
export async function clearPostgresRateLimit(key: string): Promise<void> {
  if (!isPostgresStoreEnabled()) {
    clearRateLimit(key);
    return;
  }

  try {
    const prisma = await getPrisma();
    if (!prisma) {
      throw new Error("Prisma client unavailable");
    }

    await prisma.$queryRawUnsafe(POSTGRES_RATE_LIMIT_SQL.clear, key);
  } catch (err: any) {
    console.error("[RateLimit] PostgreSQL clear rate limit error:", err.message);
    clearRateLimit(key);
  }
}

// ---------------------------------------------------------------------------
// Route-Facing Functions (Synchronous in memory mode, Promise in postgres mode)
// ---------------------------------------------------------------------------

export function checkLoginRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  if (isPostgresStoreEnabled()) {
    return checkPostgresRateLimit(key, maxAttempts, windowMs);
  }
  return checkGenericRateLimit(key, maxAttempts, windowMs);
}

export function recordFailedLoginAttempt(key: string, windowMs = 15 * 60 * 1000) {
  if (isPostgresStoreEnabled()) {
    return recordPostgresAttempt(key, windowMs);
  }
  recordGenericAttempt(key, windowMs);
}

export function clearLoginRateLimit(key: string) {
  if (isPostgresStoreEnabled()) {
    return clearPostgresRateLimit(key);
  }
  clearRateLimit(key);
}

export function checkForgotPasswordRateLimit(ip: string, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const key = `forgot-pw:${hashIdentifier(ip)}`;
  if (isPostgresStoreEnabled()) {
    return checkPostgresRateLimit(key, maxAttempts, windowMs);
  }
  return checkGenericRateLimit(key, maxAttempts, windowMs);
}

export function recordForgotPasswordAttempt(ip: string, windowMs = 15 * 60 * 1000) {
  const key = `forgot-pw:${hashIdentifier(ip)}`;
  if (isPostgresStoreEnabled()) {
    return recordPostgresAttempt(key, windowMs);
  }
  recordGenericAttempt(key, windowMs);
}

export function checkResetPasswordRateLimit(ip: string, maxAttempts = 10, windowMs = 15 * 60 * 1000) {
  const key = `reset-pw:${hashIdentifier(ip)}`;
  if (isPostgresStoreEnabled()) {
    return checkPostgresRateLimit(key, maxAttempts, windowMs);
  }
  return checkGenericRateLimit(key, maxAttempts, windowMs);
}

export function recordResetPasswordAttempt(ip: string, windowMs = 15 * 60 * 1000) {
  const key = `reset-pw:${hashIdentifier(ip)}`;
  if (isPostgresStoreEnabled()) {
    return recordPostgresAttempt(key, windowMs);
  }
  recordGenericAttempt(key, windowMs);
}

export function resetRateLimitsForTesting(): void {
  rateLimitMap.clear();
}
