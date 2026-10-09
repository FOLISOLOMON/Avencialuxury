"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Lock, ShieldCheck, AlertCircle } from "lucide-react";

export function QuickPinLock({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [storedPin, setStoredPin] = useState<string | null>(null);

  useEffect(() => {
    const pin = localStorage.getItem("avencia_quick_pin");
    const sessionAuth = sessionStorage.getItem("avencia_pin_unlocked");

    if (pin) {
      setStoredPin(pin);
      if (sessionAuth !== "true") {
        setIsLocked(true);
      }
    }
  }, []);

  const handleKeyPress = (num: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);
      setPinError("");

      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError("");
  };

  const verifyPin = (input: string) => {
    if (storedPin && input === storedPin) {
      sessionStorage.setItem("avencia_pin_unlocked", "true");
      setIsLocked(false);
      setPinInput("");
    } else {
      setPinError("Incorrect PIN. Please try again.");
      setPinInput("");
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0D0D]/80 backdrop-blur-xl flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-card rounded-lg border border-border shadow-lg p-8 max-w-sm w-full text-center space-y-6">
        {/* Header with Logo */}
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-md bg-[#0D0D0D] p-2 border border-border flex items-center justify-center mx-auto overflow-hidden">
            <Image
              src="/logo/Avencia gold logo.png"
              alt="Avencia Logo"
              width={56}
              height={56}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight flex items-center justify-center gap-1.5">
              <Lock className="w-4 h-4 text-primary" /> Avencia Quick PIN
            </h2>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Enter your 4-digit security PIN to access
            </p>
          </div>
        </div>

        {/* PIN Indicators */}
        <div className="flex items-center justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-colors ${
                idx < pinInput.length
                  ? "bg-primary border-primary"
                  : "border-border bg-muted/40"
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {pinError ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium py-2 px-3 rounded-md flex items-center justify-center gap-1.5 animate-in fade-in duration-150">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{pinError}</span>
          </div>
        ) : (
          <div className="h-8" />
        )}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="w-16 h-14 rounded-md bg-muted/40 border border-border text-foreground font-semibold text-lg hover:bg-muted hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPinInput("")}
            className="w-16 h-14 rounded-md bg-muted/40 border border-border text-muted-foreground font-medium text-xs hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="w-16 h-14 rounded-md bg-muted/40 border border-border text-foreground font-semibold text-lg hover:bg-muted hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-16 h-14 rounded-md bg-muted/40 border border-border text-muted-foreground font-medium text-base hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {/* Security badge footer */}
        <div className="pt-3 border-t border-border flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Protected by Avencia OS Session Lock
        </div>
      </div>
    </div>
  );
}
