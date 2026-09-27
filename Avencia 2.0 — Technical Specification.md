# AVENCIA 2.0
## Technical Specification

**Version:** 2.0  
**Status:** Development Specification  
**Language:** English  
**Database:** PostgreSQL  
**ORM:** Prisma ORM  
**Framework:** Next.js + TypeScript  
**Deployment:** Vercel  
**Primary Database Provider:** Neon PostgreSQL

---

# 1. PURPOSE

This document defines the technical architecture and implementation requirements for Avencia 2.0.

It translates the product requirements into:

- Database architecture
- Data models
- Relationships
- Business logic
- API/server operations
- Validation rules
- Financial calculations
- Inventory management
- Batch management
- Authentication requirements
- Error handling
- Performance requirements
- Testing requirements

This document is a technical source of truth.

The implementation must follow this specification unless a documented architectural improvement is approved.

---

# 2. SYSTEM ARCHITECTURE

The application will use a modern full-stack Next.js architecture.

```text
┌───────────────────────────────┐
│          User Device          │
│       Mobile / Desktop        │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│           Next.js             │
│       App Router / UI         │
├───────────────────────────────┤
│ Server Components             │
│ Client Components             │
│ Server Actions                │
│ Route Handlers                │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│       Application Layer       │
│                               │
│ Validation                    │
│ Business Logic                │
│ Financial Calculations        │
│ Inventory Logic               │
│ Authorization                 │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│         Prisma ORM            │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│       PostgreSQL / Neon       │
└───────────────────────────────┘
```

---

# 3. TECHNOLOGY STACK

## Core

- Next.js
- React
- TypeScript
- PostgreSQL
- Prisma ORM

## UI

- Tailwind CSS
- shadcn/ui
- Lucide icons

## Validation

Preferred:

- Zod

## Authentication

Use a production-ready authentication solution compatible with Next.js.

The authentication layer must support future multi-user expansion.

## Deployment

- Vercel
- Neon PostgreSQL

---

# 4. PROJECT STRUCTURE

Use a clean feature-oriented structure.

Suggested:

```text
src/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── batches/
│   │   ├── sales/
│   │   ├── customers/
│   │   ├── expenses/
│   │   ├── profit/
│   │   ├── reports/
│   │   └── settings/
│   │
│   └── api/
│
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── products/
│   ├── inventory/
│   ├── batches/
│   ├── sales/
│   ├── customers/
│   ├── expenses/
│   └── reports/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── validation/
│   ├── calculations/
│   ├── inventory/
│   ├── batches/
│   ├── sales/
│   ├── expenses/
│   └── reports/
│
├── services/
│   ├── sales/
│   ├── inventory/
│   ├── batches/
│   ├── expenses/
│   └── profit/
│
├── types/
│
└── utils/
```

The exact structure may be adjusted if the implementation benefits from a different organization, but separation of concerns must remain.

---

# 5. DATABASE PRINCIPLES

The database must:

- Use PostgreSQL.
- Use relational relationships.
- Use foreign keys.
- Use indexes for frequently queried fields.
- Use transactions for multi-step financial operations.
- Use precise numeric types for money.
- Avoid unnecessary duplication.
- Avoid storing calculated values when they can safely be derived.
- Preserve financial history.

---

# 6. CORE ENTITIES

The initial database will contain these core entities:

```text
User
Business
Product
Batch
BatchItem
InventoryTransaction
Sale
SaleItem
Customer
Expense
ProfitAllocation
SavingsTransaction
Setting
```

Additional supporting entities may be introduced when required.

---

# 7. ENTITY RELATIONSHIP OVERVIEW

```text
User
 │
 └── Business
       │
       ├── Products
       │
       ├── Batches
       │      │
       │      └── BatchItems
       │
       ├── Sales
       │      │
       │      └── SaleItems
       │
       ├── Customers
       │
       ├── Expenses
       │
       ├── InventoryTransactions
       │
       ├── ProfitAllocations
       │
       ├── SavingsTransactions
       │
       └── Settings
```

---

# 8. USER

Represents an authenticated application user.

Suggested fields:

