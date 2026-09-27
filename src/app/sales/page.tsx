"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { voidSaleAction } from "@/lib/actions/sale-actions";
import { ReceiptModal } from "@/components/sales/ReceiptModal";
import {
  ShoppingBag,
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Trash2,
  CreditCard,
  User,
  Eye,
  Calendar,
  RotateCcw,
  Share2,
  Barcode,
  ScanLine,
  Camera,
} from "lucide-react";
import dynamic from "next/dynamic";

const CameraScanner = dynamic(() => import("@/components/scanner/CameraScanner"), { ssr: false });


interface Product {
  id: string;
  name: string;
  barcode?: string | null;
  sku?: string | null;
  sellingPriceNum: number;
  remainingStock: number;
}

interface Customer {
  id: string;
  name: string;
}

interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  revenue: number;
  cost: number;
  profit: number;
  product: { name: string; sku: string | null };
  batch: { reference: string };
}

interface Sale {
  id: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  totalCost: number;
  grossProfit: number;
  paymentMethod: string;
  status: string;
  notes: string | null;
  customerId?: string | null;
  customer: { id?: string; name: string } | null;
  saleItems: SaleItem[];
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal & Receipt Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  // Record Debt Payment Modal for specific sale
  const [paymentSale, setPaymentSale] = useState<Sale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethodSelect, setPaymentMethodSelect] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Void Sale Modal
  const [voidingSale, setVoidingSale] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState("Customer return");
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  // Rapid Sale Entry Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);


  // Form Fields
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState("0");
  const [isPartialCredit, setIsPartialCredit] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{ productId: string; quantity: string; unitPrice: string }>>([
    { productId: "", quantity: "1", unitPrice: "0" },
  ]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, prodRes, custRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/products"),
        fetch("/api/customers"),
      ]);

      const salesJson = await salesRes.json();
      const prodJson = await prodRes.json();
      const custJson = await custRes.json();

      if (salesJson.success) setSales(salesJson.data);
      else setError(salesJson.error || "Failed to load sales");

      if (prodJson.success) setProducts(prodJson.data);
      if (custJson.success) setCustomers(custJson.data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handler = () => setIsModalOpen(true);
    window.addEventListener("avencia:open-add-sale", handler);
    return () => window.removeEventListener("avencia:open-add-sale", handler);
  }, []);


  const handleScanBarcode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;
    setScanNotice(null);

    // Look up in local products array first
    let matched = products.find(
      (p) =>
        p.barcode === code ||
        (p.sku && p.sku.toLowerCase() === code.toLowerCase()) ||
        p.name.toLowerCase() === code.toLowerCase()
    );

    // Fallback to API barcode lookup
    if (!matched) {
      try {
        const res = await fetch(`/api/products/barcode?code=${encodeURIComponent(code)}`);
        const json = await res.json();
        if (json.success && json.data) {
          matched = json.data;
        }
      } catch (err) {}
    }

    if (matched) {
      const existingIdx = items.findIndex((i) => i.productId === matched!.id);
      if (existingIdx >= 0) {
        const updated = [...items];
        const currentQty = parseInt(updated[existingIdx].quantity) || 0;
        updated[existingIdx].quantity = (currentQty + 1).toString();
        setItems(updated);
      } else {
        const priceStr = matched.sellingPriceNum ? matched.sellingPriceNum.toString() : "0";
        if (items.length === 1 && items[0].productId === "") {
          setItems([{ productId: matched.id, quantity: "1", unitPrice: priceStr }]);
        } else {
          setItems([...items, { productId: matched.id, quantity: "1", unitPrice: priceStr }]);
        }
      }
      setScanNotice(`Added 1x ${matched.name} to cart`);
      setScanInput("");
    } else {
      setScanNotice(`No product found matching barcode "${code}".`);
    }
  };

  const handleVoidSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingSale) return;

    setVoidSubmitting(true);
    const res = await voidSaleAction(voidingSale.id, voidReason);
    setVoidSubmitting(false);

    if (res.success) {
      setVoidingSale(null);
      setSelectedSale(null);
      fetchData();
    } else {
      alert(res.error || "Failed to void sale");
    }
  };

  const openPaymentModal = (s: Sale) => {
    setPaymentSale(s);
    const amtPaid = (s as any).amountPaid !== undefined && (s as any).amountPaid !== null ? Number((s as any).amountPaid) : Number(s.totalAmount);
    const balDue = (s as any).balanceDue !== undefined && (s as any).balanceDue !== null ? Number((s as any).balanceDue) : (s.status === "PARTIAL" ? Number(s.totalAmount) - amtPaid : 0);
    setPaymentAmount(balDue.toString());
    setPaymentMethodSelect("CASH");
    setPaymentNotes(`Debt payment for invoice #${s.id.slice(-6)}`);
    setPaymentError(null);
    setPaymentSuccess(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSale) return;

    const customerId = (paymentSale as any).customerId || paymentSale.customer?.id;
    if (!customerId) {
      setPaymentError("A customer record is required to apply payment.");
      return;
    }

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError("Payment amount must be greater than 0.");
      return;
    }

    setPaymentSubmitting(true);
    setPaymentError(null);
    try {
      const res = await fetch("/api/debt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          saleId: paymentSale.id,
          amount: amt,
          paymentMethod: paymentMethodSelect,
          notes: paymentNotes || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setPaymentSuccess(true);
        setTimeout(() => {
          setPaymentSale(null);
          setSelectedSale(null);
          setPaymentSuccess(false);
          fetchData();
        }, 800);
      } else {
        setPaymentError(json.error || "Failed to record payment.");
      }
    } catch (err: any) {
      setPaymentError(err.message || "Failed to submit payment.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleAddItemRow = () => {
    const defaultProduct = products[0]?.id || "";
    const defaultPrice = products[0]?.sellingPriceNum?.toString() || "0";
    setItems([...items, { productId: defaultProduct, quantity: "1", unitPrice: defaultPrice }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;

    if (field === "productId") {
      const p = products.find((prod) => prod.id === value);
      if (p && p.sellingPriceNum) {
        updated[index].unitPrice = p.sellingPriceNum.toString();
      }
    }
    setItems(updated);
  };

  const subtotal = items.reduce((sum, i) => {
    const qty = parseFloat(i.quantity) || 0;
    const price = parseFloat(i.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const discountAmount = parseFloat(discount) || 0;
  const totalAmountDue = Math.max(0, subtotal - discountAmount);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    const validItems = items.filter((i) => i.productId && parseInt(i.quantity) > 0);
    if (validItems.length === 0) {
      setFormError("Sale must contain at least one valid product line with quantity > 0.");
      return;
    }

    for (const line of validItems) {
      const prod = products.find((p) => p.id === line.productId);
      if (prod && parseInt(line.quantity) > prod.remainingStock) {
        setFormError(
          `Requested quantity (${line.quantity}) for "${prod.name}" exceeds available stock (${prod.remainingStock} units).`
        );
        return;
      }
    }

    const calculatedAmountPaid = isPartialCredit
      ? Math.min(totalAmountDue, Math.max(0, parseFloat(amountPaid || "0")))
      : totalAmountDue;

    const balanceDue = Math.max(0, totalAmountDue - calculatedAmountPaid);

    if (balanceDue > 0 && !customerId) {
      setFormError("A Customer must be selected when selling on credit or partial payment.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || undefined,
          paymentMethod,
          discount: discountAmount,
          amountPaid: calculatedAmountPaid,
          notes: notes || undefined,
          items: validItems.map((i) => ({
            productId: i.productId,
            quantity: parseInt(i.quantity),
            unitPrice: parseFloat(i.unitPrice),
          })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFormSuccess(true);
        setDiscount("0");
        setNotes("");
        setCustomerId("");
        setIsPartialCredit(false);
        setAmountPaid("");
        setScanNotice(null);
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(false);
          fetchData();
        }, 800);
      } else {
        setFormError(json.error || "Failed to process sale");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to submit sale to server");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter completed sales for KPI summary
  const completedSales = sales.filter((s) => s.status === "COMPLETED");
  const totalRevenue = completedSales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
  const totalGrossProfit = completedSales.reduce((acc, s) => acc + Number(s.grossProfit), 0);
  const totalSalesCount = completedSales.length;
  const avgOrderValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  const renderStatusBadge = (s: Sale) => {
    if (s.status === "VOIDED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-600 line-through">
          VOIDED
        </span>
      );
    }
    const isPartial = s.status === "PARTIAL" || (s as any).paymentStatus === "PARTIAL";
    const isUnpaid = s.status === "UNPAID" || (s as any).paymentStatus === "UNPAID";
    const due = (s as any).balanceDue !== undefined && (s as any).balanceDue !== null ? Number((s as any).balanceDue) : 0;

    if (isPartial) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
          PARTIAL (Due: {formatCurrency(due)})
        </span>
      );
    }
    if (isUnpaid) {
      const unpaidDue = due > 0 ? due : Number(s.totalAmount);
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
          UNPAID (Due: {formatCurrency(unpaidDue)})
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
        COMPLETED
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Sales & POS Terminal</h2>
          <p className="text-xs text-slate-500">
            Process rapid sales, FIFO batch deductions & live profit calculations.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setScanNotice(null);
            if (products.length > 0 && !items[0].productId) {
              setItems([{ productId: products[0].id, quantity: "1", unitPrice: products[0].sellingPriceNum.toString() }]);
            }
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all touch-manipulation"
        >
          <Plus className="w-4 h-4 text-amber-400" /> Rapid Sale Entry
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Revenue</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalRevenue)}</div>
          <p className="text-[11px] text-slate-500">Gross sales collected</p>
        </div>

        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Gross Profit</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalGrossProfit)}</div>
          <p className="text-[11px] text-slate-500">Revenue minus FIFO product cost</p>
        </div>

        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Orders</span>
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalSalesCount}</div>
          <p className="text-[11px] text-slate-500">Completed transactions</p>
        </div>

        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-5 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Avg Order Value</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(avgOrderValue)}</div>
          <p className="text-[11px] text-slate-500">Average spend per receipt</p>
        </div>
      </div>

      {/* Sales History Table */}
      <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-6 bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-slate-900" />
            Sales History Log
          </h3>
          <span className="text-xs font-bold text-slate-500">{sales.length} Invoices</span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading sales history...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Sales Recorded Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click 'Rapid Sale Entry' to process your first perfume sale.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 pb-2">
                    <th className="font-semibold pb-2">Date & Time</th>
                    <th className="font-semibold pb-2">Invoice Ref</th>
                    <th className="font-semibold pb-2">Status</th>
                    <th className="font-semibold pb-2">Customer</th>
                    <th className="font-semibold pb-2">Total Amount</th>
                    <th className="font-semibold pb-2">Gross Profit</th>
                    <th className="font-semibold pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="text-slate-800 hover:bg-slate-50/60">
                      <td className="py-3 text-slate-500">
                        {new Date(sale.saleDate).toLocaleString()}
                      </td>
                      <td className="py-3 font-bold text-slate-900">#{sale.id.slice(-6)}</td>
                      <td className="py-3">{renderStatusBadge(sale)}</td>
                      <td className="py-3 font-medium text-slate-700">
                        {sale.customer ? sale.customer.name : "Walk-in Client"}
                      </td>
                      <td className="py-3 font-black text-slate-900">{formatCurrency(sale.totalAmount)}</td>
                      <td className="py-3 font-extrabold text-emerald-600">
                        {formatCurrency(sale.grossProfit)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(() => {
                            const isUnsettled = sale.status === "PARTIAL" || sale.status === "UNPAID" || (sale as any).paymentStatus === "PARTIAL" || (sale as any).paymentStatus === "UNPAID" || (Number((sale as any).balanceDue) > 0);
                            return isUnsettled && sale.status !== "VOIDED" ? (
                              <button
                                onClick={() => openPaymentModal(sale)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1 hover:bg-emerald-700 shadow-sm transition-all"
                              >
                                <DollarSign className="w-3.5 h-3.5" /> Add Payment
                              </button>
                            ) : null;
                          })()}
                          <button
                            onClick={() => setSelectedSale(sale)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" /> View
                          </button>
                          <button
                            onClick={() => setReceiptSale(sale)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs inline-flex items-center gap-1 transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5 text-indigo-600" /> Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE cards - Redesigned spacious layout with clear card separation */}
            <div className="md:hidden space-y-6 mb-8">
              {sales.map((sale) => {
                const isUnsettled =
                  (sale.status === "PARTIAL" ||
                    sale.status === "UNPAID" ||
                    (sale as any).paymentStatus === "PARTIAL" ||
                    (sale as any).paymentStatus === "UNPAID" ||
                    Number((sale as any).balanceDue) > 0) &&
                  sale.status !== "VOIDED";

                return (
                  <div
                    key={sale.id}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg shadow-indigo-500/5 space-y-4"
                  >
                    {/* Card Header: Invoice Ref + Status Badge (with top space for date) */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                          #{sale.id.slice(-6)}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold pt-0.5">
                          {new Date(sale.saleDate).toLocaleDateString()}
                        </span>
                      </div>
                      {renderStatusBadge(sale)}
                    </div>

                    {/* Card Body: Amount & Client */}
                    <div className="flex items-center justify-between gap-2 py-1">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Amount</span>
                        <span className="font-black text-xl text-slate-900">{formatCurrency(sale.totalAmount)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Gross Profit</span>
                        <span className="font-extrabold text-base text-emerald-600">{formatCurrency(sale.grossProfit)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="font-semibold text-slate-800 truncate">
                        👤 {sale.customer ? sale.customer.name : "Walk-in Client"}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 uppercase px-2.5 py-0.5 rounded-full bg-white border border-slate-200">
                        {sale.paymentMethod}
                      </span>
                    </div>

                    {/* Action Buttons: Clean 2-Row Grid Structure (with bottom space under View/Receipt) */}
                    <div className="space-y-2.5 pt-2 pb-1">
                      {/* Primary Action if Unsettled / Due */}
                      {isUnsettled && (
                        <button
                          onClick={() => openPaymentModal(sale)}
                          className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-98 transition-all"
                        >
                          <DollarSign className="w-4 h-4" /> Add Payment
                        </button>
                      )}

                      {/* Secondary Actions Row */}
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-4 h-4 text-slate-500" /> View
                        </button>
                        <button
                          onClick={() => setReceiptSale(sale)}
                          className="flex-1 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Share2 className="w-4 h-4 text-indigo-600" /> Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>

      {/* WhatsApp Sales Receipt Modal */}
      <ReceiptModal
        sale={receiptSale}
        isOpen={Boolean(receiptSale)}
        onClose={() => setReceiptSale(null)}
      />

      {/* Sale Details & Void Action Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900">Invoice #{selectedSale.id.slice(-6)}</h3>
                  {renderStatusBadge(selectedSale)}
                </div>
                <p className="text-xs text-slate-500">
                  {new Date(selectedSale.saleDate).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Customer</span>
                <span className="font-bold text-slate-800">
                  {selectedSale.customer ? selectedSale.customer.name : "Walk-in Client"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Payment Method</span>
                <span className="font-bold text-slate-800">{selectedSale.paymentMethod}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2 pt-1">
              <h4 className="font-bold text-xs text-slate-700">Line Items</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedSale.saleItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{item.product.name}</span>
                      <p className="text-[10px] text-slate-400">
                        {item.quantity} units × {formatCurrency(item.unitPrice)} (Batch: {item.batch.reference})
                      </p>
                    </div>
                    <span className="font-bold text-slate-900">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary Box */}
            {(() => {
              const amtPaid = (selectedSale as any).amountPaid !== undefined && (selectedSale as any).amountPaid !== null
                ? Number((selectedSale as any).amountPaid)
                : Number(selectedSale.totalAmount);
              const balDue = (selectedSale as any).balanceDue !== undefined && (selectedSale as any).balanceDue !== null
                ? Number((selectedSale as any).balanceDue)
                : (selectedSale.status === "PARTIAL" ? Number(selectedSale.totalAmount) - amtPaid : 0);

              return (
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Total FIFO COGS:</span>
                    <span>{formatCurrency(selectedSale.totalCost)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold">
                    <span>Total Invoice Amount:</span>
                    <span>{formatCurrency(selectedSale.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Amount Paid So Far:</span>
                    <span>{formatCurrency(amtPaid)}</span>
                  </div>
                  {balDue > 0 && (
                    <div className="flex justify-between text-rose-400 font-bold">
                      <span>Balance Due:</span>
                      <span>{formatCurrency(balDue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-amber-400 font-extrabold text-xs pt-1 border-t border-slate-800">
                    <span>Gross Profit Generated:</span>
                    <span>{formatCurrency(selectedSale.grossProfit)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReceiptSale(selectedSale)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" /> WhatsApp Receipt
                </button>

                {(() => {
                  const isUnsettled = selectedSale.status === "PARTIAL" || selectedSale.status === "UNPAID" || (selectedSale as any).paymentStatus === "PARTIAL" || (selectedSale as any).paymentStatus === "UNPAID" || (Number((selectedSale as any).balanceDue) > 0);
                  return isUnsettled && selectedSale.status !== "VOIDED" ? (
                    <button
                      onClick={() => openPaymentModal(selectedSale)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Record Payment
                    </button>
                  ) : null;
                })()}
              </div>

              {selectedSale.status !== "VOIDED" && (
                <button
                  onClick={() => setVoidingSale(selectedSale)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Void / Return
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Void Sale Confirmation Modal */}
      {voidingSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-slate-900">Void / Return Sale</h3>
            </div>
            <p className="text-xs text-slate-500">
              Voiding invoice <strong className="text-slate-900">#{voidingSale.id.slice(-6)}</strong> will restore product stock back to original batches and log a RETURN inventory transaction.
            </p>

            <form onSubmit={handleVoidSale} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Reason for Return / Void</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Customer brought back item, wrong order"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidingSale(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={voidSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50"
                >
                  {voidSubmitting ? "Voiding..." : "Confirm Void"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rapid Sale Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Rapid Sale Entry</h3>
                <p className="text-xs text-slate-500">Record customer purchase & automatic FIFO stock allocation</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {scanNotice && (
              <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl text-sky-800 text-xs flex items-center gap-2">
                <ScanLine className="w-4 h-4 flex-shrink-0 text-sky-600" />
                <span>{scanNotice}</span>
              </div>
            )}

            {formError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Sale processed successfully!</span>
              </div>
            )}

            <form onSubmit={handleCreateSale} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer {isPartialCredit && <span className="text-rose-600 font-bold">* Required for Credit</span>}
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                      isPartialCredit && !customerId ? "bg-rose-50 border-rose-300" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <option value="">Walk-in Client (Guest)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="CASH">Cash</option>
                    <option value="MOBILE_MONEY">Mobile Money (MoMo)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card Payment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Payment Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsPartialCredit(false); setAmountPaid(""); }}
                    className={`py-2 px-3 rounded-full text-xs font-bold transition-all ${
                      !isPartialCredit ? "rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Full Payment (Paid)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsPartialCredit(true); setAmountPaid(""); }}
                    className={`py-2 px-3 rounded-full text-xs font-bold transition-all ${
                      isPartialCredit ? "rounded-full bg-amber-500 text-slate-900 shadow-md" : "rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Partial / Credit Sale 💳
                  </button>
                </div>
              </div>

              {/* Partial Credit Input Box */}
              {isPartialCredit && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1">Amount Paid Now (GH₵)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={totalAmountDue}
                        placeholder="0.00"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1">Remaining Balance Due</label>
                      <div className="px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-black text-rose-600 flex items-center h-[34px]">
                        {formatCurrency(Math.max(0, totalAmountDue - (parseFloat(amountPaid) || 0)))}
                      </div>
                    </div>
                  </div>
                  {!customerId && (
                    <p className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> Select a Customer above to track this debt balance.
                    </p>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3 pt-2">

                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">Sale Products *</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product Item
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, idx) => {
                    const selectedProd = products.find((p) => p.id === item.productId);

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-center"
                      >
                        <div className="col-span-5">
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                          >
                            <option value="">-- Select Product --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.remainingStock} in stock)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            min="1"
                            max={selectedProd ? selectedProd.remainingStock : undefined}
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                          />
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Unit Price"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                          />
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            disabled={items.length <= 1}
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Discount Amount (GH₵)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Live Totals Box */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Subtotal</span>
                  <span className="font-bold text-sm">{formatCurrency(subtotal)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Discount</span>
                  <span className="font-bold text-rose-400">-{formatCurrency(discountAmount)}</span>
                </div>
                <div className="text-right">
                  <span className="text-amber-400 block text-[10px] font-bold">Total Amount Due</span>
                  <span className="font-black text-base">{formatCurrency(totalAmountDue)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional sale notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Complete Sale"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Scanner Overlay */}
      {showCamera && (
        <CameraScanner
          hint="Point camera at product barcode to add it to the cart"
          onScan={(barcode: string) => {
            setShowCamera(false);
            setScanInput(barcode);
            handleScanBarcode(barcode);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Record Debt Payment Modal for specific sale */}
      {paymentSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Add Payment to Invoice</h3>
                <p className="text-xs text-slate-500">Invoice #{paymentSale.id.slice(-6)} • {paymentSale.customer?.name || "Customer"}</p>
              </div>
              <button
                onClick={() => setPaymentSale(null)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary Box */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1.5 text-xs font-sans">
              <div className="flex justify-between text-slate-600">
                <span>Total Invoice Amount:</span>
                <span className="font-bold text-slate-900">{formatCurrency(paymentSale.totalAmount)}</span>
              </div>
              {(() => {
                const amtPaid = (paymentSale as any).amountPaid !== undefined && (paymentSale as any).amountPaid !== null ? Number((paymentSale as any).amountPaid) : Number(paymentSale.totalAmount);
                const balDue = (paymentSale as any).balanceDue !== undefined && (paymentSale as any).balanceDue !== null ? Number((paymentSale as any).balanceDue) : (paymentSale.status === "PARTIAL" ? Number(paymentSale.totalAmount) - amtPaid : 0);
                return (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Amount Paid So Far:</span>
                      <span className="font-bold text-slate-800">{formatCurrency(amtPaid)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 font-bold border-t border-slate-200 pt-1">
                      <span>Remaining Balance Due:</span>
                      <span>{formatCurrency(balDue)}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {paymentError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {paymentSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Payment recorded! Invoice balance updated.</span>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (GH₵) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethodSelect}
                  onChange={(e) => setPaymentMethodSelect(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile Money (MoMo)</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card Payment</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid part balance via MoMo"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentSale(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {paymentSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Record Payment ✓"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
