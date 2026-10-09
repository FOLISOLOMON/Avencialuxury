"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Log registration
          if (process.env.NODE_ENV !== "production") {
            console.log("[Avencia SW] Service Worker active, scope:", reg.scope);
          }
        })
        .catch((err) => {
          console.warn("[Avencia SW] Service Worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
