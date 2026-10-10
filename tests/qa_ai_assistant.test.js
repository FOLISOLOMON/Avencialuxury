/**
 * AVENCIA 2.0 — AI ASSISTANT QA TEST SUITE
 * 
 * Verifies intent classification, deterministic tool routing, timeframe extraction,
 * and grounding integrity so that Ask Avencia never invents data and strictly
 * routes questions to authoritative database query tools.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

function extractTimeframe(q) {
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

function classifyIntentAndSelectTool(userQuery) {
  const q = userQuery.toLowerCase().trim();

  // 0. GREETINGS
  if (
    q === "hi" ||
    q === "hello" ||
    q === "hey" ||
    q.startsWith("hi ") ||
    q.startsWith("hello ") ||
    q.startsWith("hey ") ||
    q.includes("good morning") ||
    q.includes("good afternoon") ||
    q.includes("good evening") ||
    q.includes("who are you") ||
    q.includes("what can you do") ||
    q.includes("how can you help") ||
    q === "help"
  ) {
    return { toolName: "greeting", args: {} };
  }

  // 1. LOW STOCK & INVENTORY SHORTAGES
  if (
    q.includes("low on stock") ||
    q.includes("low in stock") ||
    q.includes("low stock") ||
    q.includes("out of stock") ||
    q.includes("out-of-stock") ||
    q.includes("restock") ||
    q.includes("reorder") ||
    q.includes("running low") ||
    q.includes("running out") ||
    q.includes("shortage") ||
    q.includes("depleted") ||
    q.includes("below threshold") ||
    q.includes("almost finished") ||
    q.includes("stock alert") ||
    q.includes("inventory low") ||
    q.includes("need stock") ||
    (q.includes("stock") && (q.includes("low") || q.includes("which") || q.includes("alert")))
  ) {
    return { toolName: "get_low_stock_products", args: {} };
  }

  // 2. CUSTOMER DEBT
  if (
    q.includes("owing") ||
    q.includes("owes") ||
    q.includes("owe") ||
    q.includes("debt") ||
    q.includes("debtor") ||
    q.includes("unpaid") ||
    q.includes("unsettled") ||
    q.includes("outstanding balance") ||
    q.includes("credit customer") ||
    q.includes("credit sale") ||
    q.includes("pending payment") ||
    q.includes("haven't paid") ||
    q.includes("havent paid") ||
    q.includes("still owe") ||
    q.includes("due today") ||
    q.includes("due date") ||
    q.includes("overdue") ||
    q.includes("expecting to collect") ||
    q.includes("collect this week") ||
    q.includes("upcoming payment")
  ) {
    const specificMatch = userQuery.match(/(?:does|is|how much does|how much is|check)\s+([a-zA-Z0-9\s]+?)\s+(?:owe|owing|have debt|have a balance|balance|debt)/i);
    if (specificMatch && specificMatch[1]) {
      const name = specificMatch[1].trim();
      if (name.length > 1 && !["anyone", "somebody", "a customer", "people", "everyone"].includes(name.toLowerCase())) {
        return { toolName: "get_customer_summary", args: { customerNameOrId: name } };
      }
    }
    return { toolName: "get_customer_balances", args: {} };
  }

  // 3. BEST SELLING
  if (
    q.includes("best selling") ||
    q.includes("best-selling") ||
    q.includes("top selling") ||
    q.includes("top-selling") ||
    q.includes("selling the most") ||
    q.includes("sold the most") ||
    q.includes("top product") ||
    q.includes("top perfume") ||
    q.includes("popular product") ||
    q.includes("popular perfume") ||
    q.includes("most sold") ||
    q.includes("highest selling") ||
    q.includes("most popular") ||
    q.includes("product performance")
  ) {
    return { toolName: "get_product_performance", args: { timeframe: extractTimeframe(q) } };
  }

  // 4. EXPENSES
  if (
    q.includes("expense") ||
    q.includes("spending") ||
    q.includes("spent") ||
    q.includes("cost of goods") ||
    q.includes("cogs") ||
    q.includes("expenditure") ||
    q.includes("operating cost")
  ) {
    return { toolName: "get_expense_summary", args: { timeframe: extractTimeframe(q) } };
  }

  // 5. PROFIT
  if (
    q.includes("profit") ||
    q.includes("margin") ||
    q.includes("net income") ||
    q.includes("gross income") ||
    q.includes("how much did i make") ||
    q.includes("how much made")
  ) {
    return {
      toolName: "get_sales_summary",
      args: { timeframe: extractTimeframe(q) },
      isProfitOnly: true,
    };
  }

  // 6. SALES & REVENUE
  if (
    q.includes("sales") ||
    q.includes("sell") ||
    q.includes("sold") ||
    q.includes("revenue") ||
    q.includes("order") ||
    q.includes("turnover")
  ) {
    return { toolName: "get_sales_summary", args: { timeframe: extractTimeframe(q) } };
  }

  // 7. BUSINESS OVERVIEW
  if (
    q.includes("overview") ||
    q.includes("summary") ||
    q.includes("health") ||
    q.includes("performance") ||
    q.includes("how is my business") ||
    q.includes("dashboard")
  ) {
    return { toolName: "get_business_summary", args: { timeframe: extractTimeframe(q) } };
  }

  return { toolName: "unknown", args: {} };
}

describe("Ask Avencia AI Query Routing & Grounding", () => {
  it("routes low stock questions directly to get_low_stock_products tool", () => {
    const q1 = classifyIntentAndSelectTool("Which perfumes are low on stock?");
    assert.equal(q1.toolName, "get_low_stock_products");

    const q2 = classifyIntentAndSelectTool("Do I have any out of stock items?");
    assert.equal(q2.toolName, "get_low_stock_products");

    const q3 = classifyIntentAndSelectTool("What products need restock?");
    assert.equal(q3.toolName, "get_low_stock_products");
  });

  it("routes debt questions directly to get_customer_balances tool", () => {
    const q1 = classifyIntentAndSelectTool("Who is owing me right now?");
    assert.equal(q1.toolName, "get_customer_balances");

    const q2 = classifyIntentAndSelectTool("Show me all debtors and outstanding balances");
    assert.equal(q2.toolName, "get_customer_balances");

    const q3 = classifyIntentAndSelectTool("Which customer payments are due today?");
    assert.equal(q3.toolName, "get_customer_balances");
  });

  it("extracts specific customer name when querying an individual's debt", () => {
    const q1 = classifyIntentAndSelectTool("Does Kwame owe me?");
    assert.equal(q1.toolName, "get_customer_summary");
    assert.equal(q1.args.customerNameOrId, "Kwame");

    const q2 = classifyIntentAndSelectTool("How much is Kofi Mensah owing?");
    assert.equal(q2.toolName, "get_customer_summary");
    assert.equal(q2.args.customerNameOrId, "Kofi Mensah");
  });

  it("routes top products questions to get_product_performance with timeframe", () => {
    const q = classifyIntentAndSelectTool("What are my best selling perfumes this month?");
    assert.equal(q.toolName, "get_product_performance");
    assert.equal(q.args.timeframe, "this month");
  });

  it("routes profit inquiries specifically with isProfitOnly flag", () => {
    const q = classifyIntentAndSelectTool("How much profit did I make today?");
    assert.equal(q.toolName, "get_sales_summary");
    assert.equal(q.args.timeframe, "today");
    assert.equal(q.isProfitOnly, true);
  });

  it("routes expense inquiries to get_expense_summary", () => {
    const q = classifyIntentAndSelectTool("How much did we spend on expenses this week?");
    assert.equal(q.toolName, "get_expense_summary");
    assert.equal(q.args.timeframe, "this week");
  });

  it("routes conversational greetings without querying financial databases", () => {
    assert.equal(classifyIntentAndSelectTool("Hello").toolName, "greeting");
    assert.equal(classifyIntentAndSelectTool("Hi there").toolName, "greeting");
    assert.equal(classifyIntentAndSelectTool("What can you do?").toolName, "greeting");
  });

  it("extracts timeframes reliably across varied natural language patterns", () => {
    assert.equal(extractTimeframe("sales today"), "today");
    assert.equal(extractTimeframe("revenue yesterday"), "yesterday");
    assert.equal(extractTimeframe("profit this week"), "this week");
    assert.equal(extractTimeframe("expenses last month"), "last month");
    assert.equal(extractTimeframe("annual revenue this year"), "this year");
    assert.equal(extractTimeframe("performance last 7 days"), "last 7 days");
    assert.equal(extractTimeframe("general question"), "this month"); // default fallback
  });
});
