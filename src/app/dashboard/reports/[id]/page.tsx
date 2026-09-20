"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Download, Loader2, Brain, Building2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { formatDate, getStatusColor } from "@/lib/utils";

interface Report {
  id: string;
  title: string;
  status: string;
  companies: string[] | null;
  executiveSummary: string | null;
  fullReportContent: string | null;
  recommendations: string[] | null;
  keyFindings: Record<string, unknown> | null;
  riskSummary: Record<string, unknown> | null;
  createdAt: string;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .trim();
}

export default function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [id]);

  async function loadReport() {
    if (!id) return;
    setLoading(true);
    const res = await fetch(`/api/reports/${id}`);
    if (res.ok) setReport((await res.json()).report);
    setLoading(false);
  }

  function downloadReport() {
    if (!report) return;
    const content = report.fullReportContent || report.executiveSummary || "No content available";
    const blob = new Blob([`${report.title}\n\n${content}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  if (!report) return <div className="p-6 text-slate-500">Report not found</div>;

  const isGenerating = report.status === "generating";

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/reports" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{report.title}</h1>
          <p className="text-sm text-slate-500">{formatDate(report.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${getStatusColor(report.status)}`}>
            {report.status}
          </span>
          {isGenerating && (
            <button onClick={loadReport} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {!isGenerating && (
            <button onClick={downloadReport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" /> Download
            </button>
          )}
        </div>
      </div>

      {/* Companies */}
      {report.companies && report.companies.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="w-4 h-4 text-slate-400" />
          {report.companies.map((c) => (
            <span key={c} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium border border-blue-200">{c}</span>
          ))}
        </div>
      )}

      {isGenerating ? (
        <div className="bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-2xl p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-blue-600 animate-pulse" />
            <div className="text-xl font-bold text-slate-800">Report Agent is Working...</div>
          </div>
          <p className="text-slate-600 mb-4">The AI agents are analyzing documents and compiling your report. This may take 1-2 minutes.</p>
          <div className="flex justify-center">
            <div className="flex gap-1">
              {["Analyzing data", "Extracting insights", "Comparing metrics", "Writing report"].map((step, i) => (
                <div key={step} className="flex items-center gap-1 bg-white rounded-full px-3 py-1.5 text-xs text-slate-600 border border-slate-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  {step}
                </div>
              ))}
            </div>
          </div>
          <button onClick={loadReport} className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 mx-auto">
            <RefreshCw className="w-4 h-4" /> Check Status
          </button>
        </div>
      ) : (
        <>
          {/* Executive Summary */}
          {report.executiveSummary && (
            <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5" />
                <h2 className="font-bold">Executive Summary</h2>
              </div>
              <p className="text-blue-100 leading-relaxed text-sm">{report.executiveSummary}</p>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Analyst Recommendations</h2>
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="w-6 h-6 bg-emerald-600 text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-emerald-800">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Report */}
          {report.fullReportContent && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-slate-900">Full Analysis Report</h2>
              </div>
              <div className="report-content prose-sm max-w-none">
                <div
                  className="text-slate-700 leading-relaxed whitespace-pre-wrap"
                  style={{ fontFamily: "inherit" }}
                >
                  {report.fullReportContent.split('\n').map((line, i) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={i} className="text-2xl font-bold text-slate-900 mt-6 mb-3">{line.slice(2)}</h1>;
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={i} className="text-xl font-semibold text-slate-800 mt-5 mb-2 border-b border-slate-200 pb-1">{line.slice(3)}</h2>;
                    }
                    if (line.startsWith('### ')) {
                      return <h3 key={i} className="text-base font-semibold text-slate-700 mt-4 mb-1">{line.slice(4)}</h3>;
                    }
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return <li key={i} className="ml-4 text-sm text-slate-600">{line.slice(2)}</li>;
                    }
                    if (line.trim() === '') {
                      return <div key={i} className="h-3" />;
                    }
                    return <p key={i} className="text-sm text-slate-600 leading-relaxed">{line}</p>;
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
