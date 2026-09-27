import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateBusinessProfile, updateOwnerProfile } from "@/lib/services/profile";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";

export async function GET() {
  try {
    const profile = await getProfile(DEFAULT_BUSINESS_ID);
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
    const body = await req.json();
    const { target } = body;

    if (target === "owner") {
      const updatedUser = await updateOwnerProfile({
        ownerId: body.ownerId,
        name: body.name,
        email: body.email,
      });
      return NextResponse.json({ success: true, data: serializePlainObject(updatedUser) });
    }

    // Default target is business
    const updatedBusiness = await updateBusinessProfile({
      businessId: DEFAULT_BUSINESS_ID,
      name: body.name,
      phone: body.phone,
      address: body.address,
      description: body.description,
    });

    return NextResponse.json({ success: true, data: serializePlainObject(updatedBusiness) });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
