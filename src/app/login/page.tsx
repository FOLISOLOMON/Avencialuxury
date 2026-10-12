"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = searchParams.get("mobile") === "true";
  const returnUrl = searchParams.get("returnUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Sign in failed");
      }

      const user = data.user || data.data?.user;
      const role = user?.role;

      let destination = "/";
      if (role === "WORKER") {
        destination = "/mobile";
      } else if (
        returnUrl &&
        !returnUrl.startsWith("/api") &&
        returnUrl !== "/login" &&
        !returnUrl.startsWith("/login?")
      ) {
        destination = returnUrl;
      } else if (isMobile) {
        destination = "/mobile";
      } else {
        destination = "/";
      }

      // Full navigation guarantees cookies and server session headers are refreshed cleanly
      window.location.href = destination;
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background Subtle Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm sm:max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
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
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              Avencia Perfumes
            </h1>
            <p className="text-xs text-amber-500/80 font-medium tracking-wider uppercase mt-1">
              Business & Sales Operating System
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">Sign In</h2>
            <p className="text-xs text-neutral-400">
              Enter your credentials to access the Avencia terminal
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-500" />
                Email Address
              </label>
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@avencialuxury.com"
                className="bg-[#1C1C1C] border-[#2E2E2E] text-white focus:border-amber-500 text-sm h-11"
                suppressHydrationWarning
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-amber-500/80 hover:text-amber-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="bg-[#1C1C1C] border-[#2E2E2E] text-white focus:border-amber-500 text-sm h-11"
                suppressHydrationWarning
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold h-11 text-sm border-0 shadow-lg shadow-amber-500/20"
              isLoading={loading}
            >
              <span>Authenticate Session</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="pt-3 border-t border-[#262626] flex items-center justify-between text-[11px] text-neutral-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Role-Based Access
            </span>
            <span>Single-Business Engine</span>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-neutral-500">
          Workers sign in via invite link sent by the owner.{" "}
          <Link href="/setup" className="text-neutral-400 hover:text-white underline">
            Owner setup
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-amber-500 text-xs">Loading Avencia Terminal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
