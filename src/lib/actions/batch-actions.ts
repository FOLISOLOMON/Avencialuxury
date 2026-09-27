"use server";

import { revalidatePath } from "next/cache";
import { createBatchSchema } from "@/lib/validation/schemas";
import { createBatch, getActiveBatches, closeBatch, updateBatchAdditionalCosts, CreateBatchInput } from "@/lib/services/batches";

export type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createBatchAction(input: CreateBatchInput): Promise<ActionResponse> {
  try {
    const validatedData = createBatchSchema.parse(input);
    const batch = await createBatch(validatedData);

    revalidatePath("/batches");
    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return { success: true, data: batch };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create batch" };
  }
}

export async function getActiveBatchesAction(businessId: string): Promise<ActionResponse> {
  try {
    if (!businessId) throw new Error("Business ID is required");
    const batches = await getActiveBatches(businessId);
    return { success: true, data: batches };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch active batches" };
  }
}

export async function closeBatchAction(batchId: string): Promise<ActionResponse> {
  try {
    if (!batchId) throw new Error("Batch ID is required");
    const batch = await closeBatch(batchId);

    revalidatePath("/batches");
    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return { success: true, data: batch };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to close batch" };
  }
}

export async function updateBatchAdditionalCostsAction(
  batchId: string,
  businessId: string,
  additionalCosts: number
): Promise<ActionResponse> {
  try {
    if (!batchId || !businessId) throw new Error("Batch ID and Business ID are required");
    const batch = await updateBatchAdditionalCosts(batchId, businessId, additionalCosts);

    revalidatePath("/batches");
    revalidatePath("/inventory");
    revalidatePath("/reports");

    return { success: true, data: batch };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update additional costs" };
  }
}
