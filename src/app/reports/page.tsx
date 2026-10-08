"use client";

import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Button,
  IconButton,
  Card,
  Badge,
  Money,
  DateRangeBar,
  QuickDateRange,
} from "@/components/ui";
import { TrendBarChart, DonutChart, MiniSparkline } from "@/components/ui/SvgCharts";
import {
  BarChart3,
  Calendar,
  Printer,
  ShoppingBag,
  Package,
  Layers,
  Receipt,
  PiggyBank,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Boxes,
  Percent,
} from "lucide-react";

interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: number;
  revenue: number;
  cost: number;
  profit: number;
  product: { name: string; sku: string | null };
}

interface Sale {
  id: string;
  saleDate: string;
  totalAmount: number;
  grossProfit: number;
  paymentMethod: string;
  status: string;
  saleItems: SaleItem[];
}

interface Product {
  id: string;
  name: string;
  category: string | null;
  remainingStock: number;
  sellingPriceNum: number;
  defaultCostPriceNum: number;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  expenseDate: string;
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<QuickDateRange>("THIS_MONTH");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profitSummary, setProfitSummary] = useState<any>(null);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, prodRes, expRes, profitRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/products"),
        fetch("/api/expenses"),
        fetch("/api/profit"),
      ]);

      const [salesJson, prodJson, expJson, profitJson] = await Promise.all([
        salesRes.json(),
        prodRes.json(),
        expRes.json(),
        profitRes.json(),
      ]);

      if (salesJson.success) setSales(salesJson.data || []);
      if (prodJson.success) setProducts(prodJson.data || []);
      if (expJson.success) setExpenses(expJson.data || []);
      if (profitJson.success) setProfitSummary(profitJson.data.summary || null);
    } catch (err: any) {
      setError(err.message || "Failed to load report analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Filter sales & expenses by chosen date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      const d = new Date(s.saleDate);
      if (dateRange === "TODAY") {
        return d.toDateString() === now.toDateString();
      }
      if (dateRange === "LAST_7_DAYS") {
        const past7 = new Date();
        past7.setDate(now.getDate() - 7);
        return d >= past7;
      }
      if (dateRange === "THIS_MONTH") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (dateRange === "CUSTOM" && customStart && customEnd) {
        return d >= new Date(customStart) && d <= new Date(customEnd);
      }
      return true;
    });
  }, [sales, dateRange, customStart, customEnd]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      const d = new Date(e.expenseDate);
      if (dateRange === "TODAY") {
        return d.toDateString() === now.toDateString();
      }
      if (dateRange === "LAST_7_DAYS") {
        const past7 = new Date();
        past7.setDate(now.getDate() - 7);
        return d >= past7;
      }
      if (dateRange === "THIS_MONTH") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [expenses, dateRange]);

  // Aggregated Analytics
  const totalRevenue = useMemo(
    () => filteredSales.filter((s) => s.status !== "VOIDED").reduce((sum, s) => sum + s.totalAmount, 0),
    [filteredSales]
  );
  const totalGrossProfit = useMemo(
    () => filteredSales.filter((s) => s.status !== "VOIDED").reduce((sum, s) => sum + s.grossProfit, 0),
    [filteredSales]
  );
  const totalExpensesAmt = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [filteredExpenses]
  );
  const netEstimatedProfit = totalGrossProfit - totalExpensesAmt;

  const validSalesCount = filteredSales.filter((s) => s.status !== "VOIDED").length;
  const avgOrderValue = validSalesCount > 0 ? Math.round(totalRevenue / validSalesCount) : 0;
  const profitMarginPercent = totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 100) : 0;

  // Chart Data: 7-day Sales Trend
  const trendBars = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toDateString();
      const daySales = sales
        .filter((s) => s.status !== "VOIDED" && new Date(s.saleDate).toDateString() === dStr)
        .reduce((sum, s) => sum + s.totalAmount, 0);

      days.push({
        label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
        value: daySales,
      });
    }
    return days;
  }, [sales]);

  // Donut Chart: Expense Breakdown by Category
  const expenseDonutSlices = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });

    const colors = ["#C9A227", "#3B82F6", "#10B981", "#EF4444", "#8B5CF6", "#F59E0B"];
    return Object.entries(map).map(([label, value], i) => ({
      label,
      value,
      color: colors[i % colors.length],
    }));
  }, [filteredExpenses]);

  // Inventory Metrics
  const totalStockUnits = useMemo(
    () => products.reduce((sum, p) => sum + (p.remainingStock || 0), 0),
    [products]
  );
  const totalStockCostValuation = useMemo(
    () => products.reduce((sum, p) => sum + (p.remainingStock || 0) * (p.defaultCostPriceNum || 0), 0),
    [products]
  );
  const totalStockPotentialRetail = useMemo(
    () => products.reduce((sum, p) => sum + (p.remainingStock || 0) * (p.sellingPriceNum || 0), 0),
    [products]
  );

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header & Print Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Executive Financial & Sales Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Period turnover, FIFO profitability, overhead ratio & stock valuation
          </p>
        </div>

        <Button
          onClick={() => window.print()}
          variant="outline"
          size="md"
          className="gap-2 font-bold self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Export PDF</span>
        </Button>
      </div>

      {/* Date Range Selector Bar */}
      <Card className="p-3">
        <DateRangeBar
          value={dateRange}
          onChange={setDateRange}
          startDate={customStart}
          endDate={customEnd}
          onCustomDateChange={(start: string, end: string) => {
            setCustomStart(start);
            setCustomEnd(end);
          }}
        />
      </Card>

      {/* Period Executive Financial Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Turnover (Revenue)
          </span>
          <div className="text-2xl font-black text-foreground mt-1">
            <Money amount={totalRevenue} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {validSalesCount} completed orders
          </div>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Gross Profit
          </span>
          <div className="text-2xl font-black text-primary mt-1">
            <Money amount={totalGrossProfit} />
          </div>
          <div className="text-[11px] text-primary font-bold mt-0.5">
            {profitMarginPercent}% gross margin
          </div>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Operating Expenses
          </span>
          <div className="text-2xl font-black text-destructive mt-1">
            <Money amount={totalExpensesAmt} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {filteredExpenses.length} expense vouchers
          </div>
        </Card>

        <Card className="p-4 bg-primary/5 border-primary/30">
          <span className="text-[11px] font-bold text-primary uppercase">
            Net Realized Profit
          </span>
          <div className="text-2xl font-black text-foreground mt-1">
            <Money amount={netEstimatedProfit} />
          </div>
          <div className="text-[11px] text-success font-semibold mt-0.5">
            Gross profit minus overhead
          </div>
        </Card>
      </div>

      {/* Charts Section: 7-Day Trend + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 7-Day Revenue Trend */}
        <Card className="lg:col-span-7 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-bold text-foreground">7-Day Sales Trend</h3>
              <p className="text-xs text-muted-foreground">Daily turnover pattern</p>
            </div>
            <Badge variant="gold">Last 7 Days</Badge>
          </div>

          <div className="py-2">
            <TrendBarChart data={trendBars} height={160} />
          </div>
        </Card>

        {/* Right: Expense Breakdown Donut */}
        <Card className="lg:col-span-5 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-bold text-foreground">Expense Distribution</h3>
              <p className="text-xs text-muted-foreground">Category share</p>
            </div>
            <Badge variant="outline">
              <Money amount={totalExpensesAmt} />
            </Badge>
          </div>

          {expenseDonutSlices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold">No expenses recorded for this period</p>
            </div>
          ) : (
            <div className="py-2">
              <DonutChart data={expenseDonutSlices} size={160} />
            </div>
          )}
        </Card>
      </div>

      {/* Inventory Health & Valuation Table */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">Asset Valuation & Stock Health</h3>
            <p className="text-xs text-muted-foreground">
              {totalStockUnits} bottles across {products.length} perfume lines
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/30 border border-border">
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Total Physical Units</div>
            <div className="text-xl font-black text-foreground mt-0.5 tabular-nums">
              {totalStockUnits} bottles
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Cost Valuation</div>
            <div className="text-xl font-black text-primary mt-0.5">
              <Money amount={totalStockCostValuation} />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold">Potential Retail Value</div>
            <div className="text-xl font-black text-success mt-0.5">
              <Money amount={totalStockPotentialRetail} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
