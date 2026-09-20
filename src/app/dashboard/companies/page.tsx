"use client";
import { useEffect, useState } from "react";
import { Building2, TrendingUp, TrendingDown, AlertTriangle, FileText, Loader2, BarChart2 } from "lucide-react";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import Link from "next/link";

interface CompanyData {
  id: string;
  name: string;
  ticker: string | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  isSeeded: boolean;
  riskCount: number;
  documentCount: number;
  metrics: {
    revenue: string | null;
    revenueGrowth: string | null;
    grossMargin: string | null;
    operatingMargin: string | null;
    netMargin: string | null;
    currentRatio: string | null;
    roe: string | null;
    eps: string | null;
    debtToEquity: string | null;
  } | null;
}

const SECTOR_COLORS: Record<string, string> = {
  Technology: "bg-blue-100 text-blue-700",
  Automotive: "bg-emerald-100 text-emerald-700",
  Healthcare: "bg-rose-100 text-rose-700",
  Finance: "bg-amber-100 text-amber-700",
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
        <p className="text-slate-500 text-sm mt-1">Pre-loaded company profiles with 2023 financial data</p>
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Companies Yet</h3>
          <p className="text-slate-400 text-sm">Load demo data from the dashboard to see pre-loaded companies</p>
          <Link href="/dashboard" className="text-blue-600 text-sm hover:underline mt-2 block">← Go to Dashboard</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {companies.map((co) => {
            const growth = co.metrics?.revenueGrowth ? parseFloat(co.metrics.revenueGrowth) : null;
            const isPositiveGrowth = growth !== null && growth > 0;

            return (
              <div key={co.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all hover:border-blue-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {co.ticker?.slice(0, 2) || co.name.slice(0, 2)}
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900">{co.name}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        {co.ticker && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{co.ticker}</span>}
                        {co.sector && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SECTOR_COLORS[co.sector] || "bg-gray-100 text-gray-600"}`}>
                            {co.sector}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{co.documentCount}</span>
                    <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-orange-400" />{co.riskCount}</span>
                  </div>
                </div>

                {co.description && (
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{co.description}</p>
                )}

                {/* Key Metrics */}
                {co.metrics ? (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Revenue", value: formatCurrency(parseFloat(co.metrics.revenue || "0") * 1e6, true) },
                      { label: "Net Margin", value: formatPercent(co.metrics.netMargin) },
                      { label: "Gross Margin", value: formatPercent(co.metrics.grossMargin) },
                      { label: "EPS", value: co.metrics.eps ? `$${parseFloat(co.metrics.eps).toFixed(2)}` : "N/A" },
                      { label: "ROE", value: formatPercent(co.metrics.roe) },
                      { label: "D/E Ratio", value: formatNumber(co.metrics.debtToEquity) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-50 rounded-lg p-2.5">
                        <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                        <div className="text-sm font-bold text-slate-900">{value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-400 text-sm mb-4">No metrics extracted yet</div>
                )}

                {/* Revenue Growth */}
                {growth !== null && (
                  <div className={`flex items-center gap-2 text-sm font-medium ${isPositiveGrowth ? "text-emerald-600" : "text-red-500"}`}>
                    {isPositiveGrowth ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    Revenue Growth: {isPositiveGrowth ? "+" : ""}{(growth * 100).toFixed(1)}% YoY
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <Link href={`/dashboard/metrics?companyId=${co.id}`} className="flex-1 text-center text-xs py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium">
                    <BarChart2 className="w-3.5 h-3.5 inline mr-1" />Metrics
                  </Link>
                  <Link href={`/dashboard/risks?companyId=${co.id}`} className="flex-1 text-center text-xs py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />Risks
                  </Link>
                  <Link href={`/dashboard/benchmark?companyId=${co.id}`} className="flex-1 text-center text-xs py-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors font-medium">
                    <TrendingUp className="w-3.5 h-3.5 inline mr-1" />Compare
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
