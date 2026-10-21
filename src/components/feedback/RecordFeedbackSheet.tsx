"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
} from "@/components/ui";
import {
  FEEDBACK_SOURCES,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  FeedbackCategoryType,
  FeedbackSourceType,
  FeedbackStatusType,
  RawFeedbackItem,
} from "@/lib/calculations/feedback";
import { Star, AlertCircle, Check } from "lucide-react";

interface RecordFeedbackSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomerId?: string | null;
  initialProductId?: string | null;
  initialSaleId?: string | null;
  editFeedback?: RawFeedbackItem | null;
}

export function RecordFeedbackSheet({
  isOpen,
  onClose,
  onSuccess,
  initialCustomerId,
  initialProductId,
  initialSaleId,
  editFeedback,
}: RecordFeedbackSheetProps) {
  // Form options
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string | null }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; category: string | null; brand: string | null }>>([]);
  const [customerSales, setCustomerSales] = useState<Array<{ id: string; saleDate: string; totalAmount: number; products: Array<{ id: string; name: string }> }>>([]);
  const [productBatches, setProductBatches] = useState<Array<{ batchId: string; reference: string; quantityRemaining: number }>>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Form fields
  const [customerId, setCustomerId] = useState<string>(initialCustomerId || "");
  const [productId, setProductId] = useState<string>(initialProductId || "");
  const [saleId, setSaleId] = useState<string>(initialSaleId || "");
  const [batchId, setBatchId] = useState<string>("");
  const [source, setSource] = useState<FeedbackSourceType>("PHONE");
  const [category, setCategory] = useState<FeedbackCategoryType>("LONGEVITY");
  const [comments, setComments] = useState<string>("");
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackDate, setFeedbackDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [status, setStatus] = useState<FeedbackStatusType>("NEW");
  const [internalNotes, setInternalNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form state
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (editFeedback) {
        setCustomerId(editFeedback.customerId || "");
        setProductId(editFeedback.productId || "");
        setSaleId(editFeedback.saleId || "");
        setBatchId(editFeedback.batchId || "");
        setSource(editFeedback.source);
        setCategory(editFeedback.category);
        setComments(editFeedback.comments);
        setRating(editFeedback.rating || null);
        setFeedbackDate(
          new Date(editFeedback.feedbackDate).toISOString().split("T")[0]
        );
        setStatus(editFeedback.status);
        setInternalNotes(editFeedback.internalNotes || "");
      } else {
        setCustomerId(initialCustomerId || "");
        setProductId(initialProductId || "");
        setSaleId(initialSaleId || "");
        setBatchId("");
        setSource("PHONE");
        setCategory("LONGEVITY");
        setComments("");
        setRating(null);
        setFeedbackDate(new Date().toISOString().split("T")[0]);
        setStatus("NEW");
        setInternalNotes("");
      }
    }
  }, [isOpen, editFeedback, initialCustomerId, initialProductId, initialSaleId]);

  // Load form dropdown data
  useEffect(() => {
    if (!isOpen) return;

    const loadFormData = async () => {
      try {
        setLoadingOptions(true);
        const params = new URLSearchParams();
        if (customerId) params.set("customerId", customerId);
        if (productId) params.set("productId", productId);

        const res = await fetch(`/api/feedback/form-data?${params.toString()}`);
        const json = await res.json();
        if (json.success && json.data) {
          setCustomers(json.data.customers || []);
          setProducts(json.data.products || []);
          setCustomerSales(json.data.customerSales || []);
          setProductBatches(json.data.productBatches || []);
        }
      } catch (e) {
        console.error("Failed to load feedback form options:", e);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadFormData();
  }, [isOpen, customerId, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) {
      setError("Please enter the customer's actual comments or feedback.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        customerId: customerId || null,
        productId: productId || null,
        saleId: saleId || null,
        batchId: batchId || null,
        source,
        category,
        comments: comments.trim(),
        rating: rating !== null ? rating : null,
        feedbackDate: new Date(feedbackDate).toISOString(),
        status,
        internalNotes: internalNotes.trim() || null,
      };

      const url = editFeedback ? `/api/feedback/${editFeedback.id}` : "/api/feedback";
      const method = editFeedback ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save feedback");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Submit feedback error:", err);
      setError(err.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={editFeedback ? "Edit Feedback Entry" : "Record Customer Feedback"}
      description="Record feedback from customer phone calls, WhatsApp messages, or in-person visits."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pb-6">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Source & Date Received */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Feedback Source <span className="text-destructive">*</span>
            </label>
            <Select
              value={source}
              onChange={(e) => setSource(e.target.value as FeedbackSourceType)}
            >
              {Object.entries(FEEDBACK_SOURCES).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Date Received <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              value={feedbackDate}
              onChange={(e) => setFeedbackDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Category & Rating */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Feedback Category <span className="text-destructive">*</span>
            </label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategoryType)}
            >
              {Object.entries(FEEDBACK_CATEGORIES).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {FEEDBACK_CATEGORIES[category]?.description}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Rating (Optional 1–5)
            </label>
            <div className="flex items-center gap-1.5 h-10 px-3 bg-card border border-border rounded-md">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className={`p-1 transition-colors rounded hover:bg-secondary/80 ${
                    rating !== null && rating >= star
                      ? "text-amber-500"
                      : "text-muted-foreground/40 hover:text-muted-foreground"
                  }`}
                  aria-label={`Rate ${star} star`}
                >
                  <Star
                    className="w-5 h-5 fill-current"
                  />
                </button>
              ))}
              {rating !== null && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground ml-auto underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Product Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Customer (Optional)
            </label>
            <Select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setSaleId(""); // Reset linked sale on customer change
              }}
            >
              <option value="">Anonymous / Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Leave blank if customer is unidentified.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Perfume / Product (Optional)
            </label>
            <Select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setBatchId(""); // Reset batch on product change
              }}
            >
              <option value="">General / Unassigned Product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.brand ? `• ${p.brand}` : ""}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Select specific perfume to feed product insights.
            </p>
          </div>
        </div>

        {/* Optional Related Sale & Batch */}
        {(customerSales.length > 0 || productBatches.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-secondary/30 rounded-md border border-border/60">
            {customerSales.length > 0 && (
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Related Sale (Optional)
                </label>
                <Select value={saleId} onChange={(e) => setSaleId(e.target.value)}>
                  <option value="">No linked sale</option>
                  {customerSales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.saleDate).toLocaleDateString()} — GH₵{s.totalAmount.toFixed(2)} ({s.products.map(p => p.name).join(", ")})
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {productBatches.length > 0 && (
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Stock Batch (Optional)
                </label>
                <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                  <option value="">No batch linked</option>
                  {productBatches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.reference} ({b.quantityRemaining} in stock)
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Customer Comments (Preserve actual feedback) */}
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            Customer Comments <span className="text-destructive">*</span>
          </label>
          <Textarea
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Type the customer's actual words, praise, complaint, or feedback..."
            required
            className="text-xs"
          />
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Preserves the original customer statement without modification.
          </p>
        </div>

        {/* Follow-up Status */}
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            Follow-up Status
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(FEEDBACK_STATUSES) as FeedbackStatusType[]).map((st) => {
              const isSelected = status === st;
              const meta = FEEDBACK_STATUSES[st];
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`px-3 py-2 text-xs font-medium rounded-md border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{meta.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Internal Notes */}
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            Internal Business Notes (Optional)
          </label>
          <Textarea
            rows={2}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Private business observations, action items, or worker notes..."
            className="text-xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editFeedback ? "Update Feedback" : "Record Feedback"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
