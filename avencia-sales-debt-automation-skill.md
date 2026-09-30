# AVENCIA — SALES, DEBT & AUTOMATION ENGINEERING SKILL

## Skill Name

`avencia-sales-debt-automation`

## Purpose

This skill defines the engineering standards for modifying Avencia's:

* Sales History
* Sales filtering
* Financial summaries
* Customer balances
* Debt payments
* Debt status
* WhatsApp messaging
* Automation rules
* Internal notifications
* Automation execution
* Reporting consistency

The objective is to ensure that all financial and customer communication features use a **single source of truth**, remain transactionally correct, and behave consistently across the application.

This is a production business application.

Do not implement quick UI patches or duplicated business logic.

---

# 1. CORE ENGINEERING PRINCIPLE

Avencia must have one authoritative financial data flow.

Use:

```text
Sales / Payments / Refunds / Voids
                ↓
        Financial Services
                ↓
       Customer Debt State
                ↓
        Automation Engine
                ↓
       Communication Layer
                ↓
      WhatsApp / Notifications
```

The frontend must never become the authoritative source for:

* customer balances
* debt status
* payment status
* financial totals
* WhatsApp eligibility
* automation eligibility

The backend/service layer is authoritative.

---

# 2. EXISTING SYSTEM MUST BE RESPECTED

Before changing anything:

1. Inspect the existing implementation.
2. Identify the current service responsible for the functionality.
3. Identify the existing database models.
4. Identify existing calculation utilities.
5. Identify existing automation/event infrastructure.
6. Identify existing notification infrastructure.
7. Identify existing API routes.
8. Identify existing frontend consumers.

Do not create duplicate systems if an existing system already performs the required responsibility.

Prefer:

```text
Extend existing service
```

over:

```text
Create second competing service
```

---

# 3. SOURCE OF TRUTH RULE

Never calculate the same financial concept differently in multiple locations.

For example:

```text
Dashboard
Sales
Reports
Customer
Automation
WhatsApp
```

must all derive their financial values from the same underlying calculation rules.

Do NOT create:

```text
Dashboard profit calculation
Sales profit calculation
Reports profit calculation
```

as three independent implementations.

Instead:

```text
Financial Calculation Service
        ↓
Dashboard
Sales
Reports
Customer
Automation
```

---

# 4. MONEY HANDLING

All monetary calculations must use the existing project's safe money/decimal implementation.

Do not introduce unsafe floating-point calculations.

Never rely on:

```javascript
0.1 + 0.2
```

style floating-point arithmetic for financial values.

Preserve exact monetary precision.

All balances must be normalized before comparison.

For example:

```text
GH₵0.00
```

must be treated as zero.

---

# 5. CUSTOMER BALANCE

Customer outstanding balance must always be derived from authoritative transaction/payment data.

Conceptually:

```text
Eligible debt
-
Valid payments
=
Outstanding balance
```

The result must never be negative.

If:

```text
Outstanding = 0
```

then:

```text
Customer Debt Status = PAID
```

The system must not determine debt status simply because a customer has historical purchases.

---

# 6. MULTIPLE DEBT TRANSACTIONS

Customers may have multiple unpaid sales.

Example:

```text
Sale A → GH₵200 outstanding
Sale B → GH₵300 outstanding

Customer pays → GH₵250
```

Payment allocation must be deterministic.

If the user selects a specific sale:

```text
Apply payment to selected sale
```

If no sale is selected:

```text
Apply payment to oldest eligible outstanding sale first
```

Continue until the payment amount is exhausted.

All affected records must be updated transactionally.

---

# 7. SALES STATUS

Respect the existing sale statuses.

At minimum handle:

```text
PAID
PARTIAL
UNPAID
VOIDED
REFUNDED
```

Never treat every Sale record as normal revenue.

Rules:

### PAID

Sale has been fully settled.

### PARTIAL

Sale has received payment but still has an outstanding balance.

