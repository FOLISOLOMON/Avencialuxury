"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Laptop, ArrowRight, X } from "lucide-react";

export function DesktopOpBanner() {
  const [user, setUser] = useState<{ role: string; name: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if running on desktop/laptop screen width
    const checkWidth = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);

    // Fetch user role
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const u = json?.user || json?.data?.user;
        if (json?.success && u) {
          setUser(u);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Only show if user is OWNER, on desktop screen, and not dismissed
  if (!isDesktop || dismissed || user?.role !== "OWNER") {
    return null;
  }

  return (
    <aside
      aria-label="Desktop Platform Switcher"
      className="w-full bg-[#121622] border-b border-amber-500/30 px-4 py-2.5 text-xs text-white z-40 transition-all shadow-md"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400">
            <Laptop className="w-4 h-4" />
          </div>
          <p className="truncate text-neutral-200">
            <span className="font-semibold text-white">Avencia Mobile</span> opened on desktop.
            Switch to the full business dashboard anytime.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors shadow-xs"
          >
            <span>Open Main OP</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
