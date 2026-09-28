import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { ExpenseCategory, Prisma } from "@prisma/client";
import { createNotification } from "./notifications";
import { automationEngine } from "@/lib/automation/engine";
import { BusinessEventType } from "@/lib/automation/events";

export interface CreateExpenseInput {
  businessId: string;
  batchId?: string | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate?: Date | null;
  notes?: string | null;
}

export async function createExpense(input: CreateExpenseInput) {
  await ensureDefaultBusiness(input.businessId);

  if (!input.description || input.description.trim() === "") {
    throw new Error("Expense description is required");
  }
  if (input.amount <= 0) {
    throw new Error("Expense amount must be greater than zero");
  }

  const expense = await prisma.expense.create({
    data: {
      businessId: input.businessId,
      batchId: input.batchId || null,
      category: input.category,
      description: input.description.trim(),
      amount: new Prisma.Decimal(input.amount),
      expenseDate: input.expenseDate || new Date(),
      notes: input.notes?.trim() || null,
    },
  });

  try {
    const isLarge = input.amount >= 1000;
    await createNotification({
      businessId: input.businessId,
      type: isLarge ? "LARGE_EXPENSE" : "EXPENSE_CREATED",
      category: "FINANCE",
      severity: isLarge ? "WARNING" : "INFO",
      title: isLarge ? "Large Expense Logged" : "Expense Logged",
      message: `${isLarge ? "Large expense" : "Expense"} of GH₵${input.amount.toFixed(2)} logged for "${expense.description}" (${expense.category}).`,
      actionLabel: "View Expenses",
      actionUrl: "/expenses",
      entityType: "EXPENSE",
      entityId: expense.id,
    });

    automationEngine.emit({
      eventType: BusinessEventType.EXPENSE_CREATED,
      businessId: input.businessId,
      entityType: "EXPENSE",
      entityId: expense.id,
      dedupeKey: `EXPENSE_CREATED:${expense.id}`,
      metadata: {
        amount: input.amount,
        category: expense.category,
        description: expense.description,
        batchId: expense.batchId,
      },
    });

    if (isLarge) {
      automationEngine.emit({
        eventType: BusinessEventType.LARGE_EXPENSE_DETECTED,
        businessId: input.businessId,
        entityType: "EXPENSE",
        entityId: expense.id,
        dedupeKey: `LARGE_EXPENSE_DETECTED:${expense.id}`,
        metadata: {
          amount: input.amount,
          category: expense.category,
          description: expense.description,
          batchId: expense.batchId,
        },
      });
    }
  } catch (err) {
    console.error("Failed to trigger expense notification/event:", err);
  }

  return expense;
}

export async function getExpenses(businessId: string, category?: ExpenseCategory) {
  await ensureDefaultBusiness(businessId);

  const where: Prisma.ExpenseWhereInput = { businessId };
  if (category) {
    where.category = category;
  }

  return await prisma.expense.findMany({
    where,
    orderBy: { expenseDate: "desc" },
    include: {
      batch: {
        select: {
          reference: true,
        },
      },
    },
  });
}
