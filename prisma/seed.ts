import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // 1. Create Default Owner User
  const passwordHash = await bcrypt.hash("avencia123", 10);
  const user = await prisma.user.upsert({
    where: { email: "owner@avencia.com" },
    update: {},
    create: {
      name: "Avencia Owner",
      email: "owner@avencia.com",
      passwordHash,
    },
  });

  console.log("User created:", user.email);

  // 2. Create Business
  const business = await prisma.business.upsert({
    where: { id: "biz_default_avencia" },
    update: {},
    create: {
      id: "biz_default_avencia",
      name: "Avencia Perfumes",
      currency: "GHS",
      ownerId: user.id,
      settings: {
        create: {
          lowStockThreshold: 3,
          currency: "GHS",
          defaultPaymentMethod: "CASH",
        },
      },
    },
  });

  console.log("Business created:", business.name);

  // 3. Create Sample Products
  const p1 = await prisma.product.create({
    data: {
      businessId: business.id,
      name: "Baccarat Rouge 540 Extract",
      sku: "AV-BR540",
      category: "Unisex",
      brand: "Maison Francis Kurkdjian",
      size: "70ml",
      sellingPrice: 150.0,
      defaultCostPrice: 80.0,
      lowStockThreshold: 3,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      businessId: business.id,
      name: "Sauvage Elixir",
      sku: "AV-SAUVE",
      category: "Men",
      brand: "Dior",
      size: "60ml",
      sellingPrice: 120.0,
      defaultCostPrice: 65.0,
      lowStockThreshold: 3,
    },
  });

  console.log("Sample products created:", p1.name, p2.name);

  // 4. Create Initial Active Batch
  const batch1 = await prisma.batch.create({
    data: {
      businessId: business.id,
      reference: "BATCH-2026-001",
      purchaseDate: new Date(),
      status: "ACTIVE",
      purchaseCost: 2100.0,
      additionalCosts: 100.0,
      totalInvestment: 2200.0,
      notes: "First quarter inventory import",
      batchItems: {
        create: [
          {
            productId: p1.id,
            quantityPurchased: 15,
            quantityRemaining: 15,
            unitCost: 80.0,
            totalCost: 1200.0,
          },
          {
            productId: p2.id,
            quantityPurchased: 14,
            quantityRemaining: 14,
            unitCost: 65.0,
            totalCost: 910.0,
          },
        ],
      },
    },
  });

  console.log("Initial batch created:", batch1.reference);

  console.log("✅ Database Seed Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
