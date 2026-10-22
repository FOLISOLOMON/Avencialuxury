import { GoogleGenAI } from "@google/genai";

/**
 * Server-only Google Gemini configuration and client provider.
 * Protects API keys from exposure and manages model selection.
 */

export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function getGeminiModel(): string {
  // Free-tier eligible model by default: gemini-2.5-flash or gemini-2.0-flash
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

export function isGeminiConfigured(): boolean {
  const key = getGeminiApiKey();
  return Boolean(key && key.length >= 8);
}

export function isRealDataTransmissionAllowed(): boolean {
  // Privacy safeguard: requires explicit owner opt-in to transmit real business data
  // to external AI providers whose free tier terms allow service improvement training.
  return process.env.ALLOW_REAL_DATA_AI_TRANSMISSION === "true";
}

let cachedClient: GoogleGenAI | null = null;
let lastApiKey: string | undefined = undefined;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING: Gemini API key is not configured on the server.");
  }

  if (!cachedClient || lastApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    lastApiKey = apiKey;
  }

  return cachedClient;
}

/**
 * Categorizes and formats errors from Gemini SDK without exposing server secrets.
 */
export function formatGeminiError(error: any): {
  message: string;
  code: "MISSING_API_KEY" | "QUOTA_EXCEEDED" | "RATE_LIMITED" | "TIMEOUT" | "SERVER_ERROR";
} {
  const errString = error?.message || String(error || "");
  const status = error?.status || error?.statusCode;

  if (errString.includes("GEMINI_API_KEY_MISSING") || errString.includes("API key not valid")) {
    return {
      message:
        "Google Gemini API key is missing or not configured. To enable Ask Avencia, please set GEMINI_API_KEY in your server environment (.env.local).",
      code: "MISSING_API_KEY",
    };
  }

  // Quota / Rate limit (HTTP 429 / RESOURCE_EXHAUSTED)
  if (
    status === 429 ||
    errString.includes("429") ||
    errString.includes("RESOURCE_EXHAUSTED") ||
    errString.toLowerCase().includes("quota exceeded") ||
    errString.toLowerCase().includes("rate limit")
  ) {
    return {
      message:
        "The AI service has reached its free tier usage limit. Please wait a moment and try again.",
      code: "QUOTA_EXCEEDED",
    };
  }

  // Timeout
  if (errString.includes("timeout") || errString.includes("aborted") || error?.name === "AbortError") {
    return {
      message:
        "The request to Gemini AI timed out. Please try asking a more specific question.",
      code: "TIMEOUT",
    };
  }

  return {
    message: "Avencia AI encountered a temporary issue communicating with Gemini. Please try again.",
    code: "SERVER_ERROR",
  };
}
