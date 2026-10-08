export type Severity = "critical" | "high" | "medium" | "low";

export interface RiskFinding {
  risk_type: string;
  severity: Severity;
  title: string;
  description: string;
  source_text: string;
  page_reference?: string;
  recommendation?: string;
}

import { evidenceSupportsMetricValue } from "./extractionUtils";

export type NumericValue = string | number | null | undefined;
export type FinancialMetricKey =
  | "revenue"
  | "totalDebt"
  | "grossMargin"
  | "operatingMargin"
  | "netMargin"
  | "totalAssets"
  | "totalLiabilities"
  | "totalEquity"
  | "currentRatio"
  | "debtToEquity"
  | "netIncome";

export interface FinancialSnapshot {
  fiscalYear?: number | null;
  fiscalPeriod?: string | null;
  fileName?: string | null;
  revenue?: NumericValue;
  totalDebt?: NumericValue;
  grossMargin?: NumericValue;
  operatingMargin?: NumericValue;
  netMargin?: NumericValue;
  totalAssets?: NumericValue;
  totalLiabilities?: NumericValue;
  totalEquity?: NumericValue;
  currentRatio?: NumericValue;
  debtToEquity?: NumericValue;
  netIncome?: NumericValue;
  metricEvidence?: Partial<Record<FinancialMetricKey, string>>;
}

