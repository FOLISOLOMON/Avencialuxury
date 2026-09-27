import { z } from "zod";
import { PaymentMethod, ExpenseCategory, AllocationType } from "@prisma/client";

// Product Schemas
export const createProductSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
  name: z.string().min(1, "Product name is required"),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  sellingPrice: z.number().min(0, "Selling price cannot be negative"),
  defaultCostPrice: z.number().min(0, "Default cost price cannot be negative"),
  lowStockThreshold: z
    .number()
    .int()
    .min(0, "Threshold must be 0 or positive")
    .optional()
    .default(3),
  initialStock: z.number().int().min(0, "Initial stock cannot be negative").optional(),
});

export const updateProductSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
  businessId: z.string().min(1, "Business ID is required"),
  name: z.string().min(1, "Product name is required").optional(),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  sellingPrice: z.number().min(0, "Selling price cannot be negative").optional(),
  defaultCostPrice: z.number().min(0, "Default cost price cannot be negative").optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// Batch Schemas
export const batchItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantityPurchased: z.number().int().positive("Quantity purchased must be greater than zero"),
  unitCost: z.number().min(0, "Unit cost cannot be negative"),
});

export const createBatchSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
  reference: z.string().min(1, "Batch reference is required"),
  purchaseDate: z.coerce.date().default(() => new Date()),
  additionalCosts: z.number().min(0, "Additional costs cannot be negative").optional().default(0),
  notes: z.string().optional().nullable(),
  items: z.array(batchItemSchema).min(0).optional().default([]),
});

// Sale Schemas
export const saleItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive("Quantity must be greater than zero"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
});

export const createSaleSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
  customerId: z.string().optional().nullable(),
  saleDate: z.coerce.date().optional().default(() => new Date()),
  discount: z.number().min(0, "Discount cannot be negative").optional().default(0),
  paymentMethod: z.nativeEnum(PaymentMethod).optional().default(PaymentMethod.CASH),
  notes: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, "A sale must contain at least one item"),
});

// Expense Schema
export const createExpenseSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
  batchId: z.string().optional().nullable(),
  category: z.nativeEnum(ExpenseCategory, {
    errorMap: () => ({ message: "Invalid expense category" }),
  }),
  description: z.string().min(1, "Expense description is required"),
  amount: z.number().positive("Expense amount must be greater than zero"),
  expenseDate: z.coerce.date().optional().default(() => new Date()),
  notes: z.string().optional().nullable(),
});

// Profit Allocation Schema
export const allocateProfitSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
  amount: z.number().positive("Allocation amount must be greater than zero"),
  type: z.nativeEnum(AllocationType, {
    errorMap: () => ({ message: "Invalid profit allocation type" }),
  }),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Customer Schemas
export const createCustomerSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")).nullable(),
  notes: z.string().optional().nullable(),
});

export const updateCustomerSchema = z.object({
  id: z.string().min(1, "Customer ID is required"),
  businessId: z.string().min(1, "Business ID is required"),
  name: z.string().min(1, "Customer name is required").optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")).nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Report Filter Schema
export const reportDateFilterSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// Type exports inferred from schemas
export type CreateProductSchemaInput = z.infer<typeof createProductSchema>;
export type UpdateProductSchemaInput = z.infer<typeof updateProductSchema>;
export type BatchItemSchemaInput = z.infer<typeof batchItemSchema>;
export type CreateBatchSchemaInput = z.infer<typeof createBatchSchema>;
export type SaleItemSchemaInput = z.infer<typeof saleItemSchema>;
export type CreateSaleSchemaInput = z.infer<typeof createSaleSchema>;
export type CreateExpenseSchemaInput = z.infer<typeof createExpenseSchema>;
export type AllocateProfitSchemaInput = z.infer<typeof allocateProfitSchema>;
export type CreateCustomerSchemaInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerSchemaInput = z.infer<typeof updateCustomerSchema>;
export type ReportDateFilterSchemaInput = z.infer<typeof reportDateFilterSchema>;
