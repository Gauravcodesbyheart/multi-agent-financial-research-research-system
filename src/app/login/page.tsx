"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { TrendingUp, BarChart2, Brain, FileText, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        toast.success("Welcome back!");
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setForm({ email: "demo@finresearch.ai", password: "demo123456" });
  }

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-violet-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl">FinResearch AI</span>
          </div>
          <p className="text-slate-400 text-sm">Multi-Agent Financial Analysis Platform</p>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Professional Financial Analysis<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
              Powered by AI Agents
            </span>
          </h1>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: FileText, label: "Document Agent", desc: "Parse & index 10-K filings" },
              { icon: BarChart2, label: "Extraction Agent", desc: "Auto-extract KPIs & ratios" },
              { icon: TrendingUp, label: "Benchmark Agent", desc: "Cross-company comparison" },
              { icon: Brain, label: "Research Agent", desc: "Conversational Q&A with citations" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <Icon className="w-5 h-5 text-blue-400 mb-2" />
                <div className="text-white text-sm font-semibold">{label}</div>
                <div className="text-slate-400 text-xs mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          {["AAPL", "MSFT", "TSLA", "AMZN"].map((ticker) => (
            <div key={ticker} className="text-center">
              <div className="text-white font-bold text-sm">{ticker}</div>
              <div className="text-slate-400 text-xs">2023 10-K</div>
            </div>
          ))}
          <div className="text-slate-500 text-xs ml-2">Pre-loaded datasets</div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <Brain className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-slate-800">FinResearch AI</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h2>
            <p className="text-slate-500 text-sm mb-6">Access your financial research workspace</p>

            {/* Demo credentials banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-blue-700 text-sm font-semibold mb-1">🎯 Demo Account</p>
              <p className="text-blue-600 text-xs mb-2">Pre-loaded with Apple, Microsoft, Tesla & Amazon 2023 financials</p>
              <button
                onClick={fillDemo}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Fill Demo Credentials
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-violet-700 transition-all disabled:opacity-60 shadow-lg shadow-blue-500/25"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              New user?{" "}
              <Link href="/register" className="text-blue-600 font-semibold hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