```text
id
name
email
passwordHash / authentication provider identifier
createdAt
updatedAt
```

Requirements:

- ID must be unique.
- Email must be unique where applicable.
- Passwords must never be stored as plain text.
- Authentication credentials must not be exposed to the client.

---

# 9. BUSINESS

The system should support a business entity even if Avencia initially has only one business.

Fields:

```text
id
name
currency
ownerId
createdAt
updatedAt
```

Default:

```text
currency = GHS
```

This allows future multi-business support.

---

# 10. PRODUCT

Represents a product sold by the business.

Fields:

```text
id
businessId
name
sku
description
category
brand
size
sellingPrice
defaultCostPrice
lowStockThreshold
isActive
createdAt
updatedAt
```

### Rules

- Product name is required.
- Selling price cannot be negative.
- Default cost cannot be negative.
- SKU should be unique within a business if provided.
- Deleted products should preferably be archived/deactivated instead of permanently deleted if historical sales reference them.

---

# 11. BATCH

A batch represents one stock acquisition.

Fields:

```text
id
businessId
reference
purchaseDate
status
purchaseCost
additionalCosts
totalInvestment
notes
createdAt
updatedAt
```

Status:

```text
ACTIVE
COMPLETED
ARCHIVED
```

### Important

A batch can contain multiple products.

A business can have multiple active batches.

---

# 12. BATCH ITEM

A BatchItem connects a product to a specific batch.

Fields:

```text
id
batchId
productId
quantityPurchased
unitCost
totalCost
quantityRemaining
createdAt
updatedAt
```

Example:

```text
Batch 001

Product A
quantityPurchased = 20
unitCost = 50
totalCost = 1000
quantityRemaining = 20
```

---

# 13. INVENTORY TRANSACTION

Inventory should be treated as a transaction history rather than simply a number.

Fields:

```text
id
businessId
productId
batchId
type
quantity
referenceId
note
createdAt
```

Possible transaction types:

```text
PURCHASE
SALE
RETURN
ADJUSTMENT_IN
ADJUSTMENT_OUT
DAMAGE
LOSS
```

This allows inventory history to be reconstructed.

---

# 14. INVENTORY RULE

Every stock-changing event should create an inventory transaction.

Examples:

Stock purchase:

```text
PURCHASE +20
```

Sale:

```text
SALE -2
```

Damage:

```text
DAMAGE -1
```

Manual adjustment:

```text
ADJUSTMENT_IN +5
```

Do not silently modify stock without recording why the quantity changed.

---

# 15. SALE

A Sale represents one customer transaction.

Fields:

```text
id
businessId
customerId
saleDate
subtotal
discount
totalAmount
totalCost
grossProfit
paymentMethod
status
notes
createdAt
updatedAt
```

Possible status:

```text
COMPLETED
VOIDED
REFUNDED
```

---

# 16. SALE ITEM

A Sale can contain multiple SaleItems.

Fields:

```text
id
saleId
productId
batchId
quantity
unitPrice
unitCost
revenue
cost
profit
createdAt
```

This allows exact historical profitability.

Example:

```text
Product:
Perfume A

Quantity:
2

Unit Price:
GH₵50

Unit Cost:
GH₵30

Revenue:
GH₵100

Cost:
GH₵60

Profit:
GH₵40
```

---

# 17. WHY SALE ITEMS STORE UNIT COST

The current cost of a product can change.

Example:

Batch 001:

Unit cost = GH₵30

Batch 002:

Unit cost = GH₵40

If the product is sold from Batch 001 today, its cost must remain GH₵30.

Therefore the sale item must preserve the actual unit cost used for that transaction.

This prevents historical profit calculations from changing when future batches have different costs.

---

# 18. INVENTORY ALLOCATION

Default inventory allocation strategy:

```text
FIFO
```

First In, First Out.

Example:

Batch A:

10 units

Batch B:

20 units

Sale:

5 units

Result:

Batch A remaining:

5

Batch B remaining:

20

If the sale quantity exceeds Batch A:

Batch A is completely consumed first.

Remaining quantity is taken from Batch B.

---

# 19. MULTI-BATCH SALE

A single sale may require inventory from multiple batches.

