"use server";

import { revalidatePath } from "next/cache";
import {
  recordSavingsTransaction,
  getSavingsSummary,
  getSavingsTransactions,
  RecordSavingsInput,
} from "@/lib/services/savings";

export type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function recordSavingsTransactionAction(
  input: RecordSavingsInput
): Promise<ActionResponse> {
  try {
    const transaction = await recordSavingsTransaction(input);

    revalidatePath("/profit");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return { success: true, data: transaction };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to record savings transaction" };
  }
}

export async function getSavingsSummaryAction(businessId: string): Promise<ActionResponse> {
  try {
    if (!businessId) throw new Error("Business ID is required");
    const summary = await getSavingsSummary(businessId);
    return { success: true, data: summary };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch savings summary" };
  }
}

export async function getSavingsTransactionsAction(businessId: string): Promise<ActionResponse> {
  try {
    if (!businessId) throw new Error("Business ID is required");
    const txns = await getSavingsTransactions(businessId);
    return { success: true, data: txns };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch savings transactions" };
  }
}
