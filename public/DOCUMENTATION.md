# FinResearch AI — Multi-Agent Financial Analysis System
## Complete Project Documentation (Beginner-Friendly)

---

## TABLE OF CONTENTS
1. Project Overview
2. What is This Project?
3. System Architecture
4. Multi-Agent Pipeline Explained
5. Technology Stack
6. Database Schema
7. API Reference
8. Setup & Installation Guide (Local)
9. Deployment Guide (Free Tools)
10. How to Use the Platform
11. Troubleshooting

---

## 1. PROJECT OVERVIEW

FinResearch AI is a full-stack web application that uses multiple AI agents working together to analyze financial documents like annual reports (10-K filings), earnings transcripts, and investor presentations.

**Target Users:** Finance students, MBA candidates, early-career analysts

**Key Problem Solved:** Manually extracting key metrics, identifying risks, and comparing companies across complex financial documents requires significant time, effort, and domain expertise. This system automates that workflow using specialized AI agents.

---

## 2. WHAT IS THIS PROJECT? (For Beginners)

### What is a 10-K Filing?
A 10-K is a comprehensive annual report that publicly traded companies must file with the SEC (Securities and Exchange Commission). It contains:
- Company overview and business description
- Financial statements (income statement, balance sheet, cash flows)
- Risk factors
- Management's discussion and analysis (MD&A)
- Notes to financial statements

### What is a Multi-Agent AI System?
Instead of having one AI do everything, we have specialized AI agents, each expert in one task:
- Like a real investment bank where different analysts handle research, risk, and writing

### What Does This System Do?
1. You upload a financial document (or use pre-loaded ones)
2. Five AI agents automatically process it in a pipeline
3. You get structured metrics, risk analysis, and research insights
4. You can ask questions in plain English and get cited answers

---

## 3. SYSTEM ARCHITECTURE

```
User Browser
    │
    ▼
Next.js 16 App (React Frontend + API Routes)
    │
    ├─── Authentication (NextAuth.js + JWT)
    │
    ├─── Multi-Agent Pipeline
    │       ├── Document Agent (parsing, chunking, indexing)
    │       ├── Extraction Agent (financial metrics)
    │       ├── Risk Agent (red flags detection)
    │       ├── Benchmark Agent (comparison)
    │       └── Research Agent (conversational Q&A)
    │
    ├─── Google Gemini AI API
    │       └── gemini-1.5-flash (fast responses)
    │       └── gemini-1.5-pro (report generation)
    │
    └─── PostgreSQL Database (via Drizzle ORM)
            ├── users
            ├── research_sessions
            ├── companies
            ├── documents
            ├── document_chunks
            ├── financial_metrics
            ├── risk_flags
            ├── analysis_reports
            ├── chat_messages
            └── agent_logs
```

---

## 4. MULTI-AGENT PIPELINE EXPLAINED

### Agent 1: Document Agent
**What it does:** Takes uploaded financial documents and processes them for AI analysis
**Steps:**
1. Receives file (PDF, DOCX, or TXT)
2. Extracts text content
3. Cleans and normalizes text
4. Splits into ~1500-character chunks with 200-char overlap
5. Identifies document sections (Business Overview, Risk Factors, etc.)
6. Stores chunks in database for retrieval
7. Updates document status to "indexed"

**Why chunking?** AI models have token limits. Breaking documents into smaller chunks lets us search and retrieve only relevant sections.

### Agent 2: Extraction Agent
**What it does:** Reads financial documents and extracts structured metrics
**Extracts:**
- Revenue, net income, gross profit
- Margins: gross, operating, net, EBITDA
- Balance sheet: assets, liabilities, equity, cash, debt
- Ratios: current ratio, D/E ratio, ROE, ROA
- Cash flows: operating, capital expenditures, free cash flow
- Per share: EPS

**How:** Sends document text to Gemini AI with a structured prompt asking for JSON output with specific metric keys.

