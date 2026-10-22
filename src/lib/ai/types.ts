import { Role } from "@prisma/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  structuredPayload?: {
    type: string;
    data: any;
  };
  sourcesUsed?: string[];
  isError?: boolean;
  code?: string;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export interface AIToolResult {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
  sourceContext?: string;
  requiresOwnerApproval?: boolean;
}

export interface AuthUserContext {
  id: string;
  name?: string;
  email?: string;
  role: Role;
  businessId: string;
}

export interface AIChatRequest {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  businessId?: string;
  authUser?: AuthUserContext;
}

export interface AIChatResponse {
  success: boolean;
  message: string;
  structuredPayload?: {
    type: string;
    data: any;
  };
  sourcesUsed?: string[];
  error?: string;
  code?: "MISSING_API_KEY" | "QUOTA_EXCEEDED" | "RATE_LIMITED" | "UNAUTHORIZED" | "FORBIDDEN" | "TIMEOUT" | "SERVER_ERROR";
  isConfigured?: boolean;
}

