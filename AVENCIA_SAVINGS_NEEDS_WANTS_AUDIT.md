# Avencia Savings, Needs & Wants — Implementation Audit

> **Audit Date:** October 2026  
> **Target System:** Avencia 2.0 (Perfume Inventory & Financial Management Engine)  
> **Scope:** Financial flow, batch lifecycle, 50/30/20 profit division, Savings ledger, database models, and execution architecture.  
> **Methodology:** Static code inspection, schema verification, and architectural trace from UI components through API routes/server actions down to database transactions.

---

## Executive Summary

Avencia 2.0 contains a functional **accrual-based net profit allocation engine** and a dedicated **Savings Transaction ledger**, but there is a significant divergence between what the UI/documentation implies and how the underlying system actually operates:

1. **Allocations are 100% manual and single-bucket:** Despite badges and documentation advertising an automated "50/30/20 wealth split", the user must manually select a single bucket (`SAVINGS`, `NEEDS`, or `WANTS`), manually type an arbitrary amount, and submit. The mathematical helper `calculate50_30_20Allocation()` exists in code and is tested, but is **never invoked** in any production workflow or user action.
2. **Batches and profit allocations are completely decoupled:** A batch does **not** need to be closed to allocate profit. In fact, `ProfitAllocation` has **no database relationship to `Batch`**. Profit is calculated at the cumulative, all-time business level across all non-voided sales minus all recorded operational expenses.
3. **Accrual profit vs. cash in hand:** Net profit is recognized at the moment of sale regardless of whether the customer paid in cash or bought on credit. Consequently, an owner can legally allocate "profit" that only exists as uncollected customer receivables (`balanceDue`), creating an overdraft or phantom-profit risk.
4. **Closing a batch with remaining inventory strands stock:** In `sales.ts`, the First-In, First-Out (FIFO) stock allocation query specifically filters for `batch: { status: "ACTIVE" }`. If a user manually closes a batch (`COMPLETED`) that still has units remaining, those units become invisible to sales and will never be deducted, forcing the system to generate auto-batches.
5. **No balance tracking for Needs or Wants:** While `SAVINGS` allocations feed a companion `SavingsTransaction` ledger with deposits, withdrawals, and adjustments, `NEEDS` and `WANTS` are merely cumulative counters. The system does not track whether Needs funds were actually spent on expenses or if Wants funds were withdrawn as owner dividends.

---

## 1. Current Workflow

### 1.1 Where Savings, Needs, and Wants Are Shown and Managed
- **Primary Management Page:** [`src/app/(op)/profit/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/(op)/profit/page.tsx)
  - Displays the "Financial Health Waterfall" card (Gross Revenue, COGS, Gross Profit, Operating Expenses, Realized Net Profit).
  - Displays three bucket cards:
    - **Reinvestment & Savings:** Shows badge "50% Target" and cumulative allocated sum (`alloc.savings`). Has button "Deposit to Savings".
    - **Operational Needs:** Shows badge "30% Target" and cumulative allocated sum (`alloc.needs`). Has button "Fund Operations".
    - **Owner Draw & Profits:** Shows badge "20% Target" and cumulative allocated sum (`alloc.wants`). Has button "Distribute Dividends".
  - Displays the **Allocation History Ledger** table listing all historical `ProfitAllocation` records.
  - Slide-over Sheet (`Distribute Realized Profit`) triggered by "Allocate Profit" or individual bucket buttons.
- **Executive Dashboard:** [`src/components/dashboard/InteractiveDashboard.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/components/dashboard/InteractiveDashboard.tsx)
  - Shows "Capital Reserve" in Metric 3, which reads directly from `summary?.allocations?.savings`.
- **Financial Reports:** [`src/lib/services/reports.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/reports.ts) & [`src/app/(op)/reports/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/(op)/reports/page.tsx)
  - `getProfitReport()` aggregates allocations by type (`SAVINGS`, `NEEDS`, `WANTS`) over configurable date ranges and calculates remaining allocatable profit.