const METRIC_LABELS: Record<FinancialMetricKey, RegExp> = {
  revenue: /\b(?:total\s+revenue|total\s+revenues|total\s+net\s+sales|net\s+sales|revenue)\b/i,
  totalDebt: /\b(?:total\s+debt|long[- ]term\s+debt|short[- ]term\s+debt|borrowings)\b/i,
  grossMargin: /\bgross\s+margin\b/i,
  operatingMargin: /\boperating\s+margin\b/i,
  netMargin: /\bnet\s+margin\b/i,
  totalAssets: /\btotal\s+assets\b/i,
  totalLiabilities: /\btotal\s+liabilities\b/i,
  totalEquity: /\btotal\s+(?:shareholders'?\s+)?equity\b/i,
  currentRatio: /\bcurrent\s+ratio\b/i,
  debtToEquity: /\bdebt[- ]to[- ]equity(?:\s+ratio)?\b/i,
  netIncome: /\bnet\s+income\b/i,
};

const EXTRACTION_METRIC_KEYS: Record<FinancialMetricKey, string> = {
  revenue: "revenue",
  totalDebt: "total_debt",
  grossMargin: "gross_margin",
  operatingMargin: "operating_margin",
  netMargin: "net_margin",
  totalAssets: "total_assets",
  totalLiabilities: "total_liabilities",
  totalEquity: "total_equity",
  currentRatio: "current_ratio",
  debtToEquity: "debt_to_equity",
  netIncome: "net_income",
};

export function toFiniteNumber(value: NumericValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value.replace(/,/g, "").replace(/\$/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEvidence(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}%$.-]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** True only when a supplied quote can be found in the source after whitespace/OCR normalization. */
export function hasGroundedEvidence(documentText: string, evidence: string): boolean {
  if (evidence.trim().length < 12) return false;
  const normalizedEvidence = normalizeEvidence(evidence);
  return normalizedEvidence.length >= 12 && normalizeEvidence(documentText).includes(normalizedEvidence);
}

function excerptAroundMatch(content: string, match: RegExp): string | undefined {
  const found = match.exec(content);
  if (!found || found.index === undefined) return undefined;
  const lineStart = content.lastIndexOf("\n", found.index) + 1;
  const lineEndIndex = content.indexOf("\n", found.index + found[0].length);
  const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex;
  const line = content.slice(lineStart, lineEnd).trim();
  if (line.length <= 700) return line || undefined;
  const localStart = Math.max(0, found.index - lineStart - 250);
  return line.slice(localStart, localStart + 500).trim();
}

export function findMetricEvidenceLine(
  content: string,
  metric: keyof typeof METRIC_LABELS
): string | undefined {
  const labelPattern = METRIC_LABELS[metric];
  const lines = content.split(/\r?\n/);
  return lines.find((line) => labelPattern.test(line))?.trim() || undefined;
}

export function detectTextualRedFlags(content: string): RiskFinding[] {
  const checks: Array<{
    pattern: RegExp;
    riskType: string;
    severity: Severity;
    title: string;
    description: string;
    recommendation: string;
  }> = [
    {
      pattern: /\b(?:qualified\s+(?:audit\s+)?opinion|adverse\s+opinion|disclaimer\s+of\s+opinion|except\s+for\s+the\s+effects?\s+of)\b/i,
      riskType: "Auditor Qualification",
      severity: "critical",
      title: "Auditor opinion qualification disclosed",
      description: "The document contains explicit qualified, adverse, disclaimer, or except-for audit opinion language. The stated limitation should be reviewed with the auditor's report.",
      recommendation: "Review the auditor's opinion, basis for qualification, affected balances, and remediation plan with a qualified professional.",
    },
    {
      pattern: /\b(?:substantial\s+doubt\s+about.{0,100}going[- ]concern|going[- ]concern)\b/i,
      riskType: "Going Concern",
      severity: "critical",
      title: "Going-concern disclosure present",
      description: "The source document contains going-concern language. This is a material disclosure to assess in its full context; mention alone does not determine the company's current viability.",
      recommendation: "Review the exact disclosure, liquidity forecasts, management plans, and auditor conclusion.",
    },
    {
      pattern: /\b(?:material\s+weakness(?:es)?\s+in\s+(?:internal\s+)?control|restatement\s+of\s+(?:the\s+)?financial\s+statements|non[- ]reliance\s+on\s+(?:previously\s+issued\s+)?financial\s+statements|accounting\s+irregularit(?:y|ies)|fraudulent\s+financial\s+reporting)\b/i,
      riskType: "Accounting Control Risk",
      severity: "high",
      title: "Accounting or internal-control issue disclosed",
      description: "The source text contains explicit accounting-control, restatement, non-reliance, or financial-reporting concern language.",
      recommendation: "Review the related filing, auditor discussion, restatement scope, and control remediation disclosures.",
    },
    {
      pattern: /\b(?:debt\s+covenant\s+breach|breach\s+of\s+(?:a\s+)?(?:debt\s+)?covenant|default(?:ed)?\s+on\s+(?:its\s+)?(?:debt|loan|borrowings)|liquidity\s+shortfall|unable\s+to\s+meet\s+(?:its\s+)?obligations)\b/i,
      riskType: "Liquidity Risk",
      severity: "high",
      title: "Explicit liquidity, covenant, or default warning",
      description: "The document contains explicit language about a covenant breach, debt default, liquidity shortfall, or inability to meet obligations.",
      recommendation: "Review maturity schedules, covenant headroom, available facilities, and management's remediation plan.",
    },
  ];

  return checks.flatMap((check) => {
    const source = excerptAroundMatch(content, check.pattern);
    if (!source) return [];
    return [{
      risk_type: check.riskType,
      severity: check.severity,
      title: check.title,
      description: check.description,
      source_text: source,
      recommendation: check.recommendation,
    }];
  });
}

const MODEL_RISK_CONTEXT_PATTERNS = [
  /\b(?:going[- ]concern|substantial doubt)\b/i,
  /\b(?:material weaknesses?|significant deficiencies|restatements?|non[- ]reliance|accounting irregularit(?:y|ies))\b/i,
  /\b(?:litigation|lawsuits?|class actions?|investigations?|subpoenas?|enforcement actions?|regulatory actions?)\b/i,
  /\b(?:debt covenants?|covenant breaches?|defaults?|liquidity shortfalls?|credit facilities|refinancings?)\b/i,
  /\b(?:impairments?|goodwill|asset write[- ]downs?|restructurings?|reorganizations?)\b/i,
  /\b(?:cybersecurity|cyber attacks?|data breaches?|security incidents?|privacy incidents?)\b/i,
  /\b(?:customer concentration|supplier concentration|single[- ]source|supply chain|key suppliers?)\b/i,
  /\b(?:revenue recognition|fraud|internal controls?|control deficiencies)\b/i,
  /\b(?:contingencies|environmental remediation|product recalls?|settlements?|penalties|fines)\b/i,
];

/**
 * Pick a small set of exact, risk-bearing passages for the supplementary model scan.
 * Deterministic checks still inspect the full document; sending a whole 10-K here can
 * exceed Groq's per-minute token budget after the extraction call has just run.
 */
export function buildRiskEvidenceExcerpt(content: string, maxChars = 6000): string {
  if (content.length <= maxChars) return content;
  if (maxChars <= 0) return "";

  const windows: Array<{ start: number; end: number }> = [];
  for (const pattern of MODEL_RISK_CONTEXT_PATTERNS) {
    const match = pattern.exec(content);
    if (match?.index === undefined) continue;
    const start = Math.max(0, match.index - 260);
    const end = Math.min(content.length, match.index + 440);
    // Nearby risk terms often refer to the same paragraph; don't spend tokens twice.
    if (windows.some((window) => start < window.end && end > window.start)) continue;
    windows.push({ start, end });
  }

  if (windows.length === 0) {
    const marker = "\n[Middle omitted]\n";
    if (maxChars <= marker.length) return content.slice(0, maxChars);
    const available = maxChars - marker.length;
    const left = Math.floor(available / 2);
    const right = available - left;
    return `${content.slice(0, left)}${marker}${content.slice(-right)}`;
  }

  windows.sort((a, b) => a.start - b.start);
  const separator = "\n[…other text omitted…]\n";
  const excerpts: string[] = [];
  let used = 0;
  for (const window of windows) {
    const gap = excerpts.length ? separator : "";
    const remaining = maxChars - used - gap.length;
    if (remaining <= 0) break;
    const excerpt = content.slice(window.start, Math.min(window.end, window.start + remaining)).trim();
    if (!excerpt) continue;
    excerpts.push(`${gap}${excerpt}`);
    used += gap.length + excerpt.length;
  }
  return excerpts.join("");
}

function metricEvidence(snapshot: FinancialSnapshot, metric: FinancialMetricKey, content: string): string | undefined {
  const value = toFiniteNumber(snapshot[metric]);
  if (value === null) return undefined;

  const candidates = [snapshot.metricEvidence?.[metric], findMetricEvidenceLine(content, metric)]
    .filter((candidate): candidate is string => Boolean(candidate));
  return candidates.find((candidate) =>
    METRIC_LABELS[metric].test(candidate) &&
    hasGroundedEvidence(content, candidate) &&
    evidenceSupportsMetricValue(EXTRACTION_METRIC_KEYS[metric], value, candidate)
  );
}

function formatPeriod(snapshot: FinancialSnapshot): string {
  return `${snapshot.fiscalPeriod || "FY"}${snapshot.fiscalYear ?? "unknown"}${snapshot.fileName ? `, ${snapshot.fileName}` : ""}`;
}

function createTrendFinding(
  metric: keyof typeof METRIC_LABELS,
  previous: FinancialSnapshot,
  current: FinancialSnapshot,
  previousContent: string,
  currentContent: string,
): RiskFinding | undefined {
  const before = toFiniteNumber(previous[metric]);
  const after = toFiniteNumber(current[metric]);
  if (before === null || after === null) return undefined;

  const oldEvidence = metricEvidence(previous, metric, previousContent);
  const newEvidence = metricEvidence(current, metric, currentContent);
  // Don't emit a comparison unless both source documents contain supporting evidence.
  if (!oldEvidence || !newEvidence) return undefined;

  const sourceText = `Prior period (${formatPeriod(previous)}): ${oldEvidence}\nCurrent period (${formatPeriod(current)}): ${newEvidence}`;

  if (metric === "totalDebt" && before > 0) {
    const percentIncrease = (after - before) / before;
    if (percentIncrease >= 0.15 && after - before >= 1) {
      return {
        risk_type: "Debt Risk",
        severity: percentIncrease >= 0.5 ? "high" : "medium",
        title: `Total debt increased ${Math.round(percentIncrease * 100)}% year over year`,
        description: `Extracted total debt increased from ${before.toLocaleString()} to ${after.toLocaleString()} million between the cited periods. This is a trend signal, not by itself a conclusion about solvency.`,
        source_text: sourceText,
        recommendation: "Review the debt maturity profile, interest coverage, refinancing requirements, and use of proceeds.",
      };
    }
  }

  if (["grossMargin", "operatingMargin", "netMargin"].includes(metric) && before - after >= 0.03) {
    const label = metric === "grossMargin" ? "gross" : metric === "operatingMargin" ? "operating" : "net";
    const pointChange = (before - after) * 100;
    return {
      risk_type: "Margin Risk",
      severity: pointChange >= 10 ? "high" : "medium",
      title: `${label[0].toUpperCase()}${label.slice(1)} margin fell ${pointChange.toFixed(1)} percentage points`,
      description: `The extracted ${label} margin declined from ${(before * 100).toFixed(1)}% to ${(after * 100).toFixed(1)}% between the cited periods. Review the source disclosures for the causes and any one-off items.`,
      source_text: sourceText,
      recommendation: "Review price, cost, mix, restructuring, and one-time factors in the source filings.",
    };
  }

  if (metric === "revenue" && before > 0 && (before - after) / before >= 0.15) {
    const decline = (before - after) / before;
    return {
      risk_type: "Revenue Risk",
      severity: decline >= 0.3 ? "high" : "medium",
      title: `Revenue declined ${Math.round(decline * 100)}% year over year`,
      description: `Extracted revenue declined from ${before.toLocaleString()} to ${after.toLocaleString()} million between the cited periods.`,
      source_text: sourceText,
      recommendation: "Review segment, geographic, pricing, and volume disclosures to understand the decline.",
    };
  }

  return undefined;
}

export function detectFinancialTrendRisks(
  previous: FinancialSnapshot | null,
  current: FinancialSnapshot,
  previousContent: string,
  currentContent: string,
): RiskFinding[] {
  if (!previous) return [];
  if (previous.fiscalYear && current.fiscalYear && previous.fiscalYear >= current.fiscalYear) return [];
  if ((previous.fiscalPeriod || null) !== (current.fiscalPeriod || null)) return [];

  return (["totalDebt", "grossMargin", "operatingMargin", "netMargin", "revenue"] as const)
    .map((metric) => createTrendFinding(metric, previous, current, previousContent, currentContent))
    .filter((finding): finding is RiskFinding => Boolean(finding));
}

export function detectMetricAnomalies(snapshot: FinancialSnapshot, content: string): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const assets = toFiniteNumber(snapshot.totalAssets);
  const liabilities = toFiniteNumber(snapshot.totalLiabilities);
  const equity = toFiniteNumber(snapshot.totalEquity);
  const debtToEquity = toFiniteNumber(snapshot.debtToEquity);
  const currentRatio = toFiniteNumber(snapshot.currentRatio);

  if (equity !== null && equity < 0) {
    const evidence = metricEvidence(snapshot, "totalEquity", content);
    if (evidence) findings.push({
      risk_type: "Balance Sheet Risk",
      severity: "high",
      title: "Negative shareholders' equity reported",
      description: "The extracted balance-sheet data indicates negative shareholders' equity. Verify the reported value and assess the company's capital structure and obligations.",
      source_text: evidence,
      recommendation: "Review the balance sheet, accumulated losses, leverage, and any going-concern disclosures.",
    });
  }

  if (assets !== null && assets > 0 && liabilities !== null && equity !== null) {
    const mismatch = Math.abs(assets - liabilities - equity) / assets;
    const evidenceLines = [
      metricEvidence(snapshot, "totalAssets", content),
      metricEvidence(snapshot, "totalLiabilities", content),
      metricEvidence(snapshot, "totalEquity", content),
    ];
    const evidence = evidenceLines.join("\n");
    if (mismatch > 0.1 && evidenceLines.every(Boolean)) findings.push({
      risk_type: "Financial Anomaly",
      severity: "medium",
      title: "Balance-sheet totals do not reconcile",
      description: `Extracted total assets differ from total liabilities plus equity by ${(mismatch * 100).toFixed(1)}%. This may reflect incomplete extraction, differing definitions, or a reporting anomaly and must be checked against the filing.`,
      source_text: evidence,
      recommendation: "Verify all three values and their units against the same balance-sheet date in the original filing.",
    });
  }

  if (debtToEquity !== null && debtToEquity > 5) {
    const evidence = metricEvidence(snapshot, "debtToEquity", content);
    if (evidence) findings.push({
      risk_type: "Debt Risk",
      severity: "high",
      title: "Unusually high debt-to-equity ratio",
      description: `The extracted debt-to-equity ratio is ${debtToEquity}. This threshold is a screening signal and should be interpreted in the company's industry and capital structure context.`,
      source_text: evidence,
      recommendation: "Confirm the ratio definition and review debt maturity, interest coverage, and peer context.",
    });
  }

  if (currentRatio !== null && currentRatio > 20) {
    const evidence = metricEvidence(snapshot, "currentRatio", content);
    if (evidence) findings.push({
      risk_type: "Financial Anomaly",
      severity: "low",
      title: "Current ratio is an outlier; verify units and extraction",
      description: `The extracted current ratio is ${currentRatio}, which is unusually high for a screening threshold and may be a data or unit issue.`,
      source_text: evidence,
      recommendation: "Verify current assets and current liabilities in the source filing before interpreting this value.",
    });
  }

  return findings;
}

/** Keep only model findings whose claimed quotation is present in the supplied source document. */
export function validateModelRiskItems(rawItems: unknown, documentText: string): RiskFinding[] {
  if (!Array.isArray(rawItems)) return [];
  const allowedSeverities = new Set<Severity>(["critical", "high", "medium", "low"]);
  const allowedTypes = new Set([
    "Liquidity Risk", "Debt Risk", "Revenue Risk", "Margin Risk", "Regulatory Risk",
    "Management Risk", "Market Risk", "Going Concern", "Concentration Risk",
    "Operational Risk", "Accounting Control Risk", "Auditor Qualification",
    "Financial Anomaly", "Balance Sheet Risk",
  ]);

  return rawItems.flatMap((entry): RiskFinding[] => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const source = typeof item.source_text === "string" ? item.source_text.trim() : "";
    const severity = typeof item.severity === "string" ? item.severity.toLowerCase() as Severity : "medium";
    const title = typeof item.title === "string" ? item.title.trim().slice(0, 200) : "";
    const description = typeof item.description === "string" ? item.description.trim().slice(0, 3000) : "";
    if (!title || !description || !allowedSeverities.has(severity) || !hasGroundedEvidence(documentText, source)) return [];
    const quoteNumbers = new Set(numericTokens(source));
    if ([...numericTokens(title), ...numericTokens(description)].some((number) => !quoteNumbers.has(number))) return [];
    const rawType = typeof item.risk_type === "string" ? item.risk_type.trim() : "";
    return [{
      risk_type: allowedTypes.has(rawType) ? rawType : "Market Risk",
      severity,
      title,
      description,
      source_text: source.slice(0, 1000),
      recommendation: typeof item.recommendation === "string" ? item.recommendation.trim().slice(0, 2000) : undefined,
    }];
  });
}

