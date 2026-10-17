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
}

export interface AIChatRequest {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  businessId?: string;
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
}
