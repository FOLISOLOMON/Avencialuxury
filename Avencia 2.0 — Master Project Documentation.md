# AVENCIA 2.0
## Business Management & Sales Platform

**Project Status:** New build from scratch  
**Version:** 2.0  
**Primary User:** Avencia business owner  
**Business Type:** Perfume / fragrance retail business  
**Primary Platform:** Web application / PWA-ready  
**Development Approach:** Production-ready, modular, scalable  
**Primary Language:** English

---

# 1. PROJECT OVERVIEW

Avencia 2.0 is a modern business management application designed for a small perfume business.

The application will manage:

- Products
- Inventory
- Stock batches
- Sales
- Customers
- Expenses
- Revenue
- Profit
- Profit allocation
- Business needs
- Business wants
- Savings
- Reports
- Business settings

The system must provide the business owner with a clear understanding of the financial and operational state of the business.

Avencia is not simply a sales tracker.

The application should function as a lightweight business operating system for the perfume business.

---

# 2. IMPORTANT DEVELOPMENT DECISION

The existing Avencia application must NOT be extended or patched.

Avencia 2.0 is a complete rebuild.

The existing application may be used only as a reference for:

- Existing features
- Existing terminology
- Existing workflows
- Existing UI ideas
- Existing business requirements

Do not copy the old architecture.

Do not preserve technical decisions simply because they existed in the old application.

The new application must use a clean architecture designed specifically for Avencia 2.0.

---

# 3. PRIMARY GOALS

The application must:

1. Be fast.
2. Be reliable.
3. Have a professional modern interface.
4. Work well on mobile devices.
5. Support desktop screens.
6. Have a scalable backend.
7. Use a real relational database.
8. Keep business calculations accurate.
9. Avoid unnecessary API requests.
10. Avoid loading large datasets unnecessarily.
11. Be maintainable.
12. Be easy to extend.
13. Support future offline functionality.
14. Keep financial records consistent.
15. Prevent accidental data loss.
16. Provide clear business reports.

---

# 4. CORE TECHNOLOGY STACK

## Frontend

- Next.js
- TypeScript
- React
- Next.js App Router
- Tailwind CSS
- shadcn/ui or an equivalent accessible component system

## Backend

The application should use Next.js server-side capabilities.

Preferred options:

- Server Actions where appropriate
- Route Handlers/API endpoints where appropriate
- Server-side database queries
- Server-side business logic

Do not create unnecessary API layers when a direct server-side operation is more appropriate.

## Database

Use:

- PostgreSQL

Preferred hosted provider:

- Neon PostgreSQL

The application must NOT use Google Sheets as its primary database.

Google Sheets may be added later as an export or synchronization feature if required.

## Deployment

Preferred:

- Vercel for the Next.js application
- Neon for PostgreSQL

## Version Control

- Git
- GitHub

---

# 5. ARCHITECTURE

The application should follow this general architecture:

User
↓
Next.js UI
↓
Server Components / Client Components
↓
Server Actions / Route Handlers
↓
Business Logic / Services
↓
PostgreSQL
↓
Persistent business data

The architecture must separate:

- UI
- Database access
- Business logic
- Validation
- Authentication
- Financial calculations

Do not place complex business calculations directly inside UI components.

---

# 6. PERFORMANCE REQUIREMENTS

Performance is one of the highest priorities of Avencia 2.0.

The previous application became very slow.

The new application must avoid the causes of that problem.

## Requirements

Do not:

- Fetch the entire database on page load.
- Fetch all sales just to calculate dashboard statistics.
- Fetch all customers unnecessarily.
- Load unnecessary images.
- Run large calculations in the browser.
- Repeatedly request the same data.
- Use unnecessary client components.
- Make every page fully client-rendered.

Prefer:

- Server Components
- Server-side database queries
- Pagination
- Filtering at database level
- Aggregation at database level
- Proper database indexes
- Caching where appropriate
- Lazy loading
- Optimistic UI where appropriate
- Small payloads

Dashboard statistics should be calculated using database aggregation queries.

Example:

Do NOT:

Get every sale → send every sale to browser → calculate revenue.

Instead:

