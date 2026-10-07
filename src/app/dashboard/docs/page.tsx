"use client";
import { useState } from "react";
import { BookOpen, ChevronRight, Download, Brain, FileText, BarChart2, AlertTriangle, TrendingUp, MessageSquare, Database, Code, Server, Cpu, Globe, Shield, Book } from "lucide-react";

const SECTIONS = [
  { id: "overview", label: "Project Overview", icon: BookOpen },
  { id: "agents", label: "AI Agents Explained", icon: Brain },
  { id: "architecture", label: "System Architecture", icon: Server },
  { id: "database", label: "Database Schema", icon: Database },
  { id: "api", label: "API Reference", icon: Code },
  { id: "setup", label: "Local Setup Guide", icon: Cpu },
  { id: "deployment", label: "Deployment Guide", icon: Globe },
  { id: "usage", label: "How to Use", icon: Book },
  { id: "glossary", label: "Financial Glossary", icon: Shield },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

  function downloadDocs() {
    const link = document.createElement("a");
    link.href = "/DOCUMENTATION.md";
    link.download = "FinResearch_AI_Documentation.md";
    link.click();
  }

  return (
    <div className="flex h-full">
      {/* Sidebar TOC */}
      <div className="w-56 flex-shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900">Documentation</h2>
          <button onClick={downloadDocs} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="Download Markdown documentation">
            <Download className="w-4 h-4" />
          </button>
        </div>
        <nav className="space-y-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-all ${activeSection === id ? "bg-blue-100 text-blue-800 font-medium" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeSection === "overview" && (
          <div className="max-w-3xl space-y-6 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">FinResearch AI</h1>
              <p className="text-lg text-slate-500">Multi-Agent Financial Analysis System — Complete Documentation</p>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl p-6 text-white">
              <h2 className="text-xl font-bold mb-2">What is FinResearch AI?</h2>
              <p className="text-blue-100 text-sm leading-relaxed">
                FinResearch AI is an educational financial research platform with an ordered document-processing pipeline plus on-demand research, benchmarking, and report agents. It&apos;s designed for finance students, MBA candidates, and early-career analysts who want to explore how evidence-based financial analysis workflows can be augmented with AI.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: FileText, title: "Document Processing", desc: "Upload 10-K filings, earnings transcripts, and annual reports. AI agents automatically parse, chunk, and index them." },
                { icon: BarChart2, title: "Metric Extraction", desc: "Automatically extracts 25+ financial KPIs including revenue, margins, ratios, and cash flows from document text." },
                { icon: AlertTriangle, title: "Risk Detection", desc: "Finds quote-backed disclosure signals and metric anomalies; cross-period alerts require comparable, source-matched values." },
                { icon: TrendingUp, title: "Benchmarking", desc: "Compare latest stored metrics with fiscal periods and source documents; Gemini insights are optional." },
                { icon: MessageSquare, title: "Research Agent", desc: "Conversational Q&A with exact source citations. Ask multi-part financial questions in plain English." },
                { icon: BookOpen, title: "Report Generation", desc: "Compile all analysis into professional analyst-style research reports downloadable as text files." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white border border-slate-200 rounded-xl p-4">
                  <Icon className="w-6 h-6 text-blue-600 mb-2" />
                  <h3 className="font-semibold text-slate-900 mb-1 text-sm">{title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-semibold text-amber-800 mb-1">🎯 Key Principle</h3>
              <p className="text-sm text-amber-700">The system validates source quotes and reported numbers before presenting research claims. These checks improve traceability but cannot prove every paraphrase is entailed; verify important conclusions against the original filing.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-3">Pre-loaded Demo Data</h2>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { company: "Apple Inc.", ticker: "AAPL", sector: "Technology", year: "2023" },
                  { company: "Microsoft Corp.", ticker: "MSFT", sector: "Technology", year: "2023" },
                  { company: "Tesla Inc.", ticker: "TSLA", sector: "Automotive", year: "2023" },
                  { company: "Amazon.com Inc.", ticker: "AMZN", sector: "Technology/E-Commerce", year: "2023" },
                ].map(({ company, ticker, sector, year }) => (
                  <div key={ticker} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">
                      {ticker.slice(0, 2)}
                    </div>
                    <div className="text-xs font-bold text-slate-900">{ticker}</div>
                    <div className="text-xs text-slate-500">{company}</div>
                    <div className="text-xs text-slate-400">{sector}</div>
                    <div className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 mt-1">FY{year}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === "agents" && (
          <div className="max-w-3xl space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900">AI Agents Explained</h1>
            <p className="text-slate-500">Document indexing, extraction, risk checks, and optional embeddings run sequentially. Benchmark, research, and report tasks are invoked on demand.</p>

            {[
              {
                number: "01",
                name: "Document Agent",
                color: "from-blue-500 to-blue-600",
                icon: FileText,
                description: "The first agent in the pipeline. It receives uploaded documents and prepares them for AI analysis.",
                steps: [
                  "Extract text from PDF, DOCX, or TXT files",
                  "Clean and normalize text (remove noise)",
                  "Split document into ~1,500-character chunks with 200-char overlap",
                  "Identify document sections (Overview, Risk Factors, MD&A, etc.)",
                  "Store source chunks with section labels; page numbers remain blank when parsers cannot verify them",
                  "Update document status and start sequential extraction, risk review, and optional embedding stages",
                ],
                output: "Searchable document chunks stored in database",
                whyImportant: "AI models have input size limits. Chunking lets us search only relevant sections instead of processing entire 200-page documents each time.",
              },
              {
                number: "02",
                name: "Extraction Agent",
                color: "from-violet-500 to-violet-600",
                icon: BarChart2,
                description: "Reads document text and uses Gemini AI to extract specific financial numbers into structured format.",
                steps: [
                  "Use document text, capped to a beginning/end excerpt for large files",
                  "Build a structured prompt for supported metric fields",
                  "Request JSON from Gemini 3.6 Flash when configured; otherwise use the local parser",
                  "Keep metric values only when their quotes and numeric evidence match",
                  "Convert monetary values to millions USD",
                  "Convert percentages to decimal ratios (0.25 = 25%)",
                  "Store in financial_metrics database table",
                ],
                output: "Structured financial metrics table with 25+ data points",
                whyImportant: "Eliminates hours of manual data entry from financial statements. Provides structured data for charts and comparisons.",
              },
              {
                number: "03",
                name: "Risk Agent",
                color: "from-orange-500 to-red-600",
                icon: AlertTriangle,
                description: "Scans the document specifically looking for red flags, material risks, and anomalies.",
                steps: [
                  "Run deterministic disclosure rules, metric anomaly checks, and comparable cross-period checks",
                  "Optionally ask Gemini for additional risk findings",
                  "Retain model findings only when source quotes and numeric claims validate",
                  "Store source text, severity, description, and review recommendation in risk_flags",
                ],
                output: "Categorized risk flags with severity ratings, source quotes, and recommendations",
                whyImportant: "Risk findings are screening signals, not audit conclusions or investment advice.",
              },
              {
                number: "04",
                name: "Embedding Agent",
                color: "from-cyan-500 to-sky-600",
                icon: Brain,
                description: "Optionally indexes document chunks with semantic vectors when Gemini is configured.",
                steps: [
                  "Embed chunks in batches and store vectors plus model identifiers in JSONB",
                  "Use semantic ranking only when the full collection has compatible vectors",
                  "Fall back to keyword retrieval when vectors or provider configuration are unavailable",
                ],
                output: "Optional semantic retrieval index; lexical search remains available",
                whyImportant: "Embeddings can find conceptually related passages without requiring a PostgreSQL vector extension for small collections.",
              },
              {
                number: "05",
                name: "Benchmark Agent",
                color: "from-emerald-500 to-teal-600",
                icon: TrendingUp,
                description: "Compares multiple companies across all financial dimensions and generates insights.",
                steps: [
                  "Receive list of company IDs to compare",
                  "Fetch only documents and metrics the signed-in user can access (plus demo fixtures)",
                  "Choose the latest fiscal metric per company and retain its source and period",
                  "Warn when fiscal periods differ or are missing",
                  "Use Gemini insights when configured; otherwise show deterministic comparisons",
                  "Do not generate buy/sell recommendations",
                ],
                output: "Period-aware comparison with source filenames, metric rows, and risk counts",
                whyImportant: "Context is everything in finance. A 30% margin is great in retail but poor in software. Benchmarking provides that context automatically.",
              },
              {
                number: "06",
                name: "Research Agent",
                color: "from-pink-500 to-rose-600",
                icon: MessageSquare,
                description: "Answers conversational financial questions using document evidence with citations.",
                steps: [
                  "Receive user's question",
                  "Verify that the signed-in user owns the requested research session",
                  "Decompose compound questions into separate retrieval steps",
                  "Search only that session's documents with compatible embeddings or keyword fallback",
                  "Require each generated claim to cite a retrieved source and exact quote",
                  "Check numeric values, currencies, scales, and percentage units against the quote",
                  "Return relevant source excerpts instead of a fabricated answer when synthesis fails",
                ],
                output: "Session-scoped answers with source citations, or transparent evidence excerpts when AI is unavailable",
                whyImportant: "Makes source review easier while keeping the limits of automated quote validation explicit.",
              },
              {
                number: "07",
                name: "Report Agent",
                color: "from-indigo-500 to-violet-600",
                icon: BookOpen,
                description: "Compiles an Executive Summary, deterministic Key Financials table, and supporting analysis.",
                steps: [
                  "Gather accessible stored metrics and source-document names",
                  "Render the latest period per selected company in a Markdown table",
                  "Generate detailed Gemini analysis when configured or an evidence-only local report otherwise",
                  "Display the Executive Summary and render headings, lists, and financial tables in the report page",
                ],
                output: "Downloadable report with an Executive Summary and source/period-aware Key Financials table",
                whyImportant: "The deterministic financial table stays available even when model generation is unavailable or omits the requested table.",
              },
            ].map(({ number, name, color, icon: Icon, description, steps, output, whyImportant }) => (
              <div key={name} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className={`bg-gradient-to-r ${color} p-5 text-white`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black opacity-40">{number}</span>
                    <Icon className="w-6 h-6" />
                    <h2 className="text-xl font-bold">{name}</h2>
                  </div>
                  <p className="text-sm opacity-90 mt-1">{description}</p>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Processing Steps</h3>
                    <ol className="space-y-1">
                      {steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0 mt-0.5">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                      <div className="text-xs font-bold text-emerald-700 mb-1">Output</div>
                      <div className="text-xs text-emerald-600">{output}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div className="text-xs font-bold text-blue-700 mb-1">Why Important</div>
                      <div className="text-xs text-blue-600">{whyImportant}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === "architecture" && (
          <div className="max-w-3xl space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900">System Architecture</h1>
            <div className="bg-slate-900 rounded-2xl p-6 text-green-400 font-mono text-xs overflow-x-auto">
              <pre>{`User Browser (React/Next.js Client)
    │
    ▼
Next.js 16 App Router (Server)
    ├── /app/dashboard/*     (React Server Components + Client Components)
    ├── /app/api/*           (Route Handlers — API endpoints)
    │       ├── /auth        (NextAuth.js — login/session)
    │       ├── /sessions    (Research session CRUD)
    │       ├── /documents   (Upload + agent pipeline trigger)
    │       ├── /companies   (Company profiles + metrics)
    │       ├── /metrics     (Financial data queries)
    │       ├── /risks       (Risk flag queries)
    │       ├── /benchmark   (Cross-company comparison)
    │       ├── /reports     (Report generation)
    │       ├── /chat        (Research Agent conversations)
    │       └── /dashboard   (Stats aggregation)
    │
    ├── Multi-Agent Pipeline (/src/lib/agents/)
    │       ├── documentAgent.ts    (Text extraction, chunking)
    │       ├── extractionAgent.ts  (Evidence-validated metrics)
    │       ├── riskAgent.ts        (Deterministic and quote-validated risks)
    │       ├── embeddingAgent.ts   (Optional semantic embeddings)
    │       ├── benchmarkAgent.ts   (Period-aware comparisons)
    │       ├── researchAgent.ts    (Session-scoped cited retrieval)
    │       └── reportAgent.ts      (Executive Summary and Key Financials)
    │
    ├── Google Gemini AI API
    │       ├── gemini-3.8-flash    (Configurable: extraction, risk review, research, benchmarks, reports)
    │       └── gemini-embedding-001 (Optional semantic vectors)
    │
    └── PostgreSQL Database (Drizzle ORM)
            ├── users                (Authentication)
            ├── research_sessions    (Workspaces)
            ├── companies            (Company profiles)
            ├── documents            (Uploaded files and processing status)
            ├── document_chunks      (Searchable chunks and optional embeddings)
            ├── document_processing_jobs (Durable retryable upload jobs)
            ├── financial_metrics    (Extracted numbers)
            ├── risk_flags           (Identified risks)
            ├── analysis_reports     (Generated reports)
            ├── chat_messages        (Session-owned conversation history)
            ├── benchmark_comparisons (Comparison metadata table)
            └── agent_logs           (Activity audit trail)`}</pre>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Document Upload Flow</h2>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="space-y-3">
                  {[
                    { step: 1, action: "Validate and extract the uploaded file", detail: "PDF → pdf-parse, DOCX → mammoth, TXT → direct read; empty/scanned files are rejected" },
                    { step: 2, action: "Persist document and durable job together", detail: "A PostgreSQL transaction records the queued job before returning the upload response" },
                    { step: 3, action: "Claim and process the job sequentially", detail: "Document indexing → metric extraction → risk checks → optional embeddings" },
                    { step: 4, action: "Recover interrupted attempts", detail: "A scheduled, secret-protected worker retries due or stale jobs with backoff" },
                    { step: 5, action: "Record stage status and evidence", detail: "The UI shows indexed chunks, metric/risk evidence, embedding status, and agent activity" },
                    { step: 6, action: "Finish as completed, partial, or failed", detail: "Exhausted jobs are marked failed; document status reflects any partial results" },
                  ].map(({ step, action, detail }) => (
                    <div key={step} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</div>
                      <div>
                        <div className="text-sm font-medium text-slate-800">{action}</div>
                        <div className="text-xs text-slate-500">{detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "database" && (
          <div className="max-w-3xl space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900">Database Schema</h1>
            <p className="text-slate-500">PostgreSQL database with 12 schema tables managed via Drizzle ORM (type-safe SQL)</p>

            {[
              { table: "users", cols: ["id (UUID)", "email (unique)", "name", "password (hashed)", "role", "created_at"] },
              { table: "research_sessions", cols: ["id", "user_id (FK→users)", "name", "description", "status", "tags[]", "created_at", "updated_at"] },
              { table: "companies", cols: ["id", "name", "ticker", "sector", "industry", "description", "is_seeded", "created_at"] },
              { table: "documents", cols: ["id", "session_id (FK)", "company_id (FK)", "user_id (FK)", "file_name", "document_type", "fiscal_year", "content (TEXT)", "processing_status", "embedding_status", "chunk_count"] },
              { table: "document_chunks", cols: ["id", "document_id (FK)", "chunk_index", "content (TEXT)", "page_number (nullable)", "section", "embedding (JSONB)", "embedding_model", "created_at"] },
              { table: "document_processing_jobs", cols: ["id", "document_id (unique FK)", "status", "attempts", "max_attempts", "next_attempt_at", "locked_at", "last_error"] },
              { table: "financial_metrics", cols: ["id", "document_id (FK)", "company_id (FK)", "fiscal_year", "fiscal_period", "revenue", "gross_margin", "operating_margin", "net_margin", "ebitda", "total_assets", "total_liabilities", "total_equity", "current_ratio", "debt_to_equity", "roe", "eps", "free_cash_flow", "...25+ fields"] },
              { table: "risk_flags", cols: ["id", "document_id (FK)", "company_id (FK)", "risk_type", "severity", "title", "description", "source_text", "recommendation", "created_at"] },
              { table: "analysis_reports", cols: ["id", "session_id", "user_id", "title", "report_type", "companies[]", "executive_summary", "full_report_content", "recommendations[]", "status", "created_at"] },
              { table: "chat_messages", cols: ["id", "session_id (FK)", "user_id (FK)", "role (user/assistant)", "content", "citations (JSONB)", "agent_type", "reasoning", "created_at"] },
              { table: "benchmark_comparisons", cols: ["id", "session_id (FK)", "user_id (FK)", "title", "company_ids", "metrics (JSONB)", "insights"] },
              { table: "agent_logs", cols: ["id (serial)", "session_id", "document_id", "agent_name", "action", "status", "details", "duration", "created_at"] },
            ].map(({ table, cols }) => (
              <div key={table} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-400" />
                  <span className="font-mono text-emerald-400 font-bold text-sm">{table}</span>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {cols.map((col) => (
                      <span key={col} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono">{col}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === "api" && (
          <div className="max-w-3xl space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900">API Reference</h1>
            <p className="text-slate-500">API routes are under /api/. Most require a signed-in user; the health, seed, and scheduled worker endpoints use their documented access controls.</p>

            {[
              {
                group: "Authentication",
                routes: [
                  { method: "POST", path: "/api/auth/register", desc: "Register new user", body: "{ name, email, password }" },
                  { method: "POST", path: "/api/auth/[...nextauth]", desc: "NextAuth signin/signout/session" },
                ],
              },
              {
                group: "Sessions",
                routes: [
                  { method: "GET", path: "/api/sessions", desc: "List user's research sessions" },
                  { method: "POST", path: "/api/sessions", desc: "Create session", body: "{ name, description?, tags? }" },
                  { method: "GET", path: "/api/sessions/[id]", desc: "Get session by ID" },
                  { method: "PATCH", path: "/api/sessions/[id]", desc: "Update session" },
                  { method: "DELETE", path: "/api/sessions/[id]", desc: "Delete session and all data" },
                ],
              },
              {
                group: "Documents",
                routes: [
                  { method: "GET", path: "/api/documents", desc: "List documents (filter: ?sessionId=)" },
                  { method: "POST", path: "/api/documents", desc: "Upload document (multipart/form-data)", body: "FormData: file, sessionId?, documentType, fiscalYear, companyName, ticker" },
                  { method: "GET", path: "/api/documents/[id]", desc: "Get accessible document with metrics, risks, chunks, embeddings, and activity" },
                  { method: "POST", path: "/api/documents/[id]/embeddings", desc: "Start semantic indexing for an accessible document" },
                  { method: "DELETE", path: "/api/documents/[id]", desc: "Delete document" },
                  { method: "GET", path: "/api/worker/documents", desc: "Recover one due job; requires Authorization: Bearer CRON_SECRET" },
                ],
              },
              {
                group: "Analysis",
                routes: [
                  { method: "GET", path: "/api/companies", desc: "List companies with latest metrics" },
                  { method: "GET", path: "/api/metrics", desc: "Get metrics (filter: ?companyIds= or ?documentId=)" },
                  { method: "GET", path: "/api/risks", desc: "Get risks (filter: ?companyIds= or ?documentId=)" },
                  { method: "POST", path: "/api/benchmark", desc: "Compare accessible companies with fiscal periods, source documents, and risk counts", body: "{ companyIds: string[], sessionId? }" },
                ],
              },
              {
                group: "Reports & Chat",
                routes: [
                  { method: "GET", path: "/api/reports", desc: "List user's reports" },
                  { method: "POST", path: "/api/reports", desc: "Generate report", body: "{ companyIds, sessionId?, title? }" },
                  { method: "GET", path: "/api/reports/[id]", desc: "Get full report content" },
                  { method: "DELETE", path: "/api/reports/[id]", desc: "Delete report" },
                  { method: "GET", path: "/api/chat", desc: "Get history only when the signed-in user owns sessionId" },
                  { method: "POST", path: "/api/chat", desc: "Run session-scoped cited research; failed synthesis returns an error", body: "{ sessionId, content }" },
                ],
              },
              {
                group: "Utilities",
                routes: [
                  { method: "GET", path: "/api/health", desc: "Check database connectivity; detailed database errors are kept in server logs" },
                  { method: "GET", path: "/api/seed", desc: "Local development only; disabled in production" },
                  { method: "POST", path: "/api/seed", desc: "Production seeding requires the SEED_SECRET value in x-seed-secret" },
                ],
              },
            ].map(({ group, routes }) => (
              <div key={group} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <h2 className="font-semibold text-slate-800 text-sm">{group}</h2>
                </div>
                <div className="divide-y divide-slate-50">
                  {routes.map(({ method, path, desc, body }) => (
                    <div key={path} className="px-5 py-3 flex items-start gap-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded font-mono flex-shrink-0 ${method === "GET" ? "bg-emerald-100 text-emerald-700" : method === "POST" ? "bg-blue-100 text-blue-700" : method === "PATCH" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {method}
                      </span>
                      <div>
                        <code className="text-xs text-slate-700 font-mono">{path}</code>
                        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                        {body && <p className="text-xs text-slate-400 mt-0.5 font-mono">Body: {body}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === "setup" && (
          <div className="max-w-3xl space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900">Local Setup Guide</h1>
            <p className="text-slate-500">Complete step-by-step guide to run FinResearch AI on your computer</p>

            {[
              {
                step: 1,
                title: "Install Node.js",
                content: "Install Node.js 20.9 or newer from nodejs.org\nVerify installation: node --version\nNext.js 16 requires a supported modern Node.js runtime",
              },
              {
                step: 2,
                title: "Install PostgreSQL",
                content: "Download from postgresql.org/download/\nInstall with default settings\nRemember your password!\nVerify: psql --version",
              },
              {
                step: 3,
                title: "Create Database",
                content: "# Open terminal and connect to PostgreSQL:\npsql -U postgres\n\n# Create the database:\nCREATE DATABASE app_db;\n\n# Exit:\n\\q",
              },
              {
                step: 4,
                title: "Optional: Get a Gemini API Key",
                content: "Without a key, evidence extraction, keyword retrieval, and transparent local fallbacks still work.\nFor model analysis or embeddings, create a key at https://aistudio.google.com/\nKeep the key private and never commit it to Git.",
              },
              {
                step: 5,
                title: "Configure .env file",
                content: "Create .env in the project root (never commit it):\n\nDATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/app_db\nNEXTAUTH_SECRET=generate-with-openssl-rand-base64-32\nNEXTAUTH_URL=http://localhost:3000\n# Optional AI configuration\nGEMINI_API_KEY=\nGEMINI_MODEL=gemini-3.8-flash\nGEMINI_PRO_MODEL=gemini-3.8-flash\nGEMINI_EMBEDDING_MODEL=gemini-embedding-001\n# Required for scheduled recovery in production\nCRON_SECRET=\n# Only for deliberate production demo seeding\nSEED_SECRET=",
              },
              {
                step: 6,
                title: "Install & Run",
                content: "# Install the locked dependencies:\nnpm ci\n\n# Apply checked-in migrations to a NEW empty database:\nnpx drizzle-kit migrate\n\n# Start development server:\nnpm run dev\n\n# Open in browser:\nhttp://localhost:3000\n\n# Optional local-only demo seed:\ncurl http://localhost:3000/api/seed\n\n# Do not replay the initial migration against an existing push-initialized DB.",
              },
            ].map(({ step, title, content }) => (
              <div key={step} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">{step}</div>
                  <h2 className="font-semibold text-slate-900">{title}</h2>
                </div>
                <div className="p-5">
                  <pre className="bg-slate-900 text-green-400 rounded-xl p-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto">{content}</pre>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === "deployment" && (
          <div className="max-w-3xl space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900">Deployment Guide</h1>
            <p className="text-slate-500">Deploy with Vercel + Neon PostgreSQL or another Node.js host; review current provider limits and costs.</p>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">Uploaded text is stored in PostgreSQL. If Gemini is configured, document excerpts and research prompts are sent to Google&apos;s API; review data-handling and contractual requirements before uploading confidential material.</p>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h2 className="font-bold text-emerald-800 mb-1">Recommended: Vercel + Neon</h2>
              <p className="text-sm text-emerald-700">Both services offer managed Next.js/PostgreSQL hosting. Plan limits and pricing vary, so confirm Cron frequency and function duration support before deployment.</p>
            </div>

            {[
              {
                phase: "Phase 1",
                title: "Set Up a Managed PostgreSQL Database",
                steps: [
                  "Go to neon.tech and click 'Sign Up' (use GitHub account)",
                  "Click 'New Project'",
                  "Name it 'finresearch-ai', choose your region",
                  "Click 'Create Project'",
                  "In the dashboard, click 'Connection Details'",
                  "Copy the 'Connection string' (postgresql://...)",
                  "Save it — you'll need it for Vercel!",
                ],
              },
              {
                phase: "Phase 2",
                title: "Push the repository branch to GitHub",
                steps: [
                  "Use the existing Git clone; do not run git init inside it",
                  "Push your working branch to the configured GitHub remote",
                  "Never commit .env files, API keys, private documents, or database credentials",
                  "Confirm the checked-in SQL migrations and vercel.json are on that branch",
                ],
              },
              {
                phase: "Phase 3",
                title: "Deploy on Vercel",
                steps: [
                  "Go to vercel.com and click 'Sign Up with GitHub'",
                  "Click 'New Project'",
                  "Find your GitHub repo and click 'Import'",
                  "Vercel auto-detects Next.js — no config needed!",
                  "Set Preview and Production environment variables separately:",
                  "  DATABASE_URL = your Neon connection string",
                  "  NEXTAUTH_SECRET = a strong, unique secret",
                  "  NEXTAUTH_URL = your exact public HTTPS origin",
                  "  CRON_SECRET = a strong secret for scheduled job recovery",
                  "  GEMINI_API_KEY = optional; without it, local evidence fallbacks remain available",
                  "  GEMINI_MODEL / GEMINI_PRO_MODEL = optional configurable analysis models",
                  "  GEMINI_EMBEDDING_MODEL = gemini-embedding-001 (optional semantic search)",
                  "Deploy, then verify health, authentication, uploads, research, and reports",
                ],
              },
              {
                phase: "Phase 4",
                title: "Apply migrations and configure recovery",
                steps: [
                  "Back up the intended database and identify whether it is new or was initialized with drizzle-kit push",
                  "For a NEW empty database, run npx drizzle-kit migrate from a trusted machine or CI job using its DATABASE_URL",
                  "For a push-initialized database, do not replay 0000; review and safely reconcile 0001 and 0002 first",
                  "Set CRON_SECRET and confirm the host can call /api/worker/documents on its schedule",
                  "Production demo seeding is disabled for GET; only when needed, set SEED_SECRET and use POST with the matching x-seed-secret header",
                  "Smoke-test login, upload processing, citations, reports, and one recovered job",
                ],
              },
            ].map(({ phase, title, steps }) => (
              <div key={phase} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
                  <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded">{phase}</span>
                  <h2 className="font-semibold text-slate-900">{title}</h2>
                </div>
                <div className="p-5">
                  <ol className="space-y-2">
                    {steps.map((step, i) => (
                      <li key={i} className={`text-sm ${step.startsWith("  ") ? "ml-6 text-slate-500 font-mono text-xs bg-slate-50 rounded px-2 py-0.5" : "text-slate-700"}`}>
                        {!step.startsWith("  ") && <span className="font-bold text-slate-400 mr-2">{i + 1}.</span>}
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === "usage" && (
          <div className="max-w-3xl space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900">How to Use FinResearch AI</h1>

            {[
              {
                step: 1,
                title: "Load Demo Data",
                desc: "In local development, initialize the empty database with the demo fixtures for Apple, Microsoft, Tesla, and Amazon.",
                tip: "Fixture metrics and risk examples are illustrative and should be checked against their cited source text."
              },
              {
                step: 2,
                title: "Explore the Dashboard",
                desc: "The dashboard summarizes your documents, sessions, reports, metrics, and risk flags. Upload processing runs sequentially; research, benchmarks, and reports run on demand.",
              },
              {
                step: 3,
                title: "View Financial Metrics",
                desc: "Go to Financial Metrics to see interactive charts. Toggle between Revenue/EBITDA, Profitability Margins, Key Ratios, and Cash Flow. The performance radar chart shows relative strengths.",
                tip: "Check each metric's source document and fiscal period before drawing comparisons."
              },
              {
                step: 4,
                title: "Analyze Risks",
                desc: "Go to Risk Analysis. Filter by severity to see Critical risks first. Click any risk card to see: the exact source quote from the document, severity rating, and analyst recommendation.",
                tip: "A red flag is a screening signal, not an audit opinion or investment recommendation."
              },
              {
                step: 5,
                title: "Run Benchmarking",
                desc: "Go to Benchmarking. Select 2-8 accessible companies and click 'Compare'. Review the side-by-side charts, source filenames, fiscal periods, and detailed comparison table.",
                tip: "A Gemini key is optional; without it, deterministic comparisons still include periods, source documents, and risk counts."
              },
              {
                step: 6,
                title: "Generate Reports",
                desc: "Go to Reports → Generate Report. Select companies, optionally add context, click Generate. The Report Agent compiles an analyst-style research report.",
              },
              {
                step: 7,
                title: "Research Agent Chat",
                desc: "Go to Research Agent. Select a session. Try asking: 'What is Apple's revenue growth compared to Microsoft?' You'll get a cited answer with exact source references.",
                tip: "A Gemini key enables synthesis. Without one, retrieval shows matching document excerpts and citations—never canned sample statistics."
              },
              {
                step: 8,
                title: "Upload Your Own Documents",
                desc: "Go to Documents → Upload Document. Fill in company details. Drag and drop a PDF, DOCX, or TXT financial document. Watch the agents process it automatically.",
                tip: "PDF/DOCX/TXT are supported; image-only PDFs need OCR. Page numbers are not fabricated when the parser cannot verify them.",
              },
            ].map(({ step, title, desc, tip }) => (
              <div key={step} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0">{step}</div>
                  <div>
                    <h2 className="font-semibold text-slate-900 mb-1">{title}</h2>
                    <p className="text-sm text-slate-600 mb-2">{desc}</p>
                    {tip && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                        <span className="text-amber-500 text-sm">💡</span>
                        <p className="text-xs text-amber-700">{tip}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === "glossary" && (
          <div className="max-w-3xl space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900">Financial Terms Glossary</h1>
            <p className="text-slate-500">Key financial concepts used throughout FinResearch AI — explained for beginners</p>

            <div className="grid grid-cols-1 gap-3">
              {[
                { term: "10-K", def: "Annual report filed with SEC by public companies. Contains audited financials, risk factors, and business overview. Most comprehensive company document." },
                { term: "10-Q", def: "Quarterly report (filed every 3 months). Similar to 10-K but shorter and unaudited." },
                { term: "Revenue", def: "Total money earned from selling products/services. Also called 'top line' or 'net sales'. Does NOT account for any expenses." },
                { term: "Gross Profit", def: "Revenue minus Cost of Goods Sold (COGS). Shows how much money is left after paying for what you sold." },
                { term: "Gross Margin", def: "Gross Profit / Revenue × 100. Example: 42.9% means 42.9 cents of gross profit per $1 of revenue." },
                { term: "EBITDA", def: "Earnings Before Interest, Taxes, Depreciation, and Amortization. A measure of core operating profitability." },
                { term: "Operating Income", def: "Profit from a company's core operations before non-operating items, interest, and taxes; statement labels and adjustments can vary." },
                { term: "Net Income", def: "Final profit after ALL expenses including taxes and interest. Also called 'bottom line'." },
                { term: "EPS (Earnings Per Share)", def: "Net Income / Total Shares Outstanding. Shows how much profit each share of stock earned." },
                { term: "Free Cash Flow (FCF)", def: "Operating Cash Flow minus Capital Expenditures. Real cash a company can use for growth, buybacks, or dividends." },
                { term: "Current Ratio", def: "Current assets / current liabilities. A short-term liquidity indicator; interpretation depends on the business model, industry, and reporting period." },
                { term: "D/E Ratio (Debt-to-Equity)", def: "Debt / shareholders' equity. Indicates leverage; definitions and appropriate levels differ across industries, and negative equity can make the ratio misleading." },
                { term: "ROE (Return on Equity)", def: "Net income / shareholders' equity. Measures profit relative to equity; high values can reflect leverage or very small/negative equity, so compare with context." },
                { term: "ROA (Return on Assets)", def: "Net Income / Total Assets. Shows how efficiently company uses all its assets to generate profit." },
                { term: "Operating Margin", def: "Operating Income / Revenue. Shows profitability from core business before interest and taxes." },
                { term: "Net Margin", def: "Net income / revenue. Profit as a share of revenue; compare across similar businesses and periods." },
                { term: "Capital Expenditures (CapEx)", def: "Spending on long-lived assets such as buildings, equipment, or servers. Interpret alongside operating cash flow, free cash flow, and management's plans." },
                { term: "MD&A", def: "Management's Discussion and Analysis. Section of 10-K where management explains results in their own words." },
                { term: "Going Concern", def: "The assumption that a business can continue operating. A disclosed substantial-doubt warning deserves review but does not by itself establish that failure is certain." },
                { term: "WACC", def: "Weighted Average Cost of Capital. The minimum return rate a company must earn to satisfy all investors." },
              ].map(({ term, def }) => (
                <div key={term} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4">
                  <div className="w-32 flex-shrink-0">
                    <span className="text-sm font-bold text-blue-700">{term}</span>
                  </div>
                  <p className="text-sm text-slate-600">{def}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
