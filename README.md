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

FinResearch AI coordinates the following agents in a sequential document-processing pipeline, with research and report agents invoked by the user:

| Agent | Responsibility |
| --- | --- |
| **Document Agent** | Cleans, sections, chunks, and indexes text; never invents page numbers. |
| **Extraction Agent** | Extracts financial metrics, validates model values against exact source quotes, and fills supported fields with a local parser. |
| **Red Flag Agent** | Detects quote-backed disclosure signals, unusual financial values, rising debt, and falling margins; validates any model-added finding against exact source text. |
| **Embedding Agent** | Optionally creates semantic vectors for chunks; keyword retrieval remains available when embeddings are not configured. |
| **Benchmark Agent** | Retains every accessible document and fiscal period, validates displayed metric values against matching source quotes, and warns about unlike periods. |
| **Research Agent** | Decomposes compound questions, retrieves evidence, and returns inline, source-linked citations; displayed claims must be verbatim source excerpts. |
| **Report Agent** | Builds an Executive Summary and Key Financials table from source-validated values, retains all periods, and excludes unvalidated model prose. |

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

The Red Flag Agent combines local, evidence-matched rules with optional model analysis (Groq by default when `GROQ_API_KEY` is configured; Gemini can also be selected). It checks for auditor qualifications and going-concern language, accounting and balance-sheet anomalies, and cross-period movements such as debt increases and margin deterioration. A model-generated finding is kept only when its quoted source text is present and any numeric claims match the quote. Deterministic trend and anomaly checks require source lines whose values reconcile to the stored metrics; cross-period checks need matching evidence from both periods. Arithmetic inconsistencies are review flags, not definitive accusations. This is a screening aid, not an audit opinion.

Risk records can contain:

* Risk type
* Severity
* Title
* Description
* Supporting source text
* Page reference when available
* Recommendation

### 🏢 Company Benchmarking

Compare companies across every accessible source document and extracted fiscal period. The dashboard retains a latest-period side-by-side view plus a document history table with source links and metric-specific quotes. A value is displayed only when its metric label, number, and quote match the original document; missing or inconsistent evidence is shown as N/A. Stored risk counts include only flags with source-grounded quotes.

Results are scoped to the signed-in user's documents plus the built-in demo dataset. If periods differ or are unknown, the UI flags that limitation instead of presenting an unsupported like-for-like comparison.

### 📑 Evidence-Validated Reports

Generate structured reports containing:

* Executive Summary and Key Financials
* Every accessible filing period for the selected companies, not just the latest row
* Metric values with citation IDs mapped to exact source excerpts and links
* Red-flag passages only when the quote is grounded in the source
* A verification checklist instead of buy/sell recommendations

Reports are deterministic and do not display unvalidated AI-generated prose. Legacy reports without the evidence contract are hidden from view and download; generate a new report to replace them.

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

The Research Agent decomposes compound questions into retrieval steps and searches the active session's documents. Every chat history read, message write, and research retrieval checks that the signed-in user owns the requested session; document and message queries are scoped to that user as well. Text synthesis uses Groq when `GROQ_API_KEY` is configured (Gemini can be selected as an alternative). It uses Gemini semantic embeddings when every chunk in the collection has a compatible vector; otherwise it falls back to local keyword ranking. Model output is structured as individual claims; before display, every claim must use a retrieved source ID, include an exact quote found in that cited excerpt, and preserve numeric values, currencies, scales, and percentage units from the quote. Invalid claims are omitted, and a transparent evidence-only excerpt summary is used if generation or validation fails; when the research pipeline itself fails, the API returns an error rather than fabricating a chat answer. This deterministic source check improves auditability but does not prove that every paraphrase is semantically entailed; verify consequential conclusions in the original filing.

### 🔄 Local Fallback Mode

Text AI is optional for core evidence processing. When both provider keys are configured, `AI_PROVIDER=auto` prefers Groq; set it to `groq`, `gemini`, or `none` to choose explicitly. Without a text-model key, uploads still run document indexing, local metric extraction, deterministic red-flag checks, and keyword retrieval; Research returns cited excerpts rather than inventing a synthesis. Benchmarking and reports use deterministic, source-validated values with period history whether or not a model is configured. Groq or Gemini enables model-assisted extraction, additional quote-validated risk screening, and synthesized research. Semantic embeddings remain an optional Gemini feature; Groq-only setups use local keyword retrieval. Embedding failures are recorded separately and do not disable keyword search.

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
                 │ PostgreSQL   │       │ Groq / Gemini│       │   Document   │
                 │ + Drizzle ORM│       │   Text APIs  │       │  Processing  │
                 └──────────────┘       └──────────────┘       └──────────────┘