### Agent 3: Risk Agent
**What it does:** Scans documents for red flags and material risks
**Risk Categories:**
- Liquidity Risk (can the company pay its bills?)
- Debt Risk (is the company over-leveraged?)
- Revenue Risk (is revenue declining or concentrated?)
- Margin Risk (are profits being squeezed?)
- Regulatory Risk (legal or compliance threats)
- Competition Risk (market competitive dynamics)
- Going Concern (can the company survive?)
- Geographic Concentration (over-reliance on one market)

**Output:** Structured risk cards with severity (Critical/High/Medium/Low), source quote, and recommendation.

### Agent 4: Benchmark Agent
**What it does:** Compares multiple companies side-by-side
**Generates:**
- Side-by-side metric comparisons
- Relative performance rankings
- Industry positioning analysis
- Investment recommendations (buy/hold/sell)

### Agent 5: Research Agent (Conversational)
**What it does:** Answers your financial questions using document evidence
**Process:**
1. Takes your question
2. Searches document chunks for relevant passages (keyword scoring)
3. Retrieves extracted metrics and risk data
4. Sends everything to Gemini with your question
5. Returns cited answer with source references

**Key Principle:** The agent NEVER makes up data. All numbers come from actual document text.

---

## 5. TECHNOLOGY STACK

### Frontend
- **Next.js 16** with App Router — React framework for server-side rendering
- **React 19** — UI component library
- **Tailwind CSS 4** — Utility-first CSS framework
- **Recharts** — Charts and data visualization
- **Lucide React** — Icon library
- **react-hot-toast** — Notification toasts
- **react-dropzone** — File drag-and-drop upload

### Backend
- **Next.js API Routes** — Serverless API endpoints
- **NextAuth.js** — Authentication (JWT sessions)
- **Drizzle ORM** — Type-safe database ORM
- **bcryptjs** — Password hashing
- **pdf-parse** — PDF text extraction
- **mammoth** — DOCX text extraction

### AI
- **Google Gemini API** (@google/generative-ai)
  - gemini-1.5-flash: Fast responses for extraction/risk/chat
  - gemini-1.5-pro: High-quality report generation

### Database
- **PostgreSQL** — Relational database
- Tables: 10 tables covering all entities

### Infrastructure
- **Node.js 18+** — Server runtime
- **npm** — Package manager

---

## 6. DATABASE SCHEMA

### users
Stores user accounts with hashed passwords.

### research_sessions
Named workspaces where users organize their analysis work. Each session can contain multiple documents and chat conversations.

### companies
Company profiles (name, ticker, sector, industry). Pre-seeded with Apple, Microsoft, Tesla, Amazon.

### documents
Uploaded financial documents with metadata (file type, fiscal year, processing status).

### document_chunks
Split chunks from each document for searchable retrieval. Each chunk ~1500 characters with section labeling.

### financial_metrics
Extracted financial numbers linked to both document and company. Includes 25+ metric fields.

### risk_flags
Risk items identified by the Risk Agent. Includes severity, source text, and recommendations.

### analysis_reports
Generated research reports with executive summary and full analyst write-up.

### chat_messages
Research Agent conversation history with citations.

### agent_logs
Audit trail of all agent activities (for debugging and transparency).

---

## 7. API REFERENCE

### Authentication
- `POST /api/auth/register` — Create new user account
- `POST /api/auth/signin` — Sign in (NextAuth)
- `POST /api/auth/signout` — Sign out

### Research Sessions
- `GET /api/sessions` — List all user sessions
- `POST /api/sessions` — Create session
- `GET /api/sessions/[id]` — Get session details
- `PATCH /api/sessions/[id]` — Update session
- `DELETE /api/sessions/[id]` — Delete session

### Documents
- `GET /api/documents` — List documents
- `POST /api/documents` — Upload document (triggers agent pipeline)
- `GET /api/documents/[id]` — Get document with metrics and risks
- `DELETE /api/documents/[id]` — Delete document

### Companies
- `GET /api/companies` — List all companies with metrics

### Financial Metrics
- `GET /api/metrics` — Get metrics (filter by companyId or documentId)

### Risk Analysis
- `GET /api/risks` — Get risk flags (filter by severity, company)

