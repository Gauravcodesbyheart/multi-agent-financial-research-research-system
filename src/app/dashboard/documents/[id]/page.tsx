"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, BarChart2, AlertTriangle, Loader2, Building2 } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatPercent, formatNumber, formatDate, getSeverityColor } from "@/lib/utils";

interface DocDetail {
  document: {
    id: string;
    fileName: string;
    documentType: string;
    processingStatus: string;
    chunkCount: number | null;
    fiscalYear: number | null;
    content: string | null;
    summary: string | null;
    createdAt: string;
  };
  metrics: Array<{
    id: string;
    revenue: string | null;
    netIncome: string | null;
    grossMargin: string | null;
    operatingMargin: string | null;
    netMargin: string | null;
    currentRatio: string | null;
    debtToEquity: string | null;
    roe: string | null;
    eps: string | null;
    ebitda: string | null;
  }>;
  risks: Array<{
    id: string;
    riskType: string;
    severity: string;
    title: string;
    description: string;
    sourceText: string | null;
    recommendation: string | null;
  }>;
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "metrics" | "risks" | "content">("overview");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/documents/${id}`);
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  if (!data) return <div className="p-6 text-slate-500">Document not found</div>;

  const { document: doc, metrics, risks } = data;

  const TABS = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "metrics", label: `Metrics (${metrics.length})`, icon: BarChart2 },
    { id: "risks", label: `Risks (${risks.length})`, icon: AlertTriangle },
    { id: "content", label: "Raw Content", icon: FileText },
  ] as const;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/documents" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{doc.fileName}</h1>
          <p className="text-sm text-slate-500">{doc.documentType} · FY{doc.fiscalYear} · {doc.chunkCount} chunks indexed</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ml-auto ${doc.processingStatus === "completed" || doc.processingStatus === "indexed" ? "text-emerald-600 bg-emerald-50 border border-emerald-200" : "text-yellow-600 bg-yellow-50 border border-yellow-200"}`}>
          {doc.processingStatus}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tabId ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Document Information</h2>
            <dl className="space-y-3">
              {[
                { label: "File Name", value: doc.fileName },
                { label: "Document Type", value: doc.documentType },
                { label: "Fiscal Year", value: doc.fiscalYear || "N/A" },
                { label: "Processing Status", value: doc.processingStatus },
                { label: "Chunks Indexed", value: doc.chunkCount || 0 },
                { label: "Upload Date", value: formatDate(doc.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <dt className="text-sm text-slate-500">{label}</dt>
                  <dd className="text-sm font-medium text-slate-900">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Agent Processing Summary</h2>
            <div className="space-y-3">
              {[
                { agent: "Document Agent", status: doc.chunkCount ? "completed" : "pending", detail: `${doc.chunkCount || 0} chunks created` },
                { agent: "Extraction Agent", status: metrics.length > 0 ? "completed" : "pending", detail: `${metrics.length} metric set(s)` },
                { agent: "Risk Agent", status: risks.length > 0 ? "completed" : "pending", detail: `${risks.length} risk(s) identified` },
              ].map(({ agent, status, detail }) => (
                <div key={agent} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status === "completed" ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">{agent}</div>
                    <div className="text-xs text-slate-400">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "metrics" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Extracted Financial Metrics</h2>
          {metrics.length === 0 ? (
            <div className="text-center py-12">
              <BarChart2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No financial metrics were extracted. Check that the PDF contains selectable text and that Gemini AI is available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map((m) => (
                <div key={m.id}>
                  {[
                    { label: "Revenue", value: formatCurrency(parseFloat(m.revenue || "0") * 1e6, true) },
                    { label: "Net Income", value: formatCurrency(parseFloat(m.netIncome || "0") * 1e6, true) },
                    { label: "EBITDA", value: formatCurrency(parseFloat(m.ebitda || "0") * 1e6, true) },
                    { label: "Gross Margin", value: formatPercent(m.grossMargin) },
                    { label: "Operating Margin", value: formatPercent(m.operatingMargin) },
                    { label: "Net Margin", value: formatPercent(m.netMargin) },
                    { label: "Current Ratio", value: formatNumber(m.currentRatio) },
                    { label: "Debt/Equity", value: formatNumber(m.debtToEquity) },
                    { label: "ROE", value: formatPercent(m.roe) },
                    { label: "EPS", value: m.eps ? `$${parseFloat(m.eps).toFixed(2)}` : "N/A" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-3 mb-3">
                      <div className="text-xs text-slate-500 mb-1">{label}</div>
                      <div className="text-sm font-bold text-slate-900">{value}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "risks" && (
        <div className="space-y-4">
          {risks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No risks identified yet.</p>
            </div>
          ) : (
            risks.map((risk) => (
              <div key={risk.id} className={`bg-white rounded-xl border p-5 ${getSeverityColor(risk.severity)}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${getSeverityColor(risk.severity)}`}>
                        {risk.severity}
                      </span>
                      <span className="text-xs text-slate-500">{risk.riskType}</span>
                    </div>
                    <h3 className="font-semibold text-sm mb-2">{risk.title}</h3>
                    <p className="text-sm opacity-80 mb-3">{risk.description}</p>
                    {risk.sourceText && (
                      <blockquote className="border-l-2 border-current pl-3 text-xs italic opacity-70 mb-2">
                        &quot;{risk.sourceText}&quot;
                      </blockquote>
                    )}
                    {risk.recommendation && (
                      <div className="bg-white/50 rounded-lg p-3 text-xs">
                        <strong>Recommendation:</strong> {risk.recommendation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "content" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Raw Document Content</h2>
          <div className="bg-slate-50 rounded-xl p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">
              {doc.content ? doc.content.slice(0, 5000) + (doc.content.length > 5000 ? "\n\n[... truncated for display ...]" : "") : "No content available"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