```

---

# 🔄 Multi-Agent Processing Pipeline

```text
Upload document + durable PostgreSQL job (atomic transaction)
      │
      ▼
Immediate `after()` trigger; scheduled worker recovers queued/stale jobs
      │
      ▼
Document Agent: parse text → clean → chunk → persist source evidence
      │
      ▼
Extraction Agent: local extraction + optional Groq/Gemini quote validation
      │
      ▼
Red Flag Agent: deterministic checks + optional quote-validated model findings
      │
      ▼
Embedding Agent: optional Gemini vectors (keyword search remains available)
      │
      └──► document status: completed / partial / failed

Research UI: decompose question → retrieve session chunks → cite source excerpts
Benchmark UI: compare accessible companies and period-tagged latest metrics
Report Agent: Executive Summary + deterministic Key Financials + analysis
```

### Document Agent

Responsible for:

1. Receiving PDF, DOCX, or TXT files (up to 10 MB)
2. Extracting text and rejecting empty or non-searchable PDFs with a clear error
3. Cleaning and normalizing content
4. Splitting content into overlapping, searchable chunks
5. Detecting document sections and storing chunks in PostgreSQL
6. Marking the document indexed before downstream processing

The upload route writes the document and a durable PostgreSQL job record in one transaction, then uses Next.js `after()` to start the job immediately. The orchestrator awaits Document → Extraction → Red Flag → Embedding in order. A conditional database update prevents two workers claiming the same job; transient failures get up to three total attempts with backoff, and abandoned `processing` locks can be reclaimed. The scheduled `/api/worker/documents` endpoint drains queued/stale jobs (configured once per minute in `vercel.json` and protected by `CRON_SECRET`). Extraction and red-flag errors are isolated so later stages still run; the final document is marked `completed`, `partial`, or `failed`, with per-agent/retry logs. Embedding is optional and its failure does not block keyword retrieval. The PostgreSQL queue survives web-process restarts; a scheduler/worker and the host's function-duration limits still need configuring for production.

The current PDF/DOCX parsers do not preserve reliable page boundaries. The application therefore avoids inventing page numbers; source citations identify the document, section, and chunk.

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

Compares all accessible documents and periods, retaining source links and showing only values whose metric-specific evidence and numbers validate against the filing.

### Research Agent

The Research Agent:

1. Receives a user question
2. Searches relevant document chunks
3. Retrieves stored metrics
4. Retrieves risk information
5. Sends relevant evidence to the configured text model (Groq by default) when available
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

* **Groq Chat Completions API** for model-assisted extraction, risk review, and research synthesis (optional; `openai/gpt-oss-20b` is the default)
* Optional Gemini text generation as an alternative provider
* Optional Gemini semantic embeddings; Groq-only deployments use local keyword retrieval
* Server-side quote/evidence validation for model-assisted claims
* Deterministic, source-validated benchmarking and reports
* Local fallback processing when no text model is configured

## Document Processing

* **pdf-parse**
* **mammoth**
* Local text processing and chunking

## Database

* **PostgreSQL**
* **Drizzle ORM**

Semantic vectors are currently stored as JSONB arrays with their model name. Similarity ranking runs in application memory and automatically falls back to keyword ranking when vectors are missing or incompatible. This avoids requiring PostgreSQL extensions for local use, but is intended for small-to-medium collections; use pgvector with an index such as HNSW for larger corpora.

## Deployment

* **Vercel**
* **Neon PostgreSQL**
* GroqCloud API key (recommended for model-assisted text generation)
* Optional Google AI Studio / Gemini API key for semantic embeddings or Gemini text generation

This application uses Next.js, React, PostgreSQL, Drizzle ORM, NextAuth, document parsing, and optional Groq/Gemini model assistance.

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
│   │   │   ├── sessions/
│   │   │   └── worker/documents/
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
│       │   ├── orchestrator.ts
│       │   ├── documentAgent.ts
│       │   ├── extractionAgent.ts
│       │   ├── riskAgent.ts
│       │   ├── embeddingAgent.ts
│       │   ├── benchmarkAgent.ts
│       │   ├── researchAgent.ts
│       │   └── reportAgent.ts
│       │
│       ├── auth.ts
│       ├── seed.ts
│       └── seedData.ts
│
├── drizzle/                 # Versioned SQL migrations
├── drizzle.config.ts        # Uses DATABASE_URL
├── vercel.json              # Schedules durable-job recovery worker
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
| `document_chunks`   | Searchable document sections and optional embeddings |
| `document_processing_jobs` | Durable, retryable upload-pipeline jobs       |
| `financial_metrics` | Structured financial metrics                     |
| `risk_flags`        | Risk classifications and evidence                |
| `analysis_reports`  | Generated financial reports                      |
| `chat_messages`     | Research Agent conversations                     |
| `benchmark_comparisons` | Comparison metadata for research sessions    |
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
| `/api/worker/documents`   | Authenticated durable-job recovery worker |
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
* GroqCloud API key for model-assisted extraction, risk review, and research answers
* Gemini API key for optional semantic embeddings or Gemini text generation
* OCR software for scanned PDFs

Use Node.js 20.9 or newer for Next.js 16, plus PostgreSQL 14 or newer.

---

## 1. Clone the Repository

```bash
git clone https://github.com/Gauravcodesbyheart/multi-agent-financial-research-research-system.git
cd multi-agent-financial-research-research-system
```

For work on an existing feature branch, fetch it and check it out before making changes.

## 2. Install Dependencies

```bash
npm ci
```

`npm ci` installs the exact dependency versions recorded in `package-lock.json`.

## 3. Create PostgreSQL Database

```sql
CREATE DATABASE app_db;
```

## 4. Configure Environment Variables

Copy `.env.example` to `.env` in the project root, then set the values:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Set at least:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/app_db
NEXTAUTH_SECRET=replace-with-a-long-random-secret
NEXTAUTH_URL=http://localhost:3000
```

