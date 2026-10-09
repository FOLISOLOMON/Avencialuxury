"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, Send, X, ArrowUpRight, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "Who owes me money?",
  "Which products are low on stock?",
  "How much profit did I make this month?",
  "What were my sales today?",
  "What are my best selling products?",
];

export function AiFloatingOrb() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am **Ask Avencia**, your business analyst. Ask me anything about your sales, inventory, debtors, or profit.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAlreadyOnAiPage = pathname === "/ai";

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (isAlreadyOnAiPage) {
    return null;
  }

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isLoading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: textToSend }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const answer = data.message || data.reply;
      if (data.success !== false && answer) {
        setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error || "I could not retrieve that information right now. Please try again.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error communicating with Avencia AI. Please check your connection.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* AI Assistant Launcher Button */}
      <aside aria-label="AI Assistant" className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Ask Avencia AI Assistant"
          className="h-10 px-3.5 rounded-md bg-card border border-border text-foreground hover:bg-secondary active:bg-secondary transition-colors flex items-center gap-2 select-none text-xs font-medium shadow-subtle"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </aside>

      {/* Instant AI Experience Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
          />

          {/* Modal / Sheet Container */}
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full md:max-w-xl max-h-[88vh] max-h-[88dvh] h-[600px] bg-card text-foreground rounded-t-lg md:rounded-lg border-t md:border border-border shadow-floating flex flex-col overflow-hidden animate-slide-up z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0 bg-card">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-secondary border border-border flex items-center justify-center text-foreground">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs tracking-tight text-foreground">
                    Avencia AI Assistant
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Direct answers from your live ledger</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <a
                  href="/ai"
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/60 transition-colors"
                  title="Open full AI page"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/60 transition-colors"
                  aria-label="Close AI sheet"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-3 py-2 border-b border-border/50 bg-secondary/30 overflow-x-auto flex items-center gap-1.5 no-scrollbar flex-shrink-0 select-none">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                  className="px-2.5 py-1 text-xs rounded-full bg-card border border-border text-foreground hover:border-primary/40 whitespace-nowrap active:scale-95 transition-all font-medium disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar text-sm">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col max-w-[85%] rounded-lg p-3 leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "mr-auto bg-secondary text-foreground border border-border/60"
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              ))}
              {isLoading && (
                <div className="mr-auto bg-secondary text-muted-foreground rounded-lg p-3 flex items-center gap-2 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Analysing ledger data...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar (Pinned above keyboard and respecting iOS safe-area) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 border-t border-border/70 bg-card/90 backdrop-blur-xs flex items-center gap-2 flex-shrink-0 pb-safe"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about sales, stock, debt..."
                disabled={isLoading}
                className="flex-1 h-11 px-3.5 text-base md:text-sm rounded-md bg-secondary text-foreground border border-border focus:outline-none focus:border-primary placeholder:text-muted-foreground/70"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="h-11 w-11 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold disabled:opacity-50 active:scale-95 transition-all shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
