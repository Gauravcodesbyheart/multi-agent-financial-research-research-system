import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  decimal,
  boolean,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).default("analyst").notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Research Sessions ────────────────────────────────────────────────────────
export const researchSessions = pgTable("research_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Companies ────────────────────────────────────────────────────────────────
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ticker: varchar("ticker", { length: 20 }),
  sector: varchar("sector", { length: 100 }),
  industry: varchar("industry", { length: 100 }),
  description: text("description"),
  isSeeded: boolean("is_seeded").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Financial Documents ──────────────────────────────────────────────────────
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => researchSessions.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: integer("file_size"),
  documentType: varchar("document_type", { length: 100 }).notNull(),
  fiscalYear: integer("fiscal_year"),
  content: text("content"),
  summary: text("summary"),
  chunkCount: integer("chunk_count").default(0),
  isSeeded: boolean("is_seeded").default(false),
  processingStatus: varchar("processing_status", { length: 50 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Document Chunks (for RAG / vector search simulation) ────────────────────
export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  pageNumber: integer("page_number"),
  section: varchar("section", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Financial Metrics ────────────────────────────────────────────────────────
export const financialMetrics = pgTable("financial_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  fiscalYear: integer("fiscal_year"),
  fiscalPeriod: varchar("fiscal_period", { length: 20 }),

  // Revenue & Profitability
  revenue: decimal("revenue", { precision: 20, scale: 2 }),
  revenueGrowth: decimal("revenue_growth", { precision: 10, scale: 4 }),
  grossProfit: decimal("gross_profit", { precision: 20, scale: 2 }),
  grossMargin: decimal("gross_margin", { precision: 10, scale: 4 }),
  operatingIncome: decimal("operating_income", { precision: 20, scale: 2 }),
  operatingMargin: decimal("operating_margin", { precision: 10, scale: 4 }),
  netIncome: decimal("net_income", { precision: 20, scale: 2 }),
  netMargin: decimal("net_margin", { precision: 10, scale: 4 }),
  ebitda: decimal("ebitda", { precision: 20, scale: 2 }),
  ebitdaMargin: decimal("ebitda_margin", { precision: 10, scale: 4 }),

  // Balance Sheet
  totalAssets: decimal("total_assets", { precision: 20, scale: 2 }),
  totalLiabilities: decimal("total_liabilities", { precision: 20, scale: 2 }),
  totalEquity: decimal("total_equity", { precision: 20, scale: 2 }),
  cashAndEquivalents: decimal("cash_and_equivalents", { precision: 20, scale: 2 }),
  totalDebt: decimal("total_debt", { precision: 20, scale: 2 }),

  // Key Ratios
  currentRatio: decimal("current_ratio", { precision: 10, scale: 4 }),
  quickRatio: decimal("quick_ratio", { precision: 10, scale: 4 }),
  debtToEquity: decimal("debt_to_equity", { precision: 10, scale: 4 }),
  roe: decimal("roe", { precision: 10, scale: 4 }),
  roa: decimal("roa", { precision: 10, scale: 4 }),
  eps: decimal("eps", { precision: 10, scale: 4 }),
  peRatio: decimal("pe_ratio", { precision: 10, scale: 4 }),

  // Cash Flow
  operatingCashFlow: decimal("operating_cash_flow", { precision: 20, scale: 2 }),
  capitalExpenditures: decimal("capital_expenditures", { precision: 20, scale: 2 }),
  freeCashFlow: decimal("free_cash_flow", { precision: 20, scale: 2 }),

  rawMetrics: jsonb("raw_metrics"),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
});

// ─── Risk Flags ───────────────────────────────────────────────────────────────
export const riskFlags = pgTable("risk_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  riskType: varchar("risk_type", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  sourceText: text("source_text"),
  pageReference: varchar("page_reference", { length: 100 }),
  recommendation: text("recommendation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Analysis Reports ─────────────────────────────────────────────────────────
export const analysisReports = pgTable("analysis_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => researchSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  reportType: varchar("report_type", { length: 100 }).notNull(),
  companies: text("companies").array(),
  executiveSummary: text("executive_summary"),
  keyFindings: jsonb("key_findings"),
  metricsComparison: jsonb("metrics_comparison"),
  riskSummary: jsonb("risk_summary"),
  recommendations: text("recommendations").array(),
  fullReportContent: text("full_report_content"),
  agentLogs: jsonb("agent_logs"),
  status: varchar("status", { length: 50 }).default("generating").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Chat Messages (Research Agent) ──────────────────────────────────────────
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => researchSessions.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  citations: jsonb("citations"),
  agentType: varchar("agent_type", { length: 100 }),
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Benchmark Comparisons ────────────────────────────────────────────────────
export const benchmarkComparisons = pgTable("benchmark_comparisons", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => researchSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  companyIds: text("company_ids").array(),
  metrics: jsonb("metrics"),
  insights: text("insights"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Agent Activity Logs ──────────────────────────────────────────────────────
export const agentLogs = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  sessionId: uuid("session_id"),
  documentId: uuid("document_id"),
  agentName: varchar("agent_name", { length: 100 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  details: text("details"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ─────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(researchSessions),
  documents: many(documents),
  chatMessages: many(chatMessages),
  reports: many(analysisReports),
}));

export const researchSessionsRelations = relations(researchSessions, ({ one, many }) => ({
  user: one(users, { fields: [researchSessions.userId], references: [users.id] }),
  documents: many(documents),
  chatMessages: many(chatMessages),
  reports: many(analysisReports),
  benchmarks: many(benchmarkComparisons),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  documents: many(documents),
  metrics: many(financialMetrics),
  risks: many(riskFlags),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  session: one(researchSessions, { fields: [documents.sessionId], references: [researchSessions.id] }),
  company: one(companies, { fields: [documents.companyId], references: [companies.id] }),
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  chunks: many(documentChunks),
  metrics: many(financialMetrics),
  risks: many(riskFlags),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ResearchSession = typeof researchSessions.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type FinancialMetrics = typeof financialMetrics.$inferSelect;
export type RiskFlag = typeof riskFlags.$inferSelect;
export type AnalysisReport = typeof analysisReports.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type AgentLog = typeof agentLogs.$inferSelect;