### UNPAID

Sale has no completed payment against its balance.

### VOIDED

Sale must not contribute to normal realized revenue/profit.

### REFUNDED

Follow the existing refund accounting logic.

Do not invent a second refund calculation system.

---

# 8. SALES FILTERING

Sales History must support:

### Quick ranges

```text
Today
Yesterday
This Week
Last 7 Days
This Month
Last Month
This Year
Custom
```

### Filters

```text
Customer
Payment Status
Payment Method
Batch
Product
Sale/reference ID
```

Multiple filters must work together.

Example:

```text
September 1–29
+
Customer = Myy
+
Status = PARTIAL
```

must return only matching transactions.

---

# 9. DATE RANGE RULES

Date filtering must respect the business timezone.

A date selected by the user represents the complete local business day.

Example:

```text
From:
2026-09-01 00:00:00

To:
2026-09-29 23:59:59
```

Do not accidentally exclude records because of UTC conversion.

Use the existing application's timezone configuration if one already exists.

---

# 10. FILTERED SALES SUMMARY

When filters are active, financial summaries must recalculate using the filtered dataset.

At minimum support:

```text
Transactions
Items Sold
Sales Revenue
Amount Collected
Outstanding
COGS
Gross Profit
Expenses where applicable
Net Profit where applicable
Average Sale
```

Do not display global dashboard totals while showing filtered transactions.

Example:

```text
Sale total       GH₵500
Paid             GH₵200
Outstanding      GH₵300
```

The system must preserve those distinctions.

---

# 11. SALES TABLE

Sales History should expose enough information to understand each transaction.

Recommended fields:

```text
Date/Time
Sale ID
Customer
Items
Total
Paid
Balance
Payment Status
Payment Method
Profit
Batch
```

Do not overload the table with unnecessary information.

Use the existing UI design system.

---

# 12. REPORTING CONSISTENCY

Sales filtering must reuse the existing reporting/financial services.

Do not create separate calculation logic inside the React/Next.js page.

Preferred:

```text
Sales API
      ↓
Reporting/Financial Service
      ↓
Filtered dataset + calculations
      ↓
Frontend
```

The frontend should display values returned by the authoritative backend calculation.

---

# 13. WHATSAPP DEBT REMINDER RULE

This is a critical business rule.

Before sending ANY payment reminder:

```text
Load customer
      ↓
Calculate current authoritative balance
      ↓
Check balance
```

Then:

```text
balance > 0
    ↓
Reminder may be sent
```

or:

```text
balance <= 0
    ↓
DO NOT SEND PAYMENT REMINDER
```

This check must happen server-side.

Never rely solely on frontend state.

---

# 14. ZERO-BALANCE PROTECTION

The following must NEVER happen:

```text
Outstanding Balance: GH₵0.00

"Please make a payment..."
```

If:

```text
Outstanding = GH₵0.00
```

the payment reminder automation must be blocked.

This must remain true even if:

* customer previously owed money
* customer previously received reminders
* a stale automation event exists
* the frontend still shows old data
* a previous notification exists

Always calculate the current balance before sending.

---

# 15. DEBT SETTLEMENT EVENT

When:

```text
Previous balance > 0
```

and:

```text
Current balance = 0
```

the system may emit:

```text
DEBT_SETTLED
```

This is separate from a payment reminder.

Possible internal notification:

```text
Myy has fully settled their outstanding balance.
```

Do not automatically send a WhatsApp settlement message unless the user has enabled that automation.

---

# 16. WHATSAPP MESSAGE TYPES

Keep message types explicit.

Examples:

```text
PAYMENT_REMINDER
DEBT_SETTLED
SALE_RECEIPT
PAYMENT_RECEIPT
```

Do not use one generic message generator for every event.

Each message type must have:

* eligibility rules
* template
* required data
* delivery behavior
* deduplication behavior

---

# 17. WHATSAPP TEMPLATE DATA

