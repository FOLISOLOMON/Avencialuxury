import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateBusinessProfile, updateOwnerProfile } from "@/lib/services/profile";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/session";
import { logAudit } from "@/lib/services/audit";

export async function GET(req: Request) {
  try {
    const { auth } = await requireAuth(req);
    const businessId = auth?.businessId || DEFAULT_BUSINESS_ID;

    const profile = await getProfile(businessId);
    return NextResponse.json({ success: true, data: serializePlainObject(profile) });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { auth, errorResponse } = await requireAuth(req, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { target } = body;
    const businessId = auth!.businessId;

    if (target === "owner") {
      const updatedUser = await updateOwnerProfile({
        ownerId: auth!.user.id,
        name: body.name,
        email: body.email,
      });

      await logAudit({
        businessId,
        userId: auth!.user.id,
        action: "OWNER_PROFILE_UPDATED",
        entityType: "USER",
        entityId: auth!.user.id,
        details: { name: body.name, email: body.email },
      });

      return NextResponse.json({ success: true, data: serializePlainObject(updatedUser) });
    }

    // Default target is business
    const updatedBusiness = await updateBusinessProfile({
      businessId,
      name: body.name,
      phone: body.phone,
      address: body.address,
      description: body.description,
    });

    await logAudit({
      businessId,
      userId: auth!.user.id,
      action: "BUSINESS_PROFILE_UPDATED",
      entityType: "BUSINESS",
      entityId: businessId,
      details: { name: body.name, phone: body.phone, address: body.address },
    });

    return NextResponse.json({ success: true, data: serializePlainObject(updatedBusiness) });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
