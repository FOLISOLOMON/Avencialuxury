import { getFinancialSummary } from "@/lib/services/profit";
import { getActiveBatches } from "@/lib/services/batches";
import { getProducts } from "@/lib/services/products";
import { getSales } from "@/lib/services/sales";
import { getCustomers } from "@/lib/services/customers";
import { getSettings } from "@/lib/services/settings";
import { InteractiveDashboard } from "@/components/dashboard/InteractiveDashboard";
import { QuickPinLock } from "@/components/auth/QuickPinLock";
import { serializePlainObject } from "@/lib/utils";

export const revalidate = 0; // Fresh real-time data on every request

export default async function DashboardPage() {
  const businessId = "biz_default_avencia";

  const rawSummary = await getFinancialSummary(businessId);
  const rawActiveBatches = await getActiveBatches(businessId);
  const rawProducts = await getProducts(businessId);
  const rawSales = await getSales(businessId);
  const rawCustomers = await getCustomers(businessId);
  const rawSettings = await getSettings(businessId);

  const summary = serializePlainObject(rawSummary);
  const activeBatches = serializePlainObject(rawActiveBatches);
  const products = serializePlainObject(rawProducts);
  const sales = serializePlainObject(rawSales);
  const customers = serializePlainObject(rawCustomers);
  const settings = serializePlainObject(rawSettings);

  return (
    <QuickPinLock>
      <div className="space-y-8">
        <InteractiveDashboard
          summary={summary}
          activeBatches={activeBatches}
          products={products}
          sales={sales}
          customers={customers}
          settings={settings}
        />
      </div>
    </QuickPinLock>
  );
}