Payment reminders should dynamically use:

```text
Customer name
Current outstanding balance
Relevant order/debt information
Business name
```

Never use stale balance values stored in an old automation event when a current balance can be calculated.

---

# 18. WHATSAPP ENCODING

The existing message contains Unicode replacement characters:

```text
�
��
```

Investigate the entire pipeline.

Verify UTF-8 preservation through:

```text
Template
↓
Message generation
↓
HTTP/API request
↓
WhatsApp provider
```

Emoji such as:

```text
👋
🙏
❤️
```

must either be transmitted correctly or safely omitted.

Never send:

```text
�
```

to customers.

---

# 19. WHATSAPP DELIVERY STATES

Where supported by the provider, track:

```text
QUEUED
SENDING
SENT
DELIVERED
FAILED
CANCELLED
```

Separate:

```text
Automation execution status
```

from:

```text
WhatsApp delivery status
```

An automation successfully executing does NOT necessarily mean WhatsApp successfully delivered the message.

---

# 20. DUPLICATE MESSAGE PROTECTION

Use the existing automation deduplication mechanism.

Payment reminders must have protection against duplicate execution caused by:

* retries
* page refreshes
* duplicate events
* server restarts
* scheduled jobs
* webhook duplication

Additionally support a configurable reminder cooldown.

Example:

```text
Same customer
+
Same reminder type
+
24-hour cooldown
```

should prevent unnecessary duplicate reminders.

---

# 21. PAYMENT RACE CONDITIONS

Protect against stale debt information.

Example:

```text
Customer owes GH₵200

Payment submitted
↓
Balance becomes GH₵0
↓
Old reminder event executes
```

The reminder must recalculate the current balance before sending.

Expected:

```text
Current balance = GH₵0
↓
Reminder cancelled
```

not:

```text
Old balance = GH₵200
↓
Send reminder
```

---

# 22. INTERNAL NOTIFICATIONS VS WHATSAPP

These are different systems.

### Internal notification

```text
Notification
NotificationSetting
```

### Automation

```text
Automation rule
Automation execution
```

### External communication

```text
WhatsApp message
Provider response
Delivery status
```

Do not treat:

```text
Internal notification created
```

as proof that:

```text
WhatsApp message delivered
```

---

# 23. AUTOMATION HISTORY

Maintain an inspectable automation history.

Useful information:

```text
Event
Automation type
Customer/entity
Execution status
Timestamp
Delivery status
Failure reason
Reference/dedupe key
```

Examples:

```text
✓ Payment reminder sent
  Myy — GH₵200 outstanding

✓ Debt settled
  Ama — GH₵0 outstanding

✕ WhatsApp failed
  Invalid phone number

✓ Low-stock alert
  Product X — 2 remaining
```

This must help developers and users understand what the automation engine actually did.

---

# 24. PHONE VALIDATION

Before WhatsApp delivery:

Check:

* phone number exists
* phone number is normalized
* country code is valid
* WhatsApp provider requirements are met
* messaging permission/consent rules are satisfied where applicable

Invalid numbers should fail cleanly.

Do not endlessly retry invalid phone numbers.

---

# 25. EVENT-DRIVEN DESIGN

Prefer business events over tightly coupling features.

Examples:

```text
SALE_COMPLETED
SALE_PARTIAL_PAYMENT
DEBT_PAYMENT_RECEIVED
DEBT_SETTLED
PRODUCT_LOW_STOCK
BATCH_COMPLETED
```

Then automation rules can subscribe to events.

Example:

```text
DEBT_SETTLED
      ↓
Internal notification

DEBT_PAYMENT_RECEIVED
      ↓
Payment receipt automation

Customer balance > 0
      ↓
Payment reminder eligibility
```

Do not create hidden side effects inside unrelated UI components.

---

# 26. FRONTEND RULE

The frontend may:

* display filters
* request filtered data
* display financial summaries
* trigger user actions
* display notification state

