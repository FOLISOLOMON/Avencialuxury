"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { clearAllOfflineData } from "@/lib/mobile/db";

const PUBLIC_PREFIXES = [
  "/login",
  "/setup",
  "/forgot-password",
  "/reset-password",
  "/invite",
];

export function SessionMonitor() {
  const pathname = usePathname();
  const [ejection, setEjection] = useState<{
    active: boolean;
    title: string;
    message: string;
  }>({
    active: false,
    title: "",
    message: "",
  });

  const isEjectingRef = useRef(false);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isPublicRoute =
    !pathname || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const triggerEjection = async (reason: "deactivated" | "revoked" | "unauthorized") => {
    if (isEjectingRef.current) return;
    isEjectingRef.current = true;

    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    const title =
      reason === "deactivated"
        ? "Account Deactivated"
        : reason === "revoked"
        ? "Session Terminated"
        : "Session Expired";

    const message =
      reason === "deactivated"
        ? "Your account has been deactivated by the business administrator. All active sessions have been revoked."
        : reason === "revoked"
        ? "Your session has been terminated by the administrator. Please sign in again."
        : "Your session has expired. Please sign in again.";

    setEjection({
      active: true,
      title,
      message,
    });

    // 1. Purge all offline IndexedDB caches immediately
    try {
      await clearAllOfflineData();
    } catch (e) {
      console.warn("Could not clear offline cache during ejection:", e);
    }

    // 2. Clear local storage items
    try {
      localStorage.removeItem("avencia_user");
      localStorage.removeItem("avencia_business");
      sessionStorage.clear();
    } catch (e) {}

    // 3. Inform server to finalize logout
    try {
      fetch("/api/auth/logout", {
        method: "POST",
        keepalive: true,
      }).catch(() => {});
    } catch (e) {}

    // 4. Force browser redirect to login with security notice
    setTimeout(() => {
      const redirectUrl =
        reason === "deactivated"
          ? "/login?deactivated=true"
          : "/login?session_revoked=true";
      window.location.replace(redirectUrl);
    }, 1200);
  };

  const verifySession = async () => {
    if (isPublicRoute || isEjectingRef.current) return;

    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (res.status === 403 || res.status === 401) {
        let json: any = {};
        try {
          json = await res.json();
        } catch (e) {}

        if (json.deactivated || res.status === 403) {
          triggerEjection("deactivated");
        } else {
          triggerEjection(json.sessionRevoked ? "revoked" : "unauthorized");
        }
      }
    } catch (err) {
      // Network drop / offline mode — allow offline PWA usage unless server actively rejects
    }
  };

  useEffect(() => {
    if (isPublicRoute) {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }

    // 1. Initial verification on mount / route change
    verifySession();

    // 2. Active fast heartbeat (checks every 3.5 seconds)
    heartbeatTimerRef.current = setInterval(verifySession, 3500);

    // 3. Immediate check when window or tab gains focus
    const onFocus = () => verifySession();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        verifySession();
      }
    };
    const onOnline = () => verifySession();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);

    // 4. Global fetch interceptor: Any 401/403 API response instantly triggers ejection
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (!isEjectingRef.current) {
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "";
        const isApi = url.includes("/api/") && !url.includes("/api/auth/login") && !url.includes("/api/auth/logout");

        if (isApi && (response.status === 401 || response.status === 403)) {
          response
            .clone()
            .json()
            .then((data) => {
              if (data?.deactivated || response.status === 403) {
                triggerEjection("deactivated");
              } else if (data?.sessionRevoked || response.status === 401) {
                triggerEjection("revoked");
              }
            })
            .catch(() => {
              triggerEjection("unauthorized");
            });
        }
      }

      return response;
    };

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
      window.fetch = originalFetch;
    };
  }, [pathname, isPublicRoute]);

  if (!ejection.active) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[#141414] border border-amber-500/30 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl shadow-amber-500/10">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
          <ShieldAlert className="w-7 h-7 text-amber-400 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-white tracking-tight">
            {ejection.title}
          </h3>
          <p className="text-xs text-neutral-300 leading-relaxed">
            {ejection.message}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-2 text-xs font-medium text-amber-400/90">
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          <span>Redirecting to sign in...</span>
        </div>
      </div>
    </div>
  );
}
