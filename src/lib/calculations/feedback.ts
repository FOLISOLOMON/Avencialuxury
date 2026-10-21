export type FeedbackSourceType = "PHONE" | "WHATSAPP" | "IN_PERSON" | "OTHER";

export type FeedbackCategoryType =
  | "LONGEVITY"
  | "FRAGRANCE_SCENT"
  | "PROJECTION"
  | "PACKAGING"
  | "VALUE_FOR_MONEY"
  | "DELIVERY_SERVICE"
  | "POSITIVE_GENERAL"
  | "COMPLAINT"
  | "OTHER";

export type FeedbackStatusType = "NEW" | "REVIEWING" | "FOLLOW_UP_NEEDED" | "RESOLVED";

export const FEEDBACK_SOURCES: Record<FeedbackSourceType, { label: string; icon: string }> = {
  PHONE: { label: "Phone Call", icon: "Phone" },
  WHATSAPP: { label: "WhatsApp", icon: "MessageSquare" },
  IN_PERSON: { label: "In Person", icon: "Users" },
  OTHER: { label: "Other", icon: "HelpCircle" },
};

export const FEEDBACK_CATEGORIES: Record<FeedbackCategoryType, { label: string; description: string }> = {
  LONGEVITY: {
    label: "Longevity",
    description: "How long the fragrance lasts on skin or clothing",
  },
  FRAGRANCE_SCENT: {
    label: "Fragrance / Scent",
    description: "Scent profile, notes, aroma, and dry-down impressions",
  },
  PROJECTION: {
    label: "Projection & Sillage",
    description: "Aroma diffusion, scent trail, and room presence",
  },
  PACKAGING: {
    label: "Packaging & Bottle",
    description: "Bottle presentation, atomizer spray, cap, and boxing",
  },
  VALUE_FOR_MONEY: {
    label: "Value for Money",
    description: "Perception of price versus quality and quantity",
  },
  DELIVERY_SERVICE: {
    label: "Delivery & Service",
    description: "Customer service, courier speed, and order handling",
  },
  POSITIVE_GENERAL: {
    label: "General Praise",
    description: "Unprompted compliments, satisfaction, and recommendations",
  },
  COMPLAINT: {
    label: "General Complaint",
    description: "Discontent, dissatisfaction, or issues not covered above",
  },
  OTHER: {
    label: "Other Inquiry/Comment",
    description: "General feedback and miscellaneous customer input",
  },
};

export const FEEDBACK_STATUSES: Record<
  FeedbackStatusType,
  { label: string; color: string; badgeVariant: "default" | "secondary" | "outline" | "danger" }