- **Navigation:**
  - Sidebar ([`src/components/layout/DesktopSidebar.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/components/layout/DesktopSidebar.tsx#L55)) and Mobile More Sheet ([`src/components/layout/MoreSheet.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/components/layout/MoreSheet.tsx#L39)) feature "Profit Allocation" with a PiggyBank icon.

### 1.2 How a Batch Is Created, Updated, and Closed
- **Creation:**
  - Initiated via [`src/app/(op)/batches/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/(op)/batches/page.tsx) or `POST /api/batches` calling `createBatch()` in [`src/lib/services/batches.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/batches.ts#L23-L128).
  - Inputs: `reference`, `purchaseDate`, optional `supplierId`, optional `additionalCosts` (e.g. shipping/customs), optional `notes`, and optional initial `items`.
  - Calculates `purchaseCost = sum(item.quantityPurchased * item.unitCost)` and `totalInvestment = purchaseCost + additionalCosts`.
  - In a database transaction, creates the `Batch`, `BatchItem` records (with `quantityRemaining = quantityPurchased`), and logs `InventoryTransaction` records of type `PURCHASE`.
  - *Automatic Fallback Creation:* In [`src/lib/services/sales.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts#L153-L220), if a product is sold without sufficient active stock in FIFO batches, the system automatically creates or finds an active batch titled `BATCH-DIRECT-<year>` to prevent POS failure.
- **Updating:**
  - Products can be added to an existing batch via `POST /api/batches/[id]/items`.
  - Additional costs can be updated via `PUT /api/batches/[id]`, which calls `updateBatchAdditionalCosts()` in [`src/lib/services/batches.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/batches.ts#L321-L361) to recompute `totalInvestment`.
  - Stock remaining is decremented automatically upon each sale via `tx.batchItem.update({ data: { quantityRemaining: { decrement: deductQuantity } } })` in [`src/lib/services/sales.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts#L301-L310).
- **Closing:**
  - **Manual Close:** User clicks "Close Batch" on [`src/app/(op)/batches/[id]/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/(op)/batches/[id]/page.tsx#L184-L200), which issues `POST /api/batches/[id]/close` ([`src/app/api/batches/[id]/close/route.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/api/batches/[id]/close/route.ts)). This sets `Batch.status = "COMPLETED"`.
  - **Automatic Close:** During `createSale()`, after stock deductions, [`syncBatchStatus()`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/batches.ts#L236-L316) is invoked. If `totalRemaining === 0` across all items in the batch, `status` is automatically updated to `"COMPLETED"`, and a `BATCH_COMPLETED` notification and automation event are fired.

### 1.3 Must a Batch Be Closed Before Allocation Is Possible?
**No. Batch status has zero effect on profit allocation.**
- The profit allocation service ([`src/lib/services/profit.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts)) and schema ([`prisma/schema.prisma`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/prisma/schema.prisma#L376-L390)) make no reference to batches.
- Allocations do not occur per batch; they occur against the global business net profit.
- A user can allocate profit when zero batches are closed, when five batches are active, or even when inventory was sold through an auto-generated fallback batch.

### 1.4 Do Allocations Happen Automatically, Manually, or Through a Combination?
**Allocations are 100% manual.**
- There are no cron jobs, database triggers, or event handlers that automatically create `ProfitAllocation` rows.
- The UI exposes a manual form where the user must type an amount and select a bucket.
- The only automated elements surrounding allocations are:
  1. Automated event emission (`BusinessEventType.PROFIT_AVAILABLE`) whenever `remainingAllocatableProfit > 0` is evaluated during summary fetches.
  2. Automated post-allocation notification (`createNotification`) and event emission (`PROFIT_ALLOCATED`).
  3. Automated companion record creation: When a `SAVINGS` allocation is manually saved, the service automatically creates a `DEPOSIT` record in `SavingsTransaction`.

### 1.5 What Action Does a User Take to Allocate Money?
1. User navigates to `/profit`.
2. User clicks "Allocate Profit" (or clicks "Deposit to Savings", "Fund Operations", or "Distribute Dividends").
3. The slide-over Sheet opens (`Distribute Realized Profit` in [`src/app/(op)/profit/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/(op)/profit/page.tsx#L429-L499)).
4. User selects the **Allocation Bucket** dropdown:
   - `SAVINGS` (Labeled: "50% Savings / Batch Reinvestment")
   - `NEEDS` (Labeled: "30% Operating Needs & Rent")
   - `WANTS` (Labeled: "20% Owner Draw & Dividends")
5. User enters an **Amount (GH₵)** into an open numeric input field. *(Note: The system does not compute or suggest the 50%, 30%, or 20% value; the user must determine and enter the figure themselves).*
6. User optionally types a "Profit Source / Description" (defaults to "Monthly Perfume Operations") and "Notes".
7. User clicks "Save Allocation".
8. The form sends `POST /api/profit` with payload `{ type, amount, source, notes }`.

### 1.6 What Happens After an Allocation Is Confirmed?
1. **Validation:** [`allocateProfit()`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L110-L132) calls `validateProfitAllocation()`. If `amount <= 0` or `amount > remainingAllocatableProfit`, the request is rejected with an error.
2. **Database Transaction:**
   - Creates a record in `ProfitAllocation` (`amount`, `type`, `source`, `notes`, `businessId`, `allocationDate: now()`).
   - If `type === "SAVINGS"`, creates a record in `SavingsTransaction` (`type: "DEPOSIT"`, `amount`, `referenceId: allocation.id`, `description: "Profit Allocation (Savings)..."`).
3. **Audit & Notifications:**
   - Creates an in-app `Notification` titled "Profit Allocated".
   - Emits an automation engine event `BusinessEventType.PROFIT_ALLOCATED`.
   - Logs an `AuditLog` entry with action `"PROFIT_ALLOCATED"`.
4. **UI State Update:**
   - Modal closes.
   - `fetchData()` re-fetches `/api/profit`.
   - The UI updates `totalAllocated` and decrements `remainingAllocatableProfit` dollar-for-dollar.
   - Next.js paths `/profit`, `/dashboard`, and `/reports` are revalidated.

### 1.7 Can the User Edit, Reverse, or Repeat an Allocation?
- **Edit:** **No.** There is no API route, server action, or UI component to edit an existing `ProfitAllocation`.
- **Reverse / Void:** **No.** There is no delete, void, or reversal endpoint for `ProfitAllocation`.
- **Repeat:** **Yes.** As long as `remainingAllocatableProfit > 0`, the user can create another allocation at any time.
- **Savings Adjustments:** In the Savings ledger service ([`src/lib/services/savings.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/savings.ts)), a user can record a `WITHDRAWAL` or `ADJUSTMENT`. However, this only updates `SavingsTransaction` and the savings balance; it **does not modify or delete** the historical `ProfitAllocation` record.

### 1.8 What Happens When New Sales, Expenses, Restocking Costs, or Payments Are Recorded After an Allocation?
- **New Sales:**
  - `totalGrossProfit` increases immediately upon sale creation.
  - `totalNetProfit` increases accordingly.
  - `remainingAllocatableProfit` expands immediately, permitting further allocations.
  - *Crucial note:* This occurs even if the sale is unpaid/credit.
- **New Expenses:**
  - `totalExpenses` increases.
  - `totalNetProfit` decreases (`totalGrossProfit - totalExpenses`).
  - `remainingAllocatableProfit` decreases.
  - **Deficit / Over-allocation Risk:** If an owner allocates 100% of available net profit, and later logs an operational expense (e.g. GH₵500 rent or delivery), `totalNetProfit` drops below `totalAllocated`. The formula evaluates `Math.max(0, totalNetProfit - totalAllocated)`, clamping remaining profit to `0`. The system does not flag an error or reverse historical allocations; the business simply enters an unacknowledged negative net position.
- **Restocking Costs:**
  - If entered as `additionalCosts` on a `Batch`, it does **not** affect expenses or net profit. It only affects the batch's `totalInvestment`.
  - If entered as an `Expense` with category `RESTOCKING`, it reduces `totalNetProfit` immediately.
- **Customer Debt Payments:**
  - When a customer pays off an outstanding balance via `recordDebtPayment()` ([`src/lib/services/debt.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/debt.ts#L113-L235)), `Sale.amountPaid` increases and `Sale.balanceDue` decreases.
  - **Gross profit, net profit, and allocatable profit do not change.** Because profit was already recognized when the credit sale was originally logged, collecting cash later generates zero new allocatable profit.

### 1.9 How the App Handles an Active Batch While Some Stock Has Already Been Sold
- Partial stock sales are handled via FIFO stock decrement in [`src/lib/services/sales.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts#L106-L148).
- When a sale occurs, `activeBatchItems` for that product are sorted by `batch.purchaseDate asc`.
- `quantityRemaining` on each `BatchItem` is reduced by the quantity sold.
- The `SaleItem` records the specific `batchId`, `unitCost`, and calculated `profit` for that slice of stock.
- The batch remains `status: "ACTIVE"` as long as `totalRemaining > 0`.
- The cost of the unsold units remains locked in inventory (`BatchItem.quantityRemaining * unitCost`) and is **not** counted in COGS or deducted from net profit.

---

## 2. Financial Calculations

All financial math in the core services relies on explicit JavaScript rounding (`Math.round(val * 100) / 100`) and Prisma `Decimal` storage (`@db.Decimal(12, 2)`).

### 2.1 Sales Revenue
- **Per Item Revenue:**
  $$\text{revenue} = \text{round}(\text{quantity} \times \text{unitPrice})$$
  *(Code: [`src/lib/services/sales.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts#L119) & [`src/lib/calculations/financial.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/calculations/financial.ts#L31))*
- **Sale Subtotal:**
  $$\text{subtotal} = \sum \text{revenue}$$
- **Sale Total Amount (Net Revenue):**
  $$\text{totalAmount} = \max(0, \text{round}(\text{subtotal} - \text{discount}))$$
  *(Code: [`src/lib/services/sales.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts#L230))*
- **Aggregate Total Revenue:**
  $$\text{totalRevenue} = \sum_{\text{Sale}} \text{totalAmount} \quad \text{where } \text{status} \notin [\text{"VOIDED"}, \text{"REFUNDED"}]$$
  *(Code: [`src/lib/services/profit.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L20-L38))*

### 2.2 Cash Collected vs. Credit / Unpaid Sales
- **At Sale Creation:**
  - If `amountPaid` is provided by user:
    $$\text{amountPaid} = \min(\text{totalAmount}, \max(0, \text{input.amountPaid}))$$
  - If `amountPaid` omitted: defaults to `totalAmount` (paid in full).
  - Balance Due:
    $$\text{balanceDue} = \max(0, \text{round}(\text{totalAmount} - \text{amountPaid}))$$
  - If `balanceDue > 0`, system enforces that a `customerId` must be present.
  *(Code: [`src/lib/services/sales.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts#L235-L243))*
- **When Debt Payments Are Collected:**
  - When cash is received via `recordDebtPayment()`, payment is applied against unpaid sales (oldest first or user-specified).
  - Updates `Sale.amountPaid = currentPaid + appliedAmount` and `Sale.balanceDue = totalAmount - newPaid`.
  *(Code: [`src/lib/services/debt.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/debt.ts#L198-L211))*
- **Aggregates:**
  - $\text{totalAmountCollected} = \sum_{\text{Sale}} \text{amountPaid}$
  - $\text{totalOutstandingDebt} = \sum_{\text{Sale}} \text{balanceDue}$
  *(Code: [`src/lib/services/profit.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L39-L40))*

### 2.3 Cost of Goods Sold (COGS) and Gross Profit
- **Item Level:**
  $$\text{cost} = \text{round}(\text{quantity} \times \text{unitCost})$$
  $$\text{profit} = \text{round}(\text{revenue} - \text{cost})$$
  *(Code: [`src/lib/services/sales.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts#L120-L121))*
- **Sale Level:**
  $$\text{totalCost} = \sum \text{cost}$$
  $$\text{grossProfit} = \text{round}(\text{totalAmount} - \text{totalCost})$$
  *(Code: [`src/lib/services/sales.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts#L231-L232))*
  *Notice that `grossProfit` incorporates the overall sale `discount`.*
- **Aggregate Total COGS & Gross Profit:**
  $$\text{totalCostOfGoods} = \sum_{\text{Sale}} \text{totalCost}$$
  $$\text{totalGrossProfit} = \sum_{\text{Sale}} \text{grossProfit}$$
  *(Code: [`src/lib/services/profit.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L41-L42))*

### 2.4 Expenses and Restocking-Related Costs
- **Operational Expenses:**
  $$\text{totalExpenses} = \sum_{\text{Expense}} \text{amount} \quad (\text{across all categories})$$
  *(Code: [`src/lib/services/profit.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L31-L43))*
- **Restocking Cost Treatment Discrepancy:**
  - In `Batch`, the fields `purchaseCost`, `additionalCosts`, and `totalInvestment` exist.
  - **None of these batch fields enter `totalExpenses`.**
  - Unsold inventory costs are capitalized in `BatchItem` and only hit COGS as products are sold.
  - If a user pays GH₵500 for customs or shipping on a batch and logs it as `Batch.additionalCosts`, that GH₵500 is **never deducted from net profit** unless they duplicate the entry by also recording it in the `Expense` table under category `RESTOCKING` or `TRANSPORT`.

### 2.5 Net Profit
$$\text{totalNetProfit} = \text{round}(\text{totalGrossProfit} - \text{totalExpenses})$$
*(Code: [`src/lib/services/profit.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L45))*

> [!IMPORTANT]
> **Accrual vs. Cash In Hand:**  
> `totalGrossProfit` is calculated from all sales, including those where `paymentStatus = "UNPAID"` or `"PARTIAL"`.  
> Therefore, **Net Profit is purely accrual-based**. It reflects accounting profit, not realized cash in the bank.

### 2.6 The Amount Eligible for Allocation
- **Total Previously Allocated:**
  $$\text{totalAllocated} = \text{round}(\text{totalSavingsAllocated} + \text{totalNeedsAllocated} + \text{totalWantsAllocated})$$
  where each category is the sum of `ProfitAllocation.amount` for that type.
  *(Code: [`src/lib/services/profit.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L47-L66))*
- **Remaining Allocatable Profit:**
  $$\text{remainingAllocatableProfit} = \max(0, \text{round}(\text{totalNetProfit} - \text{totalAllocated}))$$
  *(Code: [`src/lib/services/profit.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L68))*
- **Allocation Ceiling Enforcement:**
  When allocating an amount $A$, [`validateProfitAllocation()`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/calculations/financial.ts#L99-L116) requires:
  $$A > 0 \quad \text{and} \quad A \le \text{remainingAllocatableProfit}$$

### 2.7 Savings, Needs, and Wants Amounts & Percentages
- **Reality in Code:**
  - Amounts are whatever custom values the user submits:
    $$\text{Savings} = \sum_{\text{type}=\text{SAVINGS}} \text{amount}, \quad \text{Needs} = \sum_{\text{type}=\text{NEEDS}} \text{amount}, \quad \text{Wants} = \sum_{\text{type}=\text{WANTS}} \text{amount}$$
  - The system **does not validate or enforce** 50%, 30%, or 20% ratios. A user can allocate 100% to Wants and 0% to Savings.
- **Unused Mathematical Function:**
  [`src/lib/calculations/financial.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/calculations/financial.ts#L83-L94) defines:
  ```ts
  export function calculate50_30_20Allocation(totalProfitToAllocate: number) {
    const amount = Math.max(0, Math.round(totalProfitToAllocate * 100) / 100);
    const savings = Math.round(amount * 0.50 * 100) / 100;
    const needs = Math.round(amount * 0.30 * 100) / 100;
    const wants = Math.round((amount - savings - needs) * 100) / 100;
    return { savings, needs, wants };
  }
  ```
  This function is **dead code in production** (only referenced in unit tests).

### 2.8 Remaining Category Balances
- **Needs & Wants:** There is no balance tracking. Once an allocation is made to `NEEDS` or `WANTS`, it is only stored as an event row. The system does not maintain an expense draw account for Needs or a dividend payout account for Wants.
- **Savings Ledger:** Maintained via [`src/lib/services/savings.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/savings.ts#L49-L86):
  $$\text{totalSavingsBalance} = \max(0, \text{round}(\text{Deposits} - \text{Withdrawals} + \text{Adjustments}))$$
  Withdrawals are validated against `totalSavingsBalance` so the savings ledger cannot drop below zero.

---

## 3. Data Model Inspection

```mermaid
erDiagram
    Business ||--o{ Batch : owns
    Business ||--o{ Sale : records
    Business ||--o{ Expense : logs
    Business ||--o{ ProfitAllocation : allocates
    Business ||--o{ SavingsTransaction : maintains
    Business ||--o{ DebtPayment : receives

    Batch ||--|{ BatchItem : contains
    Product ||--o{ BatchItem : "stocked in"
    Product ||--o{ SaleItem : "sold in"
    Batch ||--o{ SaleItem : "sourced from"
    Sale ||--|{ SaleItem : contains
    Customer ||--o{ Sale : buys
    Customer ||--o{ DebtPayment : pays
    Sale ||--o{ DebtPayment : "settles"
    Batch ||--o{ Expense : "optional tag"

    ProfitAllocation ||..o| SavingsTransaction : "companion DEPOSIT (SAVINGS only)"
```

### 3.1 Relevant Database Models & Columns

| Table / Model | Key Columns & Types | Role in Profit & Allocation |
| :--- | :--- | :--- |
| **`Batch`** | `id`, `businessId`, `reference`, `purchaseDate`, `status` (`ACTIVE`/`COMPLETED`/`ARCHIVED`), `purchaseCost`, `additionalCosts`, `totalInvestment` | Tracks inventory procurement. **Has no foreign key relationship to `ProfitAllocation`.** |
| **`BatchItem`** | `id`, `batchId`, `productId`, `quantityPurchased`, `unitCost`, `totalCost`, `quantityRemaining` | Slices inventory costs for FIFO deductions during sales. |
| **`Sale`** | `id`, `businessId`, `totalAmount`, `totalCost`, `grossProfit`, `amountPaid`, `balanceDue`, `paymentStatus`, `status` | Source of revenue, COGS, and gross profit. `status NOT IN ['VOIDED', 'REFUNDED']` feeds `totalGrossProfit`. |
| **`SaleItem`** | `id`, `saleId`, `productId`, `batchId`, `quantity`, `unitPrice`, `unitCost`, `revenue`, `cost`, `profit` | Atomic record of FIFO cost-profit per batch per product. |
| **`Expense`** | `id`, `businessId`, `batchId` (optional nullable), `category`, `amount`, `expenseDate` | Direct source of `totalExpenses`. Deducted from gross profit to get net profit. |
| **`DebtPayment`** | `id`, `businessId`, `customerId`, `saleId`, `amount`, `paymentMethod`, `idempotencyKey` | Cash collections against debts. Affects receivables; **does not affect net profit or allocatable profit**. |
| **`ProfitAllocation`** | `id`, `businessId`, `amount` (Decimal), `type` (`SAVINGS`/`NEEDS`/`WANTS`), `source` (string), `notes` (string), `allocationDate` (DateTime) | **Primary allocation record.** Stores every manual profit distribution. |
| **`SavingsTransaction`** | `id`, `businessId`, `type` (`DEPOSIT`/`WITHDRAWAL`/`ADJUSTMENT`), `amount` (Decimal), `referenceId`, `description` | Ledger for savings bucket. `referenceId` stores `ProfitAllocation.id` on deposit. |

### 3.2 API Routes and Server Actions

- **`POST /api/profit`** ([`src/app/api/profit/route.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/api/profit/route.ts)):
  - Protected: `allowedRoles: ["OWNER"]`.
  - Body: `{ amount, type, source, notes }`.
  - Calls `allocateProfit()` and `logAudit()`.
- **`GET /api/profit`** ([`src/app/api/profit/route.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/api/profit/route.ts)):
  - Returns `{ summary, allocations }`.
- **Server Action `allocateProfitAction()`** ([`src/lib/actions/profit-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/profit-actions.ts)):
  - Validates via Zod `allocateProfitSchema`.
  - Calls `allocateProfit()` and revalidates paths `/profit`, `/dashboard`, `/reports`.
- **Server Action `recordSavingsTransactionAction()`** ([`src/lib/actions/savings-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/savings-actions.ts)):
  - Records manual deposits, withdrawals, or adjustments on the savings ledger.

### 3.3 Integrity Safeguards and Deficiencies

1. **Ceiling Check on Allocation:**
   - **Implemented:** In [`src/lib/services/profit.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L120-L132), `validateProfitAllocation()` ensures $A \le \text{remainingAllocatableProfit}$.
2. **Duplicate Allocation Safeguards:**
   - **Missing:** Unlike `DebtPayment`, which uses a unique `idempotencyKey`, `ProfitAllocation` has **no idempotency key and no uniqueness constraints**. Rapid double-clicking by a user can insert two identical allocation rows if total remaining profit permits.
3. **Concurrency Race Condition:**
   - **Vulnerability:** In `allocateProfit()`, `getFinancialSummary()` is called *before* entering `prisma.$transaction()`. If two concurrent requests arrive simultaneously, both read the same `remainingAllocatableProfit`, both pass validation, and both insert allocations, leading to an **over-allocation beyond actual net profit**.
4. **Cash Backing Safeguard:**
   - **Missing:** The system allows allocating profit up to `totalNetProfit`, even if `totalAmountCollected` is significantly lower due to unpaid customer debt.

---

## 4. Scenario Analysis

| # | Scenario | Status | Behavior in Current Code | Supporting Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **A batch is active and some products have been sold** | **Safe / Working** | Sold units are decremented via FIFO from `batchItem.quantityRemaining`. Only sold units enter `Sale.totalCost` and `grossProfit`. Unsold units remain capitalized in inventory at cost. Profit from sold units is immediately eligible for allocation. | [`sales.ts:L114-L148`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts#L114-L148) (FIFO deduction); [`profit.ts:L20-L45`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L20-L45) (aggregates sold items only). |
| **2** | **A customer buys on credit and has not paid yet** | **Potentially Incorrect / High Risk** | Accrual accounting treats credit sales as instant gross profit. `totalNetProfit` and `remainingAllocatableProfit` increase immediately. An owner can distribute cash dividends or savings against profit that has not been collected in cash. | [`sales.ts:L232-L264`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts#L232-L264) (`grossProfit` computed on full total amount); [`profit.ts:L45`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L45) (uses gross profit without checking `amountPaid`). |
| **3** | **A customer makes a partial payment later** | **Safe for Debt, Disconnected from Profit** | `recordDebtPayment` updates `sale.amountPaid` and `sale.balanceDue`. However, net profit and allocatable profit do **not** increase because the profit was already fully counted on the sale date. No cash-flow allocation event occurs. | [`debt.ts:L203-L211`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/debt.ts#L203-L211) (updates `amountPaid`/`balanceDue`); [`profit.ts:L45`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L45) (`netProfit` ignores `DebtPayment` table). |
| **4** | **New expense or restocking cost recorded after allocation** | **Potentially Incorrect / Deficit Risk** | A newly logged `Expense` reduces `totalNetProfit`. If profit was already 100% allocated, `totalNetProfit - totalAllocated` becomes negative. `remainingAllocatableProfit` clamps to `0`. Historical allocations are not reversed, leaving the business silently over-allocated. | [`profit.ts:L68`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L68) (`Math.max(0, netProfit - totalAllocated)` clamps negative numbers to zero). |
| **5** | **More stock purchased before batch is closed** | **Safe for Stock, Disconnected from Profit** | User adds items via `/api/batches/[id]/items`. Quantities and `totalInvestment` increase. An `InventoryTransaction` of type `PURCHASE` is logged. This purchase cost does **not** count as an expense and does not reduce net profit until individual units are sold. | [`batches.ts:L334-L360`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/batches.ts#L334-L360) (updates batch total); `prisma/schema.prisma` (no link between batch purchases and `Expense`). |
| **6** | **User attempts to allocate the same profit twice** | **Partially Safe (Ceiling bounded), No Dedupe** | If remaining profit is GH₵500, a second GH₵500 allocation is blocked because remaining profit becomes 0. However, if remaining profit is GH₵1,000 and the user double-clicks GH₵400, **both succeed** (GH₵800 allocated) due to lack of idempotency keys or request debouncing. | [`profit.ts:L120-L132`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts#L120-L132) (validates against ceiling); `schema.prisma:L376-L390` (no unique constraint or idempotency key). |
| **7** | **Batch closed while stock remains or debts outstanding** | **High Risk / Defect for Stock; Safe for Debts** | **Stock Defect:** Closing a batch marks it `COMPLETED`. `createSale` FIFO logic searches *only* `batch: { status: "ACTIVE" }`. Any remaining units in the closed batch become permanently stranded and will never be sold via FIFO.  <br>**Debts:** Customer debts reside on `Sale` and are unaffected by batch status. | [`sales.ts:L88`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts#L88) (`status: "ACTIVE"` filter); [`batches.ts:L193-L198`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/batches.ts#L193-L198) (sets status to COMPLETED). |
| **8** | **Historical allocation needs correction** | **Unsupported / Missing** | The system provides no UI or API mechanism to edit, cancel, or void a historical `ProfitAllocation`. Corrections must be executed via direct database manipulation or compensatory manual adjustments in the savings ledger. | No update or delete endpoints exist in [`profit-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/profit-actions.ts), [`profit.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts), or [`/api/profit`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/api/profit/route.ts). |

---

## 5. Implementation Assessment

### 5.1 What Currently Works
- **FIFO Inventory Costing:** `SaleItem` records precise unit costs and gross profit based on chronological batch acquisition.
- **Accrual Net Profit Pipeline:** Cumulative sales revenue minus COGS minus operational expenses correctly computes total accrual net profit.
- **Savings Ledger Double-Entry:** Saving to `SAVINGS` automatically writes to both `ProfitAllocation` and `SavingsTransaction`.
- **Savings Balance Floor Protection:** Withdrawals from `SavingsTransaction` are validated so that total savings balance cannot drop below zero.
- **Allocation Ceiling Protection:** A single allocation cannot exceed `remainingAllocatableProfit` at the time of submission.
- **Audit Logging and Notification Pipeline:** Allocations generate notifications, audit log entries, and event triggers.

### 5.2 What Is Manual and Why
- **Allocation Execution:** 100% manual. The user selects the bucket and enters the number.
  - *Why:* The app design treats profit distribution as an owner discretion decision rather than an automatic payroll/transfer event.
- **Calculation of the 50/30/20 Split:** The user must manually compute 50%, 30%, or 20% on a calculator and enter it.
  - *Why:* The frontend developer built the modal form but omitted the "Apply 50/30/20 Preset" button that was planned in the specification.
- **Batch Closure:** A user can manually click "Close Batch" on the batch detail page.
  - *Why:* Allows owners to lock a batch if they want to stop editing items or indicate procurement is finished.

### 5.3 What Is Automatic and How
- **Automatic Batch Completion:** Handled by `syncBatchStatus()` in `batches.ts`. When a sale reduces all item quantities in a batch to 0, the batch status is automatically updated to `COMPLETED`.
- **Automatic Fallback Batch Creation:** If a product is sold but no active batch has remaining stock, `createSale()` in `sales.ts` automatically creates a `BATCH-DIRECT-<year>` batch at product default cost price so POS sales do not fail.
- **Automatic Savings Ledger Deposit:** Handled by `allocateProfit()` in `profit.ts`. If `type === "SAVINGS"`, a `SavingsTransaction` deposit is created in the same database transaction.
- **Automatic Automation Event Emission:** `PROFIT_AVAILABLE` and `PROFIT_ALLOCATED` business events are dispatched through `automationEngine.emit()`.

### 5.4 Bugs, Risks, and Unclear Rules

1. **Stranded Stock on Closed Batches (Bug):**
   - *Issue:* If a user closes a batch that still has unsold units, `sales.ts` will never deduct from it because it queries `batch: { status: "ACTIVE" }`.
   - *Impact:* Inventory remains locked in the database, while future sales of that product create fallback batches with potentially wrong cost bases.
2. **Phantom Cash Allocation Risk (Financial Risk):**
   - *Issue:* Profit is allocatable based on total sales, including unpaid credit sales.
   - *Impact:* An owner can distribute dividends (`WANTS`) in physical cash based on profits tied up in unpaid customer debts.
3. **Over-Allocation Deficit on Late Expenses (Financial Risk):**
   - *Issue:* If an expense is entered after profit is allocated, net profit drops below total allocated profit.
   - *Impact:* The system silently clamps `remainingAllocatableProfit` to 0 without warning the user that previously distributed profit is now in deficit.
4. **Missing 50/30/20 Preset in UI (Incomplete Feature):**
   - *Issue:* The UI displays badges "50% Target", "30% Target", "20% Target", but provides no button to split an amount into these three buckets simultaneously.
5. **Lack of Idempotency on Allocations (Concurrency / UX Risk):**
   - *Issue:* Rapid clicks or re-submissions can double-allocate profit.
6. **Double-Counting vs. Omission of Restocking Transport Costs (Rule Ambiguity):**
   - *Issue:* Batch `additionalCosts` does not deduct from profit. Expense category `RESTOCKING` does deduct from profit. There is no clear rule guiding whether shipping fees should be a batch capital cost or an operational expense.

---

## 6. Files and Database Objects Involved

### Source Code Files
- **Database Schema:** [`prisma/schema.prisma`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/prisma/schema.prisma)
- **Financial Calculation Helpers:** [`src/lib/calculations/financial.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/calculations/financial.ts)
- **Profit Service:** [`src/lib/services/profit.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/profit.ts)
- **Savings Service:** [`src/lib/services/savings.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/savings.ts)
- **Batch Service:** [`src/lib/services/batches.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/batches.ts)
- **Sales Service & FIFO Engine:** [`src/lib/services/sales.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/sales.ts) & [`src/lib/inventory/fifo.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/inventory/fifo.ts)
- **Debt Service:** [`src/lib/services/debt.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/debt.ts)
- **Reports Service:** [`src/lib/services/reports.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/services/reports.ts)
- **Server Actions:**
  - [`src/lib/actions/profit-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/profit-actions.ts)
  - [`src/lib/actions/savings-actions.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/lib/actions/savings-actions.ts)
- **API Endpoints:**
  - [`src/app/api/profit/route.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/api/profit/route.ts)
  - [`src/app/api/batches/[id]/close/route.ts`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/api/batches/[id]/close/route.ts)
- **UI Pages & Components:**
  - [`src/app/(op)/profit/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/(op)/profit/page.tsx)
  - [`src/app/(op)/batches/[id]/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/(op)/batches/[id]/page.tsx)
  - [`src/components/dashboard/InteractiveDashboard.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/components/dashboard/InteractiveDashboard.tsx)
  - [`src/app/(op)/reports/page.tsx`](file:///c:/Users/MYPC1/Desktop/Avencia%20Project/src/app/(op)/reports/page.tsx)

### Database Tables / Models
- `Batch`
- `BatchItem`
- `Product`
- `Sale`
- `SaleItem`
- `Expense`
- `DebtPayment`
- `ProfitAllocation`
- `SavingsTransaction`
- `AuditLog`
- `Notification`

---

## 7. Recommended Next Steps (Ordered by Importance)

*(Historical Record of Initial Audit Recommendations)*

---

## 8. Implementation & Controlled Verification Resolution

### Status: Fully Implemented & Live Verified

1. **Conservative Cash-Backed Formula Landed (`src/lib/calculations/financial.ts`):**
   - Distributable Cash Surplus strictly implements:
     $$\text{Net Realized Cash Profit} = \max(0, \text{Collected Cash} - \text{Total COGS} - \text{Total Expenses})$$
     $$\text{Eligible Cash Profit} = \max(0, \text{Net Realized Cash Profit} - \text{Total Prior Allocations})$$
   - Total COGS of all active sales (paid, partially paid, or credit) is reserved in full, protecting inventory restocking capital.

2. **Batch FIFO Unstranding Landed (`src/lib/services/sales.ts:L88`):**
   - Query updated to `status: { not: "ARCHIVED" }`, allowing unexhausted batches marked `CLOSED` to sell through via FIFO.

3. **Atomic 50/30/20 Distribution & Ledger Sync (`src/lib/services/profit.ts`):**
   - One-click confirmation splits funds: 50% Savings, 30% Needs, 20% Wants with exact penny conservation integer arithmetic.
   - Atomically writes 3 `ProfitAllocation` rows and 1 companion `SavingsTransaction` row (`DEPOSIT`) linking directly to the `SAVINGS` allocation.

4. **Idempotency & Stale Concurrency Protection:**
   - Unique `idempotencyKey` prevents duplicate rows on network retries.
   - Server-side verification inside `prisma.$transaction` rejects stale confirmations if live surplus drifts.

5. **UI Disclosures & Permanence Warning (`src/app/(op)/profit/page.tsx`):**
   - Realized cash breakdown card displays COGS restocking reserve, paid expense assumptions, and available surplus.
   - Confirmation checkbox explicitly notifies the owner that allocations are permanent and cannot be automatically undone.

6. **Controlled Live Allocation Verification (Neon Database):**
   - **Pre-Allocation Baseline:** GH₵590.00 cash collected, GH₵340.00 COGS, GH₵250.00 net profit, GH₵250.00 eligible surplus, 0 previous allocations, GH₵0.00 savings balance.
   - **Execution (GH₵10.00 Allocation):**
     - Savings (50%): GH₵5.00
     - Needs (30%): GH₵3.00
     - Wants (20%): GH₵2.00
     - Linked Savings Deposit: GH₵5.00
   - **Idempotency Check:** Replaying the identical key returned existing records with `isIdempotentReplay: true` (0 duplicate rows).
   - **Post-Allocation Ledger State:** Total allocated GH₵10.00, remaining eligible profit GH₵240.00, Savings account balance GH₵5.00. 100% mathematical reconciliation across database, services, and UI.