### Benchmarking
- `POST /api/benchmark` — Compare companies (body: { companyIds: string[] })

### Reports
- `GET /api/reports` — List reports
- `POST /api/reports` — Generate new report
- `GET /api/reports/[id]` — Get full report
- `DELETE /api/reports/[id]` — Delete report

### Chat/Research Agent
- `GET /api/chat?sessionId=xxx` — Get chat history
- `POST /api/chat` — Ask question (body: { sessionId, content })

### Dashboard
- `GET /api/dashboard` — Get dashboard summary stats

### Utilities
- `GET /api/health` — Health check
- `GET /api/seed` — Seed demo data

---

## 8. SETUP & INSTALLATION GUIDE (Local Development)

### Prerequisites (Install These First)

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **PostgreSQL** (version 14 or higher)
   - Download from: https://www.postgresql.org/download/
   - Or use Docker: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`
   - Verify: `psql --version`

3. **Git**
   - Download from: https://git-scm.com/
   - Verify: `git --version`

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/finresearch-ai.git
cd finresearch-ai
```

### Step 2: Install Dependencies
```bash
npm install
```
This installs all packages listed in package.json (~400MB).

### Step 3: Create PostgreSQL Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE app_db;
\q
```

### Step 4: Configure Environment Variables
Create a `.env` file in the project root:
```env
# Database
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/app_db

# NextAuth
NEXTAUTH_SECRET=your-random-secret-key-at-least-32-chars
NEXTAUTH_URL=http://localhost:3000

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key-here
```

**How to get GEMINI_API_KEY (FREE):**
1. Go to https://aistudio.google.com/
2. Click "Get API Key"
3. Click "Create API Key"
4. Copy the key and paste it in `.env`

**How to generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```
Or use: https://generate-secret.vercel.app/32

### Step 5: Push Database Schema
```bash
npx drizzle-kit push
```
This creates all the database tables.

### Step 6: Seed Demo Data
```bash
# Start the app first
npm run dev

# In a new terminal, run:
curl http://localhost:3000/api/seed
```

### Step 7: Start Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Step 8: Login with Demo Account
- Email: `demo@finresearch.ai`
- Password: `demo123456`

---

## 9. DEPLOYMENT GUIDE (Free Tools)

### Option A: Deploy on Vercel (Easiest — RECOMMENDED)

Vercel is the company that makes Next.js. They offer a generous free tier.

**Step 1: Create accounts**
1. GitHub account: https://github.com (free)
2. Vercel account: https://vercel.com (free, sign up with GitHub)
3. Neon account (free PostgreSQL): https://neon.tech (free)

**Step 2: Set up Neon Database (Free PostgreSQL)**
1. Go to https://neon.tech
2. Click "Sign Up" → use GitHub
3. Click "New Project"
4. Name it "finresearch-ai"
5. Select region closest to you
6. Click "Create Project"
7. Copy the "Connection String" (starts with `postgresql://...`)

**Step 3: Push code to GitHub**
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit"

# Create a new repository on github.com
# Then connect and push:
git remote add origin https://github.com/your-username/finresearch-ai.git
git push -u origin main
```

**Step 4: Deploy to Vercel**
1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Click "Import" next to your GitHub repository
4. Configure Environment Variables (click "Environment Variables"):
   - `DATABASE_URL` = your Neon connection string
   - `NEXTAUTH_SECRET` = generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` = your Vercel URL (e.g., `https://your-app.vercel.app`)
   - `GEMINI_API_KEY` = your Google AI Studio key
5. Click "Deploy"
6. Wait 2-3 minutes for deployment

**Step 5: Push database schema to Neon**
```bash
# Update your .env with Neon DATABASE_URL temporarily
npx drizzle-kit push

# Then seed the database
curl https://your-app.vercel.app/api/seed
```

**That's it!** Your app is live at `https://your-app.vercel.app`

---

### Option B: Deploy on Railway (Alternative Free Tier)

Railway provides free PostgreSQL and app hosting.

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Add environment variables in Railway dashboard
5. Railway auto-detects Next.js and builds automatically

