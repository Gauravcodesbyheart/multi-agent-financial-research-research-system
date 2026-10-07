// Report Agent — emits structured reports from source-validated metric and risk evidence only.
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { agentLogs, analysisReports, companies, documents, financialMetrics, riskFlags } from "@/db/schema";
import { buildEvidenceBackedReport, type ReportProfileInput } from "./reportUtils";

function readMetricEvidence(rawMetrics: unknown): Record<string, string> {
  if (!rawMetrics || typeof rawMetrics !== "object") return {};
  const evidence = (rawMetrics as Record<string, unknown>).metric_evidence;
  if (!evidence || typeof evidence !== "object") return {};
  return Object.fromEntries(
    Object.entries(evidence).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export async function generateAnalysisReport(
  reportId: string,
  logSessionId: string,
  userId: string,
  companyIds: string[],
  additionalContext?: string,
  documentSessionId?: string | null,
): Promise<void> {
  const startedAt = Date.now();
  await db.insert(agentLogs).values({
    sessionId: logSessionId,
    agentName: "Report Agent",
    action: "Starting evidence-validated report generation",
    status: "running",
    details: "Compiling all accessible filing periods and validating each displayed claim against source text.",
  });

  try {
    const documentConditions = [
      inArray(documents.companyId, companyIds),
      or(eq(documents.userId, userId), eq(documents.isSeeded, true)),
    ];
    if (documentSessionId) documentConditions.push(eq(documents.sessionId, documentSessionId));

    const sourceDocuments = await db.select({ document: documents, company: companies })
      .from(documents)
      .innerJoin(companies, eq(documents.companyId, companies.id))
      .where(and(...documentConditions));
    const documentIds = sourceDocuments.map((row) => row.document.id);

    const [metricRows, storedRiskRows] = documentIds.length > 0
      ? await Promise.all([
          db.select({ metric: financialMetrics })
            .from(financialMetrics)
            .where(inArray(financialMetrics.documentId, documentIds))
            .orderBy(desc(financialMetrics.extractedAt)),
          db.select({ risk: riskFlags })
            .from(riskFlags)
            .where(inArray(riskFlags.documentId, documentIds)),
        ])
      : [[], []];

    const metricsByDocument = new Map<string, typeof metricRows[number]["metric"]>();
    for (const { metric } of metricRows) {
      if (!metricsByDocument.has(metric.documentId)) metricsByDocument.set(metric.documentId, metric);
    }
    const risksByDocument = new Map<string, typeof storedRiskRows>();
    for (const { risk } of storedRiskRows) {
      risksByDocument.set(risk.documentId, [...(risksByDocument.get(risk.documentId) || []), { risk }]);
    }

    const profiles: ReportProfileInput[] = sourceDocuments.map(({ document, company }) => {
      const metric = metricsByDocument.get(document.id);
      const risks = (risksByDocument.get(document.id) || []).map(({ risk }) => ({
        riskType: risk.riskType,
        severity: risk.severity,
        sourceText: risk.sourceText,
      }));
      return {
        documentId: document.id,
        companyId: company.id,
        companyName: company.name,
        ticker: company.ticker,
        fiscalYear: metric?.fiscalYear ?? document.fiscalYear ?? null,
        fiscalPeriod: metric?.fiscalPeriod ?? null,
        extractedAt: metric?.extractedAt,
        sourceDocument: document.fileName,
        documentText: document.content || "",
        metrics: metric ? metric as unknown as Record<string, unknown> : null,
        metricEvidence: readMetricEvidence(metric?.rawMetrics),
        risks,
      };
    });

    const report = buildEvidenceBackedReport(profiles, additionalContext);
    await db.update(analysisReports)
      .set({
        executiveSummary: report.executiveSummary,
        fullReportContent: report.fullReportContent,
        recommendations: report.recommendations,
        companies: [...new Set(sourceDocuments.map((row) => row.company.name))],
        metricsComparison: report.metricsComparison,
        keyFindings: report.keyFindings,
        riskSummary: report.riskSummary,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(analysisReports.id, reportId));

    await db.insert(agentLogs).values({
      sessionId: logSessionId,
      agentName: "Report Agent",
      action: "Evidence-validated report generation complete",
      status: "completed",
      details: `Included ${report.keyFindings.sourceDocuments} source documents, ${report.keyFindings.verifiedMetricClaims} metric claims with matching quotes, and ${report.keyFindings.groundedRiskFlags} grounded risk passages.`,
      duration: Date.now() - startedAt,
    });
  } catch (error) {
    await db.update(analysisReports)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(analysisReports.id, reportId));
    await db.insert(agentLogs).values({
      sessionId: logSessionId,
      agentName: "Report Agent",
      action: "Report generation failed",
      status: "failed",
      details: String(error).slice(0, 1000),
      duration: Date.now() - startedAt,
    });
    throw error;
  }
}
