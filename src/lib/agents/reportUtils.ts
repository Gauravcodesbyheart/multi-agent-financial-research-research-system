import { hasGroundedEvidence } from "./analysisUtils";
import { sourceBackedMetricValue } from "./evidenceUtils";
import { sortFiscalPeriods } from "./comparisonUtils";

export interface ReportRiskInput {
  riskType: string;
  severity: string;
  sourceText: string | null;
}

export interface ReportProfileInput {
  documentId: string;
  companyId: string;
  companyName: string;
  ticker: string | null;
  fiscalYear: number | null;
  fiscalPeriod: string | null;
  extractedAt?: Date | string;
  sourceDocument: string;
  documentText: string;
  metrics: Record<string, unknown> | null;
  metricEvidence: Record<string, string>;
  risks: ReportRiskInput[];
}

interface MetricDefinition {
  key: string;
  evidenceKey: string;
  label: string;
  kind: "amount" | "percent" | "ratio";
}

const METRIC_DEFINITIONS: MetricDefinition[] = [
  { key: "revenue", evidenceKey: "revenue", label: "Revenue", kind: "amount" },
  { key: "revenueGrowth", evidenceKey: "revenue_growth", label: "Revenue growth", kind: "percent" },
  { key: "grossMargin", evidenceKey: "gross_margin", label: "Gross margin", kind: "percent" },
  { key: "operatingMargin", evidenceKey: "operating_margin", label: "Operating margin", kind: "percent" },
  { key: "netIncome", evidenceKey: "net_income", label: "Net income", kind: "amount" },
  { key: "totalDebt", evidenceKey: "total_debt", label: "Total debt", kind: "amount" },
  { key: "currentRatio", evidenceKey: "current_ratio", label: "Current ratio", kind: "ratio" },
  { key: "freeCashFlow", evidenceKey: "free_cash_flow", label: "Free cash flow", kind: "amount" },
];

export interface ReportMetricEvidence {
  id: string;
  key: string;
  label: string;
  value: number;
  formattedValue: string;
  quote: string;
}

export interface ReportRiskEvidence {
  id: string;
  riskType: string;
  severity: string;
  quote: string;
}

export interface ReportSourceRow {
  sourceId: string;
  documentId: string;
  companyId: string;
  companyName: string;
  ticker: string | null;
  fiscalYear: number | null;
  fiscalPeriod: string | null;
  sourceDocument: string;
  metricEvidence: ReportMetricEvidence[];
  riskEvidence: ReportRiskEvidence[];
}

export interface BuiltEvidenceReport {
  executiveSummary: string;
  fullReportContent: string;
  recommendations: string[];
  metricsComparison: { evidenceVersion: 1; rows: ReportSourceRow[] };
  keyFindings: { totalCompanies: number; sourceDocuments: number; verifiedMetricClaims: number; groundedRiskFlags: number };
  riskSummary: { byCompany: Array<{ companyId: string; company: string; groundedRiskFlags: number }> };
}

export function isEvidenceValidatedComparison(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const comparison = value as Record<string, unknown>;
  if (comparison.evidenceVersion !== 1 || !Array.isArray(comparison.rows)) return false;
  return comparison.rows.every((row) => {
    if (!row || typeof row !== "object") return false;
    const source = row as Record<string, unknown>;
    return typeof source.sourceId === "string" && typeof source.documentId === "string" &&
      typeof source.sourceDocument === "string" && Array.isArray(source.metricEvidence) && Array.isArray(source.riskEvidence);
  });
}

