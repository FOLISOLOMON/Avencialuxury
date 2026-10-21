"use client";

import React, { useState } from "react";
import {
  SearchField,
  Select,
  Button,
  Badge,
  EmptyState,
} from "@/components/ui";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import {
  FEEDBACK_SOURCES,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  FeedbackCategoryType,
  FeedbackSourceType,
  FeedbackStatusType,
  RawFeedbackItem,
} from "@/lib/calculations/feedback";
import {
  MessageSquare,
  Star,
  Calendar,
  User,
  Package,
  Phone,
  Filter,
  RotateCcw,
  Plus,
} from "lucide-react";

interface FeedbackHistoryListProps {
  feedbacks: RawFeedbackItem[];
  loading: boolean;
  onSelectFeedback: (feedback: RawFeedbackItem) => void;
  onOpenRecord: () => void;
  products: Array<{ id: string; name: string }>;
  search: string;
  onSearchChange: (val: string) => void;
  category: string;
  onCategoryChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  source: string;
  onSourceChange: (val: string) => void;
  selectedProductId: string;
  onProductChange: (val: string) => void;
  onResetFilters: () => void;
}

export function FeedbackHistoryList({
  feedbacks,
  loading,
  onSelectFeedback,
  onOpenRecord,
  products,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  source,
  onSourceChange,
  selectedProductId,
  onProductChange,
  onResetFilters,
}: FeedbackHistoryListProps) {
  const hasActiveFilters =
    Boolean(search) ||
    Boolean(category) ||
    Boolean(status) ||
    Boolean(source) ||
    Boolean(selectedProductId);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="p-3 bg-card rounded-lg border border-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <SearchField
              value={search}
              onChange={onSearchChange}
              placeholder="Search comments, customer, perfume..."
            />
          </div>

          {/* Product Filter */}
          <div>
            <Select
              value={selectedProductId}
              onChange={(e) => onProductChange(e.target.value)}
            >
              <option value="">All Perfumes</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Category Filter */}
          <div>
            <Select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">All Categories</option>
              {Object.entries(FEEDBACK_CATEGORIES).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="">All Follow-up Statuses</option>
              {Object.entries(FEEDBACK_STATUSES).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Second Filter Row: Source & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Source:
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => onSourceChange("")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  !source
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {Object.entries(FEEDBACK_SOURCES).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSourceChange(source === key ? "" : key)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    source === key
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 underline"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Empty State */}
      {!loading && feedbacks.length === 0 && (
        <div className="p-8 bg-card rounded-lg border border-border text-center">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3 text-muted-foreground">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {hasActiveFilters ? "No matching feedback found" : "No feedback recorded yet"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            {hasActiveFilters
              ? "Try adjusting your search query, product, or category filters."
              : "Record feedback received from customer phone calls, WhatsApp messages, and in-person visits to track sentiment and follow-ups."}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={onResetFilters}>
              Clear Filters
            </Button>
          ) : (
            <Button size="sm" onClick={onOpenRecord}>
              <Plus className="w-4 h-4 mr-1.5" />
              Record First Feedback
            </Button>
          )}
        </div>
      )}

      {/* Feedback List Items */}
      {!loading && feedbacks.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <strong className="text-foreground">{feedbacks.length}</strong> feedback {feedbacks.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {feedbacks.map((f) => {
              const statusMeta = FEEDBACK_STATUSES[f.status] || {
                label: f.status,
                color: "text-muted-foreground bg-muted border-border",
              };
              const categoryMeta = FEEDBACK_CATEGORIES[f.category] || { label: f.category };
              const sourceMeta = FEEDBACK_SOURCES[f.source] || { label: f.source };

              return (
                <div
                  key={f.id}
                  onClick={() => onSelectFeedback(f)}
                  className="p-3.5 bg-card hover:bg-secondary/40 border border-border hover:border-primary/40 rounded-lg cursor-pointer transition-all duration-150 space-y-2 select-none"
                >
                  {/* Row 1: Header (Customer, Product, Status, Rating) */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      {/* Customer Name */}
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{f.customerName || "Anonymous / Walk-in"}</span>
                      </span>

                      {/* Perfume / Product */}
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-xs font-medium text-foreground/90 flex items-center gap-1 truncate">
                        <Package className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{f.productName || "General Feedback"}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                      {/* Rating */}
                      {f.rating !== null && f.rating !== undefined && (
                        <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{f.rating}/5</span>
                        </div>
                      )}

                      {/* Follow-up Status Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Customer Comments Preview */}
                  <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed">
                    &ldquo;{f.comments}&rdquo;
                  </p>

                  {/* Row 3: Meta details (Category, Source, Date, Creator) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/60">
                        {categoryMeta.label}
                      </span>
                      <span>via {sourceMeta.label}</span>
                      {f.saleId && (
                        <span className="text-primary font-medium">Linked to Sale</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span>{new Date(f.feedbackDate).toLocaleDateString()}</span>
                      {f.createdByName && (
                        <span className="hidden sm:inline text-muted-foreground/80">
                          by {f.createdByName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
