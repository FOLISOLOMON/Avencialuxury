"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Plus,
  Minus,
  CheckCircle2,
  UserPlus,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle,
  Clock,
  Sparkles,
  Barcode,
  ArrowLeft,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { useMobileProducts, useMobileCustomers } from "@/lib/mobile/hooks";
import { MobileProduct, MobileCustomer } from "@/lib/mobile/types";
import { InlineCustomerModal } from "@/components/mobile/InlineCustomerModal";
import { addPendingSale, putCachedCustomer } from "@/lib/mobile/db";
import { syncManager } from "@/lib/mobile/sync";

interface CartItem {
  product: MobileProduct;
  quantity: number;
  unitPrice: number;
}

function MobileSellContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const { products, loading: productsLoading } = useMobileProducts();
  const { customers, loading: customersLoading } = useMobileCustomers();

  // Search queries
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  // Sale states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<MobileCustomer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [paymentType, setPaymentType] = useState<"FULL" | "PARTIAL" | "CREDIT">("FULL");
  const [amountPaidCustom, setAmountPaidCustom] = useState<string>("");
  const [saleNotes, setSaleNotes] = useState<string>("");

  // Modals & UI states
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saleSuccessData, setSaleSuccessData] = useState<{
    total: number;
    receipt?: string;
    isOffline: boolean;
  } | null>(null);

  // If URL has preselected product (?productId=xyz)
  useEffect(() => {
    const preselectedId = searchParams.get("productId");
    if (preselectedId && products.length > 0) {
      const match = products.find((p) => p.id === preselectedId);
      if (match) {
        setCart([{ product: match, quantity: 1, unitPrice: match.sellingPrice }]);
      }
    }
  }, [searchParams, products]);

  // Filtered products list for instant search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const query = productSearch.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.brand && p.brand.toLowerCase().includes(query)) ||
          (p.barcode && p.barcode.toLowerCase().includes(query)) ||
          (p.genderCategory && p.genderCategory.toLowerCase().includes(query))
      )
      .slice(0, 8); // Top 8 fast results
  }, [products, productSearch]);

  // Filtered customers list
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5);
    const query = customerSearch.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.phone && c.phone.includes(query))
      )
      .slice(0, 6);
  }, [customers, customerSearch]);

  // Cart operations
  const addToCart = (product: MobileProduct) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { product, quantity: 1, unitPrice: product.sellingPrice }]);
    }
    setProductSearch("");
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateUnitPrice = (productId: string, newPrice: number) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, unitPrice: Math.max(0, newPrice) } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Calculations
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const finalAmountPaid = useMemo(() => {
    if (paymentType === "FULL") return totalAmount;
    if (paymentType === "CREDIT") return 0;
    const parsed = parseFloat(amountPaidCustom);
    return isNaN(parsed) ? 0 : Math.min(totalAmount, Math.max(0, parsed));
  }, [paymentType, totalAmount, amountPaidCustom]);

  const debtRemaining = Math.max(0, totalAmount - finalAmountPaid);

  // Submit sale handler (Online + Offline fallback)
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.error("Select at least one perfume to sell", "Cart empty");
      return;
    }

    if ((paymentType === "CREDIT" || (paymentType === "PARTIAL" && debtRemaining > 0)) && !selectedCustomer) {
      toast.error("Partial or credit payment requires selecting or adding a customer to record debt", "Customer required");
      return;
    }

    setSubmitting(true);
    const offlineId = "sale_off_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    const saleItemsPayload = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    try {
      if (navigator.onLine) {
        // ONLINE: Post to shared backend
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: selectedCustomer?.id || undefined,
            items: saleItemsPayload,
            paymentMethod,
            amountPaid: finalAmountPaid,
            notes: saleNotes.trim() || undefined,
            saleDate: new Date().toISOString(),
          }),
        });

        const json = await res.json();
        if (json.success && json.data) {
          // Immediately update customer cache with new debt & spend
          if (selectedCustomer) {
            await putCachedCustomer({
              ...selectedCustomer,
              totalDebt: (selectedCustomer.totalDebt || 0) + debtRemaining,
              totalSpent: (selectedCustomer.totalSpent || 0) + totalAmount,
              lastPurchaseDate: new Date().toISOString(),
            });
          }

          setSaleSuccessData({
            total: totalAmount,
            receipt: json.data.receiptNumber || json.data.id?.substring(0, 8),
            isOffline: false,
          });

          // Trigger background sync to refresh caches
          syncManager.refreshCacheFromServer();
          return;
        } else {
          throw new Error(json.error || "Server rejected sale");
        }
      } else {
        // OFFLINE: Queue into IndexedDB
        await addPendingSale({
          offlineId,
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name,
          items: cart.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          totalAmount,
          amountPaid: finalAmountPaid,
          paymentMethod,
          paymentStatus: finalAmountPaid >= totalAmount ? "PAID" : finalAmountPaid > 0 ? "PARTIAL" : "CREDIT",
          notes: saleNotes.trim() || undefined,
          saleDate: new Date().toISOString(),
        });

        if (selectedCustomer) {
          await putCachedCustomer({
            ...selectedCustomer,
            totalDebt: (selectedCustomer.totalDebt || 0) + debtRemaining,
            totalSpent: (selectedCustomer.totalSpent || 0) + totalAmount,
            lastPurchaseDate: new Date().toISOString(),
          });
        }

        setSaleSuccessData({
          total: totalAmount,
          isOffline: true,
        });

        toast.warning("Queued on your phone. Will sync automatically when connected.", "Sale Saved Offline");
      }
    } catch (err: any) {
      console.warn("Online sale failed, falling back to offline queue:", err);

      // Fallback to offline store
      await addPendingSale({
        offlineId,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        totalAmount,
        amountPaid: finalAmountPaid,
        paymentMethod,
        paymentStatus: finalAmountPaid >= totalAmount ? "PAID" : finalAmountPaid > 0 ? "PARTIAL" : "CREDIT",
        notes: saleNotes.trim() || undefined,
        saleDate: new Date().toISOString(),
      });

      if (selectedCustomer) {
        await putCachedCustomer({
          ...selectedCustomer,
          totalDebt: (selectedCustomer.totalDebt || 0) + debtRemaining,
          totalSpent: (selectedCustomer.totalSpent || 0) + totalAmount,
          lastPurchaseDate: new Date().toISOString(),
        });
      }

      setSaleSuccessData({
        total: totalAmount,
        isOffline: true,
      });

      toast.warning("Network issue. Sale stored locally and queued for auto-sync.", "Saved Locally");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNextSale = () => {
    setCart([]);
    setSelectedCustomer(null);
    setPaymentMethod("CASH");
    setPaymentType("FULL");
    setAmountPaidCustom("");
    setSaleNotes("");
    setSaleSuccessData(null);
    setProductSearch("");
  };

  // SUCCESS SCREEN
  if (saleSuccessData) {
    return (
      <div className="space-y-6 pt-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Sale Completed!</h2>
          <p className="text-xs text-muted-foreground">
            {saleSuccessData.isOffline
              ? "Saved to phone storage • Will sync automatically"
              : `Recorded on Avencia Server • Receipt #${saleSuccessData.receipt || "Done"}`}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border max-w-xs mx-auto space-y-2 text-left">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total Amount:</span>
            <span className="font-bold text-foreground">GH₵{saleSuccessData.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Customer:</span>
            <span className="font-medium text-foreground">{selectedCustomer?.name || "Walk-in"}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Payment:</span>
            <span className="font-medium text-foreground">
              {paymentType === "FULL" ? "Fully Paid" : paymentType === "CREDIT" ? "Credit / Unpaid" : `Partial (GH₵${finalAmountPaid.toFixed(2)})`}
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-2 max-w-xs mx-auto">
          <Button
            onClick={handleResetForNextSale}
            className="w-full h-12 bg-primary text-primary-foreground font-bold text-sm rounded-xl active:scale-95 transition-transform"
          >
            + Start Next Sale
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/mobile/sales")}
            className="w-full h-11 text-xs"
          >
            View Sales History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* 1. Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/mobile"
            className="p-1.5 -ml-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
            aria-label="Back to store"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">New Sale</h1>
            <p className="text-xs text-muted-foreground">Fast field checkout</p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={() => setCart([])}
            className="text-xs font-semibold text-muted-foreground hover:text-destructive active:scale-95 px-2 py-1 rounded-lg"
          >
            Clear cart
          </button>
        )}
      </div>

      {/* 2. PRODUCT SEARCH & SELECTION */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search perfume name, brand..."
            className="pl-9 pr-8 text-sm h-11 rounded-xl bg-card border-border"
          />
          {productSearch && (
            <button
              onClick={() => setProductSearch("")}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {filteredProducts.length > 0 && (
          <div className="p-1 rounded-xl bg-card border border-border shadow-xl space-y-1 max-h-60 overflow-y-auto z-20">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className="w-full p-2.5 rounded-lg hover:bg-muted text-left flex items-center justify-between active:scale-[0.99] transition-all"
              >
                <div>
                  <p className="text-xs font-bold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.volumeMl ? `${p.volumeMl}ml • ` : ""}
                    {p.genderCategory || "Fragrance"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary">GH₵{p.sellingPrice.toFixed(2)}</p>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      p.stockLevel <= 0
                        ? "bg-red-500/10 text-red-400"
                        : p.stockLevel <= (p.lowStockAlert || 5)
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {p.stockLevel <= 0 ? "Out of stock" : `${p.stockLevel} in stock`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. CART ITEMS LIST */}
      {cart.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Selected Perfume ({cart.length})
          </p>

          <div className="space-y-2">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="p-3 rounded-xl bg-card border border-border flex items-center justify-between"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-bold text-foreground truncate">{item.product.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">Price:</span>
                    <input
                      type="number"
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) => updateUnitPrice(item.product.id, parseFloat(e.target.value) || 0)}
                      className="w-20 px-1 py-0.5 text-xs font-semibold bg-muted/50 rounded border border-border text-foreground"
                    />
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground active:scale-90"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-xs font-black w-4 text-center">{item.quantity}</span>

                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center active:scale-90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="w-6 h-6 ml-1 text-muted-foreground hover:text-destructive flex items-center justify-center"
                    aria-label="Remove item"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
          Type perfume name above to add to this sale
        </div>
      )}

      {/* 4. CUSTOMER SELECTION & INLINE CREATION */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer</p>
          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Add New Customer
          </button>
        </div>

        {selectedCustomer ? (
          <div className="p-3 rounded-xl bg-card border border-primary/30 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">{selectedCustomer.name}</p>
              <p className="text-[11px] text-muted-foreground">{selectedCustomer.phone || "No phone"}</p>
              {selectedCustomer.totalDebt && selectedCustomer.totalDebt > 0 ? (
                <p className="text-[10px] text-destructive font-semibold mt-0.5">
                  Owes GH₵{selectedCustomer.totalDebt.toFixed(2)}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded hover:bg-muted"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <Input
              value={customerSearch}
              onFocus={() => setCustomerDropdownOpen(true)}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setCustomerDropdownOpen(true);
              }}
              placeholder="Search customer or select below..."
              className="text-xs h-10 rounded-xl bg-card"
            />

            {customerDropdownOpen && (
              <div className="mt-1 p-1 rounded-xl bg-card border border-border shadow-xl space-y-1 max-h-48 overflow-y-auto z-20">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerDropdownOpen(false);
                    setCustomerSearch("");
                  }}
                  className="w-full p-2 rounded-lg hover:bg-muted text-left text-xs text-muted-foreground font-medium"
                >
                  Walk-in (Anonymous)
                </button>

                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCustomerDropdownOpen(false);
                      setCustomerSearch("");
                    }}
                    className="w-full p-2 rounded-lg hover:bg-muted text-left flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-foreground">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.phone || "No phone"}</p>
                    </div>
                    {c.totalDebt && c.totalDebt > 0 ? (
                      <span className="text-[10px] font-bold text-destructive">
                        Debt: GH₵{c.totalDebt.toFixed(2)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. PAYMENT METHOD & STATUS */}
      <div className="space-y-2 pt-1">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Status</p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setPaymentType("FULL")}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all active:scale-95 ${
              paymentType === "FULL"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground"
            }`}
          >
            Fully Paid
          </button>

          <button
            type="button"
            onClick={() => setPaymentType("PARTIAL")}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all active:scale-95 ${
              paymentType === "PARTIAL"
                ? "bg-amber-500 text-zinc-950 border-amber-500"
                : "bg-card border-border text-muted-foreground"
            }`}
          >
            Partial Pay
          </button>

          <button
            type="button"
            onClick={() => setPaymentType("CREDIT")}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all active:scale-95 ${
              paymentType === "CREDIT"
                ? "bg-destructive text-destructive-foreground border-destructive"
                : "bg-card border-border text-muted-foreground"
            }`}
          >
            Credit / Debt
          </button>
        </div>

        {/* If Partial Payment: Enter Amount Paid */}
        {paymentType === "PARTIAL" && (
          <div className="p-3 rounded-xl bg-card border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Amount Paid Now:</span>
              <span className="text-muted-foreground font-semibold">Total: GH₵{totalAmount.toFixed(2)}</span>
            </div>
            <Input
              type="number"
              value={amountPaidCustom}
              onChange={(e) => setAmountPaidCustom(e.target.value)}
              placeholder="e.g. 100"
              className="text-sm font-bold"
            />
            {debtRemaining > 0 && (
              <p className="text-xs text-destructive font-medium">
                Customer debt balance will be: GH₵{debtRemaining.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Payment Channels (Cash, MoMo, Bank) */}
        {paymentType !== "CREDIT" && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPaymentMethod("CASH")}
              className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                paymentMethod === "CASH"
                  ? "bg-muted text-foreground border-primary"
                  : "bg-card/50 text-muted-foreground border-border"
              }`}
            >
              <Banknote className="w-3.5 h-3.5" /> Cash
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("MOMO")}
              className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                paymentMethod === "MOMO"
                  ? "bg-muted text-foreground border-primary"
                  : "bg-card/50 text-muted-foreground border-border"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> MoMo
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("BANK")}
              className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                paymentMethod === "BANK"
                  ? "bg-muted text-foreground border-primary"
                  : "bg-card/50 text-muted-foreground border-border"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Bank/POS
            </button>
          </div>
        )}
      </div>

      {/* FIXED BOTTOM ACTION: COMPLETE SALE */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-card/95 backdrop-blur-xl border-t border-border z-40 max-w-md mx-auto pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
        <Button
          onClick={handleCompleteSale}
          disabled={cart.length === 0 || submitting}
          className="w-full h-13 text-base font-black bg-primary text-primary-foreground shadow-lg shadow-primary/25 rounded-2xl flex items-center justify-between px-5 active:scale-[0.98] transition-all hover:brightness-105"
        >
          <span className="tracking-wide uppercase font-black">{submitting ? "RECORDING..." : "COMPLETE SALE"}</span>
          <span className="text-lg font-black tracking-tight">GH₵{totalAmount.toFixed(2)}</span>
        </Button>
      </div>

      {/* Modal: Inline Add Customer */}
      <InlineCustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onCustomerCreated={(newCust) => {
          setSelectedCustomer(newCust);
        }}
      />
    </div>
  );
}

export default function MobileSellPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading checkout...</div>}>
      <MobileSellContent />
    </React.Suspense>
  );
}
