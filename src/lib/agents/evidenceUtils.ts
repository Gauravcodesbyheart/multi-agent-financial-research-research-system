import { hasGroundedEvidence } from "./analysisUtils";
import { evidenceLabelsMetric, normalizeMetricValueFromEvidence } from "./extractionUtils";

/** Validates and normalizes a stored value only when its metric-specific quote exists in the original source. */
export function sourceBackedMetricValue(
  field: string,
  rawValue: unknown,
  quote: unknown,
  documentText: string,
): number | undefined {
  if ((typeof rawValue !== "number" && typeof rawValue !== "string") || typeof quote !== "string") return undefined;
  if (typeof rawValue === "string" && !rawValue.trim()) return undefined;
  const value = Number(rawValue);
  if (!Number.isFinite(value) || !hasGroundedEvidence(documentText, quote) || !evidenceLabelsMetric(field, quote)) return undefined;
  return normalizeMetricValueFromEvidence(field, value, quote);
}
