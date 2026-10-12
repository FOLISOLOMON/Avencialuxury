import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const businessId = auth!.businessId;

    // Fast parallel lookups for latest modification timestamps
    const [
      lastProduct,
      lastSale,
      lastCancellation,
      lastCustomer,
      lastTxn,
      lastBatch,
      lastTeamUser,
      lastInvitation,
    ] = await Promise.all([
      prisma.product.findFirst({
        where: { businessId },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      prisma.sale.findFirst({
        where: { businessId },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      prisma.saleCancellationRequest.findFirst({
        where: { businessId },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      prisma.customer.findFirst({
        where: { businessId },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      prisma.inventoryTransaction.findFirst({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.batch.findFirst({
        where: { businessId },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      prisma.user.findFirst({
        where: {
          OR: [{ businessId }, { businesses: { some: { id: businessId } } }],
        },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      prisma.workerInvitation.findFirst({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const versions = {
      products: lastProduct?.updatedAt ? new Date(lastProduct.updatedAt).getTime() : 0,
      sales: lastSale?.updatedAt ? new Date(lastSale.updatedAt).getTime() : 0,
      cancellations: lastCancellation?.updatedAt ? new Date(lastCancellation.updatedAt).getTime() : 0,
      customers: lastCustomer?.updatedAt ? new Date(lastCustomer.updatedAt).getTime() : 0,
      inventory: lastTxn?.createdAt ? new Date(lastTxn.createdAt).getTime() : 0,
      batches: lastBatch?.updatedAt ? new Date(lastBatch.updatedAt).getTime() : 0,
      team: Math.max(
        lastTeamUser?.updatedAt ? new Date(lastTeamUser.updatedAt).getTime() : 0,
        lastInvitation?.createdAt ? new Date(lastInvitation.createdAt).getTime() : 0
      ),
      timestamp: Date.now(),
    };

    return NextResponse.json(
      {
        success: true,
        versions,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
