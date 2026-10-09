import { NextResponse } from "next/server";
import { getPublicVapidKey } from "@/lib/services/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = getPublicVapidKey();

  if (!publicKey) {
    return NextResponse.json(
      { success: false, error: "VAPID public key is not configured on the server" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, publicKey });
}
