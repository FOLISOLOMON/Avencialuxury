import { AVENCIA_TOOLS, executeAITool } from "./tools";
import { AIChatRequest, AIChatResponse } from "./types";

const SYSTEM_PROMPT = `You are "Ask Avencia", the official AI business analyst for Avencia.
You answer questions using authoritative data retrieved from Avencia's backend tools.

CRITICAL RULES:
1. Answer ONLY the specific question asked by the user. Do NOT automatically provide a business health overview or complete business summary.
2. Select the MINIMUM set of Avencia tools required to answer the user's question:
   - For low-stock / restocking questions ("Which products are low on stock?"): Call ONLY 'get_low_stock_products'. Return ONLY inventory and stock alert information. Do NOT include revenue, profit, expenses, or debt.
   - For customer debt questions ("Who is owing me?", "Who owes me?"): Call ONLY 'get_customer_balances' (or 'get_customer_summary' for a named customer). Return ONLY customer debt details. Do NOT include revenue, profit, expenses, or low stock.
   - For sales questions ("How much did I sell this month?"): Call ONLY 'get_sales_summary' or 'get_sales_list'. Return sales and revenue metrics.
   - For profit questions ("How much profit did I make?"): Call ONLY 'get_sales_summary'. Focus ONLY on gross profit, expenses, net profit, and profit margin.
   - For expense questions ("How much did I spend?"): Call ONLY 'get_expense_summary'. Return total expenses and category breakdown.
   - For product performance / best selling questions ("What products are selling the most?"): Call ONLY 'get_product_performance'. Return top products by units sold and revenue.
   - For batch questions ("How much profit did Batch 4 make?"): Call ONLY 'get_batch_summary'. Return batch-specific metrics.
3. Only call 'get_business_summary' or 'get_dashboard_summary' when the user EXPLICITLY asks for a general business overview, business summary, business health report, overall performance, or asks "how is my business doing?".
4. If a tool returns zero results (e.g. no debtors or no low stock), state clearly that there are no items (e.g. "No customers currently have an outstanding balance" or "No products are currently below the low-stock threshold"). Do NOT switch to a business overview.
5. If a tool execution fails, report the failure clearly for that specific request (e.g. "I couldn't retrieve the low-stock products. Please try again."). Do NOT substitute 'get_business_summary' or any other tool on error.
6. Treat backend tool results as the absolute source of truth. Never fabricate numbers.
7. Be concise, direct, professional, and focused. Format responses with clear markdown headers, bullet points, and currency values in GH₵ (Ghana Cedi).`;

interface ToolIntent {
  toolName: string;
  args: Record<string, any>;
  isProfitOnly?: boolean;
}

/**
 * Intent classifier and tool selector.
 * NEVER defaults to get_business_summary unless explicitly requested.
 */
