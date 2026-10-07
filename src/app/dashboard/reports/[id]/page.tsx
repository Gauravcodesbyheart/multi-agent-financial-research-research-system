"use client";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Download, Loader2, Brain, Building2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { formatDate, getStatusColor } from "@/lib/utils";

interface ReportEvidenceRow {
  sourceId?: string;
  documentId?: string;
  companyId?: string;
  companyName?: string;
  fiscalYear?: number | null;
  fiscalPeriod?: string | null;
  sourceDocument?: string;
  metricEvidence?: Array<{ id: string; key: string; label: string; formattedValue: string; quote: string }>;
  riskEvidence?: Array<{ id: string; riskType: string; severity: string; quote: string }>;
}

interface Report {
  id: string;
  title: string;
  status: string;
  companies: string[] | null;
  executiveSummary: string | null;
  fullReportContent: string | null;
  recommendations: string[] | null;
  metricsComparison: { evidenceVersion?: number; rows: ReportEvidenceRow[] } | null;
  unvalidated?: boolean;
  keyFindings: Record<string, unknown> | null;
  riskSummary: Record<string, unknown> | null;
  createdAt: string;
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function renderReportContent(text: string): ReactNode[] {
  const lines = text.split(/\r?\n/);
  const rendered: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[index + 1] || "")) {
      const headers = splitTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      rendered.push(
        <div key={`table-${index}`} className="my-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>{headers.map((cell, column) => <th key={column} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold">{cell}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="odd:bg-white even:bg-slate-50/60">
                  {headers.map((_, column) => <td key={column} className="border-b border-slate-100 px-3 py-2 align-top text-slate-600">{row[column] || "N/A"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.startsWith("# ")) rendered.push(<h1 key={index} className="mt-6 mb-3 text-2xl font-bold text-slate-900">{line.slice(2)}</h1>);
    else if (line.startsWith("## ")) rendered.push(<h2 key={index} className="mt-5 mb-2 border-b border-slate-200 pb-1 text-xl font-semibold text-slate-800">{line.slice(3)}</h2>);
    else if (line.startsWith("### ")) rendered.push(<h3 key={index} className="mt-4 mb-1 text-base font-semibold text-slate-700">{line.slice(4)}</h3>);
    else if (/^\s*(?:[-*]|\d+[.)])\s+/.test(line)) {
      const list: string[] = [];
      while (index < lines.length && /^\s*(?:[-*]|\d+[.)])\s+/.test(lines[index])) {
        list.push(lines[index].replace(/^\s*(?:[-*]|\d+[.)])\s+/, ""));
        index += 1;
      }
      rendered.push(<ul key={`list-${index}`} className="my-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{list.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>);
      continue;
    } else if (line.trim()) rendered.push(<p key={index} className="my-2 text-sm leading-relaxed text-slate-600">{line}</p>);
    index += 1;
  }
  return rendered;
}

export default function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${id}`);
      if (res.ok) setReport((await res.json()).report);
    } catch (error) {
      console.error("Failed to load report:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReport(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReport]);

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
  const sourceRows = report.metricsComparison?.rows?.filter((row) => Boolean(row.documentId)) || [];

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
          {!isGenerating && !report.unvalidated && (
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

      {report.unvalidated && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <strong>Legacy report hidden.</strong> This report predates quote-level validation, so its model-written claims are not displayed or downloadable. Generate a new report to get verified financial evidence and source links.
        </div>
      )}

      {isGenerating ? (
        <div className="bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-2xl p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-blue-600 animate-pulse" />
            <div className="text-xl font-bold text-slate-800">Report Agent is Working...</div>
          </div>
          <p className="text-slate-600 mb-4">The report is retaining all accessible filing periods and validating each displayed metric against its source quote.</p>
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

          {/* Source documents and evidence for report citations */}
          {sourceRows.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-1">Source Evidence</h2>
              <p className="text-xs text-slate-500 mb-3">Citation IDs in the report map to these filing links and verbatim source passages.</p>
              <div className="space-y-2">
                {sourceRows.map((row) => {
                  if (!row.documentId) return null;
                  const metricEvidence = row.metricEvidence || [];
                  const riskEvidence = row.riskEvidence || [];
                  return (
                    <details key={row.documentId} className="rounded-lg border border-slate-200 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-slate-800">
                        [{row.sourceId || "D?"}] {row.companyName || "Company"} — {row.fiscalPeriod || "Period not specified"} {row.fiscalYear ?? ""} · {metricEvidence.length} verified metric quote(s), {riskEvidence.length} grounded risk quote(s)
                      </summary>
                      <div className="mt-2">
                        <Link href={`/dashboard/documents/${row.documentId}`} className="text-xs font-medium text-blue-600 hover:underline">Open {row.sourceDocument || "source document"}</Link>
                      </div>
                      {metricEvidence.length > 0 && (
                        <ul className="mt-3 space-y-3">
                          {metricEvidence.map((evidence) => (
                            <li key={evidence.id} className="text-xs text-slate-600">
                              <div className="font-semibold text-slate-800">[{evidence.id}] {evidence.label}: {evidence.formattedValue}</div>
                              <blockquote className="mt-1 border-l-2 border-blue-200 pl-3 italic">“{evidence.quote}”</blockquote>
                            </li>
                          ))}
                        </ul>
                      )}
                      {riskEvidence.length > 0 && (
                        <ul className="mt-3 space-y-3">
                          {riskEvidence.map((evidence) => (
                            <li key={evidence.id} className="text-xs text-slate-600">
                              <div className="font-semibold text-slate-800">[{evidence.id}] {evidence.riskType} screen ({evidence.severity})</div>
                              <blockquote className="mt-1 border-l-2 border-amber-200 pl-3 italic">“{evidence.quote}”</blockquote>
                            </li>
                          ))}
                        </ul>
                      )}
                      {metricEvidence.length === 0 && riskEvidence.length === 0 && (
                        <p className="mt-2 text-xs text-slate-500">No source quote from this document passed validation.</p>
                      )}
                    </details>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verification checklist */}
          {report.recommendations && report.recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Verification Checklist</h2>
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
              <div className="report-content max-w-none">
                {renderReportContent(report.fullReportContent)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