Example:

Customer buys:

15 units

Batch A has:

10 units

Batch B has:

20 units

The sale must become:

Sale Item Allocation:

Batch A → 10 units

Batch B → 5 units

The system must preserve this allocation.

---

# 20. SALE CREATION TRANSACTION

Creating a sale should happen within a database transaction.

Process:

```text
BEGIN TRANSACTION

1. Validate sale input.
2. Validate product.
3. Find available inventory.
4. Allocate inventory using FIFO.
5. Create Sale.
6. Create SaleItems.
7. Deduct BatchItem quantities.
8. Create InventoryTransactions.
9. Calculate revenue.
10. Calculate cost.
11. Calculate profit.
12. Commit transaction.

If anything fails:
ROLLBACK
```

This is critical.

---

# 21. CUSTOMER

Fields:

```text
id
businessId
name
phone
email
notes
isActive
createdAt
updatedAt
```

Customer information should remain minimal.

---

# 22. CUSTOMER METRICS

Customer metrics may be calculated from sales.

Examples:

```text
totalPurchases
totalSpent
lastPurchaseDate
```

These should preferably be calculated through queries rather than manually maintained duplicate values unless there is a demonstrated performance requirement.

---

# 23. EXPENSE

Fields:

```text
id
businessId
batchId
category
description
amount
expenseDate
notes
createdAt
updatedAt
```

Batch may be nullable.

Not every expense belongs to a specific batch.

---

# 24. EXPENSE CATEGORIES

Initial categories:

```text
TRANSPORT
DELIVERY
PACKAGING
MARKETING
RESTOCKING
OPERATIONS
OTHER
```

The system should allow additional categories later.

---

# 25. BATCH COST

Batch investment should include:

```text
Product acquisition cost
+
Applicable batch-specific costs
=
Total batch investment
```

Example:

Product purchase:

GH₵2,000

Transport:

GH₵100

Total:

GH₵2,100

---

# 26. PROFIT CALCULATION

For each SaleItem:

```text
revenue = quantity × unitPrice

cost = quantity × unitCost

profit = revenue - cost
```

Sale-level gross profit:

```text
SUM(SaleItem.profit)
```

Business net profit over a period:

```text
Gross Profit
-
Applicable Expenses
=
Net Profit
```

---

# 27. PROFIT ALLOCATION

Profit allocation records:

```text
id
businessId
amount
type
source
allocationDate
notes
createdAt
```

Types:

```text
SAVINGS
NEEDS
WANTS
```

---

# 28. PROFIT ALLOCATION RULE

The system must prevent:

```text
allocated amount > available allocatable profit
```

Example:

Available:

GH₵1,000

Existing allocation:

GH₵700

Maximum additional allocation:

GH₵300

---

# 29. SAVINGS TRANSACTION

Savings must be tracked separately.

Fields:

```text
id
businessId
type
amount
referenceId
description
createdAt
```

Types:

```text
DEPOSIT
WITHDRAWAL
ADJUSTMENT
```

Balance:

```text
Deposits
-
Withdrawals
=
Savings Balance
```

---

# 30. NEEDS/WANTS TRANSACTIONS

Money allocated to Needs or Wants should be traceable.

Example:

Profit:

GH₵1,000

Needs allocation:

GH₵400

Needs spending:

GH₵150

Remaining:

GH₵250

The same principle applies to Wants.

---

# 31. CASH FLOW VS PROFIT

The application must not confuse:

- Revenue
- Gross profit
- Net profit
- Cash
- Savings
- Needs allocation
- Wants allocation

The dashboard must clearly label these values.

---

# 32. SETTINGS

Settings fields may include:

```text
id
businessId
lowStockThreshold
currency
defaultPaymentMethod
createdAt
updatedAt
```

Additional settings can be added later.

---

# 33. PAYMENT METHODS

Initial values:

```text
CASH
MOBILE_MONEY
BANK_TRANSFER
CARD
OTHER
```

Use an enum or controlled value system.

---

# 34. DATABASE INDEXES

Indexes should be created for frequently queried fields.

Expected indexes:

Products:

```text
businessId
sku
isActive
```

