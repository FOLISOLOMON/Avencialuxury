"use server";

import { revalidatePath } from "next/cache";
import { createProductSchema, updateProductSchema } from "@/lib/validation/schemas";
import {
  createProduct,
  updateProduct,
  getProducts,
  getProductById,
  getProductByBarcode,
  deleteProduct,
  CreateProductInput,
  UpdateProductInput,
} from "@/lib/services/products";
import { serializePlainObject } from "@/lib/utils";

export type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createProductAction(input: CreateProductInput): Promise<ActionResponse> {
  try {
    const validatedData = createProductSchema.parse(input);
    const product = await createProduct(validatedData);

    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");

    return { success: true, data: serializePlainObject(product) };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create product" };
  }
}

export async function updateProductAction(input: UpdateProductInput): Promise<ActionResponse> {
  try {
    const validatedData = updateProductSchema.parse(input);
    const product = await updateProduct(validatedData);

    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");

    return { success: true, data: serializePlainObject(product) };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update product" };
  }
}

export async function getProductsAction(businessId: string, search?: string): Promise<ActionResponse> {
  try {
    if (!businessId) throw new Error("Business ID is required");
    const products = await getProducts(businessId, search);
    return { success: true, data: serializePlainObject(products) };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch products" };
  }
}

export async function getProductByIdAction(id: string, businessId: string): Promise<ActionResponse> {
  try {
    if (!id || !businessId) throw new Error("Product ID and Business ID are required");
    const product = await getProductById(id, businessId);
    return { success: true, data: serializePlainObject(product) };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch product" };
  }
}

export async function getProductByBarcodeAction(barcode: string, businessId: string): Promise<ActionResponse> {
  try {
    if (!barcode || !businessId) throw new Error("Barcode and Business ID are required");
    const product = await getProductByBarcode(barcode, businessId);
    return { success: true, data: serializePlainObject(product) };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch product by barcode" };
  }
}

export async function deleteProductAction(id: string, businessId: string): Promise<ActionResponse> {
  try {
    if (!id || !businessId) throw new Error("Product ID and Business ID are required");
    await deleteProduct(id, businessId);

    revalidatePath("/products");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete product" };
  }
}
