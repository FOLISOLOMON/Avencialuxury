"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  PageHeader,
  Button,
  Badge,
} from "@/components/ui";
import {
  FeedbackHistoryList,
} from "@/components/feedback/FeedbackHistoryList";
import {
  RecordFeedbackSheet,
} from "@/components/feedback/RecordFeedbackSheet";
import {
  FeedbackDetailSheet,
} from "@/components/feedback/FeedbackDetailSheet";
import {
  ProductInsightsView,
} from "@/components/feedback/ProductInsightsView";
import {
  RawFeedbackItem,
  BusinessFeedbackInsights,
} from "@/lib/calculations/feedback";
import {
  MessageSquare,
  Plus,
  BarChart3,
  ListFilter,
  ShieldAlert,
  Info,
} from "lucide-react";

function CustomerFeedbackContent() {
  const searchParams = useSearchParams();

  // URL Query Parameters for quick recording or filtering
  const urlCustomerId = searchParams.get("customerId");
  const urlProductId = searchParams.get("productId");
  const urlSaleId = searchParams.get("saleId");
  const urlOpenRecord = searchParams.get("record") === "true" || !!urlCustomerId || !!urlSaleId;

  // Current User Role & Session
  const [userRole, setUserRole] = useState<"OWNER" | "WORKER">("WORKER");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [authLoaded, setAuthLoaded] = useState(false);

  // Active Tab: "HISTORY" | "INSIGHTS"
  const [activeTab, setActiveTab] = useState<"HISTORY" | "INSIGHTS">("HISTORY");

  // Data states
  const [feedbacks, setFeedbacks] = useState<RawFeedbackItem[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [productsList, setProductsList] = useState<Array<{ id: string; name: string }>>([]);

  // Insights state (Owner only)
  const [insights, setInsights] = useState<BusinessFeedbackInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Filter states
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(urlProductId || "");

  // Sheets state
  const [isRecordOpen, setIsRecordOpen] = useState(urlOpenRecord);
  const [detailFeedback, setDetailFeedback] = useState<RawFeedbackItem | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<RawFeedbackItem | null>(null);

  // 1. Fetch authenticated user profile
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.success && json.user) {
          setUserRole(json.user.role);
          setCurrentUserId(json.user.id);
        }
      } catch (e) {
        console.error("Failed to load user info:", e);
      } finally {
        setAuthLoaded(true);
      }
    };
    fetchUser();
  }, []);

  // 2. Fetch feedback list
  const fetchFeedbackData = useCallback(async () => {
    try {
      setLoadingFeedbacks(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      if (source) params.set("source", source);
      if (selectedProductId) params.set("productId", selectedProductId);

      const res = await fetch(`/api/feedback?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setFeedbacks(json.data.feedbacks || []);
      }
    } catch (e) {
      console.error("Failed to fetch feedback:", e);
    } finally {
      setLoadingFeedbacks(false);
    }
  }, [search, category, status, source, selectedProductId]);

  // 3. Fetch products list for dropdown filters
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setProductsList(json.data.map((p: any) => ({ id: p.id, name: p.name })));
        }
      } catch (e) {
        console.error("Failed to load products list:", e);
      }
    };
    fetchProducts();
  }, []);

  // Trigger feedback fetch on filter changes
  useEffect(() => {
    if (authLoaded) {
      fetchFeedbackData();
    }
  }, [authLoaded, fetchFeedbackData]);

  // 4. Fetch insights (Owner only when on Insights tab)
  const fetchInsights = useCallback(async () => {
    if (userRole !== "OWNER") return;

    try {
      setLoadingInsights(true);
      const res = await fetch("/api/feedback/insights");
      const json = await res.json();
      if (json.success && json.data) {
        setInsights(json.data);
      }
    } catch (e) {
      console.error("Failed to load product insights:", e);
    } finally {
      setLoadingInsights(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (activeTab === "INSIGHTS" && userRole === "OWNER") {
      fetchInsights();
    }
  }, [activeTab, userRole, fetchInsights]);

  const handleResetFilters = () => {
    setSearch("");
    setCategory("");
    setStatus("");
    setSource("");
    setSelectedProductId("");
  };

  const isOwner = userRole === "OWNER";

  return (
    <div className="space-y-5 pb-10">
      {/* Page Header */}
      <PageHeader
        title="Customer Feedback"
        subtitle="Preserve customer feedback from phone calls, WhatsApp, and face-to-face interactions to track follow-ups and product quality."
        action={
          <Button
            onClick={() => {
              setEditingFeedback(null);
              setIsRecordOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Record Feedback
          </Button>
        }
      />

      {/* Role Scoping Banner for Workers */}
      {!isOwner && authLoaded && (
        <div className="p-3 bg-secondary/50 rounded-lg border border-border text-xs flex items-center justify-between gap-3 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary flex-shrink-0" />
            <span>
              <strong>Worker Access:</strong> You can record customer conversations, view entries you recorded, and update their follow-up status.
            </span>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-card border border-border">
            Worker Scoped
          </span>
        </div>
      )}

      {/* Navigation Tabs (Insights tab visible for Owner) */}
      {isOwner && (
        <div className="flex items-center gap-2 border-b border-border pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("HISTORY")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "HISTORY"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <ListFilter className="w-4 h-4" />
            Feedback History
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-card/20">
              {feedbacks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("INSIGHTS")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "INSIGHTS"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Product Insights & Trends
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === "HISTORY" ? (
        <FeedbackHistoryList
          feedbacks={feedbacks}
          loading={loadingFeedbacks}
          onSelectFeedback={(f) => setDetailFeedback(f)}
          onOpenRecord={() => {
            setEditingFeedback(null);
            setIsRecordOpen(true);
          }}
          products={productsList}
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          status={status}
          onStatusChange={setStatus}
          source={source}
          onSourceChange={setSource}
          selectedProductId={selectedProductId}
          onProductChange={setSelectedProductId}
          onResetFilters={handleResetFilters}
        />
      ) : (
        <ProductInsightsView
          insights={insights}
          loading={loadingInsights}
        />
      )}

      {/* Record / Edit Feedback Sheet */}
      <RecordFeedbackSheet
        isOpen={isRecordOpen}
        onClose={() => {
          setIsRecordOpen(false);
          setEditingFeedback(null);
        }}
        onSuccess={() => {
          fetchFeedbackData();
          if (activeTab === "INSIGHTS") fetchInsights();
        }}
        initialCustomerId={urlCustomerId}
        initialProductId={urlProductId}
        initialSaleId={urlSaleId}
        editFeedback={editingFeedback}
      />

      {/* Feedback Detail & Follow-up Workflow Sheet */}
      <FeedbackDetailSheet
        isOpen={Boolean(detailFeedback)}
        onClose={() => setDetailFeedback(null)}
        feedback={detailFeedback}
        onStatusUpdated={() => {
          fetchFeedbackData();
          if (detailFeedback) {
            // refresh active detail
            fetch(`/api/feedback/${detailFeedback.id}`)
              .then((res) => res.json())
              .then((json) => {
                if (json.success && json.data) {
                  setDetailFeedback(json.data);
                }
              })
              .catch(() => {});
          }
          if (activeTab === "INSIGHTS") fetchInsights();
        }}
        onEdit={(f) => {
          setEditingFeedback(f);
          setIsRecordOpen(true);
        }}
        onDeleted={() => {
          fetchFeedbackData();
          if (activeTab === "INSIGHTS") fetchInsights();
        }}
      />
    </div>
  );
}

export default function CustomerFeedbackPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading Customer Feedback...</div>}>
      <CustomerFeedbackContent />
    </Suspense>
  );
}