Database → SUM(revenue) → return result.

---

# 7. RESPONSIVE DESIGN

Avencia must be designed mobile-first.

The primary user may use the application from an iPhone.

The application must work properly on:

- Mobile
- Tablet
- Laptop
- Desktop

The interface must not simply be a desktop interface squeezed onto a mobile screen.

Mobile interactions should be intentionally designed.

---

# 8. APPLICATION STRUCTURE

Main application sections:

1. Dashboard
2. Products
3. Inventory
4. Batches
5. Sales
6. Customers
7. Expenses
8. Profit
9. Reports
10. Settings

Navigation should remain simple.

The dashboard should provide quick access to the most frequently used operations.

---

# 9. DASHBOARD

The dashboard is the main business overview.

It should display:

## Financial overview

- Total revenue
- Total profit
- Total expenses
- Available business money
- Savings
- Needs
- Wants

## Sales overview

- Today's sales
- This week's sales
- This month's sales
- Recent transactions

## Inventory overview

- Total products
- Total units
- Low-stock products
- Out-of-stock products
- Current inventory value

## Batch overview

- Active batches
- Batch investment
- Batch revenue
- Batch profit
- Remaining stock

## Visualizations

Where useful:

- Revenue trend
- Profit trend
- Sales trend
- Top-selling products
- Expense breakdown

Charts must not create unnecessary performance overhead.

---

# 10. PRODUCTS

Products represent the individual perfume products sold by the business.

A product should have fields such as:

- ID
- Name
- SKU
- Description
- Category
- Brand
- Size
- Selling price
- Default cost price
- Current stock
- Low-stock threshold
- Status
- Created date
- Updated date

Product images are optional.

The first production version should prioritize speed and functionality over large product images.

---

# 11. INVENTORY

Inventory represents the actual available stock.

The system must track:

- Product
- Quantity available
- Quantity sold
- Quantity purchased
- Quantity remaining
- Stock value
- Low-stock status
- Out-of-stock status

Inventory must be derived from actual stock transactions where possible.

Do not rely on manually changing a single stock number without recording the reason for the change.

---

# 12. BATCH SYSTEM

The batch system is one of the most important parts of Avencia.

A batch represents a specific stock purchase.

Example:

Batch A:

- 20 perfume units purchased
- Purchase cost = GH₵2,000
- Transport = GH₵100
- Total investment = GH₵2,100

The batch can remain active while products are being sold.

---

# 13. BATCH FIELDS

Each batch should contain:

- Batch ID
- Batch name/reference
- Purchase date
- Status
- Total purchase cost
- Additional costs
- Total investment
- Total units purchased
- Total units sold
- Remaining units
- Revenue
- Gross profit
- Expenses
- Net profit
- Created date
- Updated date

Possible statuses:

- Active
- Completed
- Archived

---

# 14. BATCH PRODUCTS

A batch can contain multiple products.

Example:

Batch 001

- Perfume A — 10 units
- Perfume B — 15 units
- Perfume C — 8 units

Each batch-product record should track:

- Product
- Quantity purchased
- Unit cost
- Total cost
- Quantity sold
- Quantity remaining

---

# 15. SALES

Every sale must contain enough information to reconstruct the transaction.

A sale should contain:

- Sale ID
- Date/time
- Customer
- Batch
- Product
- Quantity
- Unit selling price
- Total revenue
- Unit cost
- Cost of goods sold
- Gross profit
- Payment method
- Notes
- Created date

The system should automatically calculate:

Total Revenue:

quantity × selling price

Cost of Goods Sold:

quantity × unit cost

Gross Profit:

revenue − cost of goods sold

---

# 16. MULTI-PRODUCT SALES

The system should support a single sale containing multiple products.

Example:

Sale #001

- Product A × 2
- Product B × 1
- Product C × 3

The sale should have:

- One sale record
- Multiple sale item records

This is preferable to creating unrelated sales for each item.

---

# 17. STOCK DEDUCTION

When a sale is completed:

1. Validate available stock.
2. Identify the applicable batch.
3. Deduct the sold quantity.
4. Create the sale record.
5. Calculate revenue.
6. Calculate cost.
7. Calculate profit.
8. Update inventory.
9. Update batch statistics.