The frontend must NOT become responsible for deciding:

```text
Customer owes money
Customer is paid
WhatsApp reminder should be sent
Financial totals are correct
```

Those decisions belong to the backend.

---

# 27. TRANSACTIONAL INTEGRITY

Financial mutations must remain transactional.

For a debt payment:

```text
Payment created
↓
Sale/payment allocation updated
↓
Sale status recalculated
↓
Customer balance recalculated
↓
Relevant event emitted
```

If any critical operation fails, do not leave partially updated financial records.

Preserve the existing transaction architecture.

---

# 28. BARCODE / PRODUCT LOOKUP RELATION

Barcode functionality must not be confused with product lookup.

The barcode scanner returns:

```text
Barcode string
```

Product lookup then searches Avencia's own Products data.

Example:

```text
6936829063213
↓
Barcode decoded
↓
Avencia product lookup
↓
Product found / not found
```

If a barcode is successfully decoded but no product exists:

```text
Barcode detected, but no matching product exists in Avencia.
```

Do NOT report:

```text
Could not read barcode.
```

---

# 29. TESTING STANDARD

Before marking a feature complete, test real business scenarios.

## Sales

* Today
* Custom date range
* Month range
* Customer filter
* Payment status
* Payment method
* Batch
* Product
* Multiple filters
* Empty results
* Voided sale
* Refunded sale

## Debt

* Fully paid
* Partial
* Unpaid
* Multiple debts
* Partial payment
* Full settlement
* Specific-sale payment
* Automatic oldest-debt allocation
* Balance reaches zero

## WhatsApp

* Balance > 0 → reminder eligible
* Balance = 0 → reminder blocked
* Previously owed but now paid → blocked
* Duplicate automation → blocked
* Invalid phone → clean failure
* Unicode/emoji → correct
* Provider failure → recorded
* Successful delivery → recorded
* Payment immediately before reminder → no stale reminder

---

# 30. DEFINITION OF DONE

A change is not complete merely because:

```text
Build passes
```

or:

```text
No TypeScript errors
```

The implementation is complete only when:

* business rules are correct
* backend calculations are authoritative
* frontend displays backend results
* financial totals are consistent
* customer balances are correct
* WhatsApp eligibility is correct
* duplicate messages are prevented
* delivery status is tracked
* Unicode is preserved
* date filtering is timezone-safe
* existing business logic remains intact
* regression tests pass
* relevant UI flows have been manually verified

---

# 31. CHANGE MANAGEMENT RULE

Before modifying existing functionality:

1. Read the relevant code.
2. Trace the data flow.
3. Identify the authoritative service.
4. Identify existing tests.
5. Make the smallest architectural change required.
6. Run tests.
7. Run type checking.
8. Run linting.
9. Test the relevant user flow.
10. Check for regressions.

Do not rewrite working services just because a feature needs an enhancement.

---

# 32. NEVER DO THESE

Never:

* add financial calculations directly to UI components
* trust frontend debt balances for financial decisions
* send WhatsApp reminders based on stale balances
* send reminders when balance is zero
* use Number/parseInt for barcode values
* use floating-point arithmetic for financial calculations
* create duplicate calculation services
* create duplicate automation engines
* swallow all exceptions
* treat every barcode NotFoundException as a fatal error
* silently change existing accounting rules
* modify unrelated backend functionality
* commit production secrets
* report success without testing the actual business flow

---

# FINAL PRINCIPLE

Avencia is a business management system.

Financial correctness is more important than implementation speed.

Whenever modifying Sales, Debt, Payments, Reports, Notifications, or WhatsApp:

```text
DATA FIRST
     ↓
BUSINESS RULES
     ↓
TRANSACTIONAL INTEGRITY
     ↓
AUTOMATION
     ↓
COMMUNICATION
     ↓
UI
```

Never reverse this order.

The UI should represent the business state.

It should not define the business state.
