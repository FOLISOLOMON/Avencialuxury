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
  Bot,
  User as UserIcon,
  ShoppingBag,
  DollarSign,
  Package,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  Button,
  IconButton,
  Card,
  Badge,
  Money,
} from "@/components/ui";

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
  "Which perfumes are low on stock?",
  "What are my best-selling fragrances?",
  "Give me an executive business summary.",
];

export default function AskAvenciaPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Greetings! I am **Ask Avencia**, your luxury perfumery intelligence assistant. I answer questions using your verified sales, debt register, shipment consignments, and expense records. What would you like to inspect?",
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
          content: data.error || "Avencia AI is temporarily busy. Please try again.",
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
          "Conversation cleared! I'm ready to answer fresh questions about your Avencia business records.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const renderStructuredCard = (payload: { type: string; data: any }) => {
    const d = payload.data;
    if (!d) return null;

    switch (payload.type) {
      case "sales_summary":
        return (
          <div className="mt-3 p-3.5 rounded-2xl bg-card border border-primary/30 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-primary">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>Sales Performance</span>
              </span>
              <Badge variant="gold">{d.timeframe || "Report"}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-muted/40 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Revenue</span>
                <div className="text-sm font-black text-foreground">{formatCurrency(d.revenue)}</div>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Collected</span>
                <div className="text-sm font-black text-success">{formatCurrency(d.amountCollected)}</div>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Debt Due</span>
                <div className="text-sm font-black text-warning">{formatCurrency(d.outstanding)}</div>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Gross Profit</span>
                <div className="text-sm font-black text-primary">{formatCurrency(d.grossProfit)}</div>
              </div>
            </div>
          </div>
        );

      case "customer_balances":
        return (
          <div className="mt-3 p-3.5 rounded-2xl bg-card border border-warning/40 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-foreground">
              <span className="flex items-center gap-1.5 text-warning">
                <Users className="w-4 h-4" />
                <span>Accounts Receivable</span>
              </span>
              <span className="text-warning font-black">Total: {formatCurrency(d.totalOutstandingDebt)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {d.debtorCount} customer(s) with outstanding credit balances
            </p>
          </div>
        );

      case "low_stock":
        return (
          <div className="mt-3 p-3.5 rounded-2xl bg-card border border-destructive/40 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-foreground">
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span>Inventory Stock Alert</span>
              </span>
              <Badge variant="destructive">{d.lowStockCount + d.outOfStockCount} items</Badge>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] md:h-[calc(100vh-5rem)] max-w-4xl mx-auto space-y-3 pb-20 md:pb-0">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground">Ask Avencia</h1>
            <p className="text-xs text-muted-foreground">AI Intelligence & Business Analyst</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearHistory}
          className="text-xs gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Clear Chat</span>
        </Button>
      </div>

      {/* Main Chat Console */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden p-0 border-border">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : m.isError
                    ? "bg-destructive/10 border border-destructive/30 text-destructive"
                    : "bg-muted/40 border border-border text-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.structuredPayload && renderStructuredCard(m.structuredPayload)}

                <div
                  className={`text-[10px] mt-1.5 opacity-60 text-right ${
                    m.role === "user" ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-muted-foreground">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                <span>Consulting Avencia business database...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 border-t border-border/60 bg-muted/20 overflow-x-auto no-scrollbar flex items-center gap-2">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading}
              onClick={() => handleSend(s)}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/60 hover:text-primary transition-all whitespace-nowrap shrink-0"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-border bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about sales, debtors, stock, or profit..."
              disabled={loading}
              className="flex-1 bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              type="submit"
              size="md"
              disabled={!input.trim() || loading}
              className="font-bold px-4 shrink-0"
            >
              <Send className="w-4 h-4 mr-1" />
              <span>Ask</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
