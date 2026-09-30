import { NextResponse } from "next/server";
import { askAvencia } from "@/lib/ai/service";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

// Simple in-memory rate limiting: max 20 requests per minute per IP / business
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(key: string, limit = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.expiresAt < now) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "client_ip";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please wait a moment before sending another AI query.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== "object" || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload format. 'messages' array is required." },
        { status: 400 }
      );
    }

    if (body.messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Messages array cannot be empty." },
        { status: 400 }
      );
    }

    // Truncate to maximum 10 past messages for cost/token control
    const slicedMessages = body.messages.slice(-10);

    const businessId = body.businessId || DEFAULT_BUSINESS_ID;

    const result = await askAvencia(
      {
        messages: slicedMessages,
        businessId,
      },
      businessId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/ai/chat error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Avencia AI is temporarily unavailable. Please try again.",
      },
      { status: 500 }
    );
  }
}
