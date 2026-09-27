import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { ExpenseCategory, Prisma } from "@prisma/client";

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

  return await prisma.expense.create({
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