Batches:

```text
businessId
status
purchaseDate
```

BatchItems:

```text
batchId
productId
```

Sales:

```text
businessId
saleDate
customerId
status
```

SaleItems:

```text
saleId
productId
batchId
```

Expenses:

```text
businessId
expenseDate
batchId
category
```

InventoryTransactions:

```text
businessId
productId
batchId
createdAt
```

---

# 35. SOFT DELETE

Avoid permanently deleting important financial records.

For products and customers:

Use:

```text
isActive
```

or an appropriate archived status.

For financial records:

Prefer:

```text
VOIDED
REFUNDED
REVERSED
```

rather than deleting history.

---

# 36. DATABASE MIGRATIONS

All schema changes must use Prisma migrations.

Do not manually modify the production database schema without recording the change in migration history.

Migration process:

```text
Modify Prisma schema
↓
Generate migration
↓
Review migration
↓
Apply migration
↓
Generate Prisma client
↓
Run tests
```

---

# 37. VALIDATION LAYER

Use Zod or an equivalent validation library.

Each major operation should have a schema.

Examples:

```text
createProductSchema
createBatchSchema
createBatchItemSchema
createSaleSchema
createExpenseSchema
createCustomerSchema
createProfitAllocationSchema
```

---

# 38. SERVER-SIDE VALIDATION

Never trust values from the browser.

The server must validate:

- User authorization
- Business ownership
- Product ownership
- Batch ownership
- Customer ownership
- Quantity
- Prices
- Amounts
- IDs
- Financial calculations

---

# 39. AUTHORIZATION

Every business-related query must verify that the authenticated user has access to the business.

Never trust:

```text
businessId
```

provided by the client without authorization checks.

Example:

A user must not be able to send another business's ID and retrieve its sales.

---

# 40. SERVER ACTION PATTERN

Server actions may follow a pattern such as:

```text
createProduct()
updateProduct()
createBatch()
addBatchItem()
createSale()
createExpense()
createCustomer()
allocateProfit()
recordSavingsTransaction()
```

Each action should:

1. Authenticate.
2. Authorize.
3. Validate.
4. Execute business logic.
5. Return a structured result.
6. Handle errors safely.

---

# 41. SERVICE LAYER

Complex operations should be handled through services.

Example:

```text
SaleService
InventoryService
BatchService
ExpenseService
ProfitService
ReportService
```

Example:

```text
SaleService.createSale()
```

may call:

```text
InventoryService.allocateStock()
ProfitService.calculateSaleProfit()
```

---

# 42. CALCULATION LAYER

Financial calculations should be centralized.

Examples:

```text
calculateRevenue()
calculateCOGS()
calculateGrossProfit()
calculateNetProfit()
calculateBatchProfit()
calculateAvailableProfit()
calculateAllocationBalance()
```

Do not recreate these formulas independently in multiple pages.

---

# 43. DASHBOARD QUERIES

Dashboard queries should aggregate directly in PostgreSQL.

Examples:

```text
SUM(sales)
SUM(profit)
SUM(expenses)
COUNT(products)
COUNT(active batches)
SUM(inventory value)
```

Do not retrieve every transaction into JavaScript to calculate these numbers.

---

# 44. REPORT QUERIES

Reports must support date ranges.

Examples:

```text
today
this week
this month
last month
custom range
```

Database queries should use indexed date fields.

---

# 45. PAGINATION

Use pagination for:

- Sales
- Expenses
- Customers
- Products
- Inventory
- Batches

Default page size:

```text
20
```

The page size may be changed later.

---

# 46. SEARCH

Search should happen at database level for large datasets.

Examples:

Product search:

```text
name
SKU
brand
```

Customer search:

```text
name
phone
email
```

---

# 47. API RESPONSE FORMAT

Where API endpoints are used, responses should be consistent.

Success:

```json
{
  "success": true,
  "data": {}
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Unable to create sale."
  }
}
```

Do not expose internal database errors to users.

---

# 48. ERROR CODES

Suggested codes:

```text
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
NOT_FOUND
INSUFFICIENT_STOCK
INVALID_BATCH
INVALID_PRODUCT
INVALID_CUSTOMER
FINANCIAL_ERROR
DATABASE_ERROR
INTERNAL_ERROR
```

