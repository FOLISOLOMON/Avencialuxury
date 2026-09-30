# AVENCIA 2.0 — FULL PROJECT TECHNICAL & FUNCTIONAL ARCHITECTURE

> **Document Status:** Comprehensive Master Reference  
> **Version:** 2.0.0  
> **Target Business:** Avencia Luxury Perfume & Fragrance Retail  
> **Primary Technology Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma ORM 6, PostgreSQL (Neon DB)  

---

## 1. EXECUTIVE SUMMARY & BUSINESS OVERVIEW

**Avencia 2.0** is a custom-built, lightweight Business Operating System (BOS) and Point of Sale (POS) application designed specifically for **Avencia**, a high-end perfume and fragrance retail business. 

Rather than serving as a standard sales tracker, Avencia 2.0 functions as a complete financial and operational engine. It manages product catalogs, First-In, First-Out (FIFO) stock batching, multi-item point-of-sale transactions, customer credit/debt balances, land-cost expense allocations, automated profit partitioning (the 50/30/20 rule: Savings/Needs/Wants), and real-time business notification automations.

### Key Business & Technical Objectives
1. **Financial Precision:** Strict numeric calculations preventing floating-point rounding errors across sales, costs, discounts, debts, and profit allocations.
2. **First-In, First-Out (FIFO) Inventory Control:** Realized cost-of-goods-sold (COGS) calculations based on actual batch purchase costs, ensuring true gross profit accuracy.
3. **Credit & Debt Visibility:** Complete tracking of unpaid and partially paid customer sales with dedicated debt settlement workflows.
4. **Automated Operations:** Event-driven automation engine for low stock alerts, batch completion transitions, large expense warnings, and daily/weekly financial summaries.
5. **Mobile-First Luxury UX:** Custom **Royal Indigo & Emerald Teal** design system built with Tailwind CSS, supporting tactile touch interactions, camera barcode scanning, quick PIN session locking, and PWA readiness.

---

## 2. HIGH-LEVEL ARCHITECTURE & DESIGN PATTERNS

Avencia 2.0 follows a strict **3-Layer Architecture** to cleanly decouple user interaction, orchestration, and business logic execution.

```text
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                       │
│     Next.js 15 App Router | React 19 | Tailwind CSS     │
│   Mobile Nav | Desktop Sidebar | Quick PIN | POS Modal  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                APPLICATION / SERVICE LAYER              │
│       Server Actions (src/lib/actions/*)                │
│       Modular Services (src/lib/services/*)             │
│       Automation Event Engine (src/lib/automation/*)    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│               PURE LOGIC & CALCULATION ENGINE           │
│       FIFO Stock Allocator (src/lib/inventory/fifo.ts)  │
│       Financial Math (src/lib/calculations/financial.ts)│
│       Zod Validation (src/lib/validation/schemas.ts)    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 DATA ACCESS & DATABASE                  │
│       Prisma ORM Client (src/lib/db/prisma.ts)          │
│       PostgreSQL (Neon Hosted)                          │
└─────────────────────────────────────────────────────────┘
```

### Architectural Guarantees
- **Multi-Tenant Isolation:** All core data tables include a mandatory `businessId` index and relation, scoping data reads and writes to the business tenant context (`DEFAULT_BUSINESS_ID`).
- **Transactional Integrity:** Complex operations (such as sale creation involving stock deduction, transaction ledger creation, customer debt updating, and event emission) run inside database transactions (`prisma.$transaction`) with an extended 20-second timeout for cloud database resilience.
- **Idempotency & Deduplication:** Automations and event triggers use a unique `dedupeKey` check to prevent duplicate executions or notifications.

---

## 3. DATABASE SCHEMA & ENTITY RELATIONSHIPS

The database is built on **PostgreSQL** and managed using **Prisma ORM**. Below is a summary of the domain models defined in [`prisma/schema.prisma`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/prisma/schema.prisma):

```mermaid
erDiagram
    User ||--o{ Business : owns
    Business ||--o{ Product : catalog
    Business ||--o{ Batch : purchases
    Business ||--o{ Supplier : tracks
    Business ||--o{ Customer : records
    Business ||--o{ Sale : processes
    Business ||--o{ Expense : incurs
    Business ||--o{ ProfitAllocation : allocates
    Business ||--o{ SavingsTransaction : manages
    Business ||--o{ InventoryTransaction : logs
    Business ||--o{ Notification : notifies
    Business ||--o| Setting : configures
    
    Batch ||--o{ BatchItem : contains
    Product ||--o{ BatchItem : batched_in
    Sale ||--o{ SaleItem : contains
    Product ||--o{ SaleItem : sold
    Batch ||--o{ SaleItem : sourced_from
    Customer ||--o{ Sale : makes
    Customer ||--o{ DebtPayment : pays
    Sale ||--o{ DebtPayment : settles
    Batch ||--o{ Expense : linked_to
```

