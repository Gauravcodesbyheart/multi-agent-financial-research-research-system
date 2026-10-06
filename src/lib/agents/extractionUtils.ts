export interface LocalExtractedMetrics {
  fiscal_year?: number;
  fiscal_period?: string;
  revenue?: number;
  revenue_growth?: number;
  gross_profit?: number;
  gross_margin?: number;
  operating_income?: number;
  operating_margin?: number;
  net_income?: number;
  net_margin?: number;
  ebitda?: number;
  ebitda_margin?: number;
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
  cash_and_equivalents?: number;
  total_debt?: number;
  current_ratio?: number;
  quick_ratio?: number;
  debt_to_equity?: number;
  roe?: number;
  roa?: number;
  eps?: number;
  pe_ratio?: number;
  operating_cash_flow?: number;
  capital_expenditures?: number;
  free_cash_flow?: number;
  metric_evidence?: Record<string, string>;
  raw_metrics?: Record<string, unknown>;
}

const LABELS: Record<Exclude<keyof LocalExtractedMetrics, "fiscal_year" | "fiscal_period" | "metric_evidence" | "raw_metrics">, RegExp> = {
  revenue: /^\s*(?:total\s+net\s+sales|total\s+sales|total\s+revenue|total\s+revenues|net\s+sales|revenue)\s*[:—-]/i,
  revenue_growth: /\b(?:revenues?|net sales)\b.*\b(?:growth|increase|decrease|decline|change)\b/i,
  gross_profit: /^\s*gross\s+profit\s*[:—-]/i,
  gross_margin: /\bgross\s+margin\b/i,
  operating_income: /^\s*operating\s+income\s*[:—-]/i,
  operating_margin: /\boperating\s+margin\b/i,
  net_income: /^\s*net\s+income\s*[:—-]/i,
  net_margin: /\bnet\s+margin\b/i,
  ebitda: /^\s*ebitda\s*[:—-]/i,
  ebitda_margin: /\bebitda\s+margin\b/i,
  total_assets: /^\s*total\s+assets\s*[:—-]/i,
  total_liabilities: /^\s*total\s+liabilities\s*[:—-]/i,
  total_equity: /^\s*total\s+(?:shareholders'?\s+)?equity\s*[:—-]/i,
  cash_and_equivalents: /^\s*cash\s+and\s+(?:cash\s+)?equivalents\s*[:—-]/i,
  total_debt: /^\s*(?:total\s+debt|long[- ]term\s+debt|short[- ]term\s+debt|borrowings)\s*[:—-]/i,
  current_ratio: /^\s*current\s+ratio\s*[:—-]/i,
  quick_ratio: /^\s*quick\s+ratio\s*[:—-]/i,
  debt_to_equity: /^\s*debt[- ]to[- ]equity(?:\s+ratio)?\s*[:—-]/i,
  roe: /^\s*(?:return\s+on\s+equity|roe)\s*[:—-]/i,
  roa: /^\s*(?:return\s+on\s+assets|roa)\s*[:—-]/i,
  eps: /^\s*(?:earnings\s+per\s+share(?:\s*\([^)]*\))?|eps(?:\s*\([^)]*\))?)\s*[:—-]/i,
  pe_ratio: /^\s*(?:price[- ]to[- ]earnings|p\s*[/.-]\s*e)\s*(?:ratio)?\s*[:—-]/i,
  operating_cash_flow: /^\s*operating\s+cash\s+flow\s*[:—-]/i,
  capital_expenditures: /^\s*capital\s+expenditures?\s*[:—-]/i,
  free_cash_flow: /^\s*free\s+cash\s+flow\s*[:—-]/i,
};

const RATIO_FIELDS = new Set([
  "revenue_growth", "gross_margin", "operating_margin", "net_margin", "ebitda_margin",
  "current_ratio", "quick_ratio", "debt_to_equity", "roe", "roa", "pe_ratio",
]);
const PERCENT_FIELDS = new Set([
  "revenue_growth", "gross_margin", "operating_margin", "net_margin", "ebitda_margin", "roe", "roa",
]);
const MONEY_FIELDS = new Set([
  "revenue", "gross_profit", "operating_income", "net_income", "ebitda", "total_assets",
  "total_liabilities", "total_equity", "cash_and_equivalents", "total_debt", "operating_cash_flow",
  "capital_expenditures", "free_cash_flow",
]);

type MetricKey = keyof typeof LABELS;

function matchingLine(lines: string[], pattern: RegExp): string | undefined {
  return lines.find((line) => pattern.test(line));
}

function extractNumber(line: string, field: string): number | undefined {
  const numericPattern = /\(?\s*-?\$?\s*\d[\d,]*(?:\.\d+)?\s*\)?/g;
  const matches = [...line.matchAll(numericPattern)];
  if (matches.length === 0) return undefined;

  let selected = matches[0];
  if (PERCENT_FIELDS.has(field)) {
    const percentMatch = matches.find((match) => /^\s*%/.test(line.slice((match.index || 0) + match[0].length)));
    if (percentMatch) selected = percentMatch;
  }

  const raw = selected[0].trim();
  const negativeByParentheses = raw.startsWith("(") && raw.endsWith(")");
  let value = Number(raw.replace(/[(),$\s]/g, ""));
  if (!Number.isFinite(value)) return undefined;
  if (negativeByParentheses) value = -Math.abs(value);

  const after = line.slice((selected.index || 0) + selected[0].length, (selected.index || 0) + selected[0].length + 24).toLowerCase();
  if (MONEY_FIELDS.has(field) && /\s*billion\b/.test(after)) value *= 1000;
  if (PERCENT_FIELDS.has(field) && /\s*%/.test(after)) value /= 100;
  if (RATIO_FIELDS.has(field) && !PERCENT_FIELDS.has(field) && /\s*%/.test(after)) value /= 100;
  if (field === "revenue_growth" && /\b(?:decrease|decreased|decline|declined|fell|down)\b/i.test(line)) value = -Math.abs(value);
  return value;
}