---

# 49. TRANSACTION SAFETY

The following operations should use database transactions:

- Creating sales
- Voiding sales
- Processing refunds
- Adding inventory
- Batch creation with items
- Profit allocation
- Savings operations

---

# 50. CONCURRENCY

The application should account for two operations attempting to modify the same inventory simultaneously.

The inventory allocation process must prevent overselling.

Use appropriate database transaction isolation/locking strategies where necessary.

---

# 51. INVENTORY CONSISTENCY

The following values must remain consistent:

```text
Purchased
-
Sold
+
Returned
-
Damaged
-
Lost
+
Adjusted
=
Available
```

Inventory should never become negative unless a future explicitly approved business rule allows it.

---

# 52. RETURN / REFUND

The architecture must support future returns.

A refund should not simply delete the sale.

Instead:

```text
Sale
↓
Refund
↓
Inventory returned
↓
Financial reversal
↓
Audit history preserved
```

Full refund functionality may be implemented after the MVP.

---

# 53. BATCH COMPLETION

A batch can be marked completed when:

```text
Remaining inventory = 0
```

or when the user explicitly closes it.

A completed batch should remain accessible for reporting.

---

# 54. BATCH PROFITABILITY

Batch profitability should be calculated from:

```text
Revenue generated by batch
-
Cost of goods
-
Applicable batch expenses
=
Batch net profit
```

The calculation must use actual sale allocations.

---

# 55. PRODUCT COST VARIATION

The same product may have different costs across batches.

Example:

```text
Product A

Batch 001:
GH₵30/unit

Batch 002:
GH₵35/unit

Batch 003:
GH₵40/unit
```

The system must preserve the correct cost for each sale.

---

# 56. REPORTING SOURCE OF TRUTH

Reports must use transactional data.

Do not create separate manually maintained totals that can drift away from actual transactions.

If cached aggregates are introduced later for performance, there must be a reliable strategy to keep them synchronized.

---

# 57. OFFLINE ARCHITECTURE PREPARATION

The initial application may remain online-first.

However:

- Business operations must be isolated into reusable services.
- Server operations must be deterministic.
- IDs should be generated safely.
- Transactions should have unique identifiers.
- The architecture should allow future client-side synchronization.

Potential future model:

```text
Client Operation ID
↓
Sync Queue
↓
Server
↓
Idempotency Check
↓
Database Transaction
```

---

# 58. IDEMPOTENCY

Financial operations should eventually support idempotency.

This is particularly important for future offline synchronization.

Example:

If the same sale request is sent twice because of a network retry, the system must not create two sales.

Use a unique operation/reference identifier where appropriate.

---

# 59. SECURITY REQUIREMENTS

Never expose:

- DATABASE_URL
- Auth secrets
- API keys
- Private tokens

Use environment variables.

Never commit `.env` files containing secrets.

Provide:

```text
.env.example
```

---

# 60. SECURITY HEADERS

Production deployment should use appropriate security headers.

Consider:

- Content Security Policy
- X-Frame-Options
- Referrer Policy
- Permissions Policy
- Strict Transport Security

Only enable policies compatible with the application.

---

# 61. RATE LIMITING

Public or sensitive endpoints should eventually have rate limiting.

Especially:

- Authentication
- Password reset
- Public API endpoints
- Potentially expensive report generation

---

# 62. DATABASE CONNECTION MANAGEMENT

The Prisma client must be instantiated correctly for Next.js development and production.

Avoid creating a new database connection for every request.

Use a shared Prisma client pattern appropriate for Next.js.

---

# 63. PERFORMANCE TARGETS

The application should aim for:

- Fast initial page rendering
- Minimal client-side JavaScript
- Minimal unnecessary network requests
- Fast dashboard queries
- Fast sale creation
- Responsive mobile interaction

Performance must be measured rather than assumed.

---

# 64. CACHING

Use caching where appropriate.

Potential candidates:

- Settings
- Product catalog
- Dashboard summaries
- Reports that are expensive to calculate