---

### Option C: Deploy on Render (Another Option)

1. Go to https://render.com
2. Sign up free
3. Create a "Web Service" from GitHub
4. Create a free PostgreSQL database
5. Add environment variables
6. Deploy

---

## 10. HOW TO USE THE PLATFORM

### Step 1: Load Demo Data
Click "Load Demo Data" on the Dashboard to instantly populate with:
- 4 pre-loaded companies (Apple, Microsoft, Tesla, Amazon)
- FY2023 annual report documents for each
- Extracted financial metrics (revenue, margins, ratios)
- Risk flags (10 identified risks across companies)

### Step 2: Explore Companies
- Go to "Companies" in the sidebar
- View financial profiles for each pre-loaded company
- Click "Metrics", "Risks", or "Compare" buttons

### Step 3: View Financial Metrics
- Go to "Financial Metrics"
- Toggle between Revenue, Margins, Ratios, and Cash Flow charts
- See the detailed comparison table at the bottom

### Step 4: Analyze Risks
- Go to "Risk Analysis"
- Filter by severity (Critical, High, Medium, Low)
- Filter by risk type
- Read source quotes and analyst recommendations

### Step 5: Run Benchmarking
- Go to "Benchmarking"
- Select 2-4 companies
- Click "Compare Companies"
- View side-by-side charts and comparison table

### Step 6: Generate a Report
- Go to "Reports"
- Click "Generate Report"
- Select companies to include
- Click "Generate Report"
- View the AI-compiled analyst-style report

### Step 7: Research Agent Chat
- Go to "Research Agent"
- Select a session
- Ask financial questions like:
  - "What is Apple's revenue growth compared to Microsoft?"
  - "What are the biggest risks for Tesla?"
  - "Which company has the best free cash flow generation?"
- Get cited answers with source document references

### Step 8: Upload Your Own Documents
- Go to "Documents"
- Click "Upload Document"
- Fill in company name, ticker, document type, fiscal year
- Drag and drop a PDF, DOCX, or TXT file
- Watch agents process it automatically (usually takes 30-60 seconds)

---

## 11. TROUBLESHOOTING

### "GEMINI_API_KEY is not configured"
- The app works in demo mode without a key
- For full AI features, get a free key at https://aistudio.google.com/
- Add it to your `.env` file

### Database connection error
- Make sure PostgreSQL is running
- Check your DATABASE_URL in .env is correct
- Ensure the database exists: `CREATE DATABASE app_db;`

### "Session not found" in Research Agent
- Create or select a research session first
- Go to "Research Sessions" → "New Session"

### Documents stuck in "processing" status
- Without a GEMINI_API_KEY, AI extraction is skipped
- Document chunking still works (Document Agent)
- Metrics and risks require AI (Extraction + Risk Agents)

### Build errors
Run `npm run typecheck` to find TypeScript errors
Run `npm run lint` to find ESLint issues

---

## FINANCIAL TERMS GLOSSARY

| Term | Definition |
|------|-----------|
| Revenue | Total money earned from selling products/services |
| Gross Profit | Revenue minus Cost of Goods Sold |
| Gross Margin | Gross Profit / Revenue × 100 |
| EBITDA | Earnings Before Interest, Taxes, Depreciation, Amortization |
| Operating Income | EBITDA minus D&A |
| Net Income | Final profit after all expenses and taxes |
| EPS | Earnings Per Share — net income divided by shares outstanding |
| Current Ratio | Current Assets / Current Liabilities (liquidity measure) |
| D/E Ratio | Total Debt / Shareholders Equity (leverage measure) |
| ROE | Net Income / Shareholders Equity (profitability measure) |
| ROA | Net Income / Total Assets |
| Free Cash Flow | Operating Cash Flow minus Capital Expenditures |
| 10-K | Annual report filed with SEC by public companies |
| 10-Q | Quarterly report filed with SEC |

---

*FinResearch AI — Multi-Agent Financial Analysis System*
*Built with Next.js, Drizzle ORM, PostgreSQL, and Google Gemini AI*
