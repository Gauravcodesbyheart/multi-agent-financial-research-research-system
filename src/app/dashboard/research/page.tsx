"use client";
import { useEffect, useState, useRef } from "react";
import { Send, Brain, Loader2, MessageSquare, FileText, ChevronDown, ChevronUp, Quote } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  agentType?: string | null;
  reasoning?: string | null;
  citations?: Array<{ documentName: string; section: string; excerpt: string }> | null;
}

interface Session {
  id: string;
  name: string;
}

const EXAMPLE_QUESTIONS = [
  "What is Apple's revenue growth trend and gross margin compared to Microsoft?",
  "Identify the top 3 financial risks across all loaded companies",
  "Compare the free cash flow generation of Tesla vs Amazon in 2023",
  "Which company has the strongest balance sheet and why?",
  "What are the key differences in business model between Microsoft and Amazon?",
  "Analyze Tesla's margin compression and what caused it",
];

export default function ResearchPage() {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function fetchSessions() {
    const res = await fetch("/api/sessions");
    if (res.ok) {
      const d = await res.json();
      setSessions(d.sessions || []);
      if (d.sessions?.length > 0 && !activeSessionId) {
        setActiveSessionId(d.sessions[0].id);
      }
    }
  }

  async function fetchMessages() {
    setLoadingMsgs(true);
    const res = await fetch(`/api/chat?sessionId=${activeSessionId}`);
    if (res.ok) setMessages((await res.json()).messages || []);
    setLoadingMsgs(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchSessions(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    const timer = window.setTimeout(() => void fetchMessages(), 0);
    return () => window.clearTimeout(timer);
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(content?: string) {
    const question = content || input.trim();
    if (!question || !activeSessionId) return;
    if (loading) return;

    setInput("");
    setLoading(true);

    // Optimistic UI — add user message immediately
    const tempUserMsg: Message = {
      id: `temp-${crypto.randomUUID()}`,
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId, content: question }),
      });

      if (res.ok) {
        const d = await res.json();
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          d.userMessage,
          d.aiMessage,
        ]);
      } else {
        toast.error("Failed to get response");
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleCitations(msgId: string) {
    setExpandedCitations((prev) => {
      const next = new Set(prev);
      next.has(msgId) ? next.delete(msgId) : next.add(msgId);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-pink-600 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">Research Agent</h1>
            <p className="text-xs text-slate-500">Ask multi-part financial questions with source citations</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500">Session:</label>
          <select
            value={activeSessionId}
            onChange={(e) => setActiveSessionId(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {!activeSessionId ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Brain className="w-16 h-16 text-slate-200 mb-4" />
                <h2 className="text-lg font-semibold text-slate-700 mb-2">Select a Research Session</h2>
                <p className="text-slate-400 text-sm">Choose a session to start asking financial research questions</p>
              </div>
            ) : loadingMsgs ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-pink-600 rounded-2xl flex items-center justify-center mb-4">
                  <Brain className="w-9 h-9 text-white" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Research Agent Ready</h2>
                <p className="text-slate-500 text-sm mb-6 text-center max-w-md">
                  Ask any financial question about the loaded company documents. I&apos;ll search through the documents and provide step-by-step analysis with exact source citations.
                </p>
                <div className="grid grid-cols-1 gap-2 w-full max-w-lg">
                  {EXAMPLE_QUESTIONS.slice(0, 4).map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <span className="text-blue-500 mr-2">›</span>{q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === "user";
                const citations = msg.citations as Array<{ documentName: string; section: string; excerpt: string }> | null;

                return (
                  <div key={msg.id} className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isUser ? "bg-gradient-to-br from-blue-500 to-violet-600 text-white" : "bg-gradient-to-br from-violet-500 to-pink-600 text-white"}`}>
                      {isUser ? getInitials(session?.user?.name || "U") : <Brain className="w-4 h-4" />}
                    </div>

                    <div className={`max-w-[80%] space-y-2 ${isUser ? "items-end" : ""}`}>
                      {/* Agent badge */}
                      {!isUser && msg.agentType && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-violet-600 font-semibold">{msg.agentType}</span>
                          <div className="w-1 h-1 bg-violet-400 rounded-full" />
                          <span className="text-xs text-slate-400">{formatDate(msg.createdAt)}</span>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div className={`rounded-2xl px-4 py-3 ${isUser ? "chat-bubble-user text-white rounded-tr-sm" : "chat-bubble-assistant text-slate-800 rounded-tl-sm"}`}>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content.split('\n').map((line, i) => {
                            if (line.startsWith('**') && line.endsWith('**')) {
                              return <strong key={i} className="block font-bold">{line.slice(2, -2)}</strong>;
                            }
                            if (line.startsWith('# ')) return <strong key={i} className="block text-base font-bold mt-2">{line.slice(2)}</strong>;
                            if (line.startsWith('## ')) return <strong key={i} className="block font-semibold mt-1">{line.slice(3)}</strong>;
                            if (line === '') return <div key={i} className="h-2" />;
                            return <span key={i} className="block">{line}</span>;
                          })}
                        </div>
                      </div>

                      {/* Citations */}
                      {!isUser && citations && citations.length > 0 && (
                        <div>
                          <button
                            onClick={() => toggleCitations(msg.id)}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
                          >
                            <Quote className="w-3 h-3" />
                            {citations.length} source{citations.length !== 1 ? "s" : ""}
                            {expandedCitations.has(msg.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {expandedCitations.has(msg.id) && (
                            <div className="mt-2 space-y-2">
                              {citations.map((c, i) => (
                                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <FileText className="w-3 h-3 text-blue-500" />
                                    <span className="text-xs font-semibold text-slate-700">{c.documentName}</span>
                                    <span className="text-xs text-slate-400">— {c.section}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 italic">&quot;{c.excerpt}&quot;</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reasoning */}
                      {!isUser && msg.reasoning && (
                        <div className="text-xs text-slate-400 italic">{msg.reasoning}</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="chat-bubble-assistant rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs ml-1">Research Agent analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex-shrink-0">
            {!activeSessionId ? (
              <div className="text-center text-sm text-slate-400">Select a session to start chatting</div>
            ) : (
              <>
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Ask a financial research question... (Enter to send, Shift+Enter for new line)"
                      rows={2}
                      disabled={loading}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none disabled:opacity-60"
                    />
                  </div>
                  <button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-pink-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-pink-700 transition-all disabled:opacity-60 shadow-lg"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {EXAMPLE_QUESTIONS.slice(0, 3).map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      disabled={loading}
                      className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-violet-100 hover:text-violet-700 transition-colors disabled:opacity-50"
                    >
                      {q.length > 50 ? q.slice(0, 50) + "..." : q}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
