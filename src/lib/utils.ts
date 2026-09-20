import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined, compact = false): string {
  if (value === null || value === undefined || value === "") return "N/A";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "N/A";

  if (compact) {
    if (Math.abs(num) >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (Math.abs(num) >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "N/A";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "N/A";
  return `${(num * 100).toFixed(2)}%`;
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "N/A";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "N/A";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical": return "text-red-600 bg-red-50 border-red-200";
    case "high": return "text-orange-600 bg-orange-50 border-orange-200";
    case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "low": return "text-green-600 bg-green-50 border-green-200";
    default: return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "completed": return "text-green-600 bg-green-50";
    case "processing": case "generating": return "text-blue-600 bg-blue-50";
    case "pending": return "text-yellow-600 bg-yellow-50";
    case "failed": return "text-red-600 bg-red-50";
    case "active": return "text-emerald-600 bg-emerald-50";
    default: return "text-gray-600 bg-gray-50";
  }
}
