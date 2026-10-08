"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User as UserIcon, Loader2, ArrowUpRight } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "Which perfumes are low on stock?",
  "How much revenue today?",
  "Who owes us money right now?",
  "Best selling perfumes this month?",
];

export function MobileAiOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I am Avencia AI. Ask me anything about your stock, today's sales, or customer debts.",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: query }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const json = await res.json();
      if (json.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: json.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.error || "Sorry, I couldn't process that question right now." },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error. Please check your internet connection to consult Avencia AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Orb Button */}
      <div className="fixed bottom-20 right-4 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-amber-400 text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center border-2 border-background/80 hover:scale-105 active:scale-95 transition-all"
          aria-label="Ask Avencia AI"
        >
          <Sparkles className="w-5 h-5 text-zinc-950 animate-pulse" />
        </button>
      </div>

      {/* AI Chat Drawer Sheet */}
      <Sheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Avencia AI Assistant"
        description="Instant answers based on live business data"
      >
        <div className="flex flex-col h-[70vh] -mx-4 -mb-4 px-4 pb-4">
          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-xs font-medium"
                      : "bg-card border border-border text-foreground rounded-bl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-xs text-muted-foreground p-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Checking business records...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="pt-2 pb-2 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border active:scale-95 transition-all flex items-center gap-1"
              >
                <span>{prompt}</span>
                <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>

          {/* Input field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 pt-1 border-t border-border shrink-0"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about perfumes, sales, customers..."
              className="text-xs h-10 flex-1"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-10 w-10 p-0 bg-primary text-primary-foreground shrink-0 rounded-xl"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Sheet>
    </>
  );
}
