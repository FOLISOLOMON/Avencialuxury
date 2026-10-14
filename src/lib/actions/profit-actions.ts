"use server";

import { revalidatePath } from "next/cache";
import { allocateProfitSchema, allocateProfit503020Schema } from "@/lib/validation/schemas";
import {
  allocateProfit,
  allocateProfit50_30_20,
  getFinancialSummary,
  CreateAllocationInput,
  Allocate503020Input,
} from "@/lib/services/profit";

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

export async function allocateProfit503020Action(input: Allocate503020Input): Promise<ActionResponse> {
  try {
    const validatedData = allocateProfit503020Schema.parse(input);
    const result = await allocateProfit50_30_20(validatedData);

    revalidatePath("/profit");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to allocate 50/30/20 profit" };
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