export function dedupeRiskFindings(items: RiskFinding[]): RiskFinding[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.risk_type.toLowerCase()}|${item.title.toLowerCase()}|${normalizeEvidence(item.source_text)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) return -1;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (!Number.isFinite(a) || !Number.isFinite(b)) return -1;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm === 0 || rightNorm === 0) return -1;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function keywordRelevance(query: string, text: string): number {
  const terms = [...new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])];
  if (terms.length === 0) return 0;
  const normalizedText = text.toLocaleLowerCase();
  const matched = terms.reduce((count, term) => count + (normalizedText.includes(term) ? 1 : 0), 0);
  return matched / terms.length;
}

/** Split explicit multi-part questions into separate retrieval steps without splitting normal phrases. */
export function decomposeResearchQuestion(question: string, maxSteps = 4): string[] {
  const normalized = question.trim();
  if (!normalized) return [];

  const explicitParts = normalized
    .split(/\n+|\s*;\s*|(?=\n?\s*(?:\d+[.)]|[-*])\s+)/g)
    .map((part) => part.replace(/^\s*(?:\d+[.)]|[-*])\s*/, "").trim())
    .filter(Boolean);
  if (explicitParts.length > 1) return [...new Set(explicitParts)].slice(0, maxSteps);

  const questionParts = normalized
    .split(/(?<=[?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (questionParts.length > 1) return questionParts.slice(0, maxSteps);

  const compound = normalized.split(/\s+and\s+(?=(?:also\s+)?(?:what|how|why|which|identify|compare|calculate|explain|list|show|summarize)\b)/i);
  if (compound.length > 1) return compound.map((part) => part.trim()).filter(Boolean).slice(0, maxSteps);
  return [normalized];
}

export interface CitationEvidence {
  citationId: string;
  excerpt: string;
}

export interface GroundedResearchAnswer {
  answer: string;
  usedCitationIds: string[];
}

function normalizeCurrency(value: string): string {
  const normalized = value.trim().toLocaleLowerCase().replace(/\s+/g, "");
  if (normalized === "$") return "DOLLAR-SYMBOL";
  if (["us$", "usd"].includes(normalized)) return "USD";
  if (["dollar", "dollars"].includes(normalized)) return "DOLLAR-WORD";
  if (["€", "eur", "euro", "euros"].includes(normalized)) return "EUR";
  if (["£", "gbp", "pound", "pounds"].includes(normalized)) return "GBP";
  if (["₹", "inr", "rupee", "rupees"].includes(normalized)) return "INR";
  if (["cad"].includes(normalized)) return "CAD";
  if (["aud"].includes(normalized)) return "AUD";
  if (["jpy", "yen"].includes(normalized)) return "JPY";
  return normalized.toUpperCase();
}

function numericTokens(text: string): string[] {
  return [...text.matchAll(/(?<![\p{L}\w])\(?-?\$?\d[\d,]*(?:\.\d+)?%?\)?/gu)]
    .map((match) => {
      const raw = match[0];
      const negative = raw.startsWith("(") && raw.endsWith(")");
      const value = raw.replace(/[()$,%\s,]/g, "").toLocaleLowerCase();
      const start = match.index || 0;
      const before = text.slice(Math.max(0, start - 16), start);
      const after = text.slice(start + raw.length);
      const prefixCurrency = before.match(/(?:US\$|[$€£₹]|\b(?:USD|EUR|GBP|INR|CAD|AUD|JPY)\s*)$/i)?.[0];
      const unitMatch = after.match(/^\s*(%|percent(?:age)?(?:\s+points?)?|basis\s+points?|bps|trillion|billion|million|thousand|tn|bn|mm|mn|[kmb](?![\p{L}])|USD\b|EUR\b|GBP\b|INR\b|CAD\b|AUD\b|JPY\b|dollars?\b|euros?\b|pounds?\b|rupees?\b|yen\b|shares?\b|times?\b|x(?![\p{L}])|per\s+share\b|years?\b|months?\b|days?\b|quarters?\b|weeks?\b)/iu);
      const rawUnit = raw.endsWith("%") ? "%" : unitMatch?.[1]?.toLocaleLowerCase() || "";
      const normalizedUnit = /^(?:%|percent(?:age)?)$/i.test(rawUnit)
        ? "percent"
        : /percentage\s+points?/i.test(rawUnit)
          ? "percentage-points"
          : /^(?:basis\s+points?|bps)$/i.test(rawUnit)
            ? "basis-points"
            : /^(?:trillion|tn|t)$/i.test(rawUnit)
              ? "trillion"
              : /^(?:billion|bn|b)$/i.test(rawUnit)
                ? "billion"
                : /^(?:million|mm|mn|m)$/i.test(rawUnit)
                  ? "million"
                  : /^(?:thousand|k)$/i.test(rawUnit)
                    ? "thousand"
                    : /^shares?$/i.test(rawUnit)
                      ? "shares"
                      : /^(?:times?|x)$/i.test(rawUnit)
                        ? "multiple"
                        : /per\s+share/i.test(rawUnit)
                          ? "per-share"
                          : /^(?:years?|months?|days?|quarters?|weeks?)$/i.test(rawUnit)
                            ? rawUnit.replace(/s$/, "")
                            : /^(?:USD|EUR|GBP|INR|CAD|AUD|JPY|dollars?|euros?|pounds?|rupees?|yen)$/i.test(rawUnit)
                              ? "currency"
                              : "";
      const trailingCurrency = unitMatch
        ? after.slice(unitMatch[0].length).match(/^\s*(USD|EUR|GBP|INR|CAD|AUD|JPY|dollars?|euros?|pounds?|rupees?|yen)\b/i)?.[1]
        : undefined;
      const currency = [...new Set([
        raw.includes("$") ? "DOLLAR-SYMBOL" : undefined,
        prefixCurrency ? normalizeCurrency(prefixCurrency) : undefined,
        trailingCurrency ? normalizeCurrency(trailingCurrency) : undefined,
        normalizedUnit === "currency" ? normalizeCurrency(rawUnit) : undefined,
      ].filter((item): item is string => Boolean(item)))].sort().join("+");
      const sign = negative ? "-" : "";
      return `${sign}${value}|${currency}|${normalizedUnit}`;
    });
}

/**
 * Validate structured Research Agent output. Every displayed claim must cite at least
 * one retrieved source ID and include an exact supporting quote from that citation.
 * Numeric tokens must also occur in the quoted source text; unsupported claims are dropped.
 */
export function validateGroundedResearchAnswer(
  raw: unknown,
  availableEvidence: CitationEvidence[],
): GroundedResearchAnswer | null {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as Record<string, unknown>).steps)) return null;
  const evidenceById = new Map(availableEvidence.map((item) => [item.citationId, item.excerpt]));
  const usedIds = new Set<string>();
  const answerLines: string[] = [];
  const steps = (raw as { steps: unknown[] }).steps;

  for (const rawStep of steps) {
    if (!rawStep || typeof rawStep !== "object") continue;
    const step = rawStep as Record<string, unknown>;
    const question = typeof step.question === "string" ? step.question.trim().replace(/\s+/g, " ") : "";
    const isUnsupported = step.not_supported === true || step.unsupported === true;
    if (isUnsupported) {
      if (question) answerLines.push(`**${question}**\nThe retrieved source passages do not support an answer to this part.`);
      continue;
    }

    const claims = Array.isArray(step.claims) ? step.claims : [];
    const accepted: string[] = [];
    for (const rawClaim of claims) {
      if (!rawClaim || typeof rawClaim !== "object") continue;
      const claim = rawClaim as Record<string, unknown>;
      const text = typeof claim.text === "string" ? claim.text.trim().replace(/\s+/g, " ") : "";
      const ids = Array.isArray(claim.citation_ids)
        ? [...new Set(claim.citation_ids.filter((id): id is string => typeof id === "string"))]
        : [];
      const quotes = claim.supporting_quotes && typeof claim.supporting_quotes === "object"
        ? claim.supporting_quotes as Record<string, unknown>
        : {};
      if (!text || ids.length === 0) continue;

      const groundedIds = ids.filter((id) => {
        const sourceExcerpt = evidenceById.get(id);
        const quote = quotes[id];
        return Boolean(sourceExcerpt && typeof quote === "string" && hasGroundedEvidence(sourceExcerpt, quote));
      });
      if (groundedIds.length === 0) continue;

      const groundedQuotes = groundedIds.map((id) => String(quotes[id])).join(" ");
      const quoteNumbers = new Set(numericTokens(groundedQuotes));
      if (numericTokens(text).some((number) => !quoteNumbers.has(number))) continue;

      groundedIds.forEach((id) => usedIds.add(id));
      accepted.push(`${text} ${groundedIds.map((id) => `[${id}]`).join(" ")}`);
    }

    if (question) answerLines.push(`**${question}**`);
    if (accepted.length > 0) answerLines.push(...accepted);
    else if (question) answerLines.push("No retrieved source passage could be verified for this part.");
  }

  if (usedIds.size === 0 && answerLines.length === 0) return null;
  return { answer: answerLines.join("\n\n"), usedCitationIds: [...usedIds] };
}

export function hasValidCitationMarkers(answer: string, allowedCitationIds: Set<string>): boolean {
  const markers = [...answer.matchAll(/\[(S\d+)\]/g)].map((match) => match[1]);
  return markers.length > 0 && markers.every((marker) => allowedCitationIds.has(marker));
}