Optional text-AI configuration (Groq is preferred when `AI_PROVIDER=auto`):

```env
AI_PROVIDER=auto               # auto, groq, gemini, or none
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-20b
GROQ_MAX_COMPLETION_TOKENS=4096

# Optional Gemini provider and semantic embeddings
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

Create a Groq API key at [Groq Console](https://console.groq.com/keys). Groq is fast and offers a free tier, but it is **not unlimited**: requests are subject to organization/model quotas and rate limits. Check your current limits in the [Groq Console](https://console.groq.com/settings/limits).

`CRON_SECRET` is needed to protect the scheduled recovery worker in production; local uploads still start immediately through `after()`. `SEED_SECRET` is optional locally and is required only if you deliberately invoke the demo seeder in production. Generate a local auth secret with `openssl rand -base64 32` (or a password manager); use distinct secrets for production.

> **Never commit `.env` to GitHub.**

---

## 5. Apply Database Migrations

For a **new, empty database**, apply the checked-in migrations:

```bash
npx drizzle-kit migrate
```

`drizzle.config.ts` reads `DATABASE_URL` from the environment (and loads local `.env`), so the same command targets the configured local or production database. Back up any existing database first. If you previously initialized an existing database with `drizzle-kit push`, do not replay the initial `0000` migration against it; inspect the schema and apply only the missing changes from `drizzle/0001_embeddings_and_pipeline_status.sql` and `drizzle/0002_durable_document_jobs.sql` (or safely reconcile the Drizzle migration history) before deploying.

When you change `src/db/schema.ts` during development, create a new migration and review the generated SQL before applying it:

```bash
npx drizzle-kit generate --name=describe-your-change
npx drizzle-kit migrate
```

Do not use an automatic schema push against production.

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

In **local development only**, start the app and visit `http://localhost:3000/api/seed` or run:

```bash
curl http://localhost:3000/api/seed
```

PowerShell:

```powershell
Invoke-WebRequest http://localhost:3000/api/seed -Method GET
```

The built-in demo users are `demo@finresearch.ai` and `student@finresearch.ai`, both with the local-only password `demo123456`. Change or remove these accounts before any public demo. The demo includes Apple, Microsoft, Tesla, and Amazon source filings. Seed metrics and risk flags are produced by the same document-processing agents used for uploads; the seeder reprocesses older seeded documents to replace legacy curated fixtures.