### Key Models & Their Functions

1. **`User` & `Business`**: Tenant root models. A `User` owns one or more `Business` entities. Default business fallback (`biz_default_avencia`) is bootstrapped automatically via [`src/lib/db/prisma.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/db/prisma.ts).
2. **`Product`**: Perfume catalog items containing barcode, auto-generated SKU (`AV-BRAND-SIZE-RAND`), default cost price, selling price, and low-stock threshold.
3. **`Batch` & `BatchItem`**: Stock import batches from suppliers. Stores total purchase cost, additional costs (shipping/clearance), purchase date, and status (`ACTIVE`, `COMPLETED`, `ARCHIVED`). `BatchItem` tracks initial quantity vs. `quantityRemaining` per product.
4. **`InventoryTransaction`**: Complete immutable ledger of all stock movement (`PURCHASE`, `SALE`, `RETURN`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `DAMAGE`, `TESTER`, `LOSS`).
5. **`Customer` & `Sale` & `SaleItem`**: POS sales. A sale records subtotal, discount, total amount, total cost (calculated via FIFO), gross profit, payment status (`PAID`, `PARTIAL`, `UNPAID`, `VOIDED`, `REFUNDED`), amount paid, and balance due.
6. **`DebtPayment`**: Logged debt repayments against a customer and optional specific unpaid sale.
7. **`Expense`**: Business expenses categorized into `TRANSPORT`, `DELIVERY`, `PACKAGING`, `MARKETING`, `RESTOCKING`, `OPERATIONS`, or `OTHER`, with optional batch linkage for land-cost accounting.
8. **`ProfitAllocation` & `SavingsTransaction`**: Records manual or automated profit splits across `SAVINGS` (50%), `NEEDS` (30%), and `WANTS` (20%).
9. **`Notification` & `NotificationSetting`**: System notifications and granular user preference toggles.
10. **`AutomationExecution`**: Idempotency and log audit table for automated event triggers.

---

## 4. CORE BUSINESS LOGIC & ENGINES

### A. FIFO Stock Allocation Engine
Located in [`src/lib/inventory/fifo.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/inventory/fifo.ts).
- When a product is sold, the engine queries active batches containing remaining units of that product, ordered by `purchaseDate ASC` (oldest first).
- It iterates through batches, deducting requested stock from the oldest batches first and calculating precise unit cost and total cost.
- If total remaining batch stock is less than the requested sale quantity, an error is raised to prevent selling unstocked items.

### B. Financial Calculation Engine
Located in [`src/lib/calculations/financial.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/calculations/financial.ts).
- **Item Level:** $\text{Revenue} = \text{Quantity} \times \text{UnitPrice}$, $\text{Cost} = \text{Quantity} \times \text{UnitCost}$, $\text{Profit} = \text{Revenue} - \text{Cost}$.
- **Sale Level:** Calculates Subtotal, applies Discount ($\text{Discount} \le \text{Subtotal}$), computes Total Amount, Cost of Goods Sold (COGS), and Gross Profit.
- **Net Profit:** $\text{Net Profit} = \text{Gross Profit} - \text{Total Operational Expenses}$.
- **50/30/20 Allocation Rule:** 
  $$\text{Savings} = 50\%, \quad \text{Needs} = 30\%, \quad \text{Wants} = 20\%$$

### C. Event-Driven Automation Engine
Located in [`src/lib/automation/engine.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/automation/engine.ts).
- Emits events such as `PRODUCT_LOW_STOCK`, `SALE_COMPLETED`, `SALE_PARTIAL_PAYMENT`, `LARGE_EXPENSE_LOGGED`, and `BATCH_COMPLETED`.
- Evaluates event metadata against `NotificationSetting` preferences.
- Checks idempotency using `dedupeKey`.
- Automatically executes actions like creating notifications, triggering batch status updates, or updating debt flags.

### D. Barcode Decoder System
Located in [`src/lib/barcode/decoder.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/barcode/decoder.ts) and [`CameraScanner.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/components/scanner/CameraScanner.tsx).
- Provides live camera-based scanning utilizing `@zxing/browser` and `@zxing/library`.
- Supports EAN-13, EAN-8, UPC-A, Code-128, and QR codes.
- Performs exact lookup across product barcodes and SKUs for instant POS cart addition.

---

## 5. TOP-TO-BOTTOM PAGE & ROUTE GUIDE

