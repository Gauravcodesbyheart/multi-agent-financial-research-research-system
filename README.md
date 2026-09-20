# FinResearch AI

### Multi-Agent AI Financial Research & Business Insights Platform

FinResearch AI is a full-stack **multi-agent AI system for financial research and business analysis**.

It helps finance students, MBA candidates, researchers, and early-career analysts analyze financial documents such as annual reports, 10-K filings, earnings transcripts, investor presentations, and other business documents.

Instead of manually extracting financial metrics, searching through lengthy reports, identifying risks, comparing companies, and preparing research reports, FinResearch AI combines **document processing, specialized AI agents, structured financial data, risk analysis, benchmarking, and evidence-based research** in one platform.

> **Disclaimer:** FinResearch AI is an educational and research tool. Its output is informational and should not be considered investment, legal, accounting, or tax advice. Important financial values should always be verified against the original source document.

---

## 🚀 Key Features

### 📄 Intelligent Document Analysis

Upload and analyze:

* PDF
* DOCX
* TXT

The document processing pipeline extracts readable text, cleans and normalizes it, identifies sections, creates searchable chunks, and stores the resulting evidence for downstream analysis.

> Scanned or image-only PDFs may require OCR before reliable text extraction.

### 🤖 Multi-Agent AI Pipeline

FinResearch AI uses five specialized agents:

| Agent                | Responsibility                                            |
| -------------------- | --------------------------------------------------------- |
| **Document Agent**   | Extracts, cleans, sections, chunks, and indexes documents |
| **Extraction Agent** | Extracts structured financial metrics                     |
| **Risk Agent**       | Identifies financial and business risks                   |
| **Benchmark Agent**  | Compares companies using metrics and risk profiles        |
| **Research Agent**   | Answers questions using retrieved evidence and citations  |

### 📊 Financial Metrics

The platform works with metrics such as:

* Revenue
* Revenue Growth
* Gross Profit
* Gross Margin
* Operating Income
* Operating Margin
* Net Income
* Net Margin
* EBITDA
* EBITDA Margin
* Total Assets
* Total Liabilities
* Equity
* Cash
* Debt
* Current Ratio
* Quick Ratio
* Debt-to-Equity
* ROE
* ROA
* EPS
* P/E Ratio
* Operating Cash Flow
* Capital Expenditures
* Free Cash Flow

### ⚠️ Risk Analysis

The Risk Agent analyzes documents for risks including:

* Liquidity Risk
* Debt Risk
* Regulatory Risk
* Market Risk
* Concentration Risk
* Operational Risk
* Revenue Risk
* Margin Risk
* Competition Risk
* Going Concern Risk

Risk records can contain:

* Risk type
* Severity
* Title
* Description
* Supporting source text
* Page reference when available
* Recommendation

### 🏢 Company Benchmarking

Compare companies across:

* Financial metrics
* Margins
* Ratios
* Cash flow
* Debt
* Risk indicators

The system presents structured comparisons to support financial research and analysis.

### 📑 AI-Generated Reports

Generate structured reports containing:

* Executive Summary
* Key Findings
* Metric Comparisons
* Risk Summary
* Recommendations
* Full Report Content

### 💬 Research Agent

Ask natural-language questions about your financial documents.

Example:

```text
What is the revenue trend?

What is the operating margin?

What risks are mentioned in the Risk Factors section?

Compare cash flow and debt-to-equity across two companies.

What evidence supports the concentration risk?
```

The Research Agent retrieves relevant document chunks, stored financial metrics, risk information, and source evidence before generating a response.

### 🔄 Local Fallback Mode

Gemini is the preferred AI provider, but the application includes fallback behavior for supported workflows.

When AI services or quota are unavailable, the system can continue providing stored:

* Financial metrics
* Risk indicators
* Relevant document excerpts
* Document citations
* Local research results

This helps keep core document indexing and retrieval useful even when the external AI provider is unavailable.

---