These operations should be handled safely as one logical transaction.

If something fails, the system should avoid leaving partially updated financial data.

---

# 18. BATCH SELECTION

When selling a product that exists in multiple batches, the application needs a consistent inventory allocation strategy.

Preferred default:

FIFO — First In, First Out.

Example:

Batch A:
10 units remaining

Batch B:
20 units remaining

If 5 units are sold, the system should deduct from Batch A first.

However, the architecture should allow the allocation strategy to be changed later if the business requires it.

---

# 19. EXPENSES

Expenses represent money spent by the business.

Examples:

- Transportation
- Delivery
- Packaging
- Restocking costs
- Marketing
- Business purchases
- Other operational costs

Each expense should include:

- Expense ID
- Description
- Amount
- Category
- Date
- Batch if applicable
- Notes
- Created date

---

# 20. BATCH EXPENSES

Some expenses should be associated with a batch.

Example:

Batch 001:

Purchase cost:
GH₵2,000

Transport:
GH₵100

Total investment:
GH₵2,100

Batch-specific expenses should be associated with the batch.

---

# 21. PROFIT CALCULATION

Profit must be calculated carefully.

Basic gross profit:

Revenue − Cost of Goods Sold

Net profit:

Gross Profit − Applicable Expenses

Do not treat revenue as profit.

Do not treat cash balance as profit.

Do not mix personal spending with business expenses unless explicitly recorded through the appropriate allocation system.

---

# 22. PROFIT ALLOCATION

Avencia must support allocation of profit into:

1. Savings
2. Needs
3. Wants

The purpose is to help the business owner understand how generated profit is being distributed.

Example:

Profit:
GH₵1,000

Allocation:

Savings:
GH₵300

Needs:
GH₵400

Wants:
GH₵300

The system must ensure that allocations do not exceed the available amount being allocated.

---

# 23. NEEDS

Needs represent necessary spending.

Examples:

- Restocking
- Transportation
- Packaging
- Business necessities

A user should be able to record money used from the Needs allocation.

---

# 24. WANTS

Wants represent discretionary business spending.

Examples:

- Optional business purchases
- Business upgrades
- Non-essential spending

The system should track:

- Amount allocated
- Amount spent
- Amount remaining

---

# 25. SAVINGS

Savings should be tracked separately.

The system should show:

- Total saved
- Savings added
- Savings withdrawn
- Current savings balance

Savings must not be treated as ordinary expenses.

---

# 26. RESTOCKING

The system must support restocking while a batch is still active.

The business owner should not have to close a batch before purchasing additional stock.

A new purchase should normally create a new batch.

Example:

Batch 001 remains active.

New stock arrives.

Create Batch 002.

Both batches can exist simultaneously.

---

# 27. ACTIVE BATCHES

Multiple batches may be active at the same time.

The application must support:

- Multiple active batches
- Products existing in multiple batches
- Sales across multiple batches
- Batch-specific expenses
- Batch-specific profit

---

# 28. CUSTOMERS

Customer records should include:

- Customer ID
- Name
- Phone number
- Email if available
- Notes
- Total purchases
- Total spending
- Last purchase date
- Created date

Customer information should remain minimal and practical.

Do not collect unnecessary personal information.

---

# 29. REPORTS

Reports should provide useful business information.

Required reports:

## Sales report

- Date
- Customer
- Products
- Quantity
- Revenue
- Profit

## Product report

- Product
- Units sold
- Revenue
- Profit

## Batch report

- Batch
- Investment
- Revenue
- Expenses
- Profit
- Units purchased
- Units sold
- Remaining units

## Expense report

- Category
- Amount
- Date
- Batch

## Profit report

- Revenue
- Cost
- Expenses
- Gross profit
- Net profit
- Allocations

Reports should support date filtering.

---

# 30. SEARCH AND FILTERING

Large lists must support:

- Search
- Date filters
- Category filters
- Status filters
- Batch filters
- Product filters

Filtering should happen server-side/database-side where appropriate.

---

# 31. PAGINATION

Large datasets must not be loaded all at once.