### Global Layout Shell Components
- **`Header.tsx`** ([`src/components/layout/Header.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/components/layout/Header.tsx)): Sticky top bar displaying brand badge, active page title, quick POS action button (`+ New Sale`), session lock button, and notification bell.
- **`Sidebar.tsx`** ([`src/components/layout/Sidebar.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/components/layout/Sidebar.tsx)): Left navigation bar for desktop views with high-contrast active state indicators.
- **`MobileNav.tsx`** ([`src/components/layout/MobileNav.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/components/layout/MobileNav.tsx)): Fixed bottom navigation bar for mobile devices providing one-tap access to primary pages.
- **`QuickPinLock.tsx`** ([`src/components/auth/QuickPinLock.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/components/auth/QuickPinLock.tsx)): Security overlay featuring a 3×4 numeric keypad for instant session locking and PIN authentication.

---

### Route Breakdown

#### 1. Dashboard (`/`) — [`src/app/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/page.tsx)
- **Attention Required Banner:** Displays low stock alerts and unpaid sales warnings.
- **Financial Metric Grid:** Total Sales Revenue, Realized Net Profit, Unpaid Customer Debt, and Active Import Batches.
- **Quick Actions:** Instant triggers for New Sale, Log Expense, Add Product, and New Batch.
- **Recent Sales Table & Cards:** Live list of recent sales with payment status badges (`COMPLETED`, `PARTIAL`, `UNPAID`).

#### 2. Product Catalog (`/products`) — [`src/app/products/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/products/page.tsx)
- **Header & Filters:** Live search input by name/SKU/barcode and category filter pills.
- **Product Grid:** Cards displaying brand, category, volume size, prices, barcode, and live inventory badges (`In Stock`, `Low Stock`).
- **Add/Edit Modal:** Form with camera barcode scanner integration, auto-SKU generator button (`AV-BRAND-SIZE-RAND`), price inputs, and initial stock options.

#### 3. Stock Batches (`/batches` & `/batches/[id]`) — [`src/app/batches/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/batches/page.tsx)
- **Batches Directory:** Filterable list by status (`ACTIVE`, `COMPLETED`, `ARCHIVED`). Displays reference code, supplier, purchase date, total investment, items count, and remaining stock.
- **New Batch Modal:** Form to register new inventory import batches with supplier selection, shipping costs, and itemized unit costs.
- **Batch Detail Page:** Detailed view of batch health, remaining vs. sold unit progress bars, associated expenses, and sold item history.

#### 4. Point of Sale & History (`/sales`) — [`src/app/sales/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/sales/page.tsx)
- **New POS Sale Terminal:** Interactive product selector with search/scanner, cart breakdown, quantity adjustment, discount input, payment method selection (`CASH`, `MOBILE_MONEY`, `BANK_TRANSFER`, `CARD`), payment status selector, and customer selector.
- **Digital Receipt Modal:** Formatted printable and shareable receipt containing business info, itemized table, total, amount paid, balance due, and payment terms.
- **Sales History Tab:** Filterable list by date range and payment status (`PAID`, `PARTIAL`, `UNPAID`).

#### 5. Inventory Movements (`/inventory`) — [`src/app/inventory/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/inventory/page.tsx)
- **Inventory Summary Cards:** Total Items in Stock, Total Valuation (Cost vs Retail Value), Low Stock Alert count.
- **Stock Movement Ledger:** Historical table logging every transaction (`PURCHASE`, `SALE`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `DAMAGE`, `TESTER`), linking to product, batch reference, and quantity changes.
- **Manual Adjustment Modal:** Form to record damage, tester bottles, or manual stock corrections.

#### 6. Expense Tracker (`/expenses`) — [`src/app/expenses/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/expenses/page.tsx)
- **Expense Breakdown Metrics:** Total Monthly Expenses, Category Breakdown chart/summary, Batch-linked expenses.
- **Expense Log Table:** List showing expense date, category, description, amount, and associated batch reference.
- **Log Expense Modal:** Modal form to record operational costs with category dropdown and optional batch allocation.

#### 7. Profit Management & Allocation (`/profit`) — [`src/app/profit/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/profit/page.tsx)
- **Profit Summary:** Total Realized Gross Profit, Total Operational Expenses, Realized Net Profit, Total Allocated Profit.
- **50/30/20 Allocation Calculator:** One-click calculation tool for partition strategy (50% Savings, 30% Needs, 20% Wants).
- **Allocation & Savings Ledger:** Records historical profit transfers and withdrawals with source tracking.

