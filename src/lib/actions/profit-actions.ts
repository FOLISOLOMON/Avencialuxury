"use server";

import { revalidatePath } from "next/cache";
import { allocateProfitSchema } from "@/lib/validation/schemas";
import { allocateProfit, getFinancialSummary, CreateAllocationInput } from "@/lib/services/profit";

export type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function allocateProfitAction(input: CreateAllocationInput): Promise<ActionResponse> {
  try {
    const validatedData = allocateProfitSchema.parse(input);
    const allocation = await allocateProfit(validatedData);

    revalidatePath("/profit");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return { success: true, data: allocation };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to allocate profit" };
  }
}

export async function getFinancialSummaryAction(businessId: string): Promise<ActionResponse> {
  try {
    if (!businessId) throw new Error("Business ID is required");
    const summary = await getFinancialSummary(businessId);
    return { success: true, data: summary };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch financial summary" };
  }
}