export function sanitizeStoredReport<T extends {
  status: string;
  metricsComparison: unknown;
  executiveSummary: string | null;
  fullReportContent: string | null;
  recommendations: string[] | null;
}>(report: T): T & { unvalidated: boolean } {
  const hasStoredProse = Boolean(report.executiveSummary || report.fullReportContent || report.recommendations?.length);
  const unvalidated = hasStoredProse && !isEvidenceValidatedComparison(report.metricsComparison);
  return {
    ...report,
    executiveSummary: unvalidated ? null : report.executiveSummary,
    fullReportContent: unvalidated ? null : report.fullReportContent,
    recommendations: unvalidated ? null : report.recommendations,
    unvalidated,
  };
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function formatMetric(value: number, kind: MetricDefinition["kind"]): string {
  if (kind === "percent") return `${(value * 100).toFixed(2)}%`;
  if (kind === "ratio") return `${value.toFixed(2)}x`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function cleanText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function escapeCell(value: string): string {
  return cleanText(value).replace(/\|/g, "\\|");
}

function periodText(profile: Pick<ReportProfileInput, "fiscalYear" | "fiscalPeriod">): string {
  return `${cleanText(profile.fiscalPeriod || "Period not specified")} ${profile.fiscalYear ?? "year not specified"}`;
}

function validateMetricEvidence(profile: ReportProfileInput, sourceIndex: number): ReportMetricEvidence[] {
  if (!profile.metrics) return [];
  const verified: ReportMetricEvidence[] = [];
  for (const definition of METRIC_DEFINITIONS) {
    const rawValue = asFiniteNumber(profile.metrics[definition.key]);
    const quote = profile.metricEvidence[definition.evidenceKey];
    if (rawValue === undefined) continue;
    const value = sourceBackedMetricValue(definition.evidenceKey, rawValue, quote, profile.documentText);
    if (value === undefined) continue;

    verified.push({
      id: `E${sourceIndex}-${verified.length + 1}`,
      key: definition.key,
      label: definition.label,
      value,
      formattedValue: formatMetric(value, definition.kind),
      quote: cleanText(quote),
    });
  }
  return verified;
}

function validateRiskEvidence(profile: ReportProfileInput, sourceIndex: number): ReportRiskEvidence[] {
  const grounded: ReportRiskEvidence[] = [];
  const seen = new Set<string>();
  for (const risk of profile.risks) {
    const quote = typeof risk.sourceText === "string" ? cleanText(risk.sourceText) : "";
    const identity = `${risk.riskType}|${risk.severity}|${quote.toLocaleLowerCase()}`;
    if (!quote || seen.has(identity) || !hasGroundedEvidence(profile.documentText, quote)) continue;
    seen.add(identity);
    grounded.push({
      id: `R${sourceIndex}-${grounded.length + 1}`,
      riskType: cleanText(risk.riskType),
      severity: cleanText(risk.severity),
      quote,
    });
  }
  return grounded;
}

function buildExecutiveSummary(profiles: ReportProfileInput[], rows: ReportSourceRow[]): string {
  const sorted = sortFiscalPeriods(rows);
  const companyIds = [...new Set(profiles.map((profile) => profile.companyId))];
  const lines = companyIds.map((companyId) => {
    const latest = sorted.find((row) => row.companyId === companyId);
    const companyName = cleanText(profiles.find((profile) => profile.companyId === companyId)?.companyName || "Selected company");
    if (!latest) return `- ${companyName}: no source documents were available in the selected scope.`;
    const verified = latest.metricEvidence.filter((item) => ["revenue", "netIncome", "grossMargin", "currentRatio", "freeCashFlow"].includes(item.key));
    const values = verified.length
      ? verified.map((item) => `${item.label}: ${item.formattedValue}${item.key === "revenue" || item.key === "netIncome" || item.key === "freeCashFlow" ? " million USD" : ""} [${item.id}]`).join("; ")
      : "no metric value passed source-quote and numeric validation";
    return `- ${companyName} — latest available extracted row: ${periodText(latest)}; source [${latest.sourceId}] ${cleanText(latest.sourceDocument)}. ${values}.`;
  });
  return `This report covers ${companyIds.length} selected compan${companyIds.length === 1 ? "y" : "ies"} and ${profiles.length} accessible source document(s). Financial values are included only when a metric-specific quote is present in the original document text and its number matches the stored value. No unvalidated model prose or investment recommendation is used.\n\n${lines.join("\n")}`;
}

function buildKeyFinancials(rows: ReportSourceRow[]): string {
  const headings = [
    "Company", "Fiscal period", "Revenue (USD millions)", "Revenue growth", "Gross margin",
    "Operating margin", "Net income (USD millions)", "Total debt (USD millions)",
    "Current ratio", "Free cash flow (USD millions)", "Source",
  ];
  const tableRows = rows.map((row) => {
    const value = (key: string) => row.metricEvidence.find((item) => item.key === key);
    const citation = (metric: ReportMetricEvidence | undefined, kind: "amount" | "plain" = "plain") => {
      if (!metric) return "N/A";
      const unit = kind === "amount" ? " million USD" : "";
      return `${metric.formattedValue}${unit} [${metric.id}]`;
    };
    return [
      escapeCell(row.companyName),
      escapeCell(periodText(row)),
      citation(value("revenue"), "amount"),
      citation(value("revenueGrowth")),
      citation(value("grossMargin")),
      citation(value("operatingMargin")),
      citation(value("netIncome"), "amount"),
      citation(value("totalDebt"), "amount"),
      citation(value("currentRatio")),
      citation(value("freeCashFlow"), "amount"),
      `[${row.sourceId}] ${escapeCell(row.sourceDocument)}`,
    ];
  });
  const header = `| ${headings.join(" | ")} |`;
  const divider = `| ${headings.map(() => "---").join(" | ")} |`;
  const body = tableRows.map((cells) => `| ${cells.join(" | ")} |`).join("\n");
  return `Amounts are in millions of USD unless specified. Each non-N/A financial value cites a metric-specific source excerpt below. All accessible document periods are retained; differing periods are not treated as like-for-like.\n\n${header}\n${divider}\n${body || `| ${headings.map(() => "No data").join(" | ")} |`}`;
}

function buildRiskSection(rows: ReportSourceRow[]): string {
  const evidence = rows.flatMap((row) => row.riskEvidence.map((risk) => ({ ...risk, sourceId: row.sourceId, sourceDocument: row.sourceDocument, companyName: row.companyName })));
  if (evidence.length === 0) return "No stored risk flag contained a source passage that passed document-grounding validation.";
  return `The category and severity below are screening metadata, not conclusions. Only the source passage is presented as evidence.\n\n${evidence.map((risk) => `- [${risk.id}] [${risk.sourceId}] ${cleanText(risk.companyName)}: ${risk.riskType} screen, recorded severity ${risk.severity}; source ${cleanText(risk.sourceDocument)}. Source passage: “${risk.quote}”`).join("\n")}`;
}

function buildEvidenceSection(profiles: ReportProfileInput[], rows: ReportSourceRow[]): string {
  const sourceLines = profiles.map((profile, index) => {
    const row = rows[index];
    return `### [${row.sourceId}] ${escapeCell(row.companyName)} — ${escapeCell(periodText(row))}\nSource document: ${escapeCell(row.sourceDocument)}\nDocument reference: /dashboard/documents/${row.documentId}`;
  });
  const metricLines = rows.flatMap((row) => row.metricEvidence.map((evidence) =>
    `### [${evidence.id}] ${escapeCell(row.companyName)} — ${escapeCell(evidence.label)}\nSource [${row.sourceId}]: ${escapeCell(row.sourceDocument)}\nReported value: ${evidence.formattedValue}${["revenue", "netIncome", "freeCashFlow", "totalDebt"].includes(evidence.key) ? " million USD" : ""}\n> ${evidence.quote}`
  ));
  const riskLines = rows.flatMap((row) => row.riskEvidence.map((evidence) =>
    `### [${evidence.id}] ${escapeCell(row.companyName)} — ${escapeCell(evidence.riskType)} screen\nSource [${row.sourceId}]: ${escapeCell(row.sourceDocument)}\n> ${evidence.quote}`
  ));
  return [
    "### Source documents",
    ...sourceLines,
    "### Metric evidence",
    ...(metricLines.length ? metricLines : ["No metric-level source quote passed validation."]),
    "### Red-flag evidence",
    ...(riskLines.length ? riskLines : ["No grounded red-flag quote is included."]),
  ].join("\n\n");
}

export function buildEvidenceBackedReport(
  profiles: ReportProfileInput[],
  additionalContext?: string,
): BuiltEvidenceReport {
  const sortedProfiles = sortFiscalPeriods(profiles);
  const rows: ReportSourceRow[] = sortedProfiles.map((profile, index) => ({
    sourceId: `D${index + 1}`,
    documentId: profile.documentId,
    companyId: profile.companyId,
    companyName: profile.companyName,
    ticker: profile.ticker,
    fiscalYear: profile.fiscalYear,
    fiscalPeriod: profile.fiscalPeriod,
    sourceDocument: profile.sourceDocument,
    metricEvidence: validateMetricEvidence(profile, index + 1),
    riskEvidence: validateRiskEvidence(profile, index + 1),
  }));

  const executiveSummary = buildExecutiveSummary(sortedProfiles, rows);
  const keyFinancials = buildKeyFinancials(rows);
  const requestedScope = additionalContext?.trim()
    ? `\n\n# REQUESTED SCOPE\nUser-provided focus (not treated as source evidence): “${cleanText(additionalContext)}”`
    : "";
  const riskSection = buildRiskSection(rows);
  const evidenceSection = buildEvidenceSection(sortedProfiles, rows);
  const recommendations = [
    "Verify cited values and quoted passages in the linked original filings.",
    "Align fiscal periods and accounting definitions before comparing companies.",
    "Treat stored red-flag categories as screening signals, not investment advice.",
  ];
  const checklist = recommendations.map((item) => `- ${item}`).join("\n");
  const fullReportContent = `# EXECUTIVE SUMMARY\n${executiveSummary}\n\n# KEY FINANCIALS\n${keyFinancials}\n\n# DOCUMENT COVERAGE\n${rows.map((row) => `- [${row.sourceId}] ${cleanText(row.companyName)}: ${periodText(row)} — ${cleanText(row.sourceDocument)}`).join("\n") || "No source documents were available."}\n\n# RISK ANALYSIS\n${riskSection}\n\n# VERIFICATION CHECKLIST\n${checklist}${requestedScope}\n\n# SOURCES & EVIDENCE\n${evidenceSection}\n\n# DISCLAIMER\nThis report is a source-grounded summary of extracted filing data. It is not investment advice. N/A indicates that no matching metric-specific source quote passed validation.`;
  const companyIds = [...new Set(rows.map((row) => row.companyId))];
  const companyNames = new Map(rows.map((row) => [row.companyId, row.companyName]));
  const riskSummary = {
    byCompany: companyIds.map((companyId) => ({
      companyId,
      company: companyNames.get(companyId) || "Unknown company",
      groundedRiskFlags: rows.filter((row) => row.companyId === companyId).reduce((sum, row) => sum + row.riskEvidence.length, 0),
    })),
  };

  return {
    executiveSummary,
    fullReportContent,
    recommendations,
    metricsComparison: { evidenceVersion: 1, rows },
    keyFindings: {
      totalCompanies: companyIds.length,
      sourceDocuments: rows.length,
      verifiedMetricClaims: rows.reduce((sum, row) => sum + row.metricEvidence.length, 0),
      groundedRiskFlags: rows.reduce((sum, row) => sum + row.riskEvidence.length, 0),
    },
    riskSummary,
  };
}
