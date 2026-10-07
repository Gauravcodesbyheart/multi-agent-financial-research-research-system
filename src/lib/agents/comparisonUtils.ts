export function fiscalPeriodRank(period: string | null | undefined): number {
  const normalized = (period || "").trim().toLowerCase();
  if (/^(?:annual|full year|fy(?:\s*20\d{2})?)$/.test(normalized)) return 5;
  const quarter = normalized.match(/(?:q|quarter\s*)([1-4])/);
  if (quarter) return Number(quarter[1]);
  const month = normalized.match(/(?:^|\D)(1[0-2]|[1-9])(?:\D|$)/);
  if (month) return Number(month[1]) / 12;
  return 0;
}

function timestamp(value: Date | string | undefined): number {
  if (value instanceof Date) return value.getTime();
  return value ? Date.parse(value) || 0 : 0;
}

/** Sort newest fiscal year and period first; extraction time only breaks ties. */
export function sortFiscalPeriods<T extends { fiscalYear: number | null; fiscalPeriod: string | null; extractedAt?: Date | string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const yearDifference = (b.fiscalYear ?? -1) - (a.fiscalYear ?? -1);
    if (yearDifference) return yearDifference;
    const periodDifference = fiscalPeriodRank(b.fiscalPeriod) - fiscalPeriodRank(a.fiscalPeriod);
    if (periodDifference) return periodDifference;
    return timestamp(b.extractedAt) - timestamp(a.extractedAt);
  });
}
