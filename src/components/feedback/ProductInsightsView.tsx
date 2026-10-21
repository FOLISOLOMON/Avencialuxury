"use client";

import React, { useState } from "react";
import {
  MetricCard,
  StatGrid,
  SearchField,
  Select,
  Badge,
} from "@/components/ui";
import { MetricCardSkeleton, CardSkeleton } from "@/components/ui/LoadingSkeleton";
import {
  BusinessFeedbackInsights,
  ProductFeedbackStats,
  FEEDBACK_CATEGORIES,
} from "@/lib/calculations/feedback";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Star,
  MessageSquare,
  Clock,
  Sparkles,
  Search,
  Info,
} from "lucide-react";

interface ProductInsightsViewProps {
  insights: BusinessFeedbackInsights | null;
  loading: boolean;
  onSelectFeedbackForDetail?: (feedbackId: string) => void;
}

export function ProductInsightsView({
  insights,
  loading,
  onSelectFeedbackForDetail,
}: ProductInsightsViewProps) {
  const [productSearch, setProductSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<"ALL" | "CONCERNS_ONLY">("ALL");

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="p-8 bg-card rounded-lg border border-border text-center text-muted-foreground text-xs">
        No product insights available.
      </div>
    );
  }

  const filteredProducts = insights.productInsights.filter((p) => {
    const matchesSearch = p.productName.toLowerCase().includes(productSearch.toLowerCase());
    if (filterSeverity === "CONCERNS_ONLY") {
      return matchesSearch && (p.concernCount > 0 || p.recurringConcerns.length > 0);
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Overview Stat Cards */}
      <StatGrid columns={4}>
        <MetricCard
          label="Total Feedback"
          value={insights.totalFeedbackCount.toString()}
          description="Customer interactions logged"
          icon={MessageSquare}
        />
        <MetricCard
          label="Positive Praise"
          value={insights.positiveCount.toString()}
          description={`${
            insights.totalFeedbackCount > 0
              ? Math.round((insights.positiveCount / insights.totalFeedbackCount) * 100)
              : 0
          }% satisfaction`}
          icon={CheckCircle2}
          variant="emerald"
        />
        <MetricCard
          label="Customer Concerns"
          value={insights.concernCount.toString()}
          description={`${insights.followUpNeededCount} follow-ups pending`}
          icon={AlertTriangle}
          variant={insights.concernCount > 0 ? "rose" : "default"}
        />
        <MetricCard
          label="Average Rating"
          value={insights.averageRating !== null ? `${insights.averageRating} / 5` : "N/A"}
          description="Based on rated entries"
          icon={Star}
          variant="amber"
        />
      </StatGrid>

      {/* Flagged Recurring Concerns / Customer-Reported Patterns */}
      {insights.flaggedPatterns.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-foreground tracking-tight">
                Customer-Reported Product Patterns ({insights.flaggedPatterns.length})
              </h3>
              <p className="text-[11px] text-muted-foreground leading-normal">
                These patterns summarize recurring customer reports (2 or more customers mentioning the same product characteristic).
                They reflect customer perceptions to assist in inventory selection and supplier inquiries, not proven manufacturing defects.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {insights.flaggedPatterns.map((pat, idx) => (
              <div
                key={`${pat.productId}-${pat.category}-${idx}`}
                className="p-2.5 rounded-md bg-card/80 border border-amber-500/20 text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span className="truncate">{pat.productName}</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] flex-shrink-0">
                    {pat.count} reports
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {pat.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search for Products */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-card rounded-lg border border-border">
        <div className="w-full sm:w-64">
          <SearchField
            value={productSearch}
            onChange={setProductSearch}
            placeholder="Filter by perfume name..."
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterSeverity("ALL")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              filterSeverity === "ALL"
                ? "bg-primary text-primary-foreground font-semibold border-primary"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            All Products ({insights.productInsights.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity("CONCERNS_ONLY")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              filterSeverity === "CONCERNS_ONLY"
                ? "bg-destructive text-destructive-foreground font-semibold border-destructive"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            With Reported Concerns
          </button>
        </div>
      </div>

      {/* Products List Breakdown */}
      {filteredProducts.length === 0 ? (
        <div className="p-8 bg-card rounded-lg border border-border text-center text-xs text-muted-foreground">
          No perfumes match the selected filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((p) => {
            const hasFeedback = p.totalFeedbackCount > 0;
            const positivePercent =
              hasFeedback ? Math.round((p.positiveCount / p.totalFeedbackCount) * 100) : 0;
            const concernPercent =
              hasFeedback ? Math.round((p.concernCount / p.totalFeedbackCount) * 100) : 0;

            return (
              <div
                key={p.productId}
                className="p-4 bg-card rounded-lg border border-border space-y-3"
              >
                {/* Product Header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      {p.productName}
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      {p.totalFeedbackCount} recorded feedback {p.totalFeedbackCount === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  {/* Rating & Counts */}
                  <div className="flex items-center gap-3">
                    {p.averageRating !== null && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{p.averageRating} / 5</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-500 font-semibold">
                        {p.positiveCount} praise
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className={`${p.concernCount > 0 ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>
                        {p.concernCount} {p.concernCount === 1 ? "concern" : "concerns"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sentiment Ratio Bar */}
                {hasFeedback && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${positivePercent}%` }}
                        className="bg-emerald-500 h-full transition-all"
                        title={`Praise: ${positivePercent}%`}
                      />
                      <div
                        style={{ width: `${100 - positivePercent - concernPercent}%` }}
                        className="bg-muted-foreground/30 h-full transition-all"
                        title="Neutral / General"
                      />
                      <div
                        style={{ width: `${concernPercent}%` }}
                        className="bg-rose-500 h-full transition-all"
                        title={`Concerns: ${concernPercent}%`}
                      />
                    </div>
                  </div>
                )}

                {/* Top Categories for this product */}
                {p.topCategories.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground mr-1">
                      Top Topics:
                    </span>
                    {p.topCategories.map((c) => (
                      <span
                        key={c.category}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-foreground/80 border border-border"
                      >
                        {c.label} ({c.count})
                      </span>
                    ))}
                  </div>
                )}

                {/* Recurring Concerns Specific to Product */}
                {p.recurringConcerns.length > 0 && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 space-y-1.5 text-xs">
                    <div className="font-semibold text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Recurring Customer-Reported Patterns:</span>
                    </div>
                    {p.recurringConcerns.map((rc, idx) => (
                      <div key={idx} className="space-y-0.5 pl-5">
                        <p className="text-destructive font-medium">
                          • {rc.patternDescription}
                        </p>
                        {rc.recentComments.length > 0 && (
                          <div className="text-[11px] text-muted-foreground italic pl-2 border-l border-destructive/30">
                            &ldquo;{rc.recentComments[rc.recentComments.length - 1]}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent Feedback Snippets */}
                {p.recentFeedbacks.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-border/50">
                    <span className="text-[11px] font-semibold text-muted-foreground block">
                      Recent Customer Statements:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {p.recentFeedbacks.slice(0, 2).map((rf) => (
                        <div
                          key={rf.id}
                          className="p-2 rounded bg-secondary/30 border border-border/40 text-xs text-foreground/80 leading-snug"
                        >
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{new Date(rf.feedbackDate).toLocaleDateString()}</span>
                            {rf.rating && (
                              <span className="text-amber-500 font-semibold">{rf.rating}★</span>
                            )}
                          </div>
                          <p className="line-clamp-2">&ldquo;{rf.comments}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
