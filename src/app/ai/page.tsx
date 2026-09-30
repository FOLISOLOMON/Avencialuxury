"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Trash2,
  TrendingUp,
  Users,
  AlertTriangle,
  Info,
  Bot,
  User as UserIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  structuredPayload?: {
    type: string;
    data: any;
  };
  sourcesUsed?: string[];
  isError?: boolean;
}

const SUGGESTIONS = [
  "How much did I sell this month?",
  "Who owes me money?",
  "Which products are low on stock?",
  "What are my best-selling products?",
  "How much did I spend on expenses this month?",
  "Give me a business overview for this month.",
];

export default function AskAvenciaPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Hello! I am **Ask Avencia**, your AI business analyst. I answer questions using your real, authoritative Avencia sales, debt, inventory, and expense data. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();

      if (data.success) {
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          structuredPayload: data.structuredPayload,
          sourcesUsed: data.sourcesUsed,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errorMsg: Message = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: data.error || "Avencia AI is temporarily unavailable. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Network error connecting to Ask Avencia. Please verify your connection.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content:
          "Conversation cleared! I'm ready to answer any new questions about your Avencia business records.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const formatCurrency = (val: number) => `GH₵${(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const renderStructuredCard = (payload: { type: string; data: any }) => {
    const d = payload.data;
    if (!d) return null;

    switch (payload.type) {
      case "sales_summary":
        return (
          <div className="mt-3 p-4 rounded-2xl bg-gold-50/80 dark:bg-gold-500/10 border border-gold-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-gold-600 dark:text-gold-400">
              <span className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> Sales Metrics</span>
              <span>{d.timeframe || "Selected Period"}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Revenue</span>
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">{formatCurrency(d.revenue)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Collected</span>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(d.amountCollected)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Outstanding</span>
                <div className="text-sm font-black text-rose-600 dark:text-rose-400">{formatCurrency(d.outstanding)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Gross Profit</span>
                <div className="text-sm font-black text-gold-600 dark:text-gold-400">{formatCurrency(d.grossProfit)}</div>
              </div>
            </div>
          </div>
        );

      case "customer_balances":
        return (
          <div className="mt-3 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-500/30 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-300">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-amber-500" /> Customer Debt Summary</span>
              <span>Total: {formatCurrency(d.totalOutstandingDebt)}</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">{d.debtorCount} customer(s) with unpaid orders</p>
          </div>
        );

      case "low_stock":
        return (
          <div className="mt-3 p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-500/30 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-rose-900 dark:text-rose-300">
              <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-rose-500" /> Inventory Stock Alerts</span>
              <span>{d.lowStockCount + d.outOfStockCount} items affected</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] md:h-[calc(100vh-5rem)] max-w-5xl mx-auto space-y-3 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      {/* Top Page Header */}
      <PageHeader
        title="Ask Avencia"
        subtitle="Your AI Business Analyst — Powered by authoritative Avencia engine data"
        icon={Sparkles}
        action={
          <button
            onClick={handleClearHistory}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        }
      />

      {/* Main Chat Container */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-gold-500/5 flex flex-col min-h-0 overflow-hidden">
        
        {/* Messages Stream — Independently Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-2xl bg-gold-500/15 border border-gold-500/30 text-gold-600 dark:text-gold-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-slate-900 dark:bg-gold-500 text-white dark:text-slate-950 font-medium rounded-tr-sm shadow-md"
                    : m.isError
                    ? "bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-tl-sm"
                    : "bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-sm"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{m.content}</div>

                {/* Structured Payload Render */}
                {m.structuredPayload && renderStructuredCard(m.structuredPayload)}

                {/* Source Attribution Pills */}
                {m.sourcesUsed && m.sourcesUsed.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    <Info className="w-3 h-3 text-gold-500 shrink-0" />
                    <span>{m.sourcesUsed[0]}</span>
                  </div>
                )}

                <div
                  className={`mt-1.5 text-[9px] text-right font-medium opacity-60 ${
                    m.role === "user" ? "text-slate-300 dark:text-slate-800" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>

              {m.role === "user" && (
                <div className="w-8 h-8 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-slate-500 dark:text-slate-400 text-xs font-medium">
              <div className="w-8 h-8 rounded-2xl bg-gold-500/15 text-gold-500 flex items-center justify-center animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <Loader2 className="w-4 h-4 text-gold-500 animate-spin" />
                <span>Asking Avencia Engine...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-3 sm:px-4 py-2 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 overflow-x-auto flex items-center gap-2 scrollbar-none shrink-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0 pl-1">
            Suggestions:
          </span>
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              disabled={loading}
              className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-gold-500 hover:text-gold-600 dark:hover:text-gold-400 text-[11px] font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        {/* WhatsApp-Style Input Form Bar — Positioned directly above bottom nav */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about your sales, profits, debts, inventory, or expenses..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              aria-label="Ask Avencia question input"
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send question to Avencia AI"
              className="p-3 rounded-2xl bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold shadow-lg shadow-gold-500/20 transition-all disabled:opacity-50 active:scale-95 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