> = {
  NEW: { label: "New", color: "text-blue-500 bg-blue-500/10 border-blue-500/30", badgeVariant: "secondary" },
  REVIEWING: { label: "Reviewing", color: "text-amber-500 bg-amber-500/10 border-amber-500/30", badgeVariant: "secondary" },
  FOLLOW_UP_NEEDED: { label: "Follow-up Needed", color: "text-rose-500 bg-rose-500/10 border-rose-500/30", badgeVariant: "danger" },
  RESOLVED: { label: "Resolved", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30", badgeVariant: "default" },
};

export interface RawFeedbackItem {
  id: string;
  businessId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  productId?: string | null;
  productName?: string | null;
  productBrand?: string | null;
  productSize?: string | null;
  saleId?: string | null;
  saleDate?: Date | string | null;
  saleTotal?: number | null;
  batchId?: string | null;
  batchReference?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  source: FeedbackSourceType;
  category: FeedbackCategoryType;
  comments: string;
  rating?: number | null;
  feedbackDate: Date | string;
  status: FeedbackStatusType;
  internalNotes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  isOwner?: boolean;
  canEdit?: boolean;
  canUpdateStatus?: boolean;
}

export interface ProductFeedbackStats {
  productId: string;
  productName: string;
  totalFeedbackCount: number;
  positiveCount: number;
  concernCount: number;
  neutralCount: number;
  ratedCount: number;
  averageRating: number | null;
  categoryCounts: Record<FeedbackCategoryType, number>;
  topCategories: Array<{
    category: FeedbackCategoryType;
    label: string;
    count: number;
    percentage: number;
  }>;
  recurringConcerns: Array<{
    category: FeedbackCategoryType;
    label: string;
    count: number;
    averageRating: number | null;
    patternDescription: string;
    recentComments: string[];
  }>;
  recentFeedbacks: RawFeedbackItem[];
}

export interface BusinessFeedbackInsights {
  totalFeedbackCount: number;
  positiveCount: number;
  concernCount: number;
  neutralCount: number;
  averageRating: number | null;
  followUpNeededCount: number;
  newCount: number;
  resolvedCount: number;
  topCategories: Array<{
    category: FeedbackCategoryType;
    label: string;
    count: number;
    percentage: number;
  }>;
  sourceBreakdown: Record<FeedbackSourceType, number>;
  productInsights: ProductFeedbackStats[];
  flaggedPatterns: Array<{
    productId: string;
    productName: string;
    category: FeedbackCategoryType;
    categoryLabel: string;
    count: number;
    averageRating: number | null;
    summary: string;
  }>;
}

/**
 * Determines whether a feedback record expresses positive satisfaction.
 * Rule:
 * - Rating >= 4, OR
 * - Category is POSITIVE_GENERAL with no low rating (rating is null or >= 3).
 */
export function isPositiveFeedback(f: { rating?: number | null; category: FeedbackCategoryType }): boolean {
  if (typeof f.rating === "number" && f.rating >= 4) return true;
  if (f.category === "POSITIVE_GENERAL") {
    return f.rating === null || f.rating === undefined || f.rating >= 3;
  }
  return false;
}

/**
 * Determines whether a feedback record expresses a customer concern or complaint.
 * Rule:
 * - Rating <= 2, OR
 * - Category is COMPLAINT (unless rating is 4 or 5), OR
 * - Status is FOLLOW_UP_NEEDED (unless rating >= 4).
 */
export function isConcernFeedback(f: {
  rating?: number | null;
  category: FeedbackCategoryType;
  status?: FeedbackStatusType;
}): boolean {
  if (typeof f.rating === "number" && f.rating <= 2) return true;
  if (f.category === "COMPLAINT") {
    return f.rating === null || f.rating === undefined || f.rating <= 3;
  }
  if (f.status === "FOLLOW_UP_NEEDED") {
    return f.rating === null || f.rating === undefined || f.rating <= 3;
  }
  return false;
}

/**
 * Calculates deterministic product feedback analytics and identifies recurring patterns.
 * Explicitly frames patterns as customer-reported tendencies rather than definitive product flaws.
 */
export function calculateProductInsights(
  feedbacks: RawFeedbackItem[],
  allProducts: Array<{ id: string; name: string }> = []
): BusinessFeedbackInsights {
  // Group feedbacks by product
  const productMap = new Map<string, { name: string; feedbacks: RawFeedbackItem[] }>();

  // Initialize with products that exist
  for (const p of allProducts) {
    productMap.set(p.id, { name: p.name, feedbacks: [] });
  }

  // Populate feedbacks
  for (const f of feedbacks) {
    const pId = f.productId || "unassigned";
    const pName = f.productName || (pId === "unassigned" ? "Unassigned / General" : "Unknown Product");

    if (!productMap.has(pId)) {
      productMap.set(pId, { name: pName, feedbacks: [] });
    }
    productMap.get(pId)!.feedbacks.push(f);
  }

  const productStatsList: ProductFeedbackStats[] = [];
  const flaggedPatterns: BusinessFeedbackInsights["flaggedPatterns"] = [];

  const categoryTotals: Record<FeedbackCategoryType, number> = {
    LONGEVITY: 0,
    FRAGRANCE_SCENT: 0,
    PROJECTION: 0,
    PACKAGING: 0,
    VALUE_FOR_MONEY: 0,
    DELIVERY_SERVICE: 0,
    POSITIVE_GENERAL: 0,
    COMPLAINT: 0,
    OTHER: 0,
  };

  const sourceTotals: Record<FeedbackSourceType, number> = {
    PHONE: 0,
    WHATSAPP: 0,
    IN_PERSON: 0,
    OTHER: 0,
  };

  let totalRatedCount = 0;
  let totalRatingSum = 0;
  let totalPositive = 0;
  let totalConcerns = 0;
  let totalNeutral = 0;
  let followUpNeededCount = 0;
  let newCount = 0;
  let resolvedCount = 0;

  for (const f of feedbacks) {
    if (f.source && sourceTotals[f.source] !== undefined) {
      sourceTotals[f.source]++;
    }
    if (f.category && categoryTotals[f.category] !== undefined) {
      categoryTotals[f.category]++;
    }
    if (typeof f.rating === "number" && f.rating >= 1 && f.rating <= 5) {
      totalRatedCount++;
      totalRatingSum += f.rating;
    }
    if (isPositiveFeedback(f)) {
      totalPositive++;
    } else if (isConcernFeedback(f)) {
      totalConcerns++;
    } else {
      totalNeutral++;
    }

    if (f.status === "FOLLOW_UP_NEEDED") followUpNeededCount++;
    if (f.status === "NEW") newCount++;
    if (f.status === "RESOLVED") resolvedCount++;
  }

  // Calculate per-product stats
  for (const [productId, { name, feedbacks: pFeedbacks }] of productMap.entries()) {
    if (pFeedbacks.length === 0 && productId === "unassigned") continue;

    let pPositive = 0;
    let pConcern = 0;
    let pNeutral = 0;
    let pRatedCount = 0;
    let pRatingSum = 0;

    const pCategoryCounts: Record<FeedbackCategoryType, number> = {
      LONGEVITY: 0,
      FRAGRANCE_SCENT: 0,
      PROJECTION: 0,
      PACKAGING: 0,
      VALUE_FOR_MONEY: 0,
      DELIVERY_SERVICE: 0,
      POSITIVE_GENERAL: 0,
      COMPLAINT: 0,
      OTHER: 0,
    };

    // Category-specific ratings and concerns tracking
    const categoryDetails = new Map<
      FeedbackCategoryType,
      { count: number; concernCount: number; ratingSum: number; ratedCount: number; comments: string[] }
    >();

    for (const f of pFeedbacks) {
      if (isPositiveFeedback(f)) {
        pPositive++;
      } else if (isConcernFeedback(f)) {
        pConcern++;
      } else {
        pNeutral++;
      }

      if (typeof f.rating === "number" && f.rating >= 1 && f.rating <= 5) {
        pRatedCount++;
        pRatingSum += f.rating;
      }

      if (f.category && pCategoryCounts[f.category] !== undefined) {
        pCategoryCounts[f.category]++;

        if (!categoryDetails.has(f.category)) {
          categoryDetails.set(f.category, {
            count: 0,
            concernCount: 0,
            ratingSum: 0,
            ratedCount: 0,
            comments: [],
          });
        }
        const cd = categoryDetails.get(f.category)!;
        cd.count++;
        if (isConcernFeedback(f)) cd.concernCount++;
        if (typeof f.rating === "number") {
          cd.ratingSum += f.rating;
          cd.ratedCount++;
        }
        if (f.comments && f.comments.trim()) {
          cd.comments.push(f.comments.trim());
        }
      }
    }

    const pAvgRating = pRatedCount > 0 ? Math.round((pRatingSum / pRatedCount) * 10) / 10 : null;

    // Top categories for this product
    const topCategories = Object.entries(pCategoryCounts)
      .filter(([_, count]) => count > 0)
      .map(([cat, count]) => ({
        category: cat as FeedbackCategoryType,
        label: FEEDBACK_CATEGORIES[cat as FeedbackCategoryType]?.label || cat,
        count,
        percentage: pFeedbacks.length > 0 ? Math.round((count / pFeedbacks.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Identify recurring concerns (>= 2 reports with negative sentiment or specific issue category)
    const recurringConcerns: ProductFeedbackStats["recurringConcerns"] = [];

    for (const [cat, cd] of categoryDetails.entries()) {
      // Flag if 2 or more customers reported concerns in this category, OR
      // if 2 or more reports exist in a typically complaint-driven category (LONGEVITY, PACKAGING, COMPLAINT)
      const isIssueProneCategory = ["LONGEVITY", "PROJECTION", "PACKAGING", "COMPLAINT"].includes(cat);
      const isRecurring = cd.concernCount >= 2 || (isIssueProneCategory && cd.count >= 2);

      if (isRecurring && productId !== "unassigned") {
        const catAvgRating = cd.ratedCount > 0 ? Math.round((cd.ratingSum / cd.ratedCount) * 10) / 10 : null;
        const catLabel = FEEDBACK_CATEGORIES[cat]?.label || cat;

        const patternDesc =
          catAvgRating !== null
            ? `Customer-reported pattern: ${cd.count} customers reported ${catLabel.toLowerCase()} feedback (average rating: ${catAvgRating}/5)`
            : `Customer-reported pattern: ${cd.count} customers reported ${catLabel.toLowerCase()} feedback`;

        recurringConcerns.push({
          category: cat,
          label: catLabel,
          count: cd.count,
          averageRating: catAvgRating,
          patternDescription: patternDesc,
          recentComments: cd.comments.slice(-3),
        });

        flaggedPatterns.push({
          productId,
          productName: name,
          category: cat,
          categoryLabel: catLabel,
          count: cd.count,
          averageRating: catAvgRating,
          summary: patternDesc,
        });
      }
    }

    // Sort product feedbacks by date descending
    const sortedFeedbacks = [...pFeedbacks].sort((a, b) => {
      const dateA = new Date(a.feedbackDate).getTime();
      const dateB = new Date(b.feedbackDate).getTime();
      return dateB - dateA;
    });

    productStatsList.push({
      productId,
      productName: name,
      totalFeedbackCount: pFeedbacks.length,
      positiveCount: pPositive,
      concernCount: pConcern,
      neutralCount: pNeutral,
      ratedCount: pRatedCount,
      averageRating: pAvgRating,
      categoryCounts: pCategoryCounts,
      topCategories,
      recurringConcerns,
      recentFeedbacks: sortedFeedbacks.slice(0, 5),
    });
  }

  // Sort products by feedback count descending
  productStatsList.sort((a, b) => b.totalFeedbackCount - a.totalFeedbackCount);

  // Overall top categories
  const topCategories = Object.entries(categoryTotals)
    .filter(([_, count]) => count > 0)
    .map(([cat, count]) => ({
      category: cat as FeedbackCategoryType,
      label: FEEDBACK_CATEGORIES[cat as FeedbackCategoryType]?.label || cat,
      count,
      percentage: feedbacks.length > 0 ? Math.round((count / feedbacks.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const overallAvgRating = totalRatedCount > 0 ? Math.round((totalRatingSum / totalRatedCount) * 10) / 10 : null;

  return {
    totalFeedbackCount: feedbacks.length,
    positiveCount: totalPositive,
    concernCount: totalConcerns,
    neutralCount: totalNeutral,
    averageRating: overallAvgRating,
    followUpNeededCount,
    newCount,
    resolvedCount,
    topCategories,
    sourceBreakdown: sourceTotals,
    productInsights: productStatsList,
    flaggedPatterns,
  };
}