In production, `GET /api/seed` is disabled; the `POST` route requires `SEED_SECRET` and an `x-seed-secret` header. Do not seed a real production workspace unless you explicitly need a controlled demo dataset.

---

## Making Changes on Your Local Machine

1. Clone the repository or fetch the feature branch you intend to work on:

   ```bash
   git fetch origin
   git checkout YOUR_BRANCH
   git pull --ff-only origin YOUR_BRANCH
   ```

2. Install dependencies with `npm ci`, create `.env` from `.env.example`, point `DATABASE_URL` to your local PostgreSQL database, and apply migrations.
3. Start development mode with `npm run dev`. The dashboard refreshes automatically as you edit files.
4. Common code locations:
   * `src/lib/agents/` — extraction, red-flag, embedding, retrieval, benchmarking, and report logic
   * `src/app/dashboard/` — user-facing pages
   * `src/app/api/` — authenticated route handlers
   * `src/db/schema.ts` and `drizzle/` — schema and versioned migrations
5. Before sharing a change, run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. For database changes, generate and review a new SQL migration and test it on a disposable database first.
6. Commit and push your work to a Git branch. In an existing clone:

   ```bash
   git add .
   git commit -m "Describe the change"
   git push origin YOUR_BRANCH
   ```

   Replace `YOUR_BRANCH` with the branch you committed on and push that same branch. Never commit `.env` or confidential financial files.

# 🧪 Validate Before Deployment

Run the seeded-fixture regression tests and static checks:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The tests check compound-question decomposition, citation validation, anomaly/trend rules, embedding math, exact risk-evidence matching against seeded filings, and seeded metric extraction. They are deterministic regression checks—not a claim of broad real-world model accuracy.

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

The system runs each stage in order:

```text
Extract text
      ↓
Clean and chunk source passages
      ↓
Extract metrics and validate their quotes
      ↓
Scan for red flags and compare prior periods
      ↓
Create optional semantic embeddings
      ↓
Mark processing complete, partial, or failed
```

The document detail page exposes agent activity and source evidence. Embedding status is independent; keyword retrieval remains available if semantic indexing is unavailable.

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

Select companies to compare their latest available metric rows, then inspect every eligible document, fiscal period, and verified source quote in the history table.

### 8. Generate Reports

Generate a source-validated Executive Summary and Key Financials table with all eligible periods, citation IDs, source links, grounded risk excerpts, and a verification checklist.

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
             Groq / Gemini
