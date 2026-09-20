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
          <button onClick={downloadDocs} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="Download PDF">
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
                FinResearch AI is a professional financial research platform that uses five specialized AI agents working in a collaborative pipeline to automatically analyze company financial documents. It&apos;s designed for finance students, MBA candidates, and early-career analysts who want to develop financial analysis skills and experience how professional analyst workflows are augmented with multi-agent AI.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: FileText, title: "Document Processing", desc: "Upload 10-K filings, earnings transcripts, and annual reports. AI agents automatically parse, chunk, and index them." },
                { icon: BarChart2, title: "Metric Extraction", desc: "Automatically extracts 25+ financial KPIs including revenue, margins, ratios, and cash flows from document text." },
                { icon: AlertTriangle, title: "Risk Detection", desc: "Identifies financial red flags including liquidity risks, debt concerns, revenue concentration, and regulatory risks." },
                { icon: TrendingUp, title: "Benchmarking", desc: "Side-by-side comparison of multiple companies across all financial metrics with AI-generated insights." },
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
              <p className="text-sm text-amber-700">Every insight is strictly grounded in source documents. The system NEVER generates information beyond what the documents contain.</p>
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
            <p className="text-slate-500">Five specialized agents work in a coordinated pipeline. Each agent has a specific role and hands off results to the next.</p>

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
                  "Store chunks in database with section labels and page estimates",
                  "Update document status to 'indexed'",
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
                  "Take first 8,000 characters of document (where key financials appear)",
                  "Build structured prompt asking for 25+ specific metric fields",
                  "Request JSON response from Gemini AI (gemini-1.5-flash)",
                  "Parse and validate returned numbers",
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
                  "Take first 10,000 characters (risk factors often appear early)",
                  "Build specialized risk-analysis prompt",
                  "Request 3-8 risk items as JSON from Gemini AI",
                  "Each item includes: type, severity, title, description, source quote, recommendation",
                  "Validate severity is one of: critical, high, medium, low",
                  "Store in risk_flags database table",
                ],
                output: "Categorized risk flags with severity ratings, source quotes, and recommendations",
                whyImportant: "Risk identification is critical for investment decisions. The 'Risk Factors' section of a 10-K can be 50+ pages. AI can summarize and categorize these efficiently.",
              },
              {
                number: "04",
                name: "Benchmark Agent",
                color: "from-emerald-500 to-teal-600",
                icon: TrendingUp,
                description: "Compares multiple companies across all financial dimensions and generates insights.",
                steps: [
                  "Receive list of company IDs to compare",
                  "Fetch metrics and risks for each company",
                  "Build comparison context with all data",
                  "Send to Gemini with structured benchmarking prompt",
                  "Generate comparative analysis with specific numbers",
                  "Provide investment recommendations",
                ],
                output: "Comparative analysis with ranked companies and investment insights",
                whyImportant: "Context is everything in finance. A 30% margin is great in retail but poor in software. Benchmarking provides that context automatically.",
              },
              {
                number: "05",
                name: "Research Agent",
                color: "from-pink-500 to-rose-600",
                icon: MessageSquare,
                description: "Answers conversational financial questions using document evidence with citations.",
                steps: [
                  "Receive user's question",
                  "Search document chunks using keyword relevance scoring",
                  "Retrieve top 3 relevant chunks per document",
                  "Fetch related financial metrics and risk data",
                  "Build comprehensive context from all sources",
                  "Include conversation history (last 6 messages)",
                  "Generate step-by-step response with source citations",
                  "Return answer with exact document references",
                ],
                output: "Cited answer with source document references and reasoning trail",
                whyImportant: "Allows non-experts to ask complex financial questions in plain English and get expert-level answers backed by actual document evidence.",
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
    │       ├── extractionAgent.ts  (Metric extraction via Gemini)
    │       ├── riskAgent.ts        (Risk scanning via Gemini)
    │       ├── benchmarkAgent.ts   (Comparison via Gemini)
    │       └── researchAgent.ts    (Q&A via Gemini)
    │
    ├── Google Gemini AI API
    │       ├── gemini-1.5-flash    (Fast: extraction, risks, chat)
    │       └── gemini-1.5-pro      (Powerful: report generation)
    │
    └── PostgreSQL Database (Drizzle ORM)
            ├── users                (Authentication)
            ├── research_sessions    (Workspaces)
            ├── companies            (Company profiles)
            ├── documents            (Uploaded files metadata)
            ├── document_chunks      (Searchable text chunks)
            ├── financial_metrics    (Extracted numbers)
            ├── risk_flags           (Identified risks)
            ├── analysis_reports     (Generated reports)
            ├── chat_messages        (Conversation history)
            └── agent_logs           (Activity audit trail)`}</pre>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Document Upload Flow</h2>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="space-y-3">
                  {[
                    { step: 1, action: "User uploads file via drag-and-drop", detail: "Frontend sends FormData to POST /api/documents" },
                    { step: 2, action: "Server extracts text from file", detail: "PDF → pdf-parse, DOCX → mammoth, TXT → direct read" },
                    { step: 3, action: "Document record created in database", detail: "Status: 'processing'" },
                    { step: 4, action: "Agent pipeline runs asynchronously", detail: "User gets immediate response; agents work in background" },
                    { step: 5, action: "Document Agent chunks the text", detail: "~1500 chars per chunk, stored in document_chunks table" },
                    { step: 6, action: "Extraction Agent calls Gemini API", detail: "Sends document excerpt, receives structured JSON metrics" },
                    { step: 7, action: "Risk Agent calls Gemini API", detail: "Sends document excerpt, receives risk flags JSON array" },
                    { step: 8, action: "Document status updated to 'completed'", detail: "Frontend polls and shows updated status" },
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
            <p className="text-slate-500">PostgreSQL database with 10 tables managed via Drizzle ORM (type-safe SQL)</p>

            {[
              { table: "users", cols: ["id (UUID)", "email (unique)", "name", "password (hashed)", "role", "created_at"] },
              { table: "research_sessions", cols: ["id", "user_id (FK→users)", "name", "description", "status", "tags[]", "created_at", "updated_at"] },
              { table: "companies", cols: ["id", "name", "ticker", "sector", "industry", "description", "is_seeded", "created_at"] },
              { table: "documents", cols: ["id", "session_id (FK)", "company_id (FK)", "user_id (FK)", "file_name", "file_type", "file_size", "document_type", "fiscal_year", "content (TEXT)", "processing_status", "chunk_count"] },
              { table: "document_chunks", cols: ["id", "document_id (FK)", "chunk_index", "content (TEXT)", "page_number", "section", "created_at"] },
              { table: "financial_metrics", cols: ["id", "document_id (FK)", "company_id (FK)", "fiscal_year", "revenue", "gross_margin", "operating_margin", "net_margin", "ebitda", "total_assets", "total_equity", "current_ratio", "debt_to_equity", "roe", "eps", "free_cash_flow", "...25+ more"] },
              { table: "risk_flags", cols: ["id", "document_id (FK)", "company_id (FK)", "risk_type", "severity", "title", "description", "source_text", "recommendation", "created_at"] },
              { table: "analysis_reports", cols: ["id", "session_id", "user_id", "title", "report_type", "companies[]", "executive_summary", "full_report_content", "recommendations[]", "status", "created_at"] },
              { table: "chat_messages", cols: ["id", "session_id (FK)", "user_id (FK)", "role (user/assistant)", "content", "citations (JSONB)", "agent_type", "reasoning", "created_at"] },
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
            <p className="text-slate-500">All API routes are under /api/ and require authentication (except /auth/ and /health)</p>

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
                  { method: "GET", path: "/api/documents/[id]", desc: "Get document with metrics and risks" },
                  { method: "DELETE", path: "/api/documents/[id]", desc: "Delete document" },
                ],
              },
              {
                group: "Analysis",
                routes: [
                  { method: "GET", path: "/api/companies", desc: "List companies with latest metrics" },
                  { method: "GET", path: "/api/metrics", desc: "Get metrics (filter: ?companyIds= or ?documentId=)" },
                  { method: "GET", path: "/api/risks", desc: "Get risks (filter: ?companyIds= or ?documentId=)" },
                  { method: "POST", path: "/api/benchmark", desc: "Run benchmark comparison", body: "{ companyIds: string[] }" },
                ],
              },
              {
                group: "Reports & Chat",
                routes: [
                  { method: "GET", path: "/api/reports", desc: "List user's reports" },
                  { method: "POST", path: "/api/reports", desc: "Generate report", body: "{ companyIds, sessionId?, title? }" },
                  { method: "GET", path: "/api/reports/[id]", desc: "Get full report content" },
                  { method: "DELETE", path: "/api/reports/[id]", desc: "Delete report" },
                  { method: "GET", path: "/api/chat", desc: "Get chat history (?sessionId=)" },
                  { method: "POST", path: "/api/chat", desc: "Send message to Research Agent", body: "{ sessionId, content }" },
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
                content: "Download from nodejs.org (choose LTS version 18 or higher)\nVerify installation: node --version\nYou should see v18.x.x or higher",
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
                title: "Get Gemini API Key (FREE)",
                content: "1. Go to https://aistudio.google.com/\n2. Sign in with Google account\n3. Click 'Get API Key' → 'Create API Key'\n4. Copy the key (starts with AIzaSy...)\n5. Keep it secret — never share it!",
              },
              {
                step: 5,
                title: "Configure .env file",
                content: "Create a file named .env in the project root:\n\nDATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/app_db\nNEXTAUTH_SECRET=generate-with-openssl-rand-base64-32\nNEXTAUTH_URL=http://localhost:3000\nGEMINI_API_KEY=your-key-here",
              },
              {
                step: 6,
                title: "Install & Run",
                content: "# Install dependencies:\nnpm install\n\n# Push database schema:\nnpx drizzle-kit push\n\n# Start development server:\nnpm run dev\n\n# Open in browser:\nhttp://localhost:3000\n\n# Load demo data:\ncurl http://localhost:3000/api/seed",
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
            <h1 className="text-2xl font-bold text-slate-900">Deployment Guide (Free Tools)</h1>
            <p className="text-slate-500">Deploy FinResearch AI for free using Vercel + Neon PostgreSQL</p>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h2 className="font-bold text-emerald-800 mb-1">✅ Recommended: Vercel + Neon (Both 100% Free)</h2>
              <p className="text-sm text-emerald-700">Vercel is made by the Next.js team — perfect for Next.js apps. Neon provides free serverless PostgreSQL.</p>
            </div>

            {[
              {
                phase: "Phase 1",
                title: "Set Up Neon Database (Free PostgreSQL)",
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
                title: "Push Code to GitHub",
                steps: [
                  "Create GitHub account at github.com (free)",
                  "Go to github.com and click 'New Repository'",
                  "Name it 'finresearch-ai', make it Public or Private",
                  "Click 'Create Repository'",
                  "In your local project folder, run:",
                  "  git init",
                  "  git add .",
                  "  git commit -m 'Initial commit'",
                  "  git remote add origin https://github.com/YOUR-USERNAME/finresearch-ai.git",
                  "  git push -u origin main",
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
                  "Click 'Environment Variables' and add:",
                  "  DATABASE_URL = your Neon connection string",
                  "  NEXTAUTH_SECRET = run 'openssl rand -base64 32' locally",
                  "  NEXTAUTH_URL = https://your-app.vercel.app (your Vercel URL)",
                  "  GEMINI_API_KEY = your Google AI Studio key",
                  "Click 'Deploy' and wait 2-3 minutes",
                  "Your app is live!",
                ],
              },
              {
                phase: "Phase 4",
                title: "Initialize Production Database",
                steps: [
                  "Update your local .env DATABASE_URL to the Neon connection string",
                  "Run: npx drizzle-kit push",
                  "This creates all tables in Neon",
                  "Seed demo data: curl https://your-app.vercel.app/api/seed",
                  "Visit your Vercel URL and login with demo@finresearch.ai / demo123456",
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
                desc: "On the Dashboard, click 'Load Demo Data'. This instantly populates Apple, Microsoft, Tesla, and Amazon 2023 annual reports with all metrics and risks pre-analyzed.",
                tip: "This works even without a GEMINI_API_KEY — the seed data includes pre-computed metrics!",
              },
              {
                step: 2,
                title: "Explore the Dashboard",
                desc: "The dashboard shows: total companies, documents, sessions, reports, and risk flags. The Agent Pipeline Status bar shows all 5 agents are ready. The Financial Overview chart shows revenue vs net margins.",
              },
              {
                step: 3,
                title: "View Financial Metrics",
                desc: "Go to Financial Metrics to see interactive charts. Toggle between Revenue/EBITDA, Profitability Margins, Key Ratios, and Cash Flow. The performance radar chart shows relative strengths.",
                tip: "Microsoft has the highest operating margin (41.8%). Amazon has the highest revenue ($574.8B).",
              },
              {
                step: 4,
                title: "Analyze Risks",
                desc: "Go to Risk Analysis. Filter by severity to see Critical risks first. Click any risk card to see: the exact source quote from the document, severity rating, and analyst recommendation.",
                tip: "Tesla's margin compression from 28.5% to 18.2% is flagged as CRITICAL.",
              },
              {
                step: 5,
                title: "Run Benchmarking",
                desc: "Go to Benchmarking. Select 2-4 companies and click 'Compare'. See side-by-side charts and a detailed comparison table.",
                tip: "Add your GEMINI_API_KEY to get AI-generated comparative insights!",
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
                tip: "Requires GEMINI_API_KEY for full AI responses. Demo mode shows a sample response.",
              },
              {
                step: 8,
                title: "Upload Your Own Documents",
                desc: "Go to Documents → Upload Document. Fill in company details. Drag and drop a PDF, DOCX, or TXT financial document. Watch the agents process it automatically.",
                tip: "Best results with plaintext 10-K filings from SEC EDGAR (https://www.sec.gov/cgi-bin/browse-edgar)",
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
                { term: "Operating Income", def: "EBITDA minus depreciation and amortization. Also called 'EBIT' (earnings before interest and taxes)." },
                { term: "Net Income", def: "Final profit after ALL expenses including taxes and interest. Also called 'bottom line'." },
                { term: "EPS (Earnings Per Share)", def: "Net Income / Total Shares Outstanding. Shows how much profit each share of stock earned." },
                { term: "Free Cash Flow (FCF)", def: "Operating Cash Flow minus Capital Expenditures. Real cash a company can use for growth, buybacks, or dividends." },
                { term: "Current Ratio", def: "Current Assets / Current Liabilities. Measures ability to pay short-term debts. >1.0 is generally healthy." },
                { term: "D/E Ratio (Debt-to-Equity)", def: "Total Debt / Shareholders Equity. Measures financial leverage. High D/E means more debt risk." },
                { term: "ROE (Return on Equity)", def: "Net Income / Shareholders Equity. Measures how efficiently the company uses shareholder money. Higher is better." },
                { term: "ROA (Return on Assets)", def: "Net Income / Total Assets. Shows how efficiently company uses all its assets to generate profit." },
                { term: "Operating Margin", def: "Operating Income / Revenue. Shows profitability from core business before interest and taxes." },
                { term: "Net Margin", def: "Net Income / Revenue. Final profit as a percentage of revenue. Microsoft's 34.1% is exceptional." },
                { term: "Capital Expenditures (CapEx)", def: "Money spent on physical assets (buildings, equipment, servers). Amazon's $52.7B CapEx shows AWS infrastructure investment." },
                { term: "MD&A", def: "Management's Discussion and Analysis. Section of 10-K where management explains results in their own words." },
                { term: "Going Concern", def: "Auditor's warning that a company may not survive the next 12 months. A very serious red flag." },
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
