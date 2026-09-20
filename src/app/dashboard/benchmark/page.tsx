"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Loader2, Brain, CheckSquare, Square } from "lucide-react";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import toast from "react-hot-toast";

interface Company {
  id: string;
  name: string;
  ticker: string | null;
  sector: string | null;
}

interface BenchmarkResult {
  metrics: Array<{
    id: string;
    companyId: string;
    revenue: string | null;
    grossMargin: string | null;
    operatingMargin: string | null;
    netMargin: string | null;
    currentRatio: string | null;
    debtToEquity: string | null;
    roe: string | null;
    freeCashFlow: string | null;
    ebitdaMargin: string | null;
  }>;
  companies: Company[];
  insights: string;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

export default function BenchmarkPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => {
        const cos = d.companies || [];
        setCompanies(cos);
        // Auto-select first 2
        if (cos.length >= 2) setSelected(cos.slice(0, 4).map((c: Company) => c.id));
      })
      .finally(() => setInitialLoading(false));
  }, []);

  async function runBenchmark() {
    if (selected.length < 2) {
      toast.error("Select at least 2 companies");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: selected }),
      });
      if (res.ok) {
        setResult(await res.json());
      } else {
        toast.error("Benchmark failed");
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleCompany(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const chartData = result
    ? result.companies.map((co, i) => {
        const m = result.metrics.find((m) => m.companyId === co.id);
        return {
          name: co.ticker || co.name,
          Revenue: parseFloat(m?.revenue || "0"),
          "Gross Margin %": parseFloat(m?.grossMargin || "0") * 100,
          "Op Margin %": parseFloat(m?.operatingMargin || "0") * 100,
          "Net Margin %": parseFloat(m?.netMargin || "0") * 100,
          "Free CF": parseFloat(m?.freeCashFlow || "0"),
          color: COLORS[i % COLORS.length],
        };
      })
    : [];

  if (initialLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company Benchmarking</h1>
        <p className="text-slate-500 text-sm mt-1">Compare financial metrics across multiple companies side-by-side</p>
      </div>

      {/* Company Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Select Companies to Compare</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {companies.map((co, i) => {
            const isSelected = selected.includes(co.id);
            return (
              <button
                key={co.id}
                onClick={() => toggleCompany(co.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-200"}`}
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{co.ticker || co.name}</div>
                  <div className="text-xs text-slate-400 truncate">{co.name}</div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={runBenchmark}
          disabled={loading || selected.length < 2}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-violet-700 transition-all disabled:opacity-60 shadow-lg shadow-blue-500/25"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          {loading ? "Running benchmark..." : `Compare ${selected.length} Companies`}
        </button>
      </div>

      {result && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Revenue (Millions USD)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: unknown) => `$${Number(v).toLocaleString()}M`} />
                  <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Profitability Margins (%)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: unknown) => `${Number(v).toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="Gross Margin %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Op Margin %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Net Margin %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Comparison Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Side-by-Side Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 text-xs">Metric</th>
                    {result.companies.map((co, i) => (
                      <th key={co.id} className="text-center px-4 py-3 font-semibold text-xs" style={{ color: COLORS[i] }}>
                        {co.ticker || co.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { label: "Revenue", key: "revenue", fmt: (v: string | null) => formatCurrency(parseFloat(v || "0") * 1e6, true) },
                    { label: "Gross Margin", key: "grossMargin", fmt: (v: string | null) => formatPercent(v) },
                    { label: "Operating Margin", key: "operatingMargin", fmt: (v: string | null) => formatPercent(v) },
                    { label: "Net Margin", key: "netMargin", fmt: (v: string | null) => formatPercent(v) },
                    { label: "EBITDA Margin", key: "ebitdaMargin", fmt: (v: string | null) => formatPercent(v) },
                    { label: "Current Ratio", key: "currentRatio", fmt: (v: string | null) => formatNumber(v) },
                    { label: "D/E Ratio", key: "debtToEquity", fmt: (v: string | null) => formatNumber(v) },
                    { label: "ROE", key: "roe", fmt: (v: string | null) => formatPercent(v) },
                    { label: "Free Cash Flow", key: "freeCashFlow", fmt: (v: string | null) => formatCurrency(parseFloat(v || "0") * 1e6, true) },
                  ].map(({ label, key, fmt }) => (
                    <tr key={key} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-700 text-xs">{label}</td>
                      {result.companies.map((co) => {
                        const m = result.metrics.find((m) => m.companyId === co.id);
                        const val = m ? (m as Record<string, string | null>)[key] : null;
                        return (
                          <td key={co.id} className="text-center px-4 py-3 text-xs font-semibold text-slate-900">
                            {fmt(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Insights */}
          {result.insights && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold">Benchmark Agent Insights</h2>
              </div>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">
                  {result.insights}
                </pre>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
