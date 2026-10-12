"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Mail, Lock, User, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [setupAvailable, setSetupAvailable] = useState<boolean | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch("/api/auth/setup");
        const json = await res.json();
        setSetupAvailable(json.setupAvailable);
      } catch (e) {
        setSetupAvailable(false);
      } finally {
        setChecking(false);
      }
    }
    checkSetup();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          setupSecret: setupSecret.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Setup failed");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An error occurred during owner initialization.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-amber-500 text-xs">
        Checking System Authorization Status...
      </div>
    );
  }

  if (setupAvailable === false) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
        <div className="w-full max-w-sm sm:max-w-md relative z-10 space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-black border border-amber-500/30 p-2.5 flex items-center justify-center mx-auto shadow-xl">
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia"
              width={48}
              height={48}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Owner Setup Completed</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              The Avencia business owner account is already initialized and secured. Initial setup is locked against duplicate claims.
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="primary" size="md" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold">
                  Proceed to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm sm:max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-black border border-amber-500/30 p-2.5 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/5">
            <Crown className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Initial Owner Setup
            </h1>
            <p className="text-xs text-amber-500/80 font-medium tracking-wider uppercase mt-1">
              One-Time Business Administrator Provisioning
            </p>
          </div>
        </div>

        <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          {success ? (
            <div className="text-center py-6 space-y-3 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-white">Owner Account Initialized!</h2>
              <p className="text-xs text-neutral-400">
                Logged in as Business Owner. Redirecting to Management Dashboard...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Create Owner Credentials</h2>
                <p className="text-xs text-neutral-400">
                  Configure the primary owner account for Avencia Perfumes.
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
                    <User className="w-3.5 h-3.5 text-amber-500" />
                    Owner Name
                  </label>
                  <Input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Foli Solomon"
                    className="bg-[#1C1C1C] border-[#2E2E2E] text-white focus:border-amber-500 text-sm h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-500" />
                    Owner Email
                  </label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@avencialuxury.com"
                    className="bg-[#1C1C1C] border-[#2E2E2E] text-white focus:border-amber-500 text-sm h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    Owner Password
                  </label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="bg-[#1C1C1C] border-[#2E2E2E] text-white focus:border-amber-500 text-sm h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    Setup Secret (Optional if not enforced)
                  </label>
                  <Input
                    type="password"
                    value={setupSecret}
                    onChange={(e) => setSetupSecret(e.target.value)}
                    placeholder="Configured server setup secret"
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
                  <span>Initialize Owner Account</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
