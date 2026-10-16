import crypto from "crypto";

/**
 * Validates the setup secret securely on the server.
 * Never exposes the expected or provided secret to callers or logs.
 */
export function verifySetupSecret(providedSecret?: string): { valid: boolean; reason?: string } {
  const configuredSecret = process.env.SETUP_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  // In production, SETUP_SECRET is strictly mandatory and must be at least 16 characters
  if (isProduction) {
    if (!configuredSecret || configuredSecret.length < 16) {
      return { valid: false, reason: "SETUP_SECRET_UNCONFIGURED_OR_INSUFFICIENT" };
    }
  }

  // If a SETUP_SECRET is configured in any environment, it must match
  if (configuredSecret) {
    if (!providedSecret || typeof providedSecret !== "string") {
      return { valid: false, reason: "MISSING_SETUP_SECRET" };
    }
    const a = Buffer.from(providedSecret);
    const b = Buffer.from(configuredSecret);
    if (a.length !== b.length) {
      return { valid: false, reason: "INVALID_SETUP_SECRET" };
    }
    const matches = crypto.timingSafeEqual(a, b);
    return { valid: matches, reason: matches ? undefined : "INVALID_SETUP_SECRET" };
  }

  // In non-production environments with no SETUP_SECRET set, allow for developer convenience
  return { valid: true };
}
