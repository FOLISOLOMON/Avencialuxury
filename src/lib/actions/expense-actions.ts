"use server";

import { revalidatePath } from "next/cache";
import { createExpenseSchema } from "@/lib/validation/schemas";
import { createExpense, getExpenses, CreateExpenseInput } from "@/lib/services/expenses";
import { ExpenseCategory } from "@prisma/client";

export type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createExpenseAction(input: CreateExpenseInput): Promise<ActionResponse> {
  try {
    const validatedData = createExpenseSchema.parse(input);
    const expense = await createExpense(validatedData);

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/batches");

    return { success: true, data: expense };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to record expense" };
  }
}

export async function getExpensesAction(
  businessId: string,
  category?: ExpenseCategory
): Promise<ActionResponse> {
  try {
    if (!businessId) throw new Error("Business ID is required");
    const expenses = await getExpenses(businessId, category);
    return { success: true, data: expenses };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch expenses" };
  }
}
