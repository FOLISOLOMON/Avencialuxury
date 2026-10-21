import { prisma, ensureDefaultBusiness, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { Role } from "@prisma/client";
import { logAudit } from "./audit";
import {
  FeedbackCategoryType,
  FeedbackSourceType,
  FeedbackStatusType,
  calculateProductInsights,
  BusinessFeedbackInsights,
  RawFeedbackItem,
} from "@/lib/calculations/feedback";

export interface CreateFeedbackInput {
  businessId: string;
  createdById?: string | null;
  customerId?: string | null;
  productId?: string | null;
  saleId?: string | null;
  batchId?: string | null;
  source: FeedbackSourceType;
  category: FeedbackCategoryType;
  comments: string;
  rating?: number | null;
  feedbackDate?: Date | string | null;
  status?: FeedbackStatusType;
  internalNotes?: string | null;
}

export interface UpdateFeedbackInput {
  status?: FeedbackStatusType;
  comments?: string;
  rating?: number | null;
  category?: FeedbackCategoryType;
  source?: FeedbackSourceType;
  internalNotes?: string | null;
  customerId?: string | null;
  productId?: string | null;
  saleId?: string | null;
  batchId?: string | null;
}

export interface FeedbackFilterOptions {
  userRole: Role;
  userId: string;
  productId?: string;
  customerId?: string;
  saleId?: string;
  category?: FeedbackCategoryType;
  status?: FeedbackStatusType;
  source?: FeedbackSourceType;
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
  limit?: number;
  offset?: number;
}

const VALID_SOURCES: FeedbackSourceType[] = ["PHONE", "WHATSAPP", "IN_PERSON", "OTHER"];
const VALID_CATEGORIES: FeedbackCategoryType[] = [
  "LONGEVITY",
  "FRAGRANCE_SCENT",
  "PROJECTION",
  "PACKAGING",
  "VALUE_FOR_MONEY",
  "DELIVERY_SERVICE",
  "POSITIVE_GENERAL",
  "COMPLAINT",
  "OTHER",
];
const VALID_STATUSES: FeedbackStatusType[] = ["NEW", "REVIEWING", "FOLLOW_UP_NEEDED", "RESOLVED"];

/**
 * Records a new customer feedback entry.
 * Authorized for both OWNER and WORKER roles.
 */
export async function createFeedback(input: CreateFeedbackInput, authUser: { id: string; role: Role }) {
  const businessId = input.businessId || DEFAULT_BUSINESS_ID;
  await ensureDefaultBusiness(businessId);

  // 1. Comments validation
  if (!input.comments || typeof input.comments !== "string" || !input.comments.trim()) {
    throw new Error("Customer comments are required");
  }
  const cleanComments = input.comments.trim();
  if (cleanComments.length > 3000) {
    throw new Error("Comments exceed the maximum length of 3000 characters");
  }

  // 2. Rating validation (optional, 1–5)
  let cleanRating: number | null = null;
  if (input.rating !== undefined && input.rating !== null && input.rating !== ("" as any)) {
    const parsedRating = Number(input.rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5 || !Number.isInteger(parsedRating)) {
      throw new Error("Rating must be an integer between 1 and 5");
    }
    cleanRating = parsedRating;
  }

  // 3. Source & Category validation
  const cleanSource: FeedbackSourceType = VALID_SOURCES.includes(input.source) ? input.source : "OTHER";
  const cleanCategory: FeedbackCategoryType = VALID_CATEGORIES.includes(input.category) ? input.category : "OTHER";
  const cleanStatus: FeedbackStatusType = VALID_STATUSES.includes(input.status as any) ? (input.status as any) : "NEW";

  // 4. Feedback date
  let cleanFeedbackDate = new Date();
  if (input.feedbackDate) {
    const d = new Date(input.feedbackDate);
    if (!isNaN(d.getTime())) {
      cleanFeedbackDate = d;
    }
  }

  // 5. Relationship validation (tenant verification)
  let validCustomerId: string | null = null;
  if (input.customerId && input.customerId.trim()) {
    const cust = await prisma.customer.findFirst({
      where: { id: input.customerId.trim(), businessId },
      select: { id: true },
    });
    if (!cust) {
      throw new Error("Selected customer does not exist in this business");
    }
    validCustomerId = cust.id;
  }

  let validProductId: string | null = null;
  if (input.productId && input.productId.trim()) {
    const prod = await prisma.product.findFirst({
      where: { id: input.productId.trim(), businessId },
      select: { id: true },
    });
    if (!prod) {
      throw new Error("Selected product does not exist in this business");
    }
    validProductId = prod.id;
  }

  let validSaleId: string | null = null;
  if (input.saleId && input.saleId.trim()) {
    const sale = await prisma.sale.findFirst({
      where: { id: input.saleId.trim(), businessId },
      select: { id: true },
    });
    if (sale) {
      validSaleId = sale.id;
    }
  }

  let validBatchId: string | null = null;
  if (input.batchId && input.batchId.trim()) {
    const batch = await prisma.batch.findFirst({
      where: { id: input.batchId.trim(), businessId },
      select: { id: true },
    });
    if (batch) {
      validBatchId = batch.id;
    }
  }

  const cleanInternalNotes = input.internalNotes?.trim() || null;

  try {
    const feedback = await (prisma as any).customerFeedback.create({
      data: {
        businessId,
        customerId: validCustomerId,
        productId: validProductId,
        saleId: validSaleId,
        batchId: validBatchId,
        createdById: authUser.id,
        source: cleanSource,
        category: cleanCategory,
        comments: cleanComments,
        rating: cleanRating,
        feedbackDate: cleanFeedbackDate,
        status: cleanStatus,
        internalNotes: cleanInternalNotes,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        product: { select: { id: true, name: true, brand: true, size: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        sale: { select: { id: true, saleDate: true, totalAmount: true, paymentStatus: true } },
        batch: { select: { id: true, reference: true } },
      },
    });

    await logAudit({
      businessId,
      userId: authUser.id,
      action: "CUSTOMER_FEEDBACK_RECORDED",
      entityType: "CUSTOMER_FEEDBACK",
      entityId: feedback.id,
      details: {
        source: cleanSource,
        category: cleanCategory,
        rating: cleanRating,
        status: cleanStatus,
        hasCustomer: !!validCustomerId,
        hasProduct: !!validProductId,
      },
    });

    return feedback;
  } catch (err: any) {
    if (err.code === "P2021") {
      console.error("[Feedback Service] CustomerFeedback table not migrated in DB:", err);
      throw new Error("Customer feedback table is not yet migrated in database.");
    }
    throw err;
  }
}

/**
 * Retrieves a list of feedback records with search, filters, pagination, and role-based scoping.
 */
export async function getFeedbackList(businessId: string, options: FeedbackFilterOptions) {
  await ensureDefaultBusiness(businessId);

  const where: any = { businessId };

  // Strict worker scoping: Workers only see feedback they personally recorded
  if (options.userRole === "WORKER") {
    where.createdById = options.userId;
  }

  if (options.productId) {
    where.productId = options.productId;
  }

  if (options.customerId) {
    where.customerId = options.customerId;
  }

  if (options.saleId) {
    where.saleId = options.saleId;
  }

  if (options.category && VALID_CATEGORIES.includes(options.category)) {
    where.category = options.category;
  }

  if (options.status && VALID_STATUSES.includes(options.status)) {
    where.status = options.status;
  }

  if (options.source && VALID_SOURCES.includes(options.source)) {
    where.source = options.source;
  }

  if (options.startDate || options.endDate) {
    where.feedbackDate = {};
    if (options.startDate) {
      const start = new Date(options.startDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        where.feedbackDate.gte = start;
      }
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        where.feedbackDate.lte = end;
      }
    }
  }

  if (options.search && options.search.trim()) {
    const q = options.search.trim();
    where.OR = [
      { comments: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { product: { name: { contains: q, mode: "insensitive" } } },
    ];
    // Owners can also search in internal notes
    if (options.userRole === "OWNER") {
      where.OR.push({ internalNotes: { contains: q, mode: "insensitive" } });
    }
  }

  const limit = Math.min(100, Math.max(1, options.limit || 50));
  const offset = Math.max(0, options.offset || 0);

  try {
    const [feedbacks, total] = await Promise.all([
      (prisma as any).customerFeedback.findMany({
        where,
        orderBy: { feedbackDate: "desc" },
        take: limit,
        skip: offset,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          product: { select: { id: true, name: true, category: true, brand: true, size: true } },
          createdBy: { select: { id: true, name: true, email: true, role: true } },
          sale: { select: { id: true, saleDate: true, totalAmount: true, paymentStatus: true } },
          batch: { select: { id: true, reference: true } },
        },
      }),
      (prisma as any).customerFeedback.count({ where }),
    ]);

    // Data sanitization for worker: Worker sees their own internalNotes, but no financial margins
    const sanitized = feedbacks.map((f: any) => ({
      id: f.id,
      businessId: f.businessId,
      customerId: f.customerId,
      customerName: f.customer?.name || null,
      customerPhone: f.customer?.phone || null,
      productId: f.productId,
      productName: f.product?.name || null,
      productBrand: f.product?.brand || null,
      productSize: f.product?.size || null,
      saleId: f.saleId,
      saleDate: f.sale?.saleDate || null,
      saleTotal: f.sale?.totalAmount ? Number(f.sale.totalAmount) : null,
      batchId: f.batchId,
      batchReference: f.batch?.reference || null,
      createdById: f.createdById,
      createdByName: f.createdBy?.name || "System",
      source: f.source,
      category: f.category,
      comments: f.comments,
      rating: f.rating,
      feedbackDate: f.feedbackDate,
      status: f.status,
      internalNotes: f.internalNotes,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      isOwner: options.userRole === "OWNER",
      canEdit: options.userRole === "OWNER",
      canUpdateStatus: options.userRole === "OWNER" || f.createdById === options.userId,
    }));

    return { feedbacks: sanitized, total, limit, offset };
  } catch (err: any) {
    if (err.code === "P2021") {
      return { feedbacks: [], total: 0, limit, offset };
    }
    throw err;
  }
}

/**
 * Retrieves a single feedback record by ID.
 * Strictly verifies tenant and worker ownership.
 */
export async function getFeedbackById(
  businessId: string,
  feedbackId: string,
  authUser: { id: string; role: Role }
) {
  await ensureDefaultBusiness(businessId);

  try {
    const feedback = await (prisma as any).customerFeedback.findFirst({
      where: { id: feedbackId, businessId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        product: { select: { id: true, name: true, category: true, brand: true, size: true, sellingPrice: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        sale: {
          select: {
            id: true,
            saleDate: true,
            totalAmount: true,
            paymentStatus: true,
            saleItems: { select: { id: true, quantity: true, product: { select: { name: true } } } },
          },
        },
        batch: { select: { id: true, reference: true } },
      },
    });

    if (!feedback) return null;

    // Strict worker scoping
    if (authUser.role === "WORKER" && feedback.createdById !== authUser.id) {
      throw new Error("Forbidden: You do not have permission to view feedback recorded by another staff member.");
    }

    return {
      ...feedback,
      saleTotal: feedback.sale?.totalAmount ? Number(feedback.sale.totalAmount) : null,
      isOwner: authUser.role === "OWNER",
      canEdit: authUser.role === "OWNER",
      canUpdateStatus: authUser.role === "OWNER" || feedback.createdById === authUser.id,
    };
  } catch (err: any) {
    if (err.code === "P2021") return null;
    throw err;
  }
}

/**
 * Updates an existing feedback record.
 * OWNER: Can update all fields (comments, rating, status, notes, associations).
 * WORKER: Can ONLY update the follow-up status of feedback THEY personally recorded.
 */
export async function updateFeedback(
  businessId: string,
  feedbackId: string,
  input: UpdateFeedbackInput,
  authUser: { id: string; role: Role }
) {
  await ensureDefaultBusiness(businessId);

  const existing = await (prisma as any).customerFeedback.findFirst({
    where: { id: feedbackId, businessId },
  });

  if (!existing) {
    throw new Error("Feedback record not found");
  }

  // Worker role restrictions
  if (authUser.role === "WORKER") {
    if (existing.createdById !== authUser.id) {
      throw new Error("Forbidden: Workers can only update the status of feedback they personally recorded.");
    }

    // Workers cannot edit comments, ratings, notes, or relationships
    if (
      input.comments !== undefined ||
      input.rating !== undefined ||
      input.category !== undefined ||
      input.source !== undefined ||
      input.internalNotes !== undefined ||
      input.customerId !== undefined ||
      input.productId !== undefined
    ) {
      throw new Error("Forbidden: Workers can only update follow-up status. Please contact an admin to edit feedback details.");
    }

    if (!input.status || !VALID_STATUSES.includes(input.status)) {
      throw new Error("A valid follow-up status is required");
    }

    const updated = await (prisma as any).customerFeedback.update({
      where: { id: feedbackId },
      data: {
        status: input.status,
      },
    });

    await logAudit({
      businessId,
      userId: authUser.id,
      action: "FEEDBACK_STATUS_UPDATED",
      entityType: "CUSTOMER_FEEDBACK",
      entityId: feedbackId,
      details: { previousStatus: existing.status, newStatus: input.status },
    });

    return updated;
  }

  // Owner update
  const dataToUpdate: any = {};

  if (input.status !== undefined) {
    if (!VALID_STATUSES.includes(input.status)) {
      throw new Error("Invalid follow-up status");
    }
    dataToUpdate.status = input.status;
  }

  if (input.comments !== undefined) {
    if (!input.comments || !input.comments.trim()) {
      throw new Error("Comments cannot be empty");
    }
    dataToUpdate.comments = input.comments.trim();
  }

  if (input.rating !== undefined) {
    if (input.rating === null || input.rating === ("" as any)) {
      dataToUpdate.rating = null;
    } else {
      const r = Number(input.rating);
      if (isNaN(r) || r < 1 || r > 5 || !Number.isInteger(r)) {
        throw new Error("Rating must be an integer between 1 and 5");
      }
      dataToUpdate.rating = r;
    }
  }

  if (input.category !== undefined) {
    if (!VALID_CATEGORIES.includes(input.category)) {
      throw new Error("Invalid category");
    }
    dataToUpdate.category = input.category;
  }

  if (input.source !== undefined) {
    if (!VALID_SOURCES.includes(input.source)) {
      throw new Error("Invalid source");
    }
    dataToUpdate.source = input.source;
  }

  if (input.internalNotes !== undefined) {
    dataToUpdate.internalNotes = input.internalNotes?.trim() || null;
  }

  if (input.customerId !== undefined) {
    if (input.customerId) {
      const cust = await prisma.customer.findFirst({
        where: { id: input.customerId, businessId },
      });
      if (!cust) throw new Error("Customer not found in this business");
      dataToUpdate.customerId = cust.id;
    } else {
      dataToUpdate.customerId = null;
    }
  }

  if (input.productId !== undefined) {
    if (input.productId) {
      const prod = await prisma.product.findFirst({
        where: { id: input.productId, businessId },
      });
      if (!prod) throw new Error("Product not found in this business");
      dataToUpdate.productId = prod.id;
    } else {
      dataToUpdate.productId = null;
    }
  }

  const updated = await (prisma as any).customerFeedback.update({
    where: { id: feedbackId },
    data: dataToUpdate,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      product: { select: { id: true, name: true, brand: true, size: true } },
      createdBy: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  await logAudit({
    businessId,
    userId: authUser.id,
    action: "CUSTOMER_FEEDBACK_UPDATED",
    entityType: "CUSTOMER_FEEDBACK",
    entityId: feedbackId,
    details: { changes: Object.keys(dataToUpdate) },
  });

  return updated;
}

/**
 * Deletes a feedback record. Strictly OWNER only.
 */
export async function deleteFeedback(
  businessId: string,
  feedbackId: string,
  authUser: { id: string; role: Role }
) {
  await ensureDefaultBusiness(businessId);

  if (authUser.role !== "OWNER") {
    throw new Error("Forbidden: Only the business owner can delete feedback records.");
  }

  const existing = await (prisma as any).customerFeedback.findFirst({
    where: { id: feedbackId, businessId },
  });

  if (!existing) {
    throw new Error("Feedback record not found");
  }

  await (prisma as any).customerFeedback.delete({
    where: { id: feedbackId },
  });

  await logAudit({
    businessId,
    userId: authUser.id,
    action: "CUSTOMER_FEEDBACK_DELETED",
    entityType: "CUSTOMER_FEEDBACK",
    entityId: feedbackId,
    details: { commentsExcerpt: existing.comments.slice(0, 100) },
  });

  return { success: true };
}

/**
 * Computes product insights and trends across the business.
 * Strictly OWNER only.
 */
export async function getProductInsightsService(
  businessId: string,
  authUser: { id: string; role: Role },
  options?: { productId?: string; startDate?: string; endDate?: string }
): Promise<BusinessFeedbackInsights> {
  await ensureDefaultBusiness(businessId);

  if (authUser.role !== "OWNER") {
    throw new Error("Forbidden: Product Insights are restricted to the business owner.");
  }

  const where: any = { businessId };
  if (options?.productId) {
    where.productId = options.productId;
  }
  if (options?.startDate || options?.endDate) {
    where.feedbackDate = {};
    if (options.startDate) {
      const s = new Date(options.startDate);
      if (!isNaN(s.getTime())) {
        s.setHours(0, 0, 0, 0);
        where.feedbackDate.gte = s;
      }
    }
    if (options.endDate) {
      const e = new Date(options.endDate);
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        where.feedbackDate.lte = e;
      }
    }
  }

  try {
    const [feedbacks, products] = await Promise.all([
      (prisma as any).customerFeedback.findMany({
        where,
        orderBy: { feedbackDate: "desc" },
        include: {
          product: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      prisma.product.findMany({
        where: { businessId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const rawFeedbacks: RawFeedbackItem[] = feedbacks.map((f: any) => ({
      id: f.id,
      businessId: f.businessId,
      customerId: f.customerId,
      customerName: f.customer?.name || null,
      productId: f.productId,
      productName: f.product?.name || null,
      saleId: f.saleId,
      batchId: f.batchId,
      createdById: f.createdById,
      createdByName: f.createdBy?.name || null,
      source: f.source,
      category: f.category,
      comments: f.comments,
      rating: f.rating,
      feedbackDate: f.feedbackDate,
      status: f.status,
      internalNotes: f.internalNotes,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    return calculateProductInsights(rawFeedbacks, products);
  } catch (err: any) {
    if (err.code === "P2021") {
      return calculateProductInsights([], []);
    }
    throw err;
  }
}

/**
 * Returns available customers, products, and optionally customer sales for the record feedback form.
 * Safe for both OWNER and WORKER without exposing confidential cost or profit data.
 */
export async function getFeedbackFormData(
  businessId: string,
  authUser: { id: string; role: Role },
  options?: { customerId?: string; productId?: string }
) {
  await ensureDefaultBusiness(businessId);

  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: { businessId, isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        brand: true,
        size: true,
        sellingPrice: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  let customerSales: any[] = [];
  if (options?.customerId) {
    customerSales = await prisma.sale.findMany({
      where: {
        businessId,
        customerId: options.customerId,
        status: { notIn: ["VOIDED", "REFUNDED"] },
      },
      select: {
        id: true,
        saleDate: true,
        totalAmount: true,
        paymentStatus: true,
        saleItems: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { saleDate: "desc" },
      take: 10,
    });
  }

  let productBatches: any[] = [];
  if (options?.productId) {
    // Only fetch active batches for this product if reliable
    productBatches = await prisma.batchItem.findMany({
      where: {
        productId: options.productId,
        quantityRemaining: { gt: 0 },
        batch: { businessId, status: "ACTIVE" },
      },
      select: {
        batchId: true,
        quantityRemaining: true,
        batch: {
          select: {
            id: true,
            reference: true,
            purchaseDate: true,
          },
        },
      },
      orderBy: { batch: { purchaseDate: "desc" } },
      take: 5,
    });
  }

  return {
    customers: customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      brand: p.brand,
      size: p.size,
      sellingPrice: Number(p.sellingPrice),
    })),
    customerSales: customerSales.map((s) => ({
      id: s.id,
      saleDate: s.saleDate,
      totalAmount: Number(s.totalAmount),
      paymentStatus: s.paymentStatus,
      products: s.saleItems.map((item: any) => ({
        id: item.productId,
        name: item.product?.name,
        quantity: item.quantity,
      })),
    })),
    productBatches: productBatches.map((b) => ({
      batchId: b.batchId,
      reference: b.batch.reference,
      purchaseDate: b.batch.purchaseDate,
      quantityRemaining: b.quantityRemaining,
    })),
  };
}
