"use client";

import { useState, useEffect, useCallback } from "react";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type PwaPlatform = "ios" | "android" | "other";

export type InstallOutcome =
  | "accepted"
  | "dismissed"
  | "manual_needed"
  | "already_installed"
  | "unavailable";

const STORAGE_KEY_INSTALLED = "avencia_pwa_installed";
const STORAGE_KEY_DISMISSED_UNTIL = "avencia_pwa_dismissed_until";
const COOLDOWN_DAYS = 7;

// Module-level global to retain beforeinstallprompt even if component mounts after the event
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalPromptListenerAttached = false;

if (typeof window !== "undefined" && !globalPromptListenerAttached) {
  globalPromptListenerAttached = true;
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    // Prevent mini-infobar on Android Chrome
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent("avencia:pwa-prompt-ready"));
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    try {
      localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("avencia:pwa-installed"));
  });
}

export function detectIsStandalone(): boolean {
  if (typeof window === "undefined") return false;

  const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isAndroidApp = typeof document !== "undefined" && document.referrer.includes("android-app://");

  return Boolean(isStandaloneMedia || isIosStandalone || isAndroidApp);
}

export function detectPlatform(): PwaPlatform {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent || "";
  const maxTouchPoints = window.navigator.maxTouchPoints || 0;

  // iOS check (including iPad on iPadOS with desktop Safari UA)
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === "MacIntel" && maxTouchPoints > 1);

  if (isIOS) return "ios";

  // Android check
  if (/android/i.test(ua)) return "android";

  return "other";
}

export function detectIsSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const isSafari = /safari/i.test(ua) && !/chrome|crios|crmo|edg|opr|fxios/i.test(ua);
  return isSafari;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [platform, setPlatform] = useState<PwaPlatform>("other");
  const [isSafari, setIsSafari] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  // Sync state on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone = detectIsStandalone();
    setIsStandalone(standalone);

    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);

    const safari = detectIsSafari();
    setIsSafari(safari);

    let installedInStorage = false;
    let dismissedInStorage = false;

    try {
      installedInStorage = localStorage.getItem(STORAGE_KEY_INSTALLED) === "true";
      const dismissedUntilStr = localStorage.getItem(STORAGE_KEY_DISMISSED_UNTIL);
      if (dismissedUntilStr) {
        const dismissedUntil = parseInt(dismissedUntilStr, 10);
        if (!isNaN(dismissedUntil) && Date.now() < dismissedUntil) {
          dismissedInStorage = true;
        } else if (!isNaN(dismissedUntil) && Date.now() >= dismissedUntil) {
          localStorage.removeItem(STORAGE_KEY_DISMISSED_UNTIL);
        }
      }
    } catch (_) {}

    setIsInstalled(standalone || installedInStorage);
    setIsDismissed(dismissedInStorage);

    // Pick up module-level prompt if present
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }

    const handlePromptReady = () => {
      setDeferredPrompt(globalDeferredPrompt);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("avencia:pwa-prompt-ready", handlePromptReady);
    window.addEventListener("avencia:pwa-installed", handleAppInstalled);

    return () => {
      window.removeEventListener("avencia:pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("avencia:pwa-installed", handleAppInstalled);
    };
  }, []);

  /**
   * User selects "Maybe Later"
   * Immediately closes the prompt and applies a cooldown
   */
  const dismissPrompt = useCallback((days: number = COOLDOWN_DAYS) => {
    try {
      const cooldownMs = days * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY_DISMISSED_UNTIL, String(Date.now() + cooldownMs));
    } catch (_) {}
    setIsDismissed(true);
    setIsModalOpen(false);
  }, []);

  /**
   * User selects "Install App"
   * - If native beforeinstallprompt is ready: trigger native browser dialog
   * - If on iOS Safari or prompt not ready: open clear step-by-step instructions
   */
  const triggerInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (isStandalone) {
      return "already_installed";
    }

    // If native prompt is available (e.g. Android Chrome)
    const promptToUse = deferredPrompt || globalDeferredPrompt;

    if (promptToUse) {
      try {
        setIsInstalling(true);
        await promptToUse.prompt();
        const choiceResult = await promptToUse.userChoice;

        if (choiceResult.outcome === "accepted") {
          try {
            localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
          } catch (_) {}
          setIsInstalled(true);
          setDeferredPrompt(null);
          globalDeferredPrompt = null;
          setIsInstalling(false);
          return "accepted";
        } else {
          // User cancelled native prompt; apply cooldown
          dismissPrompt(COOLDOWN_DAYS);
          setIsInstalling(false);
          return "dismissed";
        }
      } catch (err) {
        console.warn("[Avencia PWA] Error triggering native install prompt:", err);
        setIsInstalling(false);
        // Fallback to manual instructions
        setIsModalOpen(true);
        return "manual_needed";
      }
    }

    // If native prompt unavailable (e.g. iOS Safari, Firefox, or unsupported browser),
    // open the instructions panel
    setIsModalOpen(true);
    return "manual_needed";
  }, [deferredPrompt, dismissPrompt, isStandalone]);

  /**
   * Manually open instructions modal (e.g. from Settings or Help)
   */
  const openInstructions = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  /**
   * Close instructions modal
   */
  const closeInstructions = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  /**
   * Clears dismissal cooldown for testing or manual prompt re-triggering
   */
  const clearDismissal = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_DISMISSED_UNTIL);
    } catch (_) {}
    setIsDismissed(false);
  }, []);

  const canPromptNative = Boolean(deferredPrompt || globalDeferredPrompt);
  const showBanner = !isStandalone && !isInstalled && !isDismissed;

  return {
    isStandalone,
    isInstalled,
    isDismissed,
    showBanner,
    canPromptNative,
    platform,
    isIOS: platform === "ios",
    isAndroid: platform === "android",
    isSafari,
    isModalOpen,
    isInstalling,
    triggerInstall,
    dismissPrompt,
    openInstructions,
    closeInstructions,
    clearDismissal,
  };
}