# 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │      User Browser    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Next.js 16      │
                         │      React 19        │
                         │      App Router      │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
       ┌─────────────┐      ┌──────────────┐      ┌──────────────┐
       │  NextAuth   │      │  API Routes  │      │  Dashboard   │
       │Authentication│      │              │      │     UI       │
       └─────────────┘      └──────┬───────┘      └──────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Multi-Agent Layer  │
                         └──────────┬───────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
 ┌────────────────┐       ┌────────────────┐       ┌────────────────┐
 │ Document Agent │       │Extraction Agent│       │   Risk Agent   │
 └────────────────┘       └────────────────┘       └────────────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
                       ┌────────────┴────────────┐
                       │                         │
                       ▼                         ▼
              ┌────────────────┐       ┌──────────────────┐
              │Benchmark Agent │       │ Research Agent   │
              └────────────────┘       └────────┬─────────┘
                                                 │
                         ┌───────────────────────┼──────────────────────┐
                         │                       │                      │
                         ▼                       ▼                      ▼
                 ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
                 │ PostgreSQL   │       │ Google Gemini│       │   Document   │
                 │ + Drizzle ORM│       │     API      │       │  Processing  │
                 └──────────────┘       └──────────────┘       └──────────────┘
```

---

# 🔄 Multi-Agent Processing Pipeline

```text
                 Financial Document
                         │
                         ▼
                ┌─────────────────┐
                │ Document Agent  │
                │ Extract / Clean │
                │ Section / Chunk │
                └────────┬────────┘
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐
    │Extraction Agent │     │    Risk Agent   │
    │ Financial Data  │     │ Risk Detection  │
    └────────┬────────┘     └────────┬────────┘
             │                       │
             └───────────┬───────────┘
                         │
                         ▼
                ┌─────────────────┐
                │Benchmark Agent │
                │Company Analysis │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Research Agent │
                │ Q&A + Evidence │
                │ + Citations    │
                └─────────────────┘
