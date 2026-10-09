import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { formatGhanaPhoneNumber } from "@/lib/utils";
import { createNotification } from "./notifications";
import { automationEngine } from "@/lib/automation/engine";
import { BusinessEventType } from "@/lib/automation/events";

export interface CreateCustomerInput {
  businessId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerInput {
  id: string;
  businessId: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isActive?: boolean | null;
}

export async function createCustomer(input: CreateCustomerInput) {
  await ensureDefaultBusiness(input.businessId);

  if (!input.name || input.name.trim() === "") {
    throw new Error("Customer name is required");
  }

  const formattedPhone = input.phone ? formatGhanaPhoneNumber(input.phone) : null;

  const customer = await prisma.customer.create({
    data: {
      businessId: input.businessId,
      name: input.name.trim(),
      phone: formattedPhone,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  try {
    await createNotification({
      businessId: input.businessId,
      type: "CUSTOMER_CREATED",
      category: "CUSTOMERS",
      severity: "INFO",
      title: "New Customer Added",
      message: `Customer ${customer.name} was added to directory.`,
      actionLabel: "View Customers",
      actionUrl: "/customers",
      entityType: "CUSTOMER",
      entityId: customer.id,
    });

    automationEngine.emit({
      eventType: BusinessEventType.CUSTOMER_CREATED,
      businessId: input.businessId,
      entityType: "CUSTOMER",
      entityId: customer.id,
      dedupeKey: `CUSTOMER_CREATED:${customer.id}`,
      metadata: {
        customerId: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
    });
  } catch (err) {
    console.error("Failed to trigger customer notification/event:", err);
  }

  return customer;
}

export async function getCustomers(businessId: string, search?: string) {
  await ensureDefaultBusiness(businessId);

  const where: any = {
    businessId,
    isActive: true,
  };

  if (search && search.trim() !== "") {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      sales: {
        where: { status: { notIn: ["VOIDED", "REFUNDED"] } },
        select: {
          id: true,
          totalAmount: true,
          grossProfit: true,
          balanceDue: true,
          paymentStatus: true,
          saleDate: true,
        },
      },
    },
  });

  return customers.map((c) => {
    const totalOrders = c.sales.length;
    const totalSpend = Math.round(c.sales.reduce((sum, s) => sum + s.totalAmount.toNumber(), 0) * 100) / 100;
    const totalProfit = Math.round(c.sales.reduce((sum, s) => sum + s.grossProfit.toNumber(), 0) * 100) / 100;
    const totalOutstandingDebt = Math.round(
      c.sales.reduce((sum, s) => sum + (s.balanceDue ? s.balanceDue.toNumber() : 0), 0) * 100
    ) / 100;
    const avgOrderValue = totalOrders > 0 ? Math.round((totalSpend / totalOrders) * 100) / 100 : 0;
    const lastPurchaseDate = c.sales.length > 0
      ? c.sales.reduce((latest, s) => (s.saleDate > latest ? s.saleDate : latest), c.sales[0].saleDate)
      : null;

    return {
      ...c,
      totalOrders,
      totalSpend,
      totalSpent: totalSpend,
      totalProfit,
      totalOutstandingDebt,
      totalDebt: totalOutstandingDebt,
      avgOrderValue,
      lastPurchaseDate,
    };
  });
}

export async function getCustomerById(id: string, businessId: string) {
  await ensureDefaultBusiness(businessId);

  const customer = await prisma.customer.findFirst({
    where: { id, businessId },
    include: {
      sales: {
        where: { status: { notIn: ["VOIDED", "REFUNDED"] } },
        orderBy: { saleDate: "desc" },
        include: {
          saleItems: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!customer) return null;

  const totalOrders = customer.sales.length;
  const totalSpend = Math.round(customer.sales.reduce((sum, s) => sum + s.totalAmount.toNumber(), 0) * 100) / 100;
  const totalProfit = Math.round(customer.sales.reduce((sum, s) => sum + s.grossProfit.toNumber(), 0) * 100) / 100;
  const totalOutstandingDebt = Math.round(
    customer.sales.reduce((sum, s) => sum + (s.balanceDue ? s.balanceDue.toNumber() : 0), 0) * 100
  ) / 100;

  return {
    ...customer,
    totalOrders,
    totalSpend,
    totalSpent: totalSpend,
    totalProfit,
    totalOutstandingDebt,
    totalDebt: totalOutstandingDebt,
    avgOrderValue: totalOrders > 0 ? Math.round((totalSpend / totalOrders) * 100) / 100 : 0,
  };
}

export async function updateCustomer(input: UpdateCustomerInput) {
  await ensureDefaultBusiness(input.businessId);

  const data: any = {};
  if (input.name) data.name = input.name.trim();
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
  if (input.email !== undefined) data.email = input.email?.trim() || null;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  if (input.isActive !== undefined && input.isActive !== null) data.isActive = input.isActive;

  return await prisma.customer.update({
    where: { id: input.id },
    data,
  });
}

export async function deleteCustomer(id: string, businessId: string) {
  await ensureDefaultBusiness(businessId);

  return await prisma.customer.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function getCustomerPurchaseHistory(customerId: string, businessId: string) {
  await ensureDefaultBusiness(businessId);

  return await prisma.sale.findMany({
    where: { customerId, businessId, status: { notIn: ["VOIDED", "REFUNDED"] } },
    orderBy: { saleDate: "desc" },
    include: {
      saleItems: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function getCustomerSpendingMetrics(customerId: string, businessId: string) {
  await ensureDefaultBusiness(businessId);

  const sales = await prisma.sale.findMany({
    where: { customerId, businessId, status: { notIn: ["VOIDED", "REFUNDED"] } },
    select: {
      totalAmount: true,
      grossProfit: true,
      saleDate: true,
    },
  });

  const totalOrders = sales.length;
  const totalSpend = Math.round(sales.reduce((sum, s) => sum + s.totalAmount.toNumber(), 0) * 100) / 100;
  const totalProfit = Math.round(sales.reduce((sum, s) => sum + s.grossProfit.toNumber(), 0) * 100) / 100;

  return {
    totalOrders,
    totalSpend,
    totalProfit,
    avgOrderValue: totalOrders > 0 ? Math.round((totalSpend / totalOrders) * 100) / 100 : 0,
  };
}
