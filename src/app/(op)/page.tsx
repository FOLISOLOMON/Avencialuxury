import { getFinancialSummary } from "@/lib/services/profit";
import { getActiveBatches } from "@/lib/services/batches";
import { getProducts } from "@/lib/services/products";
import { getSales, getCancellationRequests } from "@/lib/services/sales";
import { getCustomers } from "@/lib/services/customers";
import { getSettings } from "@/lib/services/settings";
import { InteractiveDashboard } from "@/components/dashboard/InteractiveDashboard";
import { serializePlainObject } from "@/lib/utils";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/token";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

export const revalidate = 0; // Fresh real-time data on every request

export default async function DashboardPage() {
  let businessId = DEFAULT_BUSINESS_ID;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("avencia_session")?.value;
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload?.businessId) {
        businessId = payload.businessId;
      }
    }
  } catch (e) {
    // fallback to default
  }

  const rawSummary = await getFinancialSummary(businessId);
  const rawActiveBatches = await getActiveBatches(businessId);
  const rawProducts = await getProducts(businessId);
  const rawSales = await getSales(businessId);
  const rawCustomers = await getCustomers(businessId);
  const rawSettings = await getSettings(businessId);
  const rawCancellationRequests = await getCancellationRequests(businessId, "PENDING");

  const summary = serializePlainObject(rawSummary);
  const activeBatches = serializePlainObject(rawActiveBatches);
  const products = serializePlainObject(rawProducts);
  const sales = serializePlainObject(rawSales);
  const customers = serializePlainObject(rawCustomers);
  const settings = serializePlainObject(rawSettings);
  const cancellationRequests = serializePlainObject(rawCancellationRequests);

  return (
    <div className="space-y-8">
      <InteractiveDashboard
        summary={summary}
        activeBatches={activeBatches}
        products={products}
        sales={sales}
        customers={customers}
        settings={settings}
        cancellationRequests={cancellationRequests}
      />
    </div>
  );
}