```

### Document Agent

Responsible for:

1. Receiving PDF, DOCX, or TXT files
2. Extracting text
3. Cleaning and normalizing content
4. Splitting content into searchable chunks
5. Detecting document sections
6. Storing chunks in PostgreSQL
7. Updating document processing status

### Extraction Agent

Extracts structured financial information such as:

* Revenue
* Profit
* Margins
* Assets
* Liabilities
* Equity
* Debt
* Ratios
* EPS
* Cash flow

### Risk Agent

Analyzes document evidence for potential financial and business risks and stores structured risk records.

### Benchmark Agent

Compares companies using stored financial metrics and risk information.

### Research Agent

The Research Agent:

1. Receives a user question
2. Searches relevant document chunks
3. Retrieves stored metrics
4. Retrieves risk information
5. Sends relevant evidence to Gemini when available
6. Produces an evidence-grounded response with source references

The system is designed to ground responses in retrieved document evidence; important financial values should still be verified against the original filing.

---

# 🛠️ Technology Stack

## Frontend

* **Next.js 16**
* **React 19**
* **Tailwind CSS**
* **Recharts**
* **Lucide React**
* **React Hot Toast**
* **React Dropzone**

## Backend

* **Next.js API Route Handlers**
* **NextAuth**
* **Node.js**
* **Drizzle ORM**
* **bcryptjs**

## AI

* **Google Gemini API**
* Gemini-based metric extraction
* Gemini-based risk analysis
* Gemini-based research answers
* Gemini-based benchmarking and reports
* Local fallback processing

## Document Processing

* **pdf-parse**
* **mammoth**
* Local text processing and chunking

## Database

* **PostgreSQL**
* **Drizzle ORM**

## Deployment

* **Vercel**
* **Neon PostgreSQL**
* Google AI Studio / Gemini API

The documented architecture uses Next.js, React, PostgreSQL, Drizzle ORM, NextAuth, document parsing, and Gemini-based analysis.

---

# 📁 Project Structure

```text
finresearch-ai/
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── benchmark/
│   │   │   ├── chat/
│   │   │   ├── companies/
│   │   │   ├── dashboard/
│   │   │   ├── documents/
│   │   │   ├── health/
│   │   │   ├── metrics/
│   │   │   ├── reports/
│   │   │   ├── risks/
│   │   │   ├── seed/
│   │   │   └── sessions/
│   │   │
│   │   ├── dashboard/
│   │   │   ├── benchmark/
│   │   │   ├── companies/
│   │   │   ├── documents/
│   │   │   ├── metrics/
│   │   │   ├── reports/
│   │   │   ├── research/
│   │   │   └── risks/
│   │   │
│   │   ├── login/
│   │   ├── register/
│   │   └── page.tsx
│   │
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   │
│   └── lib/
│       ├── agents/
│       │   ├── documentAgent.ts
│       │   ├── extractionAgent.ts
│       │   ├── riskAgent.ts
│       │   ├── benchmarkAgent.ts
│       │   └── researchAgent.ts
│       │
│       ├── auth.ts
│       ├── seed.ts
│       └── seedData.ts
│
├── public/
│
├── drizzle.config.json
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
```

---

# 🗄️ Database Schema

FinResearch AI uses PostgreSQL with Drizzle ORM.

### Main Tables

| Table               | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `users`             | User accounts, roles, and timestamps             |
| `research_sessions` | User research workspaces                         |
| `companies`         | Company information                              |
| `documents`         | Uploaded document metadata and extracted content |
| `document_chunks`   | Searchable document sections                     |
| `financial_metrics` | Structured financial metrics                     |
| `risk_flags`        | Risk classifications and evidence                |
| `analysis_reports`  | Generated financial reports                      |
| `chat_messages`     | Research Agent conversations                     |
| `agent_logs`        | Agent activity and processing logs               |

---

# 🌐 Main Application Routes

### Frontend

| Route                  | Purpose                   |
| ---------------------- | ------------------------- |
| `/`                    | Application entry point   |
| `/login`               | Login                     |
| `/register`            | Registration              |
| `/dashboard`           | Main dashboard            |
| `/dashboard/sessions`  | Research sessions         |
| `/dashboard/documents` | Document management       |
| `/dashboard/companies` | Companies                 |
| `/dashboard/metrics`   | Financial metrics         |
| `/dashboard/risks`     | Risk analysis             |
| `/dashboard/benchmark` | Company benchmarking      |
| `/dashboard/reports`   | Reports                   |
| `/dashboard/research`  | Research Agent            |
| `/dashboard/docs`      | Application documentation |

### API

| Endpoint                  | Purpose                        |
| ------------------------- | ------------------------------ |
| `/api/auth/register`      | Register users                 |
| `/api/auth/[...nextauth]` | Authentication                 |
| `/api/health`             | Health check                   |
| `/api/seed`               | Seed demo data                 |
| `/api/sessions`           | Research sessions              |
| `/api/documents`          | Document upload and management |
| `/api/companies`          | Company data                   |
| `/api/metrics`            | Financial metrics              |
| `/api/risks`              | Risk information               |
| `/api/benchmark`          | Company comparison             |
| `/api/reports`            | Report generation              |
| `/api/chat`               | Research Agent                 |
| `/api/dashboard`          | Dashboard statistics           |

---

# ⚡ Quick Start

## Prerequisites

Install:

* Node.js **20.9+**
* npm
* PostgreSQL **14+**
* Git

Optional:

* Docker Desktop
* Google AI Studio / Gemini API key
* OCR software for scanned PDFs

The project documentation recommends Node.js 20.9 or newer for Next.js 16 and PostgreSQL 14 or newer.

---

## 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/finresearch-ai.git
cd finresearch-ai
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Create PostgreSQL Database

```sql
CREATE DATABASE app_db;
```

## 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/app_db

NEXTAUTH_SECRET=your-long-random-secret

NEXTAUTH_URL=http://localhost:3000

GEMINI_API_KEY=your-gemini-api-key

GEMINI_MODEL=gemini-3.6-flash

GEMINI_PRO_MODEL=gemini-3.6-flash
```

For the complete list and explanations of environment variables, see the project documentation.

> **Never commit `.env` to GitHub.**

---

## 5. Apply Database Schema

```bash
npx drizzle-kit push
```

If migrations are required:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## 6. Start the Application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 7. Check Database Health

Open:

```text
http://localhost:3000/api/health
```

Expected healthy response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## 8. Seed Demo Data

After starting the application:

```powershell
Invoke-WebRequest http://localhost:3000/api/seed -Method GET
```

The demo dataset contains companies including:

* Apple
* Microsoft
* Tesla
* Amazon

---

