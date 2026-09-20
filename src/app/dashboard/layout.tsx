"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain, LayoutDashboard, FolderOpen, FileText, BarChart2,
  MessageSquare, BookOpen, TrendingUp, LogOut, Menu, X,
  ChevronRight, Bot, Shield, AlertTriangle, HelpCircle
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/dashboard/sessions", icon: FolderOpen, label: "Research Sessions" },
  { href: "/dashboard/documents", icon: FileText, label: "Documents" },
  { href: "/dashboard/companies", icon: TrendingUp, label: "Companies" },
  { href: "/dashboard/metrics", icon: BarChart2, label: "Financial Metrics" },
  { href: "/dashboard/risks", icon: AlertTriangle, label: "Risk Analysis" },
  { href: "/dashboard/benchmark", icon: BarChart2, label: "Benchmarking" },
  { href: "/dashboard/reports", icon: BookOpen, label: "Reports" },
  { href: "/dashboard/research", icon: MessageSquare, label: "Research Agent" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center animate-pulse">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <p className="text-slate-500 text-sm">Loading FinResearch AI...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-white transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width: "260px", minWidth: "260px" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-white leading-none">FinResearch AI</div>
              <div className="text-slate-400 text-xs mt-0.5">Multi-Agent Platform</div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Status */}
        <div className="mx-4 mt-4 mb-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <div className="flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-slate-300">5 AI Agents Active</span>
          </div>
          <div className="flex gap-1 mt-1.5">
            {["Doc", "Extract", "Risk", "Bench", "Research"].map((agent) => (
              <div key={agent} className="flex-1 h-1 bg-emerald-500 rounded-full animate-pulse-subtle" />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label, exact }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group",
                isActive(href, exact)
                  ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", isActive(href, exact) ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
              <span className="font-medium">{label}</span>
              {isActive(href, exact) && <ChevronRight className="w-3.5 h-3.5 ml-auto text-blue-400" />}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {getInitials(session.user?.name || "U")}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{session.user?.name}</div>
              <div className="text-xs text-slate-400 truncate">{session.user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 hover:text-slate-900"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">FinResearch AI</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-700 font-medium">
              {NAV_ITEMS.find((item) => isActive(item.href, item.exact))?.label || "Dashboard"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              AI Agents Ready
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
              {getInitials(session.user?.name || "U")}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
