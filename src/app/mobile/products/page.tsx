"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, Package, Plus, AlertTriangle, CheckCircle2, ShoppingBag, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useMobileProducts } from "@/lib/mobile/hooks";

type StockFilter = "all" | "in_stock" | "low" | "out";

export default function MobileProductsPage() {
  const { products, loading, refetch } = useMobileProducts();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 600);
  };

  const filteredProducts = useMemo(() => {
    let result = products;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.genderCategory && p.genderCategory.toLowerCase().includes(q))
      );
    }

    // Tab filter
    if (filter === "in_stock") {
      result = result.filter((p) => p.stockLevel > 0);
    } else if (filter === "low") {
      result = result.filter((p) => p.stockLevel <= (p.lowStockAlert || 5) && p.stockLevel > 0);
    } else if (filter === "out") {
      result = result.filter((p) => p.stockLevel <= 0);
    }

    return result;
  }, [products, search, filter]);

  return (
    <div className="space-y-4">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Product Lookup</h1>
          <p className="text-xs text-muted-foreground">Quickly check perfume availability & prices</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          isLoading={refreshing}
          aria-label="Refresh product stock"
        >
          Sync
        </Button>
      </div>

      {/* 2. Instant Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search perfume name, brand, barcode..."
          className="pl-9 pr-8 text-sm h-11 rounded-xl bg-card border-border"
          autoFocus
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3. Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
        >
          All ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("in_stock")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            filter === "in_stock"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
        >
          In Stock ({products.filter((p) => p.stockLevel > 0).length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("low")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            filter === "low"
              ? "bg-amber-500 text-zinc-950 font-bold"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
        >
          Low Stock ({products.filter((p) => p.stockLevel <= (p.lowStockAlert || 5) && p.stockLevel > 0).length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("out")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            filter === "out"
              ? "bg-destructive text-destructive-foreground font-bold"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
        >
          Out of Stock ({products.filter((p) => p.stockLevel <= 0).length})
        </button>
      </div>

      {/* 4. Products List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading perfume catalog...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border text-center space-y-2">
          <Package className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">No perfumes found</p>
          <p className="text-xs text-muted-foreground">
            Try a different search keyword or filter.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.stockLevel <= 0;
            const isLow = p.stockLevel <= (p.lowStockAlert || 5) && !isOutOfStock;

            return (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground truncate">{p.name}</p>
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.volumeMl ? `${p.volumeMl}ml • ` : ""}
                    {p.genderCategory || "Fragrance"}
                    {p.brand ? ` • ${p.brand}` : ""}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-black text-primary">
                      GH₵{p.sellingPrice.toFixed(2)}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOutOfStock
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : isLow
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {isOutOfStock ? "Out of Stock" : `${p.stockLevel} Available`}
                    </span>
                  </div>
                </div>

                {/* Direct Sell Button */}
                <Link
                  href={`/mobile/sell?productId=${p.id}`}
                  className={`inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-semibold shrink-0 transition-all active:scale-[0.98] ${
                    isOutOfStock
                      ? "bg-muted text-muted-foreground opacity-50 pointer-events-none"
                      : "bg-primary text-primary-foreground shadow-xs hover:brightness-105"
                  }`}
                  aria-label={`Sell ${p.name}`}
                >
                  Sell
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