#### 8. Customers & Debt Tracker (`/customers`) — [`src/app/customers/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/customers/page.tsx)
- **Customer Directory:** List of customers with total purchases and active outstanding balance.
- **Debt Settlement Modal:** Record customer debt payments with receipt generation and balance updates.
- **Customer Detail Modal:** Complete history of customer purchases and debt repayments.

#### 9. Suppliers Directory (`/suppliers`) — [`src/app/suppliers/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/suppliers/page.tsx)
- **Supplier Directory:** Contact details, total batches supplied, total investment value, and active status.
- **Add/Edit Supplier Modal:** Form to record supplier details.

#### 10. Business Reports & Analytics (`/reports`) — [`src/app/reports/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/reports/page.tsx)
- **Financial Reports:** Sales Revenue Trend, Gross vs Net Profit breakdown, Category Revenue distribution.
- **Inventory & Debt Reports:** Inventory Valuation Report and Aging Debt Analysis.

#### 11. Settings & Notifications Config (`/settings`) — [`src/app/settings/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/settings/page.tsx)
- **Business Profile:** Currency settings, low stock threshold config, default payment method.
- **Security & PIN Setup:** Enable 4-digit PIN lock and set lock PIN code.
- **Automation Preferences:** Toggle notification triggers for low stock, sales, expenses, and summaries.

---

## 6. SERVICE LAYER & BACKEND API STRUCTURE

The backend logic is organized into modular services under [`src/lib/services/`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services) and exposed via Server Actions ([`src/lib/actions/`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions)) and REST Route Handlers ([`src/app/api/`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/api)).

| Module | Service File | Server Actions File | API Route Directory | Key Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Products** | [`products.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/products.ts) | [`product-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/product-actions.ts) | `/api/products` | Product CRUD, barcode lookup, SKU auto-generation |
| **Batches** | [`batches.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/batches.ts) | [`batch-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/batch-actions.ts) | `/api/batches` | Batch creation, cost recalculation, batch completion status |
| **Sales** | [`sales.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts) | [`sale-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/sale-actions.ts) | `/api/sales` | Multi-item sale recording, FIFO deduction, receipt data |
| **Debt** | [`debt.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/debt.ts) | [`customer-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/customer-actions.ts) | `/api/debt` | Customer debt payments, credit balancing |
| **Inventory** | [`inventory.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/inventory.ts) | Included in sales/batches | `/api/inventory` | Stock adjustments, movement ledger, low stock alerts |
| **Expenses** | [`expenses.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/expenses.ts) | [`expense-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/expense-actions.ts) | `/api/expenses` | Expense logging, batch cost linkage, category reporting |
| **Profit** | [`profit.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts) | [`profit-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/profit-actions.ts) | `/api/profit` | Net profit calculation, 50/30/20 allocation rules |
| **Customers**| [`customers.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/customers.ts) | [`customer-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/customer-actions.ts) | `/api/customers` | Customer profiling, purchase history, debt aggregation |
| **Suppliers**| [`suppliers.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/suppliers.ts) | Included in batch actions | `/api/suppliers` | Supplier directory, batch supply performance |
| **Reports** | [`reports.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/reports.ts) | [`report-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/report-actions.ts) | `/api/reports` | Financial & inventory analytics aggregation |
| **Automation**| [`notifications.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/notifications.ts)| Included in settings | `/api/automation` | Notification management, event-driven rules |

---

## 7. ENVIRONMENT SETUP & DEPLOYMENT GUIDE

### Prerequisites
- Node.js 18+ or 20+
- PostgreSQL database instance (Neon PostgreSQL recommended)

### Environment Variables Configuration (`.env`)
```env
# Database connection string (PostgreSQL / Neon)
DATABASE_URL="postgresql://user:password@ep-host.pooler.region.neon.tech/avenciadb?sslmode=require"

# NextAuth / App Secret Configuration
NEXTAUTH_SECRET="avencia_super_secret_jwt_key_2026"
NEXTAUTH_URL="http://localhost:3000"

# Optional App Mode
NODE_ENV="development"
```

### Local Development Commands
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client bindings
npx prisma generate

# 3. Apply database schema migrations
npx prisma db push

# 4. Seed initial default business & sample data
npx tsx prisma/seed.ts

# 5. Start the Next.js development server
npm run dev
```

### Build & Production Verification
```bash
# Run Next.js production build
npm run build

# Start production server
npm run start
```

---

## 8. SUMMARY & DESIGN VERIFICATION

Avencia 2.0 provides an end-to-end operational ecosystem designed for performance, business scalability, and complete financial clarity. By combining Next.js 15 Server Components with pure calculation modules, a FIFO stock engine, and a PostgreSQL database, the system ensures zero financial discrepancy while offering a high-contrast luxury UI experience for retail operations.