function classifyIntentAndSelectTool(userQuery: string): ToolIntent {
  const q = userQuery.toLowerCase().trim();

  // 1. EXPLICIT BUSINESS OVERVIEW ONLY
  const isExplicitOverview =
    q.includes("business overview") ||
    q.includes("business summary") ||
    q.includes("business health") ||
    q.includes("overall performance") ||
    q.includes("how is my business doing") ||
    q.includes("how is avencia performing") ||
    q.includes("complete summary") ||
    q.includes("complete business report") ||
    q.includes("monthly business summary") ||
    q.includes("performance summary") ||
    q.includes("overall business");

  if (isExplicitOverview) {
    return { toolName: "get_business_summary", args: { timeframe: extractTimeframe(q) } };
  }

  // 2. LOW STOCK / INVENTORY ALERTS
  if (
    q.includes("low stock") ||
    q.includes("out of stock") ||
    q.includes("restock") ||
    q.includes("running low") ||
    q.includes("below threshold") ||
    q.includes("almost finished") ||
    q.includes("stock alert") ||
    q.includes("inventory low") ||
    q.includes("stock level")
  ) {
    return { toolName: "get_low_stock_products", args: {} };
  }

  // 3. CUSTOMER DEBT / WHO OWES ME
  if (
    q.includes("who owe") ||
    q.includes("who is owing") ||
    q.includes("debt") ||
    q.includes("debtor") ||
    q.includes("unpaid") ||
    q.includes("outstanding balance") ||
    q.includes("haven't paid") ||
    q.includes("havent paid") ||
    q.includes("still owe")
  ) {
    // Check if asking about a specific customer name (e.g. "Does Myy owe me?", "How much does John owe?")
    const specificMatch = userQuery.match(/(?:does|is|how much does|how much is)\s+([a-zA-Z0-9\s]+?)\s+(?:owe|owing|have debt|have a balance)/i);
    if (specificMatch && specificMatch[1]) {
      const name = specificMatch[1].trim();
      if (name.length > 1 && !["anyone", "somebody", "a customer", "people"].includes(name.toLowerCase())) {
        return { toolName: "get_customer_summary", args: { customerNameOrId: name } };
      }
    }
    return { toolName: "get_customer_balances", args: {} };
  }

  // 4. EXPENSES / SPENDING
  if (
    q.includes("expense") ||
    q.includes("spend") ||
    q.includes("spent") ||
    q.includes("cost") ||
    q.includes("outflow")
  ) {
    return { toolName: "get_expense_summary", args: { timeframe: extractTimeframe(q) } };
  }

  // 5. BEST SELLING / TOP PRODUCTS
  if (
    q.includes("best selling") ||
    q.includes("best-selling") ||
    q.includes("selling the most") ||
    q.includes("sold the most") ||
    q.includes("top product") ||
    q.includes("popular product") ||
    q.includes("product performance")
  ) {
    return { toolName: "get_product_performance", args: { timeframe: extractTimeframe(q) } };
  }

  // 6. BATCH PERFORMANCE
  if (q.includes("batch")) {
    const matchBatchNum = userQuery.match(/batch\s*(\d+|[a-zA-Z0-9_-]+)/i);
    const ref = matchBatchNum ? matchBatchNum[0] : "";
    return { toolName: "get_batch_summary", args: { batchRefOrId: ref } };
  }

  // 7. PROFIT (Pure profit query)
  if (q.includes("profit") || q.includes("margin") || q.includes("net profit") || q.includes("gross profit")) {
    return { toolName: "get_sales_summary", args: { timeframe: extractTimeframe(q) }, isProfitOnly: true };
  }

  // 8. SALES / REVENUE
  if (
    q.includes("sales") ||
    q.includes("sell") ||
    q.includes("sold") ||
    q.includes("revenue") ||
    q.includes("orders")
  ) {
    return { toolName: "get_sales_summary", args: { timeframe: extractTimeframe(q) } };
  }

  // 9. SPECIFIC CUSTOMER PROFILE
  if (q.includes("customer")) {
    const nameMatch = userQuery.replace(/customer|summary|details|info|profile|about|show|get/gi, "").trim();
    if (nameMatch.length > 2) {
      return { toolName: "get_customer_summary", args: { customerNameOrId: nameMatch } };
    }
  }

  // 10. UNMATCHED — DO NOT return get_business_summary!
  return { toolName: "unknown", args: {} };
}

function extractTimeframe(q: string): string {
  if (q.includes("today")) return "today";
  if (q.includes("yesterday")) return "yesterday";
  if (q.includes("this week")) return "this week";
  if (q.includes("last week")) return "last week";
  if (q.includes("this month")) return "this month";
  if (q.includes("last month")) return "last month";
  if (q.includes("this year")) return "this year";
  if (q.includes("last 7 days") || q.includes("7 days")) return "last 7 days";
  return "this month";
}

/**
 * Format deterministic responses for tools.
 */