function findMetricLine(lines: string[], key: MetricKey): string | undefined {
  const pattern = LABELS[key];
  const candidates = lines.filter((line) => pattern.test(line));
  if (key === "revenue") {
    return candidates.find((line) => !/growth|per share|segment|product/i.test(line));
  }
  if (key === "revenue_growth") {
    return candidates.find((line) => /%|\byear[- ]over[- ]year\b|\byoy\b/i.test(line));
  }
  return candidates[0];
}

/** Deterministic, evidence-carrying fallback extractor used when the LLM is unavailable. */
export function extractMetricsLocally(content: string): LocalExtractedMetrics {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const result: LocalExtractedMetrics = { fiscal_period: "Annual", metric_evidence: {} };
  const year = content.match(/(?:fiscal\s+year|year\s+ended|annual\s+report)[^\d]{0,35}(20\d{2})/i);
  if (year) result.fiscal_year = Number(year[1]);

  for (const key of Object.keys(LABELS) as MetricKey[]) {
    const line = findMetricLine(lines, key);
    if (!line) continue;
    const value = extractNumber(line, key);
    if (value === undefined) continue;
    result[key] = value;
    result.metric_evidence![key] = line;
  }

  result.raw_metrics = { extraction_method: "local-evidence-parser" };
  return result;
}

function normalizedText(text: string): string {
  return text.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

export function evidenceSupportsMetricValue(field: string, value: number, evidence: string): boolean {
  const tokens = [...evidence.matchAll(/\(?\s*-?\$?\s*\d[\d,]*(?:\.\d+)?\s*\)?/g)];
  const tolerance = Math.max(0.02, Math.abs(value) * 0.005);
  return tokens.some((match) => {
    const raw = Number(match[0].replace(/[(),$\s]/g, ""));
    if (!Number.isFinite(raw)) return false;
    const suffix = evidence.slice((match.index || 0) + match[0].length, (match.index || 0) + match[0].length + 16).toLowerCase();
    let normalized = raw;
    if (PERCENT_FIELDS.has(field) && /\s*%/.test(suffix)) normalized /= 100;
    if (MONEY_FIELDS.has(field) && /\s*(?:billion|bn|b)\b/.test(suffix)) normalized *= 1000;
    const expected = PERCENT_FIELDS.has(field) && value > 1 && value <= 100 ? value / 100 : value;
    return Math.abs(normalized - expected) <= Math.max(tolerance, Math.abs(expected) * 0.005);
  });
}

/** Drops model-provided metric values that do not cite an exact quote with a matching number. */
export function validateExtractedMetrics<T extends Record<string, unknown>>(
  candidate: T,
  documentText: string,
): T & { metric_evidence: Record<string, string> } {
  const evidenceInput = candidate.metric_evidence && typeof candidate.metric_evidence === "object"
    ? candidate.metric_evidence as Record<string, unknown>
    : {};
  const evidence: Record<string, string> = {};
  const validated = { ...candidate } as Record<string, unknown>;

  for (const field of Object.keys(LABELS)) {
    const rawValue = candidate[field];
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      validated[field] = null;
      continue;
    }
    const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
    const quote = typeof evidenceInput[field] === "string" ? evidenceInput[field] as string : "";
    const quoteExists = quote.length >= 12 && normalizedText(documentText).includes(normalizedText(quote));
    const quoteLabelsMetric = LABELS[field as MetricKey]?.test(quote) ?? false;
    if (!Number.isFinite(value) || !quoteExists || !quoteLabelsMetric || !evidenceSupportsMetricValue(field, value, quote)) {
      validated[field] = null;
      continue;
    }
    validated[field] = PERCENT_FIELDS.has(field) && value > 1 && value <= 100 ? value / 100 : value;
    evidence[field] = quote.trim();
  }

  const fiscalYear = candidate.fiscal_year;
  if (fiscalYear !== null && fiscalYear !== undefined && !new RegExp(`\\b${Number(fiscalYear)}\\b`).test(documentText)) {
    validated.fiscal_year = undefined;
  }
  validated.metric_evidence = evidence;
  return validated as T & { metric_evidence: Record<string, string> };
}

export function mergeWithLocalMetrics<T extends Record<string, unknown>>(
  validated: T,
  local: LocalExtractedMetrics,
): T & { metric_evidence: Record<string, string> } {
  const result = { ...validated } as Record<string, unknown>;
  const evidence = { ...((validated.metric_evidence as Record<string, string> | undefined) || {}) };
  for (const field of Object.keys(LABELS)) {
    if (result[field] !== null && result[field] !== undefined) continue;
    const value = (local as Record<string, unknown>)[field];
    const quote = local.metric_evidence?.[field];
    if (typeof value === "number" && quote) {
      result[field] = value;
      evidence[field] = quote;
    }
  }
  if (!result.fiscal_year && local.fiscal_year) result.fiscal_year = local.fiscal_year;
  if (!result.fiscal_period) result.fiscal_period = local.fiscal_period || "Annual";
  result.metric_evidence = evidence;
  return result as T & { metric_evidence: Record<string, string> };
}
