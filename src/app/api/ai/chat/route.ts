import { NextResponse } from "next/server";
import { askAvencia } from "@/lib/ai/service";
import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Rate limiter: Max 15 requests per minute per authenticated user (matching Gemini free tier limits)
const userRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkUserRateLimit(userId: string, limit = 15, windowMs = 60000): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = userRateLimits.get(userId);

  if (!entry || entry.resetAt <= now) {
    userRateLimits.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true };
}

export async function POST(request: Request) {
  try {
    // 1. Mandatory Server-Side Authentication
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) {
      return errorResponse;
    }

    const authUser = auth!.user;
    const businessId = auth!.businessId;

    // 2. Per-User Rate Limiting
    const rateCheck = checkUserRateLimit(authUser.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "You have reached the temporary rate limit. Please wait a moment before asking another question.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfterSeconds || 60),
          },
        }
      );
    }

    // 3. Payload Validation
    const body = await request.json();

    if (!body || typeof body !== "object" || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload. 'messages' array is required." },
        { status: 400 }
      );
    }

    if (body.messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Messages array cannot be empty." },
        { status: 400 }
      );
    }

    // Sanitize and validate messages
    const validMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
    for (const m of body.messages) {
      if (m && typeof m === "object" && typeof m.content === "string") {
        const role = m.role === "assistant" || m.role === "system" ? m.role : "user";
        // Trim and enforce max 2,000 characters per message
        const content = m.content.trim().slice(0, 2000);
        if (content.length > 0) {
          validMessages.push({ role, content });
        }
      }
    }

    if (validMessages.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid text content found in messages." },
        { status: 400 }
      );
    }

    // Limit conversation context to the 10 most recent messages
    const slicedMessages = validMessages.slice(-10);

    // 4. Delegate to Ask Avencia with Authoritative Context
    const result = await askAvencia(
      {
        messages: slicedMessages,
        businessId,
        authUser,
      },
      businessId,
      authUser
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/ai/chat unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Ask Avencia is temporarily unable to process your request. Please try again.",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
