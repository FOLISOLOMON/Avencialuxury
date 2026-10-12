import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { revokeWorkerInvitation, resendWorkerInvitation } from "@/lib/services/team";
import { sendWorkerInvitationEmail } from "@/lib/services/email";
import { serializePlainObject } from "@/lib/utils";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const { id: invitationId } = await params;
    const updated = await revokeWorkerInvitation({
      businessId: auth!.businessId,
      invitationId,
      revokedById: auth!.user.id,
    });

    return NextResponse.json({
      success: true,
      data: serializePlainObject(updated),
      message: "Invitation revoked successfully.",
    });
  } catch (error: any) {
    console.error("DELETE /api/team/invitations/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to revoke invitation" }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const { id: invitationId } = await params;
    const result = await resendWorkerInvitation({
      businessId: auth!.businessId,
      invitationId,
      sentById: auth!.user.id,
    });

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");
    const appBaseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || (host ? `${proto}://${host}` : "http://localhost:3000");
    const inviteUrl = `${appBaseUrl}/invite/${result.rawToken}`;

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
        ? `Invitation email successfully resent to ${result.invitation.email}!`
        : `Invitation refreshed with a new 24-hour validity window.${emailResult.error ? ` (Email issue: ${emailResult.error})` : ""}`,
    });
  } catch (error: any) {
    console.error("POST /api/team/invitations/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to resend invitation" }, { status: 400 });
  }
}
