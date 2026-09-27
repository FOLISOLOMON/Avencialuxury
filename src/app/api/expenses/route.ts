import { NextResponse } from "next/server";
import { createExpense, getExpenses } from "@/lib/services/expenses";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { ExpenseCategory } from "@prisma/client";
import { serializePlainObject } from "@/lib/utils";

const VALID_EXPENSE_CATEGORIES = new Set(Object.values(ExpenseCategory));

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as any;
    const expenses = await getExpenses(DEFAULT_BUSINESS_ID, category || undefined);
    return NextResponse.json({ success: true, data: serializePlainObject(expenses) });
  } catch (error: any) {
    console.error("GET /api/expenses error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!body.description || typeof body.description !== "string" || !body.description.trim()) {
      return NextResponse.json({ success: false, error: "Expense description is required" }, { status: 400 });
    }

    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Expense amount must be a positive number (> 0)" }, { status: 400 });
    }

    const category = body.category || ExpenseCategory.OPERATIONS;
    if (!VALID_EXPENSE_CATEGORIES.has(category)) {
      return NextResponse.json({ success: false, error: `Invalid expense category. Must be one of: ${Array.from(VALID_EXPENSE_CATEGORIES).join(", ")}` }, { status: 400 });
    }

    let expenseDate: Date | undefined = undefined;
    if (body.expenseDate) {
      const parsedDate = new Date(body.expenseDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ success: false, error: "Invalid expense date format" }, { status: 400 });
      }
      expenseDate = parsedDate;
    }

    const expense = await createExpense({
      businessId: DEFAULT_BUSINESS_ID,
      batchId: body.batchId ? String(body.batchId).trim() : undefined,
      category,
      description: body.description.trim(),
      amount,
      expenseDate,
      notes: body.notes ? String(body.notes).trim() : undefined,
    });

    return NextResponse.json({ success: true, data: serializePlainObject(expense) });
  } catch (error: any) {
    console.error("POST /api/expenses error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create expense" }, { status: 400 });
  }
}