```

**Vercel + Neon PostgreSQL** is the recommended deployment route for this Next.js application.

### Vercel + Neon (recommended)

1. Push your branch to GitHub and import the repository into Vercel. A non-production branch normally creates a Preview deployment; merge into the configured production branch when ready to release.
2. Create a PostgreSQL database in Neon (or another PostgreSQL provider). Keep the connection URL private and ensure its SSL parameters match the provider's instructions.
3. In Vercel **Project → Settings → Environment Variables**, configure the values below for Preview and Production separately.
4. Back up any existing database. For a new empty database, run the checked-in migrations once from a trusted machine/CI job using the production URL:

   ```bash
   DATABASE_URL='postgresql://...production connection...' npx drizzle-kit migrate
   ```

   PowerShell:

   ```powershell
   $env:DATABASE_URL = 'postgresql://...production connection...'
   npx drizzle-kit migrate
   ```

   The checked-in `0000` migration initializes a new database. If your existing production database was previously initialized with `drizzle-kit push`, do not blindly replay it; review and apply the pending schema change safely, then reconcile the migration history.
5. Set a strong `CRON_SECRET`. `vercel.json` schedules `/api/worker/documents` every minute; Vercel sends the matching bearer token to the worker. Confirm Cron is enabled for the project/plan.
6. Deploy, then verify `/api/health`, registration/login, document upload, processing status, citations, report generation, and that a test queued job is drained. Upload a harmless test document before using private filings.
7. The upload response uses Next.js `after()` for low latency, while the durable PostgreSQL job row plus scheduled worker recovers interrupted attempts. Function/cron duration limits still apply; move sustained or oversized work to a dedicated worker and use private object storage.

### Production Environment Variables

Configure these in the hosting provider (never commit the values):

```text
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
AI_PROVIDER                    # optional; defaults to auto (prefers Groq, then Gemini)
GROQ_API_KEY                   # optional; enables model-assisted text features
GROQ_MODEL                     # optional; default openai/gpt-oss-20b
GROQ_MAX_COMPLETION_TOKENS     # optional; default 4096
GEMINI_API_KEY                 # optional; Gemini text provider and/or semantic embeddings
GEMINI_MODEL                   # optional; default Gemini text model
GEMINI_EMBEDDING_MODEL         # optional; default gemini-embedding-001
CRON_SECRET                    # required for scheduled durable-job recovery
SEED_SECRET                    # only if controlled production demo seeding is needed
```

Use a **different production `NEXTAUTH_SECRET`** from your local development secret. Set `NEXTAUTH_URL` to the exact public HTTPS origin. Do not set `SEED_SECRET` unless you need it; the production seeder only accepts POST requests with the matching `x-seed-secret` header.

### Other Node.js hosts

Render, Railway, Fly.io, or a VPS can also run this app. Use a managed PostgreSQL database, set the same environment variables, run `npm ci` and `npm run build` during the build step, and `npm start` as the web start command. Apply migrations as a separate pre-deploy job. Configure a scheduler to GET `/api/worker/documents` with `Authorization: Bearer $CRON_SECRET` at a suitable interval. For workloads that can exceed request limits, move execution to a dedicated worker and store large source files in private object storage.

---

# 🔐 Security

Security is especially important because the application processes financial documents and uses authentication and external AI services. Extracted source text is currently stored in PostgreSQL. When a text model is configured, document excerpts and research prompts are sent to Groq or Gemini for generation; Gemini can also receive document chunks for embeddings. Review each provider's data-handling and contractual terms before uploading confidential material. Keep API keys server-side, use a private database and HTTPS, and grant least-privilege access.

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

Rotate exposed keys, protect `/api/seed`, restrict database access, validate uploads, use object storage where appropriate, and configure backups.

---

# ⚠️ Limitations

### AI Provider Availability

Groq and Gemini enforce model- and organization-specific rate limits; neither provider should be treated as unlimited. Provider quotas or outages affect model-assisted extraction, additional risk review, and synthesized research answers. Gemini quota or availability also affects optional semantic embeddings. Local metric extraction, deterministic red flags, keyword search, source-validated benchmarking, and evidence-only reports remain available for supported workflows.

### PDF Processing

Image-only/scanned PDFs may require OCR.

### Serverless Deployment

When deployed to serverless infrastructure:

* Uploads are capped at 10 MB; hosting platforms may impose a smaller body-size limit.
* `after()` starts the first attempt, while a PostgreSQL job record and scheduled worker provide recovery. Platform plan limits may be lower than the route's 300-second ceiling; confirm the cron is enabled and authorized.
* Database connectivity and connection pooling must be configured for serverless usage.
* Full extracted text is currently stored in PostgreSQL; use private object storage for larger-scale production deployments.
* Chunk embeddings are JSONB and scored in app memory; migrate to pgvector for large corpora.

For sustained production load, move ingestion and report generation to a dedicated worker so execution is independent of serverless request limits; the document queue is already persisted and can be drained by an external scheduler.

---

# 🛠️ Troubleshooting

## `users` table does not exist

For a fresh local database, verify `DATABASE_URL` points to the intended database and run:

```bash
npx drizzle-kit migrate
```

Then restart the application. If this database was previously initialized using `drizzle-kit push`, inspect its schema before applying migrations; do not replay the initial migration blindly.

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

## Groq or Gemini API returns 429

A 429 response means the provider's current rate or quota limit was reached. Groq is not unlimited; review the organization limits in the [Groq Console](https://console.groq.com/settings/limits), wait for the window to reset, or choose a plan/model with suitable limits. The app falls back to local extraction, deterministic risk checks, keyword retrieval, and evidence-only research where supported. To switch providers, set `AI_PROVIDER=gemini` and configure `GEMINI_API_KEY`; to disable text generation, set `AI_PROVIDER=none`.

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

Potential next improvements include:

* pgvector-backed approximate nearest-neighbor search for larger collections
* A dedicated non-serverless worker for document and report jobs that exceed function-duration limits
* Object storage integration for uploaded source files
* Broader held-out accuracy and source-faithfulness evaluation across real filings
* More advanced financial metric extraction and SEC filing ingestion
* Streaming AI responses
* Advanced role-based access control and rate limiting
* Production monitoring and automated database backups
* Additional AI providers and financial data integrations

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
Groq (optional text generation)
Google Gemini (optional text and embeddings)
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