Sales, expenses, customers and other potentially large collections should use pagination or another appropriate incremental loading strategy.

---

# 32. SETTINGS

Settings should include:

- Business name
- Currency
- Low-stock threshold
- Default payment method
- Inventory preferences
- Profit allocation preferences

Currency should default to:

GHS / GH₵

But the architecture should allow additional currencies later.

---

# 33. PAYMENT METHODS

The application should support configurable payment methods such as:

- Cash
- Mobile Money
- Bank Transfer
- Card
- Other

The system should not assume that every sale is paid through the same method.

---

# 34. AUTHENTICATION

The first production version is primarily for the business owner.

Authentication should be implemented properly.

The architecture should support future:

- Multiple users
- User roles
- Staff accounts
- Permissions

Do not hard-code the system around a single user in a way that prevents future expansion.

---

# 35. DATA VALIDATION

All important inputs must be validated.

Validation should happen on the server.

Examples:

- Quantity must be greater than zero.
- Price cannot be negative.
- Expense amount cannot be negative.
- Required fields cannot be empty.
- A sale cannot exceed available inventory.
- Profit allocation cannot exceed available profit.
- Invalid batch IDs must be rejected.
- Invalid product IDs must be rejected.

Client-side validation can improve UX, but server-side validation is mandatory.

---

# 36. FINANCIAL PRECISION

Financial values must be handled safely.

Do not rely blindly on JavaScript floating-point arithmetic for financial calculations.

Use appropriate database numeric/decimal types.

Money should be stored using a precise numeric representation.

Avoid storing financial values as formatted strings.

Example:

Correct:

100.50

Incorrect:

"GH₵100.50"

The currency symbol should be added only for display.

---

# 37. DATABASE DESIGN PRINCIPLES

Use relational database design.

Expected core tables include:

- users
- businesses
- products
- batches
- batch_items
- sales
- sale_items
- customers
- expenses
- profit_allocations
- savings_transactions
- inventory_transactions
- settings

The final schema may introduce additional supporting tables if required.

Relationships must use foreign keys.

Do not duplicate data unnecessarily.

---

# 38. DATABASE TRANSACTIONS

Operations affecting multiple financial records should use database transactions.

For example, creating a sale should safely handle:

- Sale creation
- Sale items
- Inventory deduction
- Batch stock update
- Financial calculations

If one critical operation fails, the transaction should roll back where appropriate.

---

# 39. AUDITABILITY

Important financial operations should be traceable.

The system should maintain enough information to determine:

- What happened
- When it happened
- Which record was affected
- How much changed

This is especially important for:

- Sales
- Expenses
- Inventory changes
- Profit allocations
- Savings changes

---

# 40. ERROR HANDLING

Errors must be useful.

Do not show raw database errors to users.

Example:

Bad:

"PrismaClientKnownRequestError..."

Better:

"Unable to save this sale. Please try again."

Detailed errors should still be logged for development/debugging.

---

# 41. LOADING STATES

Every asynchronous operation must have an appropriate loading state.

Examples:

- Loading dashboard
- Saving sale
- Creating product
- Updating inventory
- Generating report

Avoid unnecessary full-screen loading spinners.

Prefer localized loading states.

---

# 42. EMPTY STATES

Every list should have a useful empty state.

Example:

"No sales recorded yet."

Provide an appropriate action:

"Record your first sale"

---

# 43. MOBILE UX

On mobile:

- Navigation should be easy to access.
- Buttons must be touch-friendly.
- Tables should become mobile-friendly cards or horizontally scrollable layouts where appropriate.
- Forms should be easy to complete with one hand.
- Important actions should be obvious.

Sales entry should be extremely quick.

---

# 44. SALE ENTRY UX

Recording a sale should require as few steps as reasonably possible.

Ideal flow:

1. Select product.
2. Select quantity.
3. Select customer if applicable.
4. Select payment method.
5. Confirm sale.
6. Save.

The system calculates:

- Revenue
- Cost
- Profit
- Inventory deduction
- Batch allocation

automatically.

---

# 45. DESIGN DIRECTION

Avencia should have a professional modern SaaS-style interface.

The design should feel:

- Clean
- Premium
- Simple
- Fast
- Modern
- Mobile-friendly
- Business-focused

Avoid:

- Excessive gradients
- Excessive animations
- Cluttered dashboards
- Giant cards everywhere
- Unnecessary decorative elements
- Excessive shadows
- Slow visual effects

The interface should prioritize clarity over decoration.

---

# 46. ACCESSIBILITY

The application should follow reasonable accessibility practices.

Include:

- Semantic HTML
- Keyboard accessibility
- Visible focus states
- Proper labels
- Accessible dialogs
- Accessible buttons
- Sufficient contrast
- Screen-reader-friendly controls

---

# 47. SECURITY

Security must be considered from the beginning.

Requirements:

- Server-side authorization
- Input validation
- Secure authentication
- Secure session handling
- Environment variables for secrets
- Never expose database credentials
- Never expose private API keys
- Never trust client-provided financial calculations

All financial calculations must be verified server-side.

---

# 48. ENVIRONMENT VARIABLES

Sensitive configuration must use environment variables.

Examples:

DATABASE_URL

AUTH_SECRET

Other provider-specific secrets

Never commit secrets to GitHub.

Provide:

.env.example

with variable names but no real credentials.

---

# 49. LOGGING

Development logging should provide useful information.

Production logs should avoid:

- Passwords
- Tokens
- Sensitive customer information
- Database credentials

Log important server errors with enough context for debugging.

---

# 50. OFFLINE-FIRST FUTURE

Offline functionality is a future requirement and should influence the architecture.

The long-term goal is:

User
↓
Local application data
↓
Offline operation
↓
Sync engine
↓
PostgreSQL

Potential technologies:

- IndexedDB
- Dexie
- Service Worker
- PWA
- Background synchronization

Do not implement an unnecessarily complex offline architecture in the first version unless required.

However, the current architecture must not make future offline support impossible.

---

# 51. PWA READINESS

The application should be structured so it can later support:

- Installable PWA
- App icon
- Splash screen
- Offline shell
- Service worker
- Cached assets

The application should behave well when installed to an iPhone home screen.

---

# 52. GOOGLE SHEETS

Google Sheets is NOT the primary database for Avencia 2.0.

The previous application used Google Sheets as a database-like system.

That architecture should not be repeated.

If needed later, Google Sheets can be used for:

- Export
- Backup
- Reporting
- Manual bookkeeping
- Data migration

---

# 53. DATA EXPORT

Future export functionality should support:

- CSV
- Excel
- PDF reports

Export operations should be generated server-side where practical.

---

# 54. BACKUPS

The system must consider database backup and recovery.

Do not rely solely on the application's UI as a backup.

The production database provider should have appropriate backup/recovery capabilities.

The application may later provide manual business-data exports.

---

# 55. TESTING

The application must not be considered complete merely because it compiles.

Testing should cover:

## Unit tests

- Profit calculations
- Revenue calculations
- Inventory calculations
- Batch calculations
- Profit allocation
- Validation

## Integration tests

- Creating sales
- Updating inventory
- Creating batches
- Recording expenses

## End-to-end tests

Critical user workflows:

- Login
- Create product
- Create batch
- Record sale
- Check inventory
- Record expense
- View profit
- Generate report

---

# 56. BUSINESS RULE TESTING

Examples:

## Sale

Given:

Quantity = 2

Selling price = GH₵50

Cost = GH₵30

Expected:

Revenue = GH₵100

COGS = GH₵60

Gross profit = GH₵40

## Inventory

If:

Stock = 10

Sale = 3

Expected:

Remaining stock = 7

## Profit allocation

If:

Available profit = GH₵1,000

Savings = GH₵300

Needs = GH₵400

Wants = GH₵300

Expected:

Allocated = GH₵1,000

Remaining = GH₵0

---

# 57. DEVELOPMENT WORKFLOW

The AI development agent must work in stages.

Do not attempt to create the entire application blindly in one step.

Recommended development sequence:

## Stage 1

Project setup

## Stage 2

Database architecture

## Stage 3

Authentication

## Stage 4

Application shell

## Stage 5

Products

## Stage 6

Batches

