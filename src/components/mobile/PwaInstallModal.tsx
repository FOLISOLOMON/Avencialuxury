"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  X,
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PwaPlatform } from "@/lib/hooks/usePwaInstall";

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: PwaPlatform;
  canPromptNative: boolean;
  onNativeInstall?: () => void;
  isInstalling?: boolean;
}

export function PwaInstallModal({
  isOpen,
  onClose,
  platform,
  canPromptNative,
  onNativeInstall,
  isInstalling = false,
}: PwaInstallModalProps) {
  const [activeTab, setActiveTab] = useState<"ios" | "android">(
    platform === "ios" ? "ios" : "android"
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-md bg-card border-t sm:border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 z-10 max-h-[90vh] overflow-y-auto">
        {/* Header with Brand Logo & Close Button */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-background border border-primary/30 p-1.5 flex items-center justify-center shadow-xs">
              <Image
                src="/logo/Avencia gold icon logo.png"
                alt="Avencia"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2
                  id="pwa-install-title"
                  className="text-sm font-bold text-foreground tracking-tight"
                >
                  Install Avencia
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary/15 text-primary border border-primary/25 uppercase">
                  Mobile App
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                One-tap access directly on your phone
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform Selector Switch (iPhone / Android) */}
        <div className="flex rounded-xl bg-muted/60 p-1 mb-4 border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("ios")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "ios"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone & iPad</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("android")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "android"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
        </div>

        {/* Tab 1: iOS Safari Steps */}
        {activeTab === "ios" && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/80 text-xs text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                iOS Safari Installation
              </span>
              <p className="text-[11px] leading-relaxed">
                Apple requires installing web apps through the Safari browser. Follow these 4 quick steps:
              </p>
            </div>

            <ol className="space-y-2.5 text-xs">
              {/* Step 1 */}
              <li className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Open in Safari</p>
                  <p className="text-[11px] text-muted-foreground">
                    Ensure you are viewing this page in Safari (not an in-app browser).
                  </p>
                </div>
              </li>

              {/* Step 2 */}
              <li className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    Tap the Share button
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-primary border border-border text-[10px] font-bold">
                      <Share className="w-3 h-3 mr-1" /> Share
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Located in the toolbar at the bottom of your iPhone screen (or top on iPad).
                  </p>
                </div>
              </li>

              {/* Step 3 */}
              <li className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    Select &apos;Add to Home Screen&apos;
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-foreground border border-border text-[10px] font-bold">
                      <PlusSquare className="w-3 h-3 mr-1 text-primary" /> Add
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Scroll down the options list and select <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </li>

              {/* Step 4 */}
              <li className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Confirm by tapping &apos;Add&apos;</p>
                  <p className="text-[11px] text-muted-foreground">
                    Tap <strong>Add</strong> in the top-right corner. The Avencia icon will appear on your home screen.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Tab 2: Android Chrome Steps */}
        {activeTab === "android" && (
          <div className="space-y-3">
            {canPromptNative && onNativeInstall ? (
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-xs space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>One-Tap Install Ready</span>
                </div>
                <p className="text-[11px] text-foreground leading-relaxed">
                  Your Android browser supports direct 1-tap installation. Tap below to install Avencia immediately:
                </p>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  isLoading={isInstalling}
                  onClick={onNativeInstall}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Install App Now
                </Button>
              </div>
            ) : null}

            <div className="p-3 rounded-xl bg-muted/30 border border-border/80 text-xs text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <MoreVertical className="w-3.5 h-3.5 text-primary" />
                Browser Menu Installation
              </span>
              <p className="text-[11px] leading-relaxed">
                If the automatic prompt is not shown, install manually in Chrome:
              </p>
            </div>

            <ol className="space-y-2.5 text-xs">
              {/* Step 1 */}
              <li className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    Tap the Chrome Menu
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-foreground border border-border text-[10px] font-bold">
                      <MoreVertical className="w-3 h-3 text-primary" /> Menu
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Tap the three dots (⋮) in the top-right corner of Google Chrome.
                  </p>
                </div>
              </li>

              {/* Step 2 */}
              <li className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Select &apos;Install app&apos; or &apos;Add to Home screen&apos;</p>
                  <p className="text-[11px] text-muted-foreground">
                    Look for <strong>Install app</strong> or <strong>Add to Home screen</strong> in the menu list.
                  </p>
                </div>
              </li>

              {/* Step 3 */}
              <li className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">Confirm &apos;Install&apos;</p>
                  <p className="text-[11px] text-muted-foreground">
                    Tap <strong>Install</strong>. Avencia will be added to your home screen and app drawer.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Benefits Note */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Free • No App Store download needed
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
