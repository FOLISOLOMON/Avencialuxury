"use server";

import { revalidatePath } from "next/cache";
import { createCustomerSchema, updateCustomerSchema } from "@/lib/validation/schemas";
import {
  createCustomer,
  updateCustomer,
  getCustomers,
  getCustomerById,
  deleteCustomer,
  getCustomerPurchaseHistory,
  getCustomerSpendingMetrics,
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@/lib/services/customers";

export type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createCustomerAction(input: CreateCustomerInput): Promise<ActionResponse> {
  try {
    const validatedData = createCustomerSchema.parse(input);
    const customer = await createCustomer(validatedData);

    revalidatePath("/customers");
    revalidatePath("/sales");
    revalidatePath("/dashboard");

    return { success: true, data: customer };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create customer" };
  }
}

export async function updateCustomerAction(input: UpdateCustomerInput): Promise<ActionResponse> {
  try {
    const validatedData = updateCustomerSchema.parse(input);
    const customer = await updateCustomer(validatedData);

    revalidatePath("/customers");
    revalidatePath("/sales");
    revalidatePath("/dashboard");

    return { success: true, data: customer };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update customer" };
  }
}

export async function getCustomersAction(businessId: string, search?: string): Promise<ActionResponse> {
  try {
    if (!businessId) throw new Error("Business ID is required");
    const customers = await getCustomers(businessId, search);
    return { success: true, data: customers };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch customers" };
  }
}

export async function getCustomerByIdAction(
  customerId: string,
  businessId: string
): Promise<ActionResponse> {
  try {
    if (!customerId || !businessId) throw new Error("Customer ID and Business ID are required");
    const customer = await getCustomerById(customerId, businessId);
    return { success: true, data: customer };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch customer" };
  }
}

export async function deleteCustomerAction(
  customerId: string,
  businessId: string
): Promise<ActionResponse> {
  try {
    if (!customerId || !businessId) throw new Error("Customer ID and Business ID are required");
    await deleteCustomer(customerId, businessId);

    revalidatePath("/customers");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete customer" };
  }
}

export async function getCustomerPurchaseHistoryAction(
  customerId: string,
  businessId: string
): Promise<ActionResponse> {
  try {
    if (!customerId || !businessId) throw new Error("Customer ID and Business ID are required");
    const history = await getCustomerPurchaseHistory(customerId, businessId);
    return { success: true, data: history };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch customer purchase history" };
  }
}

export async function getCustomerSpendingMetricsAction(
  customerId: string,
  businessId: string
): Promise<ActionResponse> {
  try {
    if (!customerId || !businessId) throw new Error("Customer ID and Business ID are required");
    const metrics = await getCustomerSpendingMetrics(customerId, businessId);
    return { success: true, data: metrics };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch customer spending metrics" };
  }
}
