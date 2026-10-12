"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Request failed");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm sm:max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-black border border-amber-500/30 p-2.5 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/5">
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia"
              width={48}
              height={48}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Password Recovery
            </h1>
            <p className="text-xs text-amber-500/80 font-medium tracking-wider uppercase mt-1">
              Avencia Security Terminal
            </p>
          </div>
        </div>

        <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          {submitted ? (
            <div className="text-center py-6 space-y-3 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-white">Recovery Instructions Sent</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                If an active account exists for <span className="text-white font-medium">{email}</span>, password reset instructions have been issued.
              </p>
              <div className="pt-4">
                <Link href="/login">
                  <Button variant="secondary" size="md" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Reset Account Password</h2>
                <p className="text-xs text-neutral-400">
                  Enter your registered email address. We will verify your identity without leaking account presence.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-500" />
                    Registered Email
                  </label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@avencialuxury.com"
                    className="bg-[#1C1C1C] border-[#2E2E2E] text-white focus:border-amber-500 text-sm h-11"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold h-11 text-sm border-0 shadow-lg shadow-amber-500/20"
                  isLoading={loading}
                >
                  <span>Request Reset Token</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-xs text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