## Stage 7

Inventory

## Stage 8

Sales

## Stage 9

Expenses

## Stage 10

Profit allocation

## Stage 11

Customers

## Stage 12

Dashboard

## Stage 13

Reports

## Stage 14

Settings

## Stage 15

Performance optimization

## Stage 16

Testing

## Stage 17

Production deployment

---

# 58. AI CODING AGENT RULES

The AI coding agent must follow these rules.

### Rule 1

Do not invent requirements.

If something is unclear, inspect the documentation and existing architecture first.

### Rule 2

Do not create mock functionality in production code.

Do not leave fake sales, fake products, fake customers or fake dashboard numbers.

### Rule 3

Do not use placeholder data unless explicitly requested.

### Rule 4

Do not replace the database with local arrays.

### Rule 5

Do not use Google Sheets as the main database.

### Rule 6

Do not create unnecessary dependencies.

### Rule 7

Do not duplicate business logic across components.

### Rule 8

Do not put financial calculations only in the frontend.

### Rule 9

Do not ignore TypeScript errors.

### Rule 10

Do not ignore lint errors.

### Rule 11

Do not claim something is implemented until it has actually been implemented and tested.

### Rule 12

After major implementation work:

- Run lint
- Run type checking
- Run tests
- Run production build

Fix errors before continuing.

---

# 59. CODE QUALITY

Code must be:

- Type-safe
- Modular
- Readable
- Maintainable
- Production-ready

Avoid:

- `any` unless genuinely necessary
- giant components
- giant files
- duplicated logic
- hard-coded business rules
- hard-coded credentials
- unnecessary global state

---

# 60. COMPONENT ARCHITECTURE

Use reusable components.

Examples:

- Button
- Input
- Select
- Modal
- Dialog
- Data table
- Form
- Currency display
- Stat card
- Empty state
- Loading state
- Confirmation dialog
- Date picker
- Search input

Business-specific components should also be reusable where appropriate.

---

# 61. SERVER VS CLIENT COMPONENTS

Prefer Server Components by default.

Use Client Components only when client-side interactivity is actually required.

Examples that may require Client Components:

- Interactive forms
- Charts
- Dropdown interactions
- Dialogs
- Local UI state
- Browser APIs
- Offline functionality

Do not add `"use client"` to entire page trees unnecessarily.

---

# 62. STATE MANAGEMENT

Do not introduce a global state library unless there is a demonstrated need.

Prefer:

- Server state
- URL state
- Form state
- Local component state

Use a dedicated state library only if application complexity genuinely requires it.

---

# 63. DATABASE ACCESS

All database access should be centralized and structured.

Do not scatter raw database queries throughout UI components.

Use a clear data-access/service structure.

---

# 64. BUSINESS LOGIC

Business logic should live in dedicated server-side services/modules.

Examples:

- calculateSaleProfit()
- allocateInventory()
- calculateBatchProfit()
- allocateProfit()
- recordExpense()

Function names should clearly communicate their purpose.

---

# 65. ROUTING

Use clean routes.

Suggested structure:

/dashboard

/products

/products/[id]

/inventory

/batches

/batches/[id]

/sales

/sales/[id]

/customers

/customers/[id]

/expenses

/profit

/reports

/settings

/login

---

# 66. DASHBOARD QUICK ACTIONS

The dashboard should provide quick actions such as:

- New Sale
- Add Product
- New Batch
- Add Expense
- View Reports

These actions should be easily accessible on mobile.

---

# 67. CONFIRMATION RULES

Destructive operations should require confirmation.

Examples:

- Delete product
- Delete customer
- Delete expense
- Cancel batch
- Delete sale

Financial records should preferably be voided/reversed rather than permanently deleted where appropriate.

---

# 68. FINANCIAL RECORD IMMUTABILITY

Historical financial records should be treated carefully.

Instead of silently changing historical sales:

Prefer:

- Correction
- Reversal
- Adjustment
- Audit record

This helps maintain trustworthy financial history.

---

# 69. DATE AND TIME

Store timestamps consistently.

Use UTC internally where appropriate.

Display dates/times according to the user's local timezone.