# 🧪 Validate Before Deployment

Run:

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run build
```

All three should pass before deploying.

The project documentation explicitly includes these checks in its final verification process.

---

# 📊 How to Use

### 1. Login

Sign in or create a new account.

### 2. Create a Research Session

Create a workspace for a financial research project.

### 3. Upload a Document

Upload:

```text
PDF
DOCX
TXT
```

Provide the relevant company and document information.

### 4. Wait for Processing

The system:

```text
Extracts Text
      ↓
Creates Chunks
      ↓
Indexes Evidence
      ↓
Extracts Metrics
      ↓
Identifies Risks
```

### 5. Explore Financial Metrics

Review:

* Revenue
* Margins
* Profitability
* Liquidity
* Leverage
* Cash flow
* EPS
* Other supported metrics

### 6. Analyze Risks

Review risk types, severity, supporting evidence, and recommendations.

### 7. Benchmark Companies

Select multiple companies and compare their stored financial metrics and risk profiles.

### 8. Generate Reports

Generate structured research reports containing key findings, comparisons, risks, and recommendations.

### 9. Ask the Research Agent

Ask questions in natural language and review the supporting evidence and citations.

---

# ☁️ Deployment

## Recommended Architecture

```text
GitHub
   │
   ▼
Vercel
   │
   ├── Next.js Application
   │
   └──────────────┐
                  │
                  ▼
             Neon PostgreSQL
                  │
                  │
                  ▼
             Google Gemini
