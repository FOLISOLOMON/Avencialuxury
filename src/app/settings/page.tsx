"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  DollarSign,
  CreditCard,
  Bell,
  Database,
} from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings State
  const [lowStockThreshold, setLowStockThreshold] = useState("3");
  const [currency, setCurrency] = useState("GHS");
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState("CASH");

  // Save State
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // PIN Management State
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState<"view" | "set" | "confirm">("view");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  useEffect(() => {
    setStoredPin(localStorage.getItem("avencia_quick_pin"));
  }, []);

  const handleSavePin = () => {
    setPinError(null);
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError("PIN must be exactly 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("PINs do not match. Try again.");
      return;
    }
    localStorage.setItem("avencia_quick_pin", newPin);
    sessionStorage.removeItem("avencia_pin_unlocked");
    setStoredPin(newPin);
    setNewPin("");
    setConfirmPin("");
    setPinMode("view");
    setPinSuccess(true);
    setTimeout(() => setPinSuccess(false), 3000);
  };

  const handleRemovePin = () => {
    localStorage.removeItem("avencia_quick_pin");
    sessionStorage.removeItem("avencia_pin_unlocked");
    setStoredPin(null);
    setPinMode("view");
    setNewPin("");
    setConfirmPin("");
    setPinSuccess(true);
    setTimeout(() => setPinSuccess(false), 3000);
  };

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) {
        setLowStockThreshold(json.data.lowStockThreshold.toString());
        setCurrency(json.data.currency || "GHS");
        setDefaultPaymentMethod(json.data.defaultPaymentMethod || "CASH");
      } else {
        setError(json.error || "Failed to load settings");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);


  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    const threshold = parseInt(lowStockThreshold);
    if (isNaN(threshold) || threshold < 1) {
      setSaveError("Low stock threshold must be at least 1 unit.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lowStockThreshold: threshold,
          currency,
          defaultPaymentMethod,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(json.error || "Failed to save settings");
      }
    } catch (err: any) {
      setSaveError(err.message || "Failed to submit settings update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Business Preferences & Settings</h2>
        <p className="text-xs text-slate-500">
          Configure low-stock alert thresholds, currency defaults, and payment preferences.
        </p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-12 bg-white flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <p className="text-xs font-medium text-slate-500">Loading business settings...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Neon DB Status Banner */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Neon PostgreSQL Database Connected</h3>
                <p className="text-xs text-slate-400">Serverless cloud database engine with full transaction safety.</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active
            </span>
          </div>

          {/* Form Settings Box */}
          <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-6 bg-white space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-base text-slate-900">General Settings</h3>
            </div>

            {saveError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Business settings saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Low Stock Threshold */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  Global Low-Stock Alert Threshold (Units)
                </label>
                <p className="text-[11px] text-slate-500">
                  Products with stock levels at or below this number will display low-stock warning badges.
                </p>
                <input
                  type="number"
                  min="1"
                  required
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full sm:w-64 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Business Currency */}
              <div className="space-y-1 pt-2">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Default Business Currency
                </label>
                <p className="text-[11px] text-slate-500">
                  Select the standard currency code used across sales receipts and financial summaries.
                </p>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full sm:w-64 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="GHS">Ghanaian Cedi (GH₵)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="NGN">Nigerian Naira (₦)</option>
                  <option value="KES">Kenyan Shilling (KSh)</option>
                </select>
              </div>

              {/* Default Payment Method */}
              <div className="space-y-1 pt-2">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  Default Payment Method for Rapid Sales
                </label>
                <p className="text-[11px] text-slate-500">
                  Default selected option when creating new sale entry.
                </p>
                <select
                  value={defaultPaymentMethod}
                  onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                  className="w-full sm:w-64 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile Money (MoMo)</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all font-bold text-xs disabled:opacity-50 flex items-center gap-2 touch-manipulation"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Business Preferences"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Security & Quick PIN Card */}
          <div className="rounded-3xl border border-slate-100 shadow-xl shadow-indigo-500/5 p-6 bg-white space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-base text-slate-900">Security & Quick PIN Access</h3>
            </div>

            {pinSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  {storedPin
                    ? "PIN updated successfully! The lock screen will protect app access."
                    : "PIN removed. Access lock disabled."}
                </span>
              </div>
            )}

            {pinError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {pinMode === "view" && (
              <div className="space-y-4">
                {storedPin ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-emerald-950">4-Digit PIN Lock Active</h4>
                        <p className="text-[11px] text-emerald-700">App requires PIN authentication to access dashboard and sales.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNewPin("");
                          setConfirmPin("");
                          setPinError(null);
                          setPinMode("set");
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-slate-800 hover:bg-emerald-50"
                      >
                        Change PIN
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePin}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      >
                        Remove PIN
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">No Quick PIN Configured</h4>
                        <p className="text-[11px] text-slate-500">Set a 4-digit PIN to lock your Avencia POS session on mobile & desktop.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPin("");
                        setConfirmPin("");
                        setPinError(null);
                        setPinMode("set");
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all text-xs font-bold whitespace-nowrap"
                    >
                      Set 4-Digit PIN
                    </button>
                  </div>
                )}
              </div>
            )}

            {(pinMode === "set" || pinMode === "confirm") && (
              <div className="space-y-4 max-w-sm">
                <p className="text-xs font-bold text-slate-800">
                  {pinMode === "set" ? "Enter your new 4-digit PIN:" : "Re-enter your 4-digit PIN to confirm:"}
                </p>

                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={4}
                    pattern="\d*"
                    autoFocus
                    placeholder="e.g. 1234"
                    value={pinMode === "set" ? newPin : confirmPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (pinMode === "set") setNewPin(val);
                      else setConfirmPin(val);
                    }}
                    className="w-48 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-mono font-bold text-center tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPinMode("view");
                      setNewPin("");
                      setConfirmPin("");
                      setPinError(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  {pinMode === "set" ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (newPin.length !== 4) {
                          setPinError("Please enter all 4 digits.");
                          return;
                        }
                        setPinError(null);
                        setPinMode("confirm");
                      }}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all text-xs font-bold"
                    >
                      Next: Confirm PIN
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSavePin}
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                    >
                      Save & Activate PIN
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

