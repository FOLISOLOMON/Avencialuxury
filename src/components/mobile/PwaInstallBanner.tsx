"use client";

import React from "react";
import Image from "next/image";
import { Download, X, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePwaInstall } from "@/lib/hooks/usePwaInstall";
import { PwaInstallModal } from "./PwaInstallModal";

interface PwaInstallBannerProps {
  className?: string;
}

export function PwaInstallBanner({ className = "" }: PwaInstallBannerProps) {
  const {
    showBanner,
    isStandalone,
    isInstalled,
    isIOS,
    platform,
    canPromptNative,
    isModalOpen,
    isInstalling,
    triggerInstall,
    dismissPrompt,
    openInstructions,
    closeInstructions,
  } = usePwaInstall();

  // If running in standalone mode or already installed or dismissed, do not render banner
  if (!showBanner) {
    return (
      <PwaInstallModal
        isOpen={isModalOpen}
        onClose={closeInstructions}
        platform={platform}
        canPromptNative={canPromptNative}
        onNativeInstall={triggerInstall}
        isInstalling={isInstalling}
      />
    );
  }

  const handleInstallClick = async () => {
    await triggerInstall();
  };

  const handleDismissClick = () => {
    dismissPrompt(7); // 7-day cooldown
  };

  return (
    <>
      <div
        className={`p-4 rounded-xl bg-card border border-border shadow-xs space-y-3 transition-all ${className}`}
        role="region"
        aria-label="Install Avencia Application"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-background border border-primary/30 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <Image
                src="/logo/Avencia gold icon logo.png"
                alt="Avencia"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-foreground tracking-tight">
                  Install Avencia
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary/15 text-primary border border-primary/25 uppercase">
                  Fast POS
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                Get quicker access to your sales, customers and stock by adding Avencia to your phone&apos;s home screen.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismissClick}
            className="w-7 h-7 -mr-1 -mt-1 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-colors shrink-0"
            aria-label="Dismiss prompt"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="flex-1 text-xs font-bold"
            isLoading={isInstalling}
            onClick={handleInstallClick}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Install App
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={handleDismissClick}
          >
            Maybe Later
          </Button>
        </div>
      </div>

      {/* Manual Instructions Dialog */}
      <PwaInstallModal
        isOpen={isModalOpen}
        onClose={closeInstructions}
        platform={platform}
        canPromptNative={canPromptNative}
        onNativeInstall={triggerInstall}
        isInstalling={isInstalling}
      />
    </>
  );
}
