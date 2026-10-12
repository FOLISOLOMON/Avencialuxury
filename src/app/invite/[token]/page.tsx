"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { Lock, User, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: name.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?mobile=true");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An error occurred accepting the invitation.");
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
              Worker Account Activation
            </h1>
            <p className="text-xs text-amber-500/80 font-medium tracking-wider uppercase mt-1">
              Avencia Mobile POS & Sales Team
            </p>
          </div>
        </div>

        <div className="bg-[#151515] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          {success ? (
            <div className="text-center py-6 space-y-3 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-white">Account Activated!</h2>
              <p className="text-xs text-neutral-400">
                Your worker credentials have been securely registered. Redirecting to Mobile Sign-in...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Accept Invitation</h2>
                <p className="text-xs text-neutral-400">
                  Set your name and create a password to access the Avencia mobile sales application.
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
                    Full Name
                  </label>
                  <Input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ama Mensah"
                    className="bg-[#1C1C1C] border-[#2E2E2E] text-white focus:border-amber-500 text-sm h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    Create Password
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
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
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
                  <span>Activate Account & Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </>
          )}

          <div className="pt-3 border-t border-[#262626] flex items-center justify-between text-[11px] text-neutral-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Authorized Invitation Only
            </span>
            <span>Single-Use Token</span>
          </div>
        </div>
      </div>
    </div>
  );
}
