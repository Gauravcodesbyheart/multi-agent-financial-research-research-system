"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";
import { BarChart2, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";

interface MetricItem {
  metrics: {
    id: string;
    revenue: string | null;
    revenueGrowth: string | null;
    grossMargin: string | null;
    operatingMargin: string | null;
    netMargin: string | null;
    currentRatio: string | null;
    debtToEquity: string | null;
    roe: string | null;
    roa: string | null;
    eps: string | null;
    ebitda: string | null;
    ebitdaMargin: string | null;
    operatingCashFlow: string | null;
    freeCashFlow: string | null;
    fiscalYear: number | null;
    totalAssets: string | null;
    cashAndEquivalents: string | null;
    totalDebt: string | null;
  };
  company: { name: string; ticker: string | null } | null;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<"revenue" | "margins" | "ratios" | "cashflow">("revenue");

  useEffect(() => {
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((d) => setMetrics(d.metrics || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  const chartNameCounts = new Map<string, number>();
  const chartData = metrics.map((item, i) => {
    const baseName = item.company?.ticker || item.company?.name || "N/A";
    const occurrence = chartNameCounts.get(baseName) || 0;
    chartNameCounts.set(baseName, occurrence + 1);

    return {
      name: occurrence === 0 ? baseName : `${baseName} (${occurrence + 1})`,
      revenue: parseFloat(item.metrics.revenue || "0"),
      netIncome: 0, // Would need netIncome field
      ebitda: parseFloat(item.metrics.ebitda || "0"),
      grossMargin: parseFloat(item.metrics.grossMargin || "0") * 100,
      operatingMargin: parseFloat(item.metrics.operatingMargin || "0") * 100,
      netMargin: parseFloat(item.metrics.netMargin || "0") * 100,
      currentRatio: parseFloat(item.metrics.currentRatio || "0"),
      debtToEquity: parseFloat(item.metrics.debtToEquity || "0"),
      roe: parseFloat(item.metrics.roe || "0") * 100,
      operatingCF: parseFloat(item.metrics.operatingCashFlow || "0"),
      freeCF: parseFloat(item.metrics.freeCashFlow || "0"),
      color: COLORS[i % COLORS.length],
    };
  });

  const radarData = [
    { metric: "Gross Margin", ...Object.fromEntries(chartData.map((d) => [d.name, Math.min(d.grossMargin, 100)])) },
    { metric: "Op Margin", ...Object.fromEntries(chartData.map((d) => [d.name, Math.min(d.operatingMargin, 100)])) },
    { metric: "Net Margin", ...Object.fromEntries(chartData.map((d) => [d.name, Math.min(d.netMargin, 100)])) },
    { metric: "ROE", ...Object.fromEntries(chartData.map((d) => [d.name, Math.min(Math.abs(d.roe), 100)])) },
    { metric: "Current Ratio", ...Object.fromEntries(chartData.map((d) => [d.name, Math.min(d.currentRatio * 20, 100)])) },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financial Metrics</h1>
        <p className="text-slate-500 text-sm mt-1">Comparative financial metrics extracted by the Extraction Agent</p>
      </div>

      {metrics.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <BarChart2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Metrics Available</h3>
          <p className="text-slate-400 text-sm">Load demo data from the dashboard to see financial metrics</p>
        </div>
      ) : (
        <>
          {/* Chart Toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {(["revenue", "margins", "ratios", "cashflow"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveChart(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeChart === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {tab === "cashflow" ? "Cash Flow" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-4">
                {activeChart === "revenue" && "Revenue & EBITDA (Millions USD)"}
                {activeChart === "margins" && "Profitability Margins (%)"}
                {activeChart === "ratios" && "Key Financial Ratios"}
                {activeChart === "cashflow" && "Cash Flow Analysis (Millions USD)"}
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => {
                      const num = parseFloat(String(value ?? 0));
                      return activeChart === "margins" ? `${num.toFixed(1)}%` : `${num.toLocaleString()}M`;
                    }}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Legend />
                  {activeChart === "revenue" && (
                    <>
                      <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ebitda" name="EBITDA" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                  {activeChart === "margins" && (
                    <>
                      <Bar dataKey="grossMargin" name="Gross Margin %" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="operatingMargin" name="Op Margin %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="netMargin" name="Net Margin %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                  {activeChart === "ratios" && (
                    <>
                      <Bar dataKey="currentRatio" name="Current Ratio" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="debtToEquity" name="D/E Ratio" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="roe" name="ROE %" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                  {activeChart === "cashflow" && (
                    <>
                      <Bar dataKey="operatingCF" name="Operating CF" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="freeCF" name="Free Cash Flow" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Performance Radar</h2>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  {chartData.map((d, i) => (
                    <Radar key={metrics[i].metrics.id} name={d.name} dataKey={d.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.1} />
                  ))}
                  <Legend />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metrics Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Detailed Metrics Table</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-slate-600 text-xs">Company</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">Revenue</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">Rev Growth</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">Gross Margin</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">Op Margin</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">Net Margin</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">Current Ratio</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">D/E</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">ROE</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs">EPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {metrics.map((item) => {
                    const growth = parseFloat(item.metrics.revenueGrowth || "0");
                    return (
                      <tr key={item.metrics.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-900">{item.company?.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{item.company?.ticker}</div>
                        </td>
                        <td className="text-right px-4 py-3 font-medium text-slate-700">
                          {formatCurrency(parseFloat(item.metrics.revenue || "0") * 1e6, true)}
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className={`flex items-center justify-end gap-1 text-xs font-semibold ${growth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {growth >= 0 ? "+" : ""}{(growth * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right px-4 py-3 text-slate-700">{formatPercent(item.metrics.grossMargin)}</td>
                        <td className="text-right px-4 py-3 text-slate-700">{formatPercent(item.metrics.operatingMargin)}</td>
                        <td className="text-right px-4 py-3 text-slate-700">{formatPercent(item.metrics.netMargin)}</td>
                        <td className="text-right px-4 py-3 text-slate-700">{formatNumber(item.metrics.currentRatio)}</td>
                        <td className="text-right px-4 py-3 text-slate-700">{formatNumber(item.metrics.debtToEquity)}</td>
                        <td className="text-right px-4 py-3 text-slate-700">{formatPercent(item.metrics.roe)}</td>
                        <td className="text-right px-4 py-3 font-medium text-slate-700">
                          {item.metrics.eps ? `$${parseFloat(item.metrics.eps).toFixed(2)}` : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