```

The project documentation identifies **Vercel + Neon PostgreSQL** as the recommended deployment route for the Next.js application.

### Vercel Deployment

1. Push the project to GitHub.
2. Create a Vercel project.
3. Import the GitHub repository.
4. Select Next.js.
5. Configure environment variables.
6. Deploy.
7. Configure the production database.
8. Apply the production schema.
9. Verify the application.

### Production Environment Variables

Configure these through the hosting provider:

```text
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
GEMINI_API_KEY
GEMINI_MODEL
GEMINI_PRO_MODEL
```

Use a **different production `NEXTAUTH_SECRET`** from your local development secret.

---

# 🔐 Security

Security is especially important because the application processes financial documents and uses authentication and external AI services.

### Never commit:

```text
.env
.env.local
.env.production
API keys
Database passwords
Authentication secrets
Private credentials
Private uploaded documents
Service-account credentials
```

### Recommended `.gitignore`

```gitignore
node_modules/
.next/
.env
.env.local
.env.development
.env.test
.env.production
.env*.local
*.log
.vercel/
coverage/
*.pem
*.key
*.crt
```

### Production Security Checklist

* Rotate any exposed API keys.
* Use a strong production `NEXTAUTH_SECRET`.
* Keep production and development secrets separate.
* Use a production database.
* Protect or remove the `/api/seed` endpoint after demo seeding.
* Change or remove demo credentials for real deployments.
* Validate uploaded file types and sizes.
* Add rate limiting to authentication, upload, chat, and AI routes.
* Use object storage for large production documents.
* Configure database backups.
* Monitor provider quotas and billing.
* Avoid exposing raw database errors.
* Review logs for confidential information.

The project documentation specifically recommends rotating exposed keys, protecting `/api/seed`, restricting database access where possible, validating uploads, using object storage, and configuring backups.

---

# ⚠️ Limitations

### AI Provider Availability

Gemini quota or provider availability can affect:

* Metric extraction
* Risk analysis
* Research Agent responses
* Benchmarking
* Report generation

Local fallback behavior is available for supported workflows.

### PDF Processing

Image-only/scanned PDFs may require OCR.

### Serverless Deployment

When deployed to serverless infrastructure:

* Large PDF uploads may exceed request limits.
* Long-running AI operations may time out.
* Database connectivity must be configured correctly.
* Large document storage should use object storage rather than database text fields.

These limitations are documented for the project's Vercel deployment architecture.

---

# 🛠️ Troubleshooting

## `users` table does not exist

Run:

```bash
npx drizzle-kit push
```

Then restart the application.

---

## PostgreSQL authentication error

Check your:

```env
DATABASE_URL=...
```

Make sure the PostgreSQL username, password, host, port, and database name are correct.

---

## Port 3000 is already in use

PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

Then:

```powershell
taskkill /PID YOUR_PID /F
```

Restart:

```bash
npm run dev
```

---

## Gemini API returns 429

This generally indicates that the available API quota has been exceeded.

You can use the application's supported fallback behavior or use a valid API configuration with available quota.

---

## PDF contains no useful text

The document may be scanned/image-only.

Use an OCR-enabled/searchable version of the document and upload it again.

---

## Build fails

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

Fix the reported errors before deployment.

---

# 🔮 Future Improvements

Potential future improvements include:

* Semantic/vector search
* Improved document retrieval
* More advanced financial metric extraction
* Automated SEC filing ingestion
* Enhanced risk analysis
* Streaming AI responses
* Background document processing
* Object storage integration
* Advanced role-based access control
* Rate limiting
* Production monitoring
* Automated database backups
* Additional AI providers
* Expanded financial data integrations

---

# 📚 Financial Glossary

| Term                    | Meaning                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| **Revenue**             | Money earned from products or services                           |
| **Gross Profit**        | Revenue minus cost of goods sold                                 |
| **Gross Margin**        | Gross profit divided by revenue                                  |
| **Operating Income**    | Profit from normal operations before interest and taxes          |
| **Operating Margin**    | Operating income divided by revenue                              |
| **Net Income**          | Profit after expenses and taxes                                  |
| **EBITDA**              | Earnings before interest, taxes, depreciation, and amortization  |
| **EPS**                 | Earnings per share                                               |
| **Current Ratio**       | Current assets divided by current liabilities                    |
| **Debt-to-Equity**      | Debt divided by shareholders' equity                             |
| **ROE**                 | Net income divided by shareholders' equity                       |
| **ROA**                 | Net income divided by total assets                               |
| **Operating Cash Flow** | Cash generated from normal operations                            |
| **Capital Expenditure** | Cash spent on long-term assets                                   |
| **Free Cash Flow**      | Operating cash flow minus capital expenditures                   |
| **10-K**                | Annual filing submitted by a public company to the SEC           |
| **10-Q**                | Quarterly filing submitted by a public company to the SEC        |
| **Risk Flag**           | Structured warning or concern identified from financial evidence |

---

# 📌 Project Highlights

```text
┌──────────────────────────────────────────────────────────┐
│                    FINRESEARCH AI                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📄 Financial Document Processing                        │
│  🤖 Multi-Agent AI Analysis                              │
│  📊 Financial Metric Extraction                          │
│  ⚠️ Risk Detection                                       │
│  🏢 Company Benchmarking                                 │
│  💬 Evidence-Based Research Chat                         │
│  📑 AI-Assisted Report Generation                        │
│  🔐 Authentication & Protected APIs                     │
│  🗄️ PostgreSQL + Drizzle ORM                            │
│  ☁️ Vercel + Neon Deployment                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

# 🎯 Project Objective

The goal of FinResearch AI is to reduce the manual effort involved in financial research by combining:

```text
Financial Documents
        ↓
Document Processing
        ↓
Evidence Extraction
        ↓
Structured Metrics
        ↓
Risk Analysis
        ↓
Company Benchmarking
        ↓
AI-Assisted Research
        ↓
Evidence-Based Insights
```

The system is designed around a key principle:

> **Reliable document extraction and evidence storage come first; AI enrichment is an additional layer on top of that evidence.**

This architecture allows the application to remain useful for document retrieval and stored financial evidence even when external AI services are unavailable.

---

# 👨‍💻 Project

**FinResearch AI — Multi-Agent Financial Research & Business Insights System**

### Built With

```text
Next.js
React
PostgreSQL
Drizzle ORM
NextAuth
Google Gemini
Node.js
TypeScript
```

---

# ⚖️ Disclaimer

FinResearch AI is intended for **educational, research, and analytical purposes**.

AI-generated or extracted information may contain errors. Financial values, risks, and conclusions should always be checked against the original source documents.

This project does not provide investment, legal, accounting, or tax advice.

---

## ⭐ If you find this project useful

Consider giving the repository a ⭐ on GitHub and exploring the codebase to understand how multi-agent AI, document processing, financial analysis, and full-stack development can be combined into a single application.
