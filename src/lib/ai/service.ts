import { processAIChat } from "./provider";
import { AIChatRequest, AIChatResponse } from "./types";
import { DEFAULT_BUSINESS_ID, ensureDefaultBusiness } from "@/lib/db/prisma";

/**
 * High level entry point for Ask Avencia AI Assistant
 */
export async function askAvencia(
  request: AIChatRequest,
  businessId: string = DEFAULT_BUSINESS_ID
): Promise<AIChatResponse> {
  await ensureDefaultBusiness(businessId);
  return processAIChat(request, businessId);
}
