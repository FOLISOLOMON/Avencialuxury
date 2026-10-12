import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getWorkersList, getPendingInvitations, createWorkerInvitation } from "@/lib/services/team";
import { sendWorkerInvitationEmail } from "@/lib/services/email";
import { serializePlainObject } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const [workers, invitations] = await Promise.all([
      getWorkersList(auth!.businessId),
      getPendingInvitations(auth!.businessId),
    ]);

    const serializedWorkers = serializePlainObject(workers);
    const serializedInvitations = serializePlainObject(invitations);

    return NextResponse.json({
      success: true,
      workers: serializedWorkers,
      invitations: serializedInvitations,
      data: {
        workers: serializedWorkers,
        invitations: serializedInvitations,
      },
    });
  } catch (error: any) {
    console.error("GET /api/team error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch team" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { name, email } = body || {};

    if (!name || typeof name !== "string") {
      return NextResponse.json({ success: false, error: "Worker name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "A valid email is required" }, { status: 400 });
    }

    const result = await createWorkerInvitation({
      businessId: auth!.businessId,
      invitedById: auth!.user.id,
      name,
      email,
    });

    // Provide the invitation link directly for easy sharing by the owner
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");
    const appBaseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || (host ? `${proto}://${host}` : "http://localhost:3000");
    const inviteUrl = `${appBaseUrl}/invite/${result.rawToken}`;

    // Dispatch email if SMTP is configured
    const emailResult = await sendWorkerInvitationEmail({
      to: result.invitation.email,
      workerName: result.invitation.name,
      inviteUrl,
      expiresAt: result.invitation.expiresAt,
    });

    return NextResponse.json({
      success: true,
      data: serializePlainObject(result.invitation),
      inviteUrl,
      rawToken: result.rawToken,
      emailSent: emailResult.sent,
      emailError: emailResult.error,
      message: emailResult.sent
        ? `Invitation email successfully sent to ${result.invitation.email}!`
        : `Invitation created for ${result.invitation.name}.${emailResult.error ? ` (Email issue: ${emailResult.error})` : ""} You can also share the link directly.`,
    });
  } catch (error: any) {
    console.error("POST /api/team error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to invite worker" }, { status: 400 });
  }
}
