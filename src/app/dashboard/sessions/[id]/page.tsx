"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FolderOpen, FileText, MessageSquare, BarChart2, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Session {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tags: string[] | null;
  createdAt: string;
}

interface Document {
  document: {
    id: string;
    fileName: string;
    documentType: string;
    processingStatus: string;
    createdAt: string;
    fiscalYear: number | null;
  };
  company: { name: string; ticker: string | null } | null;
}

export default function SessionDetailPage() {
  const { id } = useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [sRes, dRes] = await Promise.all([
        fetch(`/api/sessions/${id}`),
        fetch(`/api/documents?sessionId=${id}`),
      ]);
      if (sRes.ok) setSession((await sRes.json()).session);
      if (dRes.ok) setDocs((await dRes.json()).documents);
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  if (!session) return <div className="p-6 text-slate-500">Session not found</div>;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/sessions" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{session.name}</h1>
          <p className="text-sm text-slate-500">{session.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={`/dashboard/documents?sessionId=${id}`} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group">
          <FileText className="w-8 h-8 text-blue-600 mb-3" />
          <div className="text-2xl font-bold text-slate-900">{docs.length}</div>
          <div className="text-sm text-slate-500">Documents</div>
        </Link>

        <Link href={`/dashboard/research?sessionId=${id}`} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group">
          <MessageSquare className="w-8 h-8 text-violet-600 mb-3" />
          <div className="text-2xl font-bold text-slate-900">Chat</div>
          <div className="text-sm text-slate-500">Research Agent</div>
        </Link>

        <Link href={`/dashboard/reports?sessionId=${id}`} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group">
          <BarChart2 className="w-8 h-8 text-emerald-600 mb-3" />
          <div className="text-2xl font-bold text-slate-900">Report</div>
          <div className="text-sm text-slate-500">Generate Analysis</div>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Documents in this Session</h2>
        {docs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No documents yet</p>
            <Link href="/dashboard/documents" className="text-blue-600 text-sm hover:underline mt-1 block">
              Upload a document →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <Link key={d.document.id} href={`/dashboard/documents/${d.document.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{d.document.fileName}</div>
                  <div className="text-xs text-slate-400">{d.company?.name} · {d.document.documentType} · FY{d.document.fiscalYear}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.document.processingStatus === "completed" || d.document.processingStatus === "indexed" ? "text-emerald-600 bg-emerald-50" : "text-yellow-600 bg-yellow-50"}`}>
                  {d.document.processingStatus}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
