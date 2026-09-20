"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  FileText, FolderOpen, BarChart2, TrendingUp, AlertTriangle,
  BookOpen, Brain, ArrowRight, Activity, Bot, ChevronRight,
  Loader2, RefreshCw
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, truncate } from "@/lib/utils";
import toast from "react-hot-toast";

interface DashboardData {
  stats: { documents: number; sessions: number; reports: number; companies: number; risks: number };
  recentSessions: Array<{ id: string; name: string; updatedAt: string; status: string }>;
  recentReports: Array<{ id: string; title: string; status: string; createdAt: string }>;
  recentAgentActivity: Array<{ id: number; agentName: string; action: string; status: string; createdAt: string; duration: number | null }>;
  metricsChartData: Array<{ metrics: { revenue: string | null; netMargin: string | null; grossMargin: string | null; companyId: string | null }; company: { name: string; ticker: string | null } | null }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed");
      if (res.ok) {
        toast.success("Demo data loaded! Refreshing...");
        await fetchDashboard();
      } else {
        const d = await res.json();
        toast.error(d.error || "Seeding failed");
      }
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const stats = data?.stats;
  const isEmptyDb = !stats || (stats.companies === 0 && stats.documents === 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {session?.user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Your AI-powered financial research workspace
          </p>
        </div>
        <div className="flex gap-2">
          {isEmptyDb && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-violet-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {seeding ? "Loading demo data..." : "Load Demo Data"}
            </button>
          )}
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Agent Pipeline Status */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            <span className="font-semibold">Multi-Agent Pipeline Status</span>
          </div>
          <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-500/30">
            All Agents Active
          </span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[
            { name: "Document Agent", desc: "Parse & chunk", color: "from-blue-500 to-blue-600", icon: FileText },
            { name: "Extraction Agent", desc: "KPIs & ratios", color: "from-violet-500 to-violet-600", icon: BarChart2 },
            { name: "Risk Agent", desc: "Red flags", color: "from-orange-500 to-red-600", icon: AlertTriangle },
            { name: "Benchmark Agent", desc: "Comparison", color: "from-emerald-500 to-teal-600", icon: TrendingUp },
            { name: "Research Agent", desc: "Q&A with citations", color: "from-pink-500 to-rose-600", icon: Brain },
          ].map(({ name, desc, color, icon: Icon }, i) => (
            <div key={name} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-xs font-semibold text-white">{name}</div>
              <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
              <div className="flex items-center gap-1 mt-2">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs text-emerald-400">Ready</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Companies", value: stats?.companies ?? 0, icon: TrendingUp, color: "text-blue-600 bg-blue-50", href: "/dashboard/companies" },
          { label: "Documents", value: stats?.documents ?? 0, icon: FileText, color: "text-violet-600 bg-violet-50", href: "/dashboard/documents" },
          { label: "Sessions", value: stats?.sessions ?? 0, icon: FolderOpen, color: "text-emerald-600 bg-emerald-50", href: "/dashboard/sessions" },
          { label: "Reports", value: stats?.reports ?? 0, icon: BookOpen, color: "text-orange-600 bg-orange-50", href: "/dashboard/reports" },
          { label: "Risk Flags", value: stats?.risks ?? 0, icon: AlertTriangle, color: "text-red-600 bg-red-50", href: "/dashboard/risks" },
        ].map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all hover:border-blue-200 group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${color.split(" ")[1]} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color.split(" ")[0]}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Metrics Overview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Financial Overview — FY2023</h2>
            <Link href="/dashboard/metrics" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isEmptyDb ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No data yet. Load demo data to see company financials.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.metricsChartData?.slice(0, 4).map((item, i) => {
                const revenue = parseFloat(item.metrics.revenue || "0");
                const maxRevenue = 600000;
                const pct = Math.min((revenue / maxRevenue) * 100, 100);
                const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-orange-500"];
                return (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-slate-700 truncate">
                      {item.company?.ticker || item.company?.name || "N/A"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Revenue</span>
                        <span className="text-xs font-semibold text-slate-700">{formatCurrency(revenue, true)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[i % colors.length]} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <span className="text-xs font-semibold text-emerald-600">
                        {item.metrics.netMargin ? `${(parseFloat(item.metrics.netMargin) * 100).toFixed(1)}%` : "N/A"}
                      </span>
                      <div className="text-xs text-slate-400">Net Mgn</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Agent Activity
            </h2>
          </div>
          {(!data?.recentAgentActivity || data.recentAgentActivity.length === 0) ? (
            <div className="text-center py-8">
              <Bot className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-xs">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentAgentActivity.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${log.status === "completed" ? "bg-emerald-500" : log.status === "running" ? "bg-blue-500 animate-pulse" : "bg-red-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-700">{log.agentName}</div>
                    <div className="text-xs text-slate-500 truncate">{log.action}</div>
                    {log.duration && (
                      <div className="text-xs text-slate-400">{(log.duration / 1000).toFixed(1)}s</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sessions & Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent Sessions</h2>
            <Link href="/dashboard/sessions" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          {(!data?.recentSessions || data.recentSessions.length === 0) ? (
            <div className="text-center py-8">
              <FolderOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No sessions yet</p>
              <Link href="/dashboard/sessions" className="text-blue-600 text-sm hover:underline">Create one →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentSessions.map((s) => (
                <Link key={s.id} href={`/dashboard/sessions/${s.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-700 truncate">{s.name}</div>
                    <div className="text-xs text-slate-400">{formatDate(s.updatedAt)}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(s.status)}`}>
                    {s.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent Reports</h2>
            <Link href="/dashboard/reports" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          {(!data?.recentReports || data.recentReports.length === 0) ? (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No reports generated yet</p>
              <Link href="/dashboard/reports" className="text-blue-600 text-sm hover:underline">Generate one →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentReports.map((r) => (
                <Link key={r.id} href={`/dashboard/reports/${r.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-700 truncate">{r.title}</div>
                    <div className="text-xs text-slate-400">{formatDate(r.createdAt)}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(r.status)}`}>
                    {r.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl p-6 text-white">
        <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "New Research Session", icon: FolderOpen, href: "/dashboard/sessions" },
            { label: "Upload Document", icon: FileText, href: "/dashboard/documents" },
            { label: "Ask Research Agent", icon: Brain, href: "/dashboard/research" },
            { label: "Generate Report", icon: BookOpen, href: "/dashboard/reports" },
          ].map(({ label, icon: Icon, href }) => (
            <Link key={label} href={href} className="flex items-center gap-3 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl p-4 transition-all">
              <Icon className="w-5 h-5 text-white flex-shrink-0" />
              <span className="text-sm font-medium text-white">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
