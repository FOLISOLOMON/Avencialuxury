"use server";

import { revalidatePath } from "next/cache";
import { createSaleSchema } from "@/lib/validation/schemas";
import { createSale, voidSale, CreateSaleInput } from "@/lib/services/sales";

export type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createSaleAction(input: CreateSaleInput): Promise<ActionResponse> {
  try {
    const validatedData = createSaleSchema.parse(input);
    const sale = await createSale(validatedData);

    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/batches");
    revalidatePath("/customers");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return { success: true, data: sale };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to process sale" };
  }
}

export async function voidSaleAction(saleId: string, reason?: string): Promise<ActionResponse> {
  try {
    const sale = await voidSale(saleId, reason);

    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/batches");
    revalidatePath("/customers");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return { success: true, data: sale };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to void sale" };
  }
}
