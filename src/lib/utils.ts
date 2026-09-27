import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely format currency for display (default GHS / GH₵)
 */
export function formatCurrency(amount: any, currency = "GHS"): string {
  if (amount === null || amount === undefined) return "GH₵0.00";
  
  let num = 0;
  if (typeof amount === "number") {
    num = amount;
  } else if (typeof amount === "string") {
    num = parseFloat(amount);
  } else if (amount && typeof amount.toNumber === "function") {
    num = amount.toNumber();
  } else if (amount && typeof amount.toString === "function") {
    num = parseFloat(amount.toString());
  }

  const formatted = isNaN(num) ? "0.00" : num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (currency === "GHS") {
    return `GH₵${formatted}`;
  }
  return `${currency} ${formatted}`;
}

/**
 * Deeply converts Prisma Decimal objects, Date objects, and custom instances
 * into plain JSON-serializable primitives safe for React Server Component props.
 */
export function serializePlainObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj) as any;
  if (typeof obj !== "object") return obj;

  if (obj instanceof Date) {
    return obj.toISOString() as any;
  }

  // Handle Prisma.Decimal or Decimal.js instances
  if ("toNumber" in (obj as any) && typeof (obj as any).toNumber === "function") {
    return (obj as any).toNumber();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializePlainObject(item)) as any;
  }

  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val && typeof val === "object" && "toNumber" in val && typeof val.toNumber === "function") {
      result[key] = val.toNumber();
    } else if (val instanceof Date) {
      result[key] = val.toISOString();
    } else {
      result[key] = serializePlainObject(val);
    }
  }
  return result as T;
}

/**
 * Formats a phone number into standard Ghana international format (+233XX...XX)
 * Examples:
 * - "0554663443" -> "+233554663443"
 * - "+233554663443" -> "+233554663443"
 * - "+2330554663443" -> "+233554663443"
 * - "233554663443" -> "+233554663443"
 * - "554663443" -> "+233554663443"
 */
export function formatGhanaPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  let cleaned = phone.trim().replace(/[\s\-\(\)]/g, "");
  if (!cleaned) return "";

  // If already starts with "+233"
  if (cleaned.startsWith("+233")) {
    const rest = cleaned.slice(4).replace(/^0+/, "");
    return `+233${rest}`;
  }

  // If starts with "233" (without plus)
  if (cleaned.startsWith("233")) {
    const rest = cleaned.slice(3).replace(/^0+/, "");
    return `+233${rest}`;
  }

  // If starts with "0"
  if (cleaned.startsWith("0")) {
    return `+233${cleaned.slice(1)}`;
  }

  // If starts with another plus (e.g., international format from another country), return as is
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // Otherwise, prefix +233
  return `+233${cleaned}`;
}

/**
 * Auto-generates a clean, unique SKU for a product.
 * Examples:
 * - ("Amber Wood Cologne", "Avencia", "100ml") -> "AV-AMB-100ML-8F9A"
 * - ("Bleu De Chanel", "Chanel") -> "AV-CHA-4K2P"
 */
export function generateProductSku(name: string = "", brand?: string | null, size?: string | null): string {
  const cleanStr = (brand && brand.trim().length >= 2 ? brand : name || "AV")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  
  const prefix = cleanStr.length >= 3 ? cleanStr.substring(0, 3) : (cleanStr + "AVX").substring(0, 3);
  
  const sizeClean = size ? size.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : "";
  const sizeSuffix = sizeClean ? `-${sizeClean}` : "";

  // 4 random alphanumeric characters
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `AV-${prefix}${sizeSuffix}-${randomChars}`;
}
