"use client";
import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, Trash2, Search, Loader2, Eye, CheckCircle, AlertCircle, Clock, Building2 } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, truncate } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

interface DocItem {
  document: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number | null;
    documentType: string;
    fiscalYear: number | null;
    processingStatus: string;
    chunkCount: number | null;
    createdAt: string;
    isSeeded: boolean;
  };
  company: { name: string; ticker: string | null } | null;
}

interface Session {
  id: string;
  name: string;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    sessionId: "",
    documentType: "Annual Report (10-K)",
    fiscalYear: new Date().getFullYear().toString(),
    companyName: "",
    ticker: "",
  });

  async function fetchDocs() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) setDocs((await res.json()).documents || []);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSessions() {
    const res = await fetch("/api/sessions");
    if (res.ok) setSessions((await res.json()).sessions || []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchDocs();
      void fetchSessions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("documentType", uploadForm.documentType);
    if (uploadForm.sessionId) fd.append("sessionId", uploadForm.sessionId);
    if (uploadForm.fiscalYear) fd.append("fiscalYear", uploadForm.fiscalYear);
    if (uploadForm.companyName) fd.append("companyName", uploadForm.companyName);
    if (uploadForm.ticker) fd.append("ticker", uploadForm.ticker);

    try {
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (res.ok) {
        toast.success("Document uploaded! AI agents processing...");
        setShowUpload(false);
        await fetchDocs();
        // Poll for status update
        setTimeout(fetchDocs, 3000);
      } else {
        const d = await res.json();
        toast.error(d.error || "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  }, [uploadForm]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  async function deleteDoc(id: string) {
    if (!confirm("Delete this document?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Document deleted");
      setDocs(docs.filter((d) => d.document.id !== id));
    }
  }

  const filtered = docs.filter((d) =>
    d.document.fileName.toLowerCase().includes(search.toLowerCase()) ||
    d.company?.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusIcon = (status: string) => {
    if (status === "completed" || status === "indexed") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === "failed") return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
  };

  const DOC_TYPES = ["Annual Report (10-K)", "Quarterly Report (10-Q)", "Earnings Transcript", "Investor Presentation", "ESG Report", "Proxy Statement", "Other"];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Documents</h1>
          <p className="text-slate-500 text-sm mt-1">Upload 10-K filings, earnings transcripts, and annual reports</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
        >
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Upload Financial Document</h2>

            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Company Name</label>
                  <input
                    placeholder="Apple Inc."
                    value={uploadForm.companyName}
                    onChange={(e) => setUploadForm({ ...uploadForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ticker</label>
                  <input
                    placeholder="AAPL"
                    value={uploadForm.ticker}
                    onChange={(e) => setUploadForm({ ...uploadForm, ticker: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Document Type</label>
                  <select
                    value={uploadForm.documentType}
                    onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fiscal Year</label>
                  <input
                    type="number"
                    value={uploadForm.fiscalYear}
                    onChange={(e) => setUploadForm({ ...uploadForm, fiscalYear: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Research Session (optional)</label>
                <select
                  value={uploadForm.sessionId}
                  onChange={(e) => setUploadForm({ ...uploadForm, sessionId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No session</option>
                  {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"}`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-sm text-slate-500">Uploading & processing...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">
                    {isDragActive ? "Drop the file here" : "Drop file or click to select"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">PDF, DOCX, or TXT (max 10MB)</p>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowUpload(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Documents Found</h3>
          <p className="text-slate-400 text-sm mb-4">Upload financial documents to begin analysis</p>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
          >
            Upload Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div key={item.document.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all hover:border-blue-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex items-center gap-2">
                  {statusIcon(item.document.processingStatus)}
                  {!item.document.isSeeded && (
                    <button
                      onClick={() => deleteDoc(item.document.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <Link href={`/dashboard/documents/${item.document.id}`}>
                <h3 className="font-semibold text-slate-900 text-sm mb-1 group-hover:text-blue-600 transition-colors truncate">
                  {item.document.fileName}
                </h3>
              </Link>

              {item.company && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">{item.company.name}</span>
                  {item.company.ticker && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{item.company.ticker}</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{item.document.documentType}</span>
                {item.document.fiscalYear && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">FY{item.document.fiscalYear}</span>
                )}
                {item.document.isSeeded && (
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Pre-loaded</span>
                )}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                <span>{item.document.chunkCount || 0} chunks indexed</span>
                <span>{formatDate(item.document.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
