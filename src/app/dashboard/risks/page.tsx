"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Shield, Filter, Loader2 } from "lucide-react";
import { getSeverityColor } from "@/lib/utils";

interface RiskItem {
  risk: {
    id: string;
    riskType: string;
    severity: string;
    title: string;
    description: string;
    sourceText: string | null;
    recommendation: string | null;
    createdAt: string;
  };
  company: { name: string; ticker: string | null } | null;
}

const SEVERITY_ORDER = ["critical", "high", "medium", "low"];
const SEVERITY_ICONS: Record<string, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢" };

export default function RisksPage() {
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetch("/api/risks")
      .then((r) => r.json())
      .then((d) => setRisks(d.risks || []))
      .finally(() => setLoading(false));
  }, []);

  const riskTypes = [...new Set(risks.map((r) => r.risk.riskType))];

  const filtered = risks
    .filter((r) => filterSeverity === "all" || r.risk.severity === filterSeverity)
    .filter((r) => filterType === "all" || r.risk.riskType === filterType)
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.risk.severity) - SEVERITY_ORDER.indexOf(b.risk.severity));

  const severityCounts = SEVERITY_ORDER.reduce((acc, s) => {
    acc[s] = risks.filter((r) => r.risk.severity === s).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Risk Analysis</h1>
        <p className="text-slate-500 text-sm mt-1">Risk flags and red flags identified by the Risk Agent across all documents</p>
      </div>

      {/* Severity Summary */}
      <div className="grid grid-cols-4 gap-4">
        {SEVERITY_ORDER.map((sev) => (
          <button
            key={sev}
            onClick={() => setFilterSeverity(filterSeverity === sev ? "all" : sev)}
            className={`bg-white rounded-xl border p-4 text-left hover:shadow-md transition-all ${filterSeverity === sev ? "border-blue-400 shadow-md" : "border-slate-200"}`}
          >
            <div className="text-2xl mb-1">{SEVERITY_ICONS[sev]}</div>
            <div className="text-2xl font-bold text-slate-900">{severityCounts[sev] || 0}</div>
            <div className="text-sm text-slate-500 capitalize">{sev} Risk{severityCounts[sev] !== 1 ? "s" : ""}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">Filter:</span>
        </div>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Severities</option>
          {SEVERITY_ORDER.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Risk Types</option>
          {riskTypes.map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className="text-xs text-slate-400">{filtered.length} risks shown</span>
      </div>

      {/* Risk Cards */}
      {risks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Shield className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Risk Flags Identified</h3>
          <p className="text-slate-400 text-sm">Load demo data to see risk analysis results</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div key={item.risk.id} className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all ${getSeverityColor(item.risk.severity)}`}>
              <div className="flex items-start gap-4">
                <div className="text-2xl shrink-0">{SEVERITY_ICONS[item.risk.severity]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${getSeverityColor(item.risk.severity)}`}>
                      {item.risk.severity}
                    </span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.risk.riskType}</span>
                    {item.company && (
                      <span className="text-xs text-slate-500">
                        {item.company.name} {item.company.ticker && `(${item.company.ticker})`}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-slate-900 mb-2">{item.risk.title}</h3>
                  <p className="text-sm text-slate-600 mb-3 leading-relaxed">{item.risk.description}</p>

                  {item.risk.sourceText && (
                    <div className="bg-slate-50 border-l-3 border-slate-300 pl-3 py-2 mb-3 rounded-r-lg">
                      <p className="text-xs text-slate-500 italic">&quot;{item.risk.sourceText}&quot;</p>
                    </div>
                  )}

                  {item.risk.recommendation && (
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-semibold text-blue-700">Analyst Recommendation: </span>
                        <span className="text-xs text-blue-600">{item.risk.recommendation}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
