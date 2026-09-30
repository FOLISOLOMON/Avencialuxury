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
export function formatGhanaPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let cleaned = phone.trim().replace(/[\s\-\(\)]/g, "");
  if (!cleaned) return null;

  // Extract pure digits to validate length
  const digitsOnly = cleaned.replace(/\+/g, "");
  if (digitsOnly.length < 9) return null;

  // If already starts with "+233"
  if (cleaned.startsWith("+233")) {
    const rest = cleaned.slice(4).replace(/^0+/, "");
    return `233${rest}`;
  }

  // If starts with "233" (without plus)
  if (cleaned.startsWith("233")) {
    const rest = cleaned.slice(3).replace(/^0+/, "");
    return `233${rest}`;
  }

  // If starts with "0"
  if (cleaned.startsWith("0")) {
    return `233${cleaned.slice(1)}`;
  }

  // If starts with another plus
  if (cleaned.startsWith("+")) {
    return cleaned.slice(1);
  }

  return `233${cleaned}`;
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

/**
 * Returns inclusive timezone-safe start and end Date objects for a date range or quick range filter.
 * Ensures start is 00:00:00.000 local time and end is 23:59:59.999 local time.
 */
export function getBusinessDayBounds(
  quickRange?: string,
  customStart?: string | Date | null,
  customEnd?: string | Date | null
): { startDate?: Date; endDate?: Date } {
  const now = new Date();

  if (quickRange) {
    const rangeUpper = quickRange.toUpperCase();
    if (rangeUpper === "TODAY") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
    if (rangeUpper === "YESTERDAY") {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
    if (rangeUpper === "THIS_WEEK") {
      const dayOfWeek = now.getDay(); // 0 is Sunday
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: startOfWeek, endDate: endOfWeek };
    }
    if (rangeUpper === "LAST_7_DAYS") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
    if (rangeUpper === "THIS_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
    if (rangeUpper === "LAST_MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startDate: start, endDate: endOfLastMonth };
    }
    if (rangeUpper === "THIS_YEAR") {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
  }

  let startDate: Date | undefined = undefined;
  let endDate: Date | undefined = undefined;

  if (customStart) {
    const sDate = new Date(customStart);
    if (!isNaN(sDate.getTime())) {
      startDate = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), 0, 0, 0, 0);
    }
  }

  if (customEnd) {
    const eDate = new Date(customEnd);
    if (!isNaN(eDate.getTime())) {
      endDate = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate(), 23, 59, 59, 999);
    }
  }

  return { startDate, endDate };
}

/**
 * Parses natural language date expressions (e.g. "today", "this month", "last 7 days") into
 * structured date bounds for backend reporting services.
 */
export function parseNaturalDateRange(phrase?: string): { quickRange?: string; startDate?: Date; endDate?: Date } {
  if (!phrase) return {};
  const p = phrase.toLowerCase().trim();

  if (p.includes("today")) return { quickRange: "TODAY" };
  if (p.includes("yesterday")) return { quickRange: "YESTERDAY" };
  if (p.includes("this week")) return { quickRange: "THIS_WEEK" };
  if (p.includes("last 7 days") || p.includes("7 days")) return { quickRange: "LAST_7_DAYS" };
  if (p.includes("this month") || p.includes("month")) return { quickRange: "THIS_MONTH" };
  if (p.includes("last month")) return { quickRange: "LAST_MONTH" };
  if (p.includes("this year") || p.includes("year")) return { quickRange: "THIS_YEAR" };

  return {};
}