Do not cache financial information in a way that causes users to see dangerously stale information during critical operations.

---

# 65. OPTIMISTIC UI

Optimistic updates may be used for low-risk UI operations.

For financial transactions, the UI should clearly distinguish:

```text
Saving...
Saved
Failed
```

Do not falsely display a sale as permanently saved before the server confirms it unless a proper offline queue is implemented.

---

# 66. TESTING STRATEGY

Testing layers:

```text
Unit Tests
↓
Integration Tests
↓
Database Tests
↓
End-to-End Tests
```

---

# 67. UNIT TESTS

At minimum:

- Revenue calculation
- COGS calculation
- Profit calculation
- Batch profit calculation
- Profit allocation
- Inventory allocation
- Low-stock detection

---

# 68. INTEGRATION TESTS

Test:

- Product creation
- Batch creation
- Batch item creation
- Sale creation
- Inventory deduction
- Expense creation
- Profit allocation
- Savings transaction

---

# 69. CRITICAL E2E FLOW

The following workflow must work:

```text
Login
↓
Create Product
↓
Create Batch
↓
Add Product to Batch
↓
View Inventory
↓
Create Customer
↓
Create Sale
↓
Inventory decreases
↓
Revenue increases
↓
Profit appears
↓
Record Expense
↓
Net profit updates
↓
Allocate profit
↓
Dashboard updates
↓
Report reflects transactions
```

---

# 70. FINANCIAL TEST EXAMPLE

Input:

```text
Quantity = 5
Selling price = GH₵50
Unit cost = GH₵30
```

Expected:

```text
Revenue = GH₵250

COGS = GH₵150

Gross Profit = GH₵100
```

If applicable expense:

```text
GH₵20
```

Expected net contribution:

```text
GH₵80
```

---

# 71. FIFO TEST

Batch A:

```text
10 units
GH₵30 cost
```

Batch B:

```text
20 units
GH₵40 cost
```

Sale:

```text
15 units
```

Expected allocation:

```text
Batch A = 10 units
Batch B = 5 units
```

Expected COGS:

```text
10 × 30 = GH₵300

5 × 40 = GH₵200

Total COGS = GH₵500
```

---

# 72. LOW STOCK TEST

Threshold:

```text
3
```

Stock:

```text
3
```

Expected:

```text
LOW STOCK
```

Stock:

```text
0
```

Expected:

```text
OUT OF STOCK
```

---

# 73. FINANCIAL INTEGRITY TEST

Attempt to allocate:

```text
GH₵1,100
```

when available profit is:

```text
GH₵1,000
```

Expected:

```text
Operation rejected.
```

No financial record should be created.

---

# 74. UI DATA RULE

The UI must never invent financial numbers.

All displayed business metrics must come from:

- Server queries
- Validated local state
- Confirmed transaction results

No hard-coded financial values.

---

# 75. MOCK DATA RULE

Mock data may only be used during initial UI development.

Before production:

- Remove mock data.
- Remove demo records.
- Remove placeholder API responses.
- Connect every feature to the real database.

---

# 76. LOGGING

Log:

- Unexpected server errors
- Failed transactions
- Database failures
- Authentication failures
- Important system events

Never log:

- Passwords
- Secrets
- Authentication tokens
- Full sensitive customer information

---

# 77. MONITORING

Production should eventually include:

- Error monitoring
- Performance monitoring
- Database monitoring
- Deployment logs

The specific providers can be selected during deployment.

---

# 78. DATABASE SEEDING

A development seed script may create:

- Demo business
- Demo products
- Demo batches
- Demo customers
- Demo sales

However, seed data must never be accidentally inserted into production.

---

# 79. ENVIRONMENT SEPARATION

Use separate environments:

```text
Development
Preview
Production
```

Each environment should have appropriate database configuration.

---

# 80. DEPLOYMENT PIPELINE

Recommended:

```text
Developer
↓
Git commit
↓
GitHub
↓
Preview deployment
↓
Tests
↓
Review
↓
Production deployment
```

Production database migrations must be handled carefully.

---

# 81. DOCUMENTATION REQUIREMENTS

The repository should contain:

```text
README.md

/docs/
  product-requirements.md
  technical-specification.md
  database-schema.md
  business-rules.md
  api-specification.md
  ui-ux-specification.md
  testing.md
  deployment.md
  development-guide.md
```

---

# 82. DATABASE SCHEMA DOCUMENTATION

The database schema documentation must include:

- Table descriptions
- Columns
- Data types
- Relationships
- Constraints
- Indexes
- Enums
- Business rules

The Prisma schema must remain the executable source of truth.

---

# 83. DEVELOPMENT PHASES

## Phase 1 — Foundation

- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- Prisma
- PostgreSQL
- Environment configuration
- Authentication

## Phase 2 — Database

- Prisma schema
- Migrations
- Seed data
- Relationships
- Indexes

## Phase 3 — Products

- Product CRUD
- Search
- Filtering
- Low-stock system

## Phase 4 — Batches

- Batch creation
- Batch items
- Batch costs
- Batch inventory

## Phase 5 — Inventory

- Inventory transactions
- FIFO allocation
- Stock adjustments

## Phase 6 — Sales

- Sale creation
- Multi-product sales
- Multi-batch allocation
- Profit calculations

## Phase 7 — Expenses

- Expense creation
- Categories
- Batch expenses

## Phase 8 — Profit

- Gross profit
- Net profit
- Profit allocation
- Savings
- Needs
- Wants

## Phase 9 — Customers

- Customer management
- Customer purchase history

## Phase 10 — Dashboard

- Financial metrics
- Sales metrics
- Inventory metrics
- Batch metrics
- Charts

## Phase 11 — Reports

- Sales reports
- Product reports
- Batch reports
- Expense reports
- Profit reports

## Phase 12 — Optimization

- Query optimization
- Caching
- Pagination
- Mobile performance
- Lighthouse analysis

## Phase 13 — Testing

- Unit tests
- Integration tests
- E2E tests
- Financial integrity tests

## Phase 14 — Production

- Vercel
- Neon
- Environment variables
- Production migrations
- Monitoring
- Backup strategy

---

# 84. AI AGENT IMPLEMENTATION RULES

The AI coding agent must:

1. Read this technical specification before implementation.
2. Inspect the repository before modifying it.
3. Never overwrite working architecture without understanding it.
4. Never invent undocumented business rules.
5. Never use Google Sheets as the primary database.
6. Never use fake financial data in production.
7. Never perform financial calculations only in the browser.
8. Never bypass server-side validation.
9. Never bypass authorization.
10. Never ignore TypeScript errors.
11. Never ignore lint errors.
12. Never leave broken imports.
13. Never leave TODO placeholders for core functionality.
14. Never claim completion without verification.
15. Run tests after significant changes.
16. Run production build before declaring a phase complete.

---

# 85. IMPLEMENTATION PRINCIPLE

The AI must implement the system incrementally.

Do not generate hundreds of files before establishing:

```text
Next.js
↓
Database
↓
Authentication
↓
Core models
↓
Core business logic
```

Each stage must compile and work before proceeding.

---

# 86. SOURCE OF TRUTH

When information conflicts:

Priority should be:

1. Explicit current user requirements
2. Product Requirements Documentation
3. Technical Specification
4. Business Rules
5. Existing implementation
6. AI assumptions

The AI must not assume that old Avencia code represents the correct architecture.

---

# 87. FINAL TECHNICAL PRINCIPLE

Avencia 2.0 must be designed around this flow:

```text
PRODUCT
   ↓
BATCH
   ↓
INVENTORY
   ↓
SALE
   ↓
REVENUE
   ↓
COST
   ↓
GROSS PROFIT
   ↓
EXPENSES
   ↓
NET PROFIT
   ↓
ALLOCATION
   ├── SAVINGS
   ├── NEEDS
   └── WANTS
```

Every major financial number shown by the application must be traceable back to actual transactional records.

The system must prioritize:

DATA INTEGRITY
FINANCIAL ACCURACY
SECURITY
PERFORMANCE
SCALABILITY
MAINTAINABILITY
USER EXPERIENCE

over rapid implementation.

END OF TECHNICAL SPECIFICATION