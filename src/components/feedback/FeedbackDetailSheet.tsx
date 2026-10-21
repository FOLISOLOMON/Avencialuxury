"use client";

import React, { useState } from "react";
import {
  Sheet,
  Button,
  Badge,
  ConfirmDialog,
} from "@/components/ui";
import {
  FEEDBACK_SOURCES,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  FeedbackStatusType,
  RawFeedbackItem,
} from "@/lib/calculations/feedback";
import {
  Star,
  Calendar,
  User,
  ShoppingBag,
  Package,
  Layers,
  Phone,
  MessageSquare,
  HelpCircle,
  FileText,
  Clock,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface FeedbackDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: RawFeedbackItem | null;
  onStatusUpdated: () => void;
  onEdit?: (feedback: RawFeedbackItem) => void;
  onDeleted?: () => void;
}

export function FeedbackDetailSheet({
  isOpen,
  onClose,
  feedback,
  onStatusUpdated,
  onEdit,
  onDeleted,
}: FeedbackDetailSheetProps) {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!feedback) return null;

  const sourceMeta = FEEDBACK_SOURCES[feedback.source] || { label: feedback.source, icon: "HelpCircle" };
  const categoryMeta = FEEDBACK_CATEGORIES[feedback.category] || { label: feedback.category, description: "" };
  const currentStatusMeta = FEEDBACK_STATUSES[feedback.status] || { label: feedback.status, color: "", badgeVariant: "secondary" };

  const handleUpdateStatus = async (newStatus: FeedbackStatusType) => {
    if (newStatus === feedback.status) return;

    try {
      setUpdatingStatus(true);
      setStatusError(null);

      const res = await fetch(`/api/feedback/${feedback.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update follow-up status");
      }

      onStatusUpdated();
    } catch (err: any) {
      console.error("Update status error:", err);
      setStatusError(err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/feedback/${feedback.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete feedback entry");
      }
      setIsDeleteDialogOpen(false);
      onClose();
      if (onDeleted) onDeleted();
    } catch (err: any) {
      console.error("Delete feedback error:", err);
      setStatusError(err.message || "Failed to delete feedback");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Sheet
        isOpen={isOpen}
        onClose={onClose}
        title="Customer Feedback Record"
        description={`Received on ${new Date(feedback.feedbackDate).toLocaleDateString()}`}
        size="lg"
      >
        <div className="space-y-5 pb-6">
          {statusError && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{statusError}</span>
            </div>
          )}

          {/* Header Card: Status & Badges */}
          <div className="p-4 rounded-lg bg-card border border-border space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStatusMeta.color}`}>
                  {currentStatusMeta.label}
                </span>
                <span className="text-xs text-muted-foreground">via {sourceMeta.label}</span>
              </div>

              {/* Rating Display */}
              {feedback.rating ? (
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-amber-500">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          feedback.rating! >= s ? "fill-current" : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold ml-1">{feedback.rating}/5</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">No rating given</span>
              )}
            </div>

            {/* Category */}
            <div>
              <span className="text-xs font-semibold text-foreground">
                Category: {categoryMeta.label}
              </span>
              {categoryMeta.description && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {categoryMeta.description}
                </p>
              )}
            </div>
          </div>

          {/* Customer & Product Associations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customer Box */}
            <div className="p-3 rounded-lg bg-card border border-border flex items-start gap-3">
              <div className="p-2 rounded-md bg-secondary text-muted-foreground flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Customer
                </span>
                <span className="text-xs font-semibold text-foreground block truncate">
                  {feedback.customerName || "Anonymous / Walk-in"}
                </span>
                {feedback.customerPhone && (
                  <span className="text-[11px] text-muted-foreground block">
                    {feedback.customerPhone}
                  </span>
                )}
              </div>
            </div>

            {/* Product Box */}
            <div className="p-3 rounded-lg bg-card border border-border flex items-start gap-3">
              <div className="p-2 rounded-md bg-secondary text-muted-foreground flex-shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Perfume / Product
                </span>
                <span className="text-xs font-semibold text-foreground block truncate">
                  {feedback.productName || "General / Unassigned"}
                </span>
                {feedback.productBrand && (
                  <span className="text-[11px] text-muted-foreground block truncate">
                    {feedback.productBrand} {feedback.productSize ? `(${feedback.productSize})` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Related Sale & Batch Info (if present) */}
          {(feedback.saleId || feedback.batchReference) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-secondary/30 rounded-lg border border-border/60">
              {feedback.saleId && (
                <div className="flex items-center gap-2 text-xs">
                  <ShoppingBag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Linked Sale:</span>
                  <span className="font-medium text-foreground">
                    {feedback.saleDate ? new Date(feedback.saleDate).toLocaleDateString() : `#${feedback.saleId.slice(-6)}`}
                    {feedback.saleTotal !== null && feedback.saleTotal !== undefined ? ` • GH₵${feedback.saleTotal.toFixed(2)}` : ""}
                  </span>
                </div>
              )}

              {feedback.batchReference && (
                <div className="flex items-center gap-2 text-xs">
                  <Layers className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Stock Batch:</span>
                  <span className="font-medium text-foreground">{feedback.batchReference}</span>
                </div>
              )}
            </div>
          )}

          {/* Actual Customer Comments */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              Customer Feedback Comments
            </h4>
            <div className="p-3.5 rounded-lg bg-card border border-border text-xs text-foreground whitespace-pre-wrap leading-relaxed">
              &ldquo;{feedback.comments}&rdquo;
            </div>
          </div>

          {/* Internal Business Notes */}
          {feedback.internalNotes && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                Internal Business Notes
              </h4>
              <div className="p-3 rounded-lg bg-secondary/40 border border-border text-xs text-muted-foreground whitespace-pre-wrap">
                {feedback.internalNotes}
              </div>
            </div>
          )}

          {/* Follow-up Status Workflow */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground">
                Update Follow-up Status
              </h4>
              <span className="text-[11px] text-muted-foreground">
                Tracking only (does not contact customer)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(FEEDBACK_STATUSES) as FeedbackStatusType[]).map((st) => {
                const isSelected = feedback.status === st;
                const meta = FEEDBACK_STATUSES[st];
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus(st)}
                    className={`px-3 py-2 text-xs font-medium rounded-md border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{meta.label}</span>
                      {isSelected && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audit Metadata */}
          <div className="p-3 rounded-md bg-secondary/20 text-[11px] text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Recorded by:</span>
              <span className="font-medium text-foreground">{feedback.createdByName || "Authorized Staff"}</span>
            </div>
            <div className="flex justify-between">
              <span>Date received:</span>
              <span>{new Date(feedback.feedbackDate).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Last updated:</span>
              <span>{new Date(feedback.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Owner Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              {feedback.isOwner && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {feedback.canEdit && onEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit(feedback);
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                  Edit Details
                </Button>
              )}
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Feedback Record?"
        message="Are you sure you want to delete this customer feedback record? This action is permanent and will be logged in the audit trail."
        confirmLabel={isDeleting ? "Deleting..." : "Delete Record"}
        variant="destructive"
      />
    </>
  );
}
