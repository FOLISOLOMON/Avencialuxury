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
    // Check if user set a quick PIN in local storage
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
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xl flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-indigo-500/25 p-8 max-w-sm w-full text-center space-y-6">
        {/* Header with Logo */}
        <div className="space-y-3">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 via-slate-50 to-emerald-50 p-2 border border-indigo-100 flex items-center justify-center mx-auto shadow-md shadow-indigo-500/10 overflow-hidden">
            <Image
              src="/logo/Avencia gold logo.png"
              alt="Avencia Logo"
              width={72}
              height={72}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-600" /> Avencia Quick PIN
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Enter your 4-digit security PIN to access
            </p>
          </div>
        </div>

        {/* PIN Indicators */}
        <div className="flex items-center justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                idx < pinInput.length
                  ? "bg-indigo-600 border-indigo-600 scale-110 shadow-md shadow-indigo-500/40"
                  : "border-slate-300 bg-slate-100"
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {pinError ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 animate-in shake duration-150">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{pinError}</span>
          </div>
        ) : (
          <div className="h-8" />
        )}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-xl hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 active:scale-95 transition-all shadow-sm flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPinInput("")}
            className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 font-bold text-xs hover:bg-slate-200 hover:text-slate-800 active:scale-95 transition-all flex items-center justify-center"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-xl hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 active:scale-95 transition-all shadow-sm flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 font-bold text-base hover:bg-slate-200 hover:text-slate-800 active:scale-95 transition-all flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {/* Security badge footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Protected by Avencia OS Session Lock
        </div>
      </div>
    </div>
  );
}
