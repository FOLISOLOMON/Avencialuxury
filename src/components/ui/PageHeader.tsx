"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: any;
  action?: React.ReactNode;
  actions?: React.ReactNode;
  backLink?: { href: string; label: string };
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  icon: Icon,
  action,
  actions,
  backLink,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6 font-sans", className)}>
      <div>
        {backLink && (
          <Link
            href={backLink.href}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#525252] dark:text-[#D4D4D4] hover:text-gold-600 dark:hover:text-gold-400 transition-colors bg-white dark:bg-[#151515] px-3.5 py-2 rounded-xl border border-[#E5E2D8] dark:border-[#2A2A2A] shadow-xs mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-gold-600 dark:text-gold-400" />
            <span>{backLink.label}</span>
          </Link>
        )}
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-2 rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20">
              <Icon className="w-5 h-5" />
            </div>
          )}
          {title && (
            <h2 className="text-lg md:text-xl font-black text-[#171717] dark:text-[#F5F5F5] tracking-tight flex items-center gap-2">
              {title}
              {badge}
            </h2>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] font-medium mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {(action || actions) && (
        <div className="flex items-center gap-2 shrink-0">
          {action}
          {actions}
        </div>
      )}
    </div>
  );
}
