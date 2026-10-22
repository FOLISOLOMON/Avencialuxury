import { processAIChat } from "./provider";
import { AIChatRequest, AIChatResponse, AuthUserContext } from "./types";
import { DEFAULT_BUSINESS_ID, ensureDefaultBusiness } from "@/lib/db/prisma";

/**
 * High level entry point for Ask Avencia AI Assistant.
 * Receives verified session context to enforce role-based access.
 */
export async function askAvencia(
  request: AIChatRequest,
  businessId: string = DEFAULT_BUSINESS_ID,
  authUser?: AuthUserContext
): Promise<AIChatResponse> {
  await ensureDefaultBusiness(businessId);
  return processAIChat(request, businessId, authUser || request.authUser);
}