The application is primarily intended for Ghana, so Ghana time should be supported correctly.

---

# 70. CURRENCY DISPLAY

Default currency:

GH₵

Examples:

GH₵100.00

GH₵1,250.50

Do not store the currency symbol inside the database amount.

---

# 71. LOW STOCK

The low-stock threshold should be configurable.

Default:

3 units

Example:

Stock > 3:

Normal

Stock <= 3:

Low stock

Stock = 0:

Out of stock

The exact visual treatment can be determined by the UI design system.

---

# 72. PRODUCT PROFIT

Product-level profitability should be calculated from actual sales.

Do not assume that the default product cost is always the actual cost.

When batches have different costs, the actual batch cost should be used.

---

# 73. BATCH PROFIT

Batch profit must consider:

- Revenue generated from the batch
- Cost of stock
- Batch-specific expenses

The system must distinguish between:

- Gross profit
- Net profit

---

# 74. BUSINESS CASH VS PROFIT

The application must clearly distinguish:

Revenue

Profit

Expenses

Cash

Savings

Allocated funds

These values are not interchangeable.

The dashboard must avoid presenting a misleading "profit = cash balance" model.

---

# 75. FUTURE FEATURES

Potential future features:

- Multiple businesses
- Multiple staff accounts
- Role-based permissions
- Advanced analytics
- Supplier management
- Purchase orders
- Barcode scanning
- Receipt printing
- WhatsApp integration
- Customer notifications
- Automated backups
- Advanced offline sync
- Native mobile application
- Payment integration
- AI business insights

These are NOT part of the initial MVP unless explicitly approved.

---

# 76. MVP PRIORITY

The first production version should prioritize:

1. Authentication
2. Products
3. Batches
4. Inventory
5. Sales
6. Expenses
7. Profit calculation
8. Profit allocation
9. Customers
10. Dashboard
11. Reports
12. Settings

Do not build future features before the core system is stable.

---

# 77. DEFINITION OF DONE

A feature is not complete until:

- UI is implemented.
- Backend logic is implemented.
- Database integration is implemented.
- Validation is implemented.
- Error handling is implemented.
- Loading state is implemented.
- Empty state is implemented where applicable.
- Mobile layout works.
- TypeScript passes.
- Lint passes.
- Tests pass where applicable.
- Production build passes.
- No mock data remains.
- No placeholder functionality remains.

---

# 78. FINAL PRODUCT STANDARD

Avencia 2.0 should feel like a real production SaaS product.

It should not feel like:

- A school project
- A demo
- A template
- An AI-generated prototype
- A collection of disconnected CRUD pages

Every feature must work together around the business model.

The system should prioritize:

FAST
RELIABLE
SIMPLE
ACCURATE
SCALABLE
PROFESSIONAL

---

# 79. MASTER PRINCIPLE

The most important principle for the entire project is:

> Build Avencia around the real business workflow, not around the database tables.

The user should be able to run the business naturally:

Purchase stock
↓
Create batch
↓
Add products to batch
↓
Sell products
↓
Inventory decreases
↓
Revenue increases
↓
Profit is calculated
↓
Expenses are recorded
↓
Net profit is determined
↓
Profit is allocated
↓
Money is tracked across Savings / Needs / Wants
↓
Reports explain the business

The system should make this workflow easy, fast and reliable.

---

# 80. AI AGENT INSTRUCTION

You are building Avencia 2.0 as a production-ready application.

Do not rush.

Before implementing a feature:

1. Understand the existing architecture.
2. Read the relevant documentation.
3. Inspect related database models.
4. Check existing business logic.
5. Plan the change.
6. Implement it.
7. Test it.
8. Run type checking.
9. Run linting.
10. Run the production build.
11. Fix all errors.
12. Only then move to the next feature.

Never replace working architecture with a shortcut merely to make a feature easier.

Never create fake functionality to make the UI look complete.

Never claim that a feature works unless it has been implemented and verified.

When requirements conflict, prioritize:

1. Data integrity
2. Financial correctness
3. Security
4. Performance
5. Maintainability
6. User experience
7. Visual polish

Avencia 2.0 must be built as a real application that can actually be used by the business.