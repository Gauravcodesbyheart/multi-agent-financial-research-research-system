"use client";
import { useEffect, useState } from "react";
import { FolderOpen, Plus, Search, Trash2, Edit3, MessageSquare, FileText, Loader2, Tag, Calendar } from "lucide-react";
import { formatDate, getStatusColor, truncate } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

interface Session {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  messageCount: number;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", description: "", tags: "" });
  const [submitting, setSubmitting] = useState(false);

  async function fetchSessions() {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const d = await res.json();
        setSessions(d.sessions || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchSessions(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const url = editId ? `/api/sessions/${editId}` : "/api/sessions";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, description: form.description, tags }),
      });
      if (res.ok) {
        toast.success(editId ? "Session updated" : "Session created");
        setShowForm(false);
        setEditId(null);
        setForm({ name: "", description: "", tags: "" });
        fetchSessions();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this session and all its data?")) return;
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Session deleted");
      setSessions(sessions.filter((s) => s.id !== id));
    }
  }

  function startEdit(s: Session) {
    setForm({ name: s.name, description: s.description || "", tags: s.tags?.join(", ") || "" });
    setEditId(s.id);
    setShowForm(true);
  }

  const filtered = sessions.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Research Sessions</h1>
          <p className="text-slate-500 text-sm mt-1">Organize your financial research into named workspaces</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ name: "", description: "", tags: "" }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" /> New Session
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editId ? "Edit Session" : "New Research Session"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Session Name *</label>
                <input
                  required
                  placeholder="e.g., Big Tech Analysis 2023"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  placeholder="What are you researching?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags (comma-separated)</label>
                <input
                  placeholder="Technology, 2023, FAANG"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditId(null); }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {submitting ? "Saving..." : editId ? "Update" : "Create Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          placeholder="Search sessions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <FolderOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Sessions Found</h3>
          <p className="text-slate-400 text-sm mb-4">Create a research session to organize your financial analysis work</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
          >
            Create Your First Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all hover:border-blue-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(s)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteSession(s.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <Link href={`/dashboard/sessions/${s.id}`}>
                <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {s.name}
                </h3>
              </Link>

              {s.description && (
                <p className="text-sm text-slate-500 mb-3">{truncate(s.description, 80)}</p>
              )}

              {s.tags && s.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {s.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{s.documentCount} docs</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{s.messageCount} msgs</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(s.status)}`}>
                  {s.status}
                </span>
              </div>

              <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                <Calendar className="w-3 h-3" />
                {formatDate(s.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