function formatFallbackResponse(
  toolName: string,
  toolResult: any,
  intent?: ToolIntent
): { text: string; payload?: { type: string; data: any } } {
  if (!toolResult.success) {
    return {
      text: `I couldn't retrieve the requested ${toolName.replace("get_", "").replace("_", " ")} data. Error: ${toolResult.error}`,
    };
  }

  const data = toolResult.data;

  switch (toolName) {
    case "get_low_stock_products": {
      if (data.lowStockCount === 0 && data.outOfStockCount === 0) {
        return {
          text: `### Stock Looks Good\n\nNo products are currently below the low-stock threshold or out of stock. All product inventory levels are adequate.`,
          payload: { type: "low_stock", data },
        };
      }

      let text = `### Low Stock Products\n\nYou currently have ${data.lowStockCount + data.outOfStockCount} product(s) requiring attention:\n\n`;

      if (data.outOfStockCount > 0) {
        text += `#### Out of Stock (${data.outOfStockCount}):\n`;
        data.outOfStockItems.forEach((p: any) => {
          text += `- **${p.name}** — 0 remaining\n`;
        });
        text += `\n`;
      }

      if (data.lowStockCount > 0) {
        text += `#### Low Stock (${data.lowStockCount}):\n`;
        data.lowStockItems.forEach((p: any) => {
          text += `- **${p.name}** — ${p.currentStock} remaining (Threshold: ${p.threshold})\n`;
        });
      }

      text += `\n*These products may need restocking.*`;

      return {
        text,
        payload: { type: "low_stock", data },
      };
    }

    case "get_customer_balances": {
      if (data.debtorCount === 0) {
        return {
          text: `### No Outstanding Customer Balances\n\nAll customers currently have a balance of GH₵0.00. No outstanding customer debt found.`,
          payload: { type: "customer_balances", data },
        };
      }

      const debtorList = data.debtors
        .map((d: any) => `- **${d.name}** — GH₵${d.outstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)
        .join("\n");

      return {
        text: `### Customers With Outstanding Balances\n\n${debtorList}\n\n**Total Outstanding Debt**:\nGH₵${data.totalOutstandingDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        payload: { type: "customer_balances", data },
      };
    }

    case "get_customer_summary": {
      if (!data.found) {
        return { text: data.message || "Customer not found." };
      }

      if (data.outstandingBalance <= 0) {
        return {
          text: `### ${data.name}\n\n**Outstanding Balance**:\nGH₵0.00\n\n${data.name} currently has no outstanding balance.\n\n- **Total Orders**: ${data.totalOrders}\n- **Total Purchased**: GH₵${data.totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          payload: { type: "customer_summary", data },
        };
      }

      return {
        text: `### ${data.name}\n\n- **Outstanding Balance**: GH₵${data.outstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Total Orders**: ${data.totalOrders}\n- **Total Purchased**: GH₵${data.totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Phone**: ${data.phone || "Not provided"}`,
        payload: { type: "customer_summary", data },
      };
    }

    case "get_sales_summary": {
      if (intent?.isProfitOnly) {
        const totalExp = (data.revenue - data.grossProfit) > 0 ? (data.revenue - data.netProfit) : 0;
        return {
          text: `### Profit (${data.timeframe})\n\n- **Gross Profit**: GH₵${data.grossProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Net Profit**: GH₵${data.netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Profit Margin**: ${data.profitMarginPct}%`,
          payload: { type: "sales_summary", data },
        };
      }

      return {
        text: `### Sales (${data.timeframe})\n\n- **Revenue**: GH₵${data.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Total Orders**: ${data.transactions}\n- **Amount Collected**: GH₵${data.amountCollected.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Outstanding**: GH₵${data.outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        payload: { type: "sales_summary", data },
      };
    }

    case "get_expense_summary": {
      const catList = data.categoryBreakdown && data.categoryBreakdown.length > 0
        ? data.categoryBreakdown.map((c: any) => `- **${c.category}**: GH₵${c.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${c.percentage}%)`).join("\n")
        : "";

      return {
        text: `### Expenses (${data.timeframe})\n\n- **Total Expenses**: GH₵${data.totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Total Expense Records**: ${data.expenseCount}\n${catList ? `\n#### Expense Categories:\n${catList}` : ""}`,
        payload: { type: "expense_summary", data },
      };
    }

    case "get_product_performance": {
      const topList = (data.topSellingByRevenue || [])
        .map((p: any, idx: number) => `${idx + 1}. **${p.name}** — ${p.unitsSold} sold (GH₵${p.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })} revenue)`)
        .join("\n");

      return {
        text: `### Best-Selling Products\n\n${topList || "No product sales recorded for this timeframe."}\n\n- **Total Units Sold**: ${data.totalUnitsSold}`,
        payload: { type: "product_performance", data },
      };
    }

    case "get_batch_summary": {
      if (data.batches && data.batches.length > 0) {
        const bList = data.batches
          .map(
            (b: any) =>
              `#### ${b.reference}\n- **Status**: ${b.status}\n- **Revenue**: GH₵${b.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Investment**: GH₵${b.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Net Profit**: GH₵${b.netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
          )
          .join("\n\n");

        return {
          text: `### Batch Performance\n\n${bList}`,
          payload: { type: "batch_summary", data },
        };
      }

      return {
        text: `### Stock Batches Summary\n\n- **Total Batches**: ${data.totalBatches} (${data.activeBatches} Active)\n- **Total Investment**: GH₵${data.totalInvestment.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Total Revenue**: GH₵${data.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Realized Net Profit**: GH₵${data.totalNetProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        payload: { type: "batch_summary", data },
      };
    }

    case "get_business_summary": {
      return {
        text: `### Business Health Overview (${data.timeframe})\n\n- **Revenue**: GH₵${data.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Amount Collected**: GH₵${data.amountCollected.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Outstanding Debt**: GH₵${data.outstandingDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Gross Profit**: GH₵${data.grossProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Expenses**: GH₵${data.totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Net Profit**: GH₵${data.netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n- **Total Orders**: ${data.totalOrders}\n- **Low Stock Items**: ${data.lowStockCount}`,
        payload: { type: "business_summary", data },
      };
    }

    case "unknown":
    default: {
      return {
        text: `I can answer specific questions about your Avencia business records. What would you like to know?\n\n- **Low Stock**: *"Which products are low on stock?"*\n- **Customer Debt**: *"Who is owing me?"* or *"Does Myy owe me?"*\n- **Sales**: *"How much did I sell this month?"*\n- **Profit**: *"How much profit did I make this month?"*\n- **Expenses**: *"How much did I spend this month?"*\n- **Best-Selling Products**: *"What products are selling the most?"*\n- **Batch Performance**: *"How is Batch 4 performing?"*\n- **Business Overview**: *"Give me a business overview for this month."*`,
      };
    }
  }
}

/**
 * Process AI Chat Request with Gemini API or Fallback Orchestrator
 */
export async function processAIChat(
  request: AIChatRequest,
  businessId: string
): Promise<AIChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const modelName = process.env.AI_MODEL || "gemini-2.5-flash";

  const userMessages = request.messages.filter((m) => m.role === "user");
  const lastUserMsg = userMessages[userMessages.length - 1]?.content || "";

  if (!lastUserMsg.trim()) {
    return {
      success: false,
      message: "Please enter a question about your business.",
    };
  }

  // 1. If Gemini API Key is available, invoke Gemini with strict system instruction
  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const contents = request.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const toolsPayload = [
        {
          functionDeclarations: AVENCIA_TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];

      const firstResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents,
          tools: toolsPayload,
        }),
      });

      if (firstResponse.ok) {
        const resData = await firstResponse.json();
        const candidate = resData.candidates?.[0];
        const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall);

        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0].functionCall;
          const toolResult = await executeAITool(call.name, call.args || {}, businessId);

          if (!toolResult.success) {
            return {
              success: false,
              message: `I couldn't retrieve the requested ${call.name.replace("get_", "").replace("_", " ")} data. Error: ${toolResult.error}`,
              sourcesUsed: [`Avencia Tool Error: ${call.name}`],
            };
          }

          // Second turn: send tool execution output back to Gemini
          const secondContents = [
            ...contents,
            candidate.content,
            {
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: call.name,
                    response: { result: toolResult.data },
                  },
                },
              ],
            },
          ];

          const secondResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }],
              },
              contents: secondContents,
            }),
          });

          if (secondResponse.ok) {
            const secondData = await secondResponse.json();
            const textResponse = secondData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) {
              return {
                success: true,
                message: textResponse,
                structuredPayload: {
                  type: call.name,
                  data: toolResult.data,
                },
                sourcesUsed: [toolResult.sourceContext || `Avencia Service: ${call.name}`],
              };
            }
          }
        } else {
          const directText = candidate?.content?.parts?.[0]?.text;
          if (directText) {
            return {
              success: true,
              message: directText,
            };
          }
        }
      }
    } catch (geminiError) {
      console.warn("Gemini API call failed, falling back to deterministic orchestrator:", geminiError);
    }
  }

  // 2. Deterministic Intent Classifier Fallback Orchestrator
  const intent = classifyIntentAndSelectTool(lastUserMsg);

  if (intent.toolName === "unknown") {
    const formatted = formatFallbackResponse("unknown", { success: true, data: {} });
    return {
      success: true,
      message: formatted.text,
    };
  }

  const toolResult = await executeAITool(intent.toolName, intent.args, businessId);

  if (!toolResult.success) {
    return {
      success: false,
      message: `I couldn't retrieve the requested data. Error: ${toolResult.error}`,
      sourcesUsed: [`Avencia Service: ${intent.toolName}`],
    };
  }

  const formatted = formatFallbackResponse(intent.toolName, toolResult, intent);

  return {
    success: true,
    message: formatted.text,
    structuredPayload: formatted.payload,
    sourcesUsed: [toolResult.sourceContext || `Avencia Business Service`],
  };
}
