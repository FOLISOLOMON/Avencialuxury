# Avencia 2.0 — Google Gemini AI Integration Guide

## 1. Overview
Ask Avencia is integrated with Google's official Gen AI SDK (`@google/genai`) to provide natural-language intelligence for sales, collections, inventory, and customer feedback while strictly enforcing server-side Role-Based Access Control (RBAC) and financial accuracy.

---

## 2. Obtaining a Free-Tier Gemini API Key
1. Go to the [Google AI Studio API Key page](https://aistudio.google.com/apikey).
2. Sign in with your Google account.
3. Click **Create API key** (select an existing Google Cloud project or create a free project).
4. Copy your generated API key.
   > **CRITICAL SECURITY RULE:** Never paste your API key in chat, never commit it to Git, and never expose it through client-side code (`NEXT_PUBLIC_*`).

---

## 3. Local Configuration (`.env.local`)
Create or edit `.env.local` in the project root (`C:\Users\MYPC1\Desktop\Avencia Project\.env.local`):

```bash
# Google Gemini API Key (Server-Only)
GEMINI_API_KEY=your_gemini_api_key_here

# Configurable Gemini Model (Default is free-tier eligible)
GEMINI_MODEL=gemini-3.8-flash

# Real Business Data AI Transmission Opt-In (Default: false)
# When set to false, Ask Avencia operates in Privacy Guard mode using synthetic demonstration fixtures.
# Set to true only after reviewing the Google Free Tier data-use terms below.
ALLOW_REAL_DATA_AI_TRANSMISSION=false
```

---

## 4. Free-Tier Rate Limits & Quotas
For `gemini-3.8-flash` on the Google AI Studio Free Tier:
- **Requests Per Minute (RPM):** 15 RPM
- **Tokens Per Minute (TPM):** 1,000,000 TPM
- **Requests Per Day (RPD):** 1,500 RPD
- **Surprise Charges Protection:** The integration will **never** automatically switch to a paid model or activate a paid tier. If quota is reached, a clean `QUOTA_EXCEEDED` message is displayed: *"The AI service has reached its free tier usage limit. Please wait a moment and try again."*

---

## 5. Data Privacy & Owner Approval Disclosure
### Free Tier Data-Use Considerations
Under Google's Free Tier terms:
> *"When using the free tier of the Gemini API through Google AI Studio, prompt data and responses may be reviewed by human reviewers and used to improve Google products, technologies, and services."*

### Avencia's Multi-Layer Privacy Protections
1. **Server-Side Privacy Gate (`ALLOW_REAL_DATA_AI_TRANSMISSION`):**
   - By default, real business data is **not transmitted** to Google's external servers. Tools operate in a synthetic fixture mode.
   - Live data transmission requires explicit owner configuration: `ALLOW_REAL_DATA_AI_TRANSMISSION=true`.
2. **Strict Data Minimization:**
   - Raw database connection strings, passwords, sessions, and secrets are **never** provided to the AI.
   - Customer phone numbers and emails are masked (e.g. `054****567`).
   - Summaries are aggregated server-side rather than exporting raw tables.
3. **Role-Based Scoping:**
   - **Workers** can only query their own sales, non-sensitive stock levels, and their own feedback. Workers are strictly blocked from operational expenses, batch consignment costs, and company profit.
   - **Owners** can access company-wide reports and metrics.

---

## 6. Restarting the Server & Verifying Connection
1. After updating `.env.local`, restart your Next.js development server:
   ```bash
   npm run dev
   ```
2. Navigate to `/ai` in your browser.
3. If the key is not set, a clear setup banner will instruct you on how to add it.
4. Once configured, ask a question such as:
   - *"Which perfumes are low on stock?"*
   - *"Explain the difference between our sales and collected cash."*
   - *"What were my sales today?"*
5. You can click **Stop** at any time during generation to cancel an in-flight query.

---

## 7. How to Safely Disable the Integration
To turn off Gemini AI immediately:
- Simply remove or comment out `GEMINI_API_KEY` in `.env.local` or your production hosting dashboard.
- The assistant will safely return a configuration message without breaking any other Avencia features.
