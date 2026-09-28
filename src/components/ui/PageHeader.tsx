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
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backLink.label}</span>
          </Link>
        )}
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/50">
              <Icon className="w-5 h-5" />
            </div>
          )}
          {title && (
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              {title}
              {badge}
            </h1>
          )}
        </div>
        {subtitle && (
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
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
