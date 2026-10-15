"use client";

import React from "react";
import Image from "next/image";
import {
  Smartphone,
  Download,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePwaInstall } from "@/lib/hooks/usePwaInstall";
import { PwaInstallModal } from "./PwaInstallModal";

export function PwaSettingsCard() {
  const {
    isStandalone,
    isInstalled,
    canPromptNative,
    platform,
    isModalOpen,
    isInstalling,
    triggerInstall,
    openInstructions,
    closeInstructions,
    clearDismissal,
  } = usePwaInstall();

  const handleInstallClick = async () => {
    // If dismissed previously, reset cooldown so action executes
    clearDismissal();
    await triggerInstall();
  };

  return (
    <>
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-foreground">
                  Avencia Mobile App
                </h3>
                {isStandalone ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                    Installed
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 uppercase">
                    Browser Mode
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isStandalone
                  ? "Running standalone on home screen"
                  : "Optional home screen installation"}
              </p>
            </div>
          </div>

          {!isStandalone && (
            <Button
              size="sm"
              variant="outline"
              onClick={openInstructions}
              className="text-xs"
            >
              <HelpCircle className="w-3.5 h-3.5 mr-1 text-primary" />
              Guide
            </Button>
          )}
        </div>

        {/* State description */}
        <div className="p-3 rounded-xl bg-muted/40 text-xs space-y-2">
          {isStandalone ? (
            <div className="flex items-start gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                Avencia is running in standalone app mode on your home screen with fast POS access and local sync.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Add Avencia to your phone&apos;s home screen for one-tap access without typing URLs or seeing browser address bars.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full text-xs font-bold"
                  isLoading={isInstalling}
                  onClick={handleInstallClick}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Install App
                </Button>
              </div>
            </div>
          )}
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
