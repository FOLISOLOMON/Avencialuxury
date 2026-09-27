"use server";

import { reportDateFilterSchema } from "@/lib/validation/schemas";
import {
  getSalesReport,
  getProductReport,
  getBatchReport,
  getExpenseReport,
  getProfitReport,
  ReportFilter,
} from "@/lib/services/reports";

export type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getSalesReportAction(
  businessId: string,
  filter?: ReportFilter
): Promise<ActionResponse> {
  try {
    if (!businessId) throw new Error("Business ID is required");
    const validatedFilter = filter ? reportDateFilterSchema.parse(filter) : undefined;
    const report = await getSalesReport(businessId, validatedFilter);
    return { success: true, data: report };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to generate sales report" };
  }
}

export async function getProductReportAction(
  businessId: string,
  filter?: ReportFilter
): Promise<ActionResponse> {
  try {
    if (!businessId) throw new Error("Business ID is required");
    const validatedFilter = filter ? reportDateFilterSchema.parse(filter) : undefined;
    const report = await getProductReport(businessId, validatedFilter);
    return { success: true, data: report };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to generate product report" };
  }
}

export async function getBatchReportAction(
  businessId: string,
  filter?: ReportFilter
): Promise<ActionResponse> {
  try {
    if (!businessId) throw new Error("Business ID is required");
    const validatedFilter = filter ? reportDateFilterSchema.parse(filter) : undefined;
    const report = await getBatchReport(businessId, validatedFilter);
    return { success: true, data: report };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to generate batch report" };
  }
}

export async function getExpenseReportAction(
  businessId: string,
  filter?: ReportFilter
): Promise<ActionResponse> {
  try {
    if (!businessId) throw new Error("Business ID is required");
    const validatedFilter = filter ? reportDateFilterSchema.parse(filter) : undefined;
    const report = await getExpenseReport(businessId, validatedFilter);
    return { success: true, data: report };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to generate expense report" };
  }
}

export async function getProfitReportAction(
  businessId: string,
  filter?: ReportFilter
): Promise<ActionResponse> {
  try {
    if (!businessId) throw new Error("Business ID is required");
    const validatedFilter = filter ? reportDateFilterSchema.parse(filter) : undefined;
    const report = await getProfitReport(businessId, validatedFilter);
    return { success: true, data: report };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to generate profit report" };
  }
}
