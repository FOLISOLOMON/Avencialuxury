"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { Menu, Laptop } from "lucide-react";

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
}

export function MobileHeader({ title, subtitle }: MobileHeaderProps) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const role = json?.user?.role || json?.data?.user?.role;
        if (role === "OWNER") {
          setIsOwner(true);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur-md border-b border-border/80 px-4 py-2.5 transition-colors">
      <div className="flex items-center justify-between max-w-md mx-auto w-full">
        {/* Brand Logo & Name */}
        <Link href="/mobile" className="flex items-center gap-2.5 active:opacity-80 transition-opacity">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-primary/30 shadow-sm flex items-center justify-center bg-card">
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
              Avencia <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30">Mobile</span>
            </span>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground leading-none">{subtitle}</p>
            )}
          </div>
        </Link>

        {/* Right Action: Sync Badge & More */}
        <div className="flex items-center gap-2">
          {isOwner && (
            <Link
              href="/"
              className="h-8 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 text-[11px] font-semibold transition-all active:scale-95"
              title="Switch to Avencia OP Desktop Dashboard"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>OP</span>
            </Link>
          )}
          <SyncStatusBadge />
          <Link
            href="/mobile/more"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
            aria-label="More options"
          >
            <Menu className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
