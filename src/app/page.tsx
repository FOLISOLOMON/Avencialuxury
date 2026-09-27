import { getFinancialSummary } from "@/lib/services/profit";
import { getActiveBatches } from "@/lib/services/batches";
import { getProducts } from "@/lib/services/products";
import { InteractiveDashboard } from "@/components/dashboard/InteractiveDashboard";
import { QuickPinLock } from "@/components/auth/QuickPinLock";
import { serializePlainObject } from "@/lib/utils";

export const revalidate = 0; // Fresh real-time data on every request

export default async function DashboardPage() {
  const businessId = "biz_default_avencia";

  const rawSummary = await getFinancialSummary(businessId);
  const rawActiveBatches = await getActiveBatches(businessId);
  const rawProducts = await getProducts(businessId);

  const summary = serializePlainObject(rawSummary);
  const activeBatches = serializePlainObject(rawActiveBatches);
  const products = serializePlainObject(rawProducts);

  return (
    <QuickPinLock>
      <div className="space-y-8">
        <InteractiveDashboard
          summary={summary}
          activeBatches={activeBatches}
          products={products}
        />
      </div>
    </QuickPinLock>
  );
}
