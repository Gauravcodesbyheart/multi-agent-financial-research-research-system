"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, BarChart2, AlertTriangle, Loader2, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatCurrency, formatPercent, formatNumber, formatDate, getSeverityColor } from "@/lib/utils";

interface DocDetail {
  embeddingCount: number;
  activity: Array<{
    agentName: string;
    action: string;
    status: string;
    details: string | null;
    createdAt: string;
    duration: number | null;
  }>;
  document: {
    id: string;
    fileName: string;
    documentType: string;
    processingStatus: string;
    embeddingStatus: string;
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
    pageReference: string | null;
    recommendation: string | null;
  }>;
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "metrics" | "risks" | "content">("overview");
  const [embeddingBusy, setEmbeddingBusy] = useState(false);

  const reloadDocument = useCallback(async (showLoading = true) => {
    if (!id) {
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (res.ok) setData(await res.json());
      else setData(null);
    } catch (error) {
      console.error("Failed to reload document:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reloadDocument(), 0);
    return () => window.clearTimeout(timer);
  }, [reloadDocument]);

  useEffect(() => {
    const processing = data?.document.processingStatus;
    const embeddingStatus = data?.document.embeddingStatus;
    if (!processing || ["completed", "partial", "failed"].includes(processing)) {
      if (embeddingStatus !== "processing") return;
    }
    const timer = window.setInterval(() => void reloadDocument(false), 5000);
    return () => window.clearInterval(timer);
  }, [data?.document.embeddingStatus, data?.document.processingStatus, reloadDocument]);

  async function buildEmbeddings() {
    if (!id || embeddingBusy) return;
    setEmbeddingBusy(true);
    try {
      const res = await fetch(`/api/documents/${id}/embeddings`, { method: "POST" });
      if (res.ok) {
        toast.success("Semantic embedding generation started");
        window.setTimeout(() => void reloadDocument(), 4000);
      } else {
        const body = await res.json();
        toast.error(body.error || "Could not start embedding generation");
      }
    } finally {
      setEmbeddingBusy(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  if (!data) return <div className="p-6 text-slate-500">Document not found</div>;

  const { document: doc, metrics, risks } = data;
  const latestActivity = new Map<string, DocDetail["activity"][number]>();
  for (const log of data.activity) {
    if (!latestActivity.has(log.agentName)) latestActivity.set(log.agentName, log);
  }
  const agentSummaries = ["Document Agent", "Extraction Agent", "Red Flag Agent", "Embedding Agent", "Pipeline Orchestrator"].map((agent) => {
    const log = latestActivity.get(agent);
    const isProcessing = ["processing", "indexed"].includes(doc.processingStatus);
    return {
      agent,
      status: log?.status || (isProcessing ? "pending" : "not started"),
      detail: log?.details || "Waiting for this pipeline stage.",
    };
  });

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
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${doc.embeddingStatus === "completed" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : doc.embeddingStatus === "failed" ? "text-red-700 bg-red-50 border-red-200" : "text-slate-600 bg-slate-50 border-slate-200"}`}>
            Embeddings: {doc.embeddingStatus} ({data.embeddingCount}/{doc.chunkCount || 0})
          </span>
          <button
            onClick={buildEmbeddings}
            disabled={embeddingBusy || doc.embeddingStatus === "processing" || !doc.chunkCount}
            className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
            title="Build semantic embeddings for indexed document chunks"
          >
            {embeddingBusy || doc.embeddingStatus === "processing" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {doc.embeddingStatus === "completed" ? "Rebuild embeddings" : "Build embeddings"}
          </button>
          <span className={`text-xs px-3 py-1 rounded-full font-medium border ${doc.processingStatus === "completed" || doc.processingStatus === "indexed" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : doc.processingStatus === "failed" ? "text-red-600 bg-red-50 border-red-200" : "text-yellow-600 bg-yellow-50 border-yellow-200"}`}>
            {doc.processingStatus}
          </span>
        </div>
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
              {agentSummaries.map(({ agent, status, detail }) => (
                <div key={agent} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status === "completed" ? "bg-emerald-500" : status === "partial" || status === "skipped" ? "bg-amber-500" : status === "failed" ? "bg-red-500" : status === "running" ? "bg-blue-500 animate-pulse" : "bg-slate-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-700">{agent}</div>
                      <div className="text-xs text-slate-500 capitalize">{status}</div>
                    </div>
                    <div className="text-xs text-slate-400 break-words">{detail}</div>
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
              <p className="text-slate-400 text-sm">No evidence-backed financial metrics were extracted. Verify the document contains selectable text and explicitly reports the values; Gemini enrichment is optional.</p>
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
                      <div className="border-l-2 border-current pl-3 text-xs opacity-70 mb-2">
                        <div className="font-semibold">Source evidence{risk.pageReference ? ` · ${risk.pageReference}` : ""}</div>
                        <p className="whitespace-pre-wrap">{risk.sourceText}</p>
                      </div>
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
