// Red Flag Agent — combines quote-grounded document rules with cross-period financial checks.
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { agentLogs, documents, financialMetrics, riskFlags } from "@/db/schema";
import { generateJSON } from "./llm";
import {
  dedupeRiskFindings,
  detectFinancialTrendRisks,
  detectMetricAnomalies,
  detectTextualRedFlags,
  type FinancialSnapshot,
  type RiskFinding,
  validateModelRiskItems,
} from "./analysisUtils";

const RISK_SYSTEM = `You are a cautious financial red-flag analyst. Identify only material risks explicitly evidenced in the supplied filing.
Do not infer facts. Every item must contain one exact source_text quote copied from the document. If no concrete item is supported, return {"findings":[]}. Output one JSON object with a findings array.`;

function snapshotFromMetric(
  metric: typeof financialMetrics.$inferSelect | undefined,
  fileName?: string | null,
): FinancialSnapshot | null {
  if (!metric) return null;
  const rawMetrics = metric.rawMetrics && typeof metric.rawMetrics === "object"
    ? metric.rawMetrics as Record<string, unknown>
    : {};
  const rawEvidence = rawMetrics.metric_evidence && typeof rawMetrics.metric_evidence === "object"
    ? rawMetrics.metric_evidence as Record<string, unknown>
    : {};
  const evidence = (key: string) => typeof rawEvidence[key] === "string" ? rawEvidence[key] as string : undefined;

  return {
    fiscalYear: metric.fiscalYear,
    fiscalPeriod: metric.fiscalPeriod,
    fileName,
    revenue: metric.revenue,
    totalDebt: metric.totalDebt,
    grossMargin: metric.grossMargin,
    operatingMargin: metric.operatingMargin,
    netMargin: metric.netMargin,
    totalAssets: metric.totalAssets,
    totalLiabilities: metric.totalLiabilities,
    totalEquity: metric.totalEquity,
    currentRatio: metric.currentRatio,
    debtToEquity: metric.debtToEquity,
    netIncome: metric.netIncome,
    operatingCashFlow: metric.operatingCashFlow,
    metricEvidence: {
      revenue: evidence("revenue"),
      totalDebt: evidence("total_debt"),
      grossMargin: evidence("gross_margin"),
      operatingMargin: evidence("operating_margin"),
      netMargin: evidence("net_margin"),
      totalAssets: evidence("total_assets"),
      totalLiabilities: evidence("total_liabilities"),
      totalEquity: evidence("total_equity"),
      currentRatio: evidence("current_ratio"),
      debtToEquity: evidence("debt_to_equity"),
      netIncome: evidence("net_income"),
      operatingCashFlow: evidence("operating_cash_flow"),
    },
  };
}

async function getCrossPeriodFindings(
  documentId: string,
  currentContent: string,
  companyId?: string,
): Promise<RiskFinding[]> {
  const [currentDocument] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  const resolvedCompanyId = companyId || currentDocument?.companyId;
  if (!currentDocument || !resolvedCompanyId) return [];

  const metricsRows = await db
    .select({ metric: financialMetrics, document: documents })
    .from(financialMetrics)
    .innerJoin(documents, eq(financialMetrics.documentId, documents.id))
    .where(and(
      eq(financialMetrics.companyId, resolvedCompanyId),
      or(eq(documents.userId, currentDocument.userId), eq(documents.isSeeded, true)),
    ))
    .orderBy(sql`${financialMetrics.fiscalYear} DESC NULLS LAST`, desc(financialMetrics.extractedAt));

  const currentRow = metricsRows.find((row) => row.metric.documentId === documentId);
  if (!currentRow) return [];
  const currentYear = currentRow.metric.fiscalYear;
  const currentPeriod = currentRow.metric.fiscalPeriod || null;
  const previousRow = metricsRows.find((row) =>
    row.metric.documentId !== documentId &&
    row.metric.fiscalYear !== null &&
    currentYear !== null &&
    row.metric.fiscalYear < currentYear &&
    (row.metric.fiscalPeriod || null) === currentPeriod,
  );
  if (!previousRow) return [];

  const currentSnapshot = snapshotFromMetric(currentRow.metric, currentRow.document.fileName);
  const previousSnapshot = snapshotFromMetric(previousRow.metric, previousRow.document.fileName);
  if (!currentSnapshot || !previousSnapshot) return [];

  return detectFinancialTrendRisks(
    previousSnapshot,
    currentSnapshot,
    previousRow.document.content || "",
    currentContent,
  );
}

export async function scanForRisks(
  documentId: string,
  content: string,
  companyId?: string,
): Promise<void> {
  const startedAt = Date.now();
  await db.insert(agentLogs).values({
    documentId,
    agentName: "Red Flag Agent",
    action: "Starting red-flag scan",
    status: "running",
    details: "Checking audit/going-concern disclosures, accounting signals, metric anomalies, and cross-period changes.",
  });

  try {
    const [currentMetric] = await db.select().from(financialMetrics)
      .where(eq(financialMetrics.documentId, documentId))
      .orderBy(desc(financialMetrics.extractedAt))
      .limit(1);

    const deterministicFindings: RiskFinding[] = [
      ...detectTextualRedFlags(content),
      ...detectMetricAnomalies(snapshotFromMetric(currentMetric) || {}, content),
      ...await getCrossPeriodFindings(documentId, content, companyId),
    ];

    let validatedModelFindings: RiskFinding[] = [];
    let modelStatus = "No text AI provider configured; deterministic checks used.";
    try {
      const prompt = `Review this financial document for additional material risks not already covered by deterministic checks.
Return one JSON object with a findings array. Each finding has fields risk_type, severity (critical/high/medium/low), title, description, source_text (an exact quote of at least 12 characters copied from this document), and recommendation. Use {"findings":[]} if there are no additional supported findings.
Do not fabricate a quote.

DOCUMENT TEXT:\n${content.length <= 30000 ? content : `${content.slice(0, 15000)}\n[Middle omitted]\n${content.slice(-15000)}`}`;
      const modelItems = await generateJSON<unknown>(prompt, RISK_SYSTEM);
      validatedModelFindings = validateModelRiskItems(modelItems, content);
      modelStatus = `Validated ${validatedModelFindings.length} additional model findings against source quotes.`;
    } catch (error) {
      modelStatus = `Text AI unavailable; deterministic checks used. ${String(error).slice(0, 300)}`;
    }

    const findings = dedupeRiskFindings([...deterministicFindings, ...validatedModelFindings]);
    await db.delete(riskFlags).where(eq(riskFlags.documentId, documentId));
    if (findings.length > 0) {
      await db.insert(riskFlags).values(findings.map((risk) => ({
        documentId,
        companyId: companyId || null,
        riskType: risk.risk_type,
        severity: risk.severity,
        title: risk.title,
        description: risk.description,
        sourceText: risk.source_text,
        pageReference: risk.page_reference || null,
        recommendation: risk.recommendation || null,
      })));
    }

    await db.insert(agentLogs).values({
      documentId,
      agentName: "Red Flag Agent",
      action: "Red-flag scan complete",
      status: "completed",
      details: `Persisted ${findings.length} evidence-backed findings. ${modelStatus}`,
      duration: Date.now() - startedAt,
    });
  } catch (error) {
    await db.insert(agentLogs).values({
      documentId,
      agentName: "Red Flag Agent",
      action: "Red-flag scan failed",
      status: "failed",
      details: String(error).slice(0, 1000),
      duration: Date.now() - startedAt,
    });
    throw error;
  }
}
