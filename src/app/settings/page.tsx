"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useTheme } from "@/components/theme/ThemeProvider";
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
  Building2,
  Sliders,
  Lock,
  Cpu,
  TrendingUp,
  Layers,
  Users,
  Mail,
  Sun,
  Moon,
  Monitor,
  MessageSquare,
  History,
  Activity,
  RefreshCw,
} from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings State
  const [lowStockThreshold, setLowStockThreshold] = useState("3");
  const [currency, setCurrency] = useState("GHS");
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState("CASH");

  // Automation Engine Rules State
  const [largeExpenseThreshold, setLargeExpenseThreshold] = useState("1000");
  const [batchNearCompletionThreshold, setBatchNearCompletionThreshold] = useState("10");
  const [dormantCustomerDays, setDormantCustomerDays] = useState("30");
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(true);
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(true);

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

  // Automation & WhatsApp History State
  const [historyLoading, setHistoryLoading] = useState(false);
  const [automationExecutions, setAutomationExecutions] = useState<any[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);

  const fetchAutomationHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/automation/history");
      const json = await res.json();
      if (json.success) {
        setAutomationExecutions(json.data.automationExecutions || []);
        setWhatsappLogs(json.data.whatsappLogs || []);
      }
    } catch (e) {
      console.error("Failed to load automation history", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    setStoredPin(localStorage.getItem("avencia_quick_pin"));
    fetchAutomationHistory();
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
        setLowStockThreshold((json.data.lowStockThreshold ?? 3).toString());
        setCurrency(json.data.currency || "GHS");
        setDefaultPaymentMethod(json.data.defaultPaymentMethod || "CASH");
        setLargeExpenseThreshold((json.data.largeExpenseThreshold ?? 1000).toString());
        setBatchNearCompletionThreshold((json.data.batchNearCompletionThreshold ?? 10).toString());
        setDormantCustomerDays((json.data.dormantCustomerDays ?? 30).toString());
        setDailySummaryEnabled(json.data.dailySummaryEnabled ?? true);
        setWeeklySummaryEnabled(json.data.weeklySummaryEnabled ?? true);
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

    const threshold = parseInt(lowStockThreshold, 10);
    if (isNaN(threshold) || threshold < 1) {
      setSaveError("Low stock threshold must be at least 1 unit.");
      return;
    }

    const largeExp = parseFloat(largeExpenseThreshold);
    if (isNaN(largeExp) || largeExp < 0) {
      setSaveError("Large expense threshold must be a valid non-negative number.");
      return;
    }

    const batchNear = parseFloat(batchNearCompletionThreshold);
    if (isNaN(batchNear) || batchNear <= 0 || batchNear > 100) {
      setSaveError("Batch near completion threshold must be between 1% and 100%.");
      return;
    }

    const dormantDays = parseInt(dormantCustomerDays, 10);
    if (isNaN(dormantDays) || dormantDays < 1) {
      setSaveError("Dormant customer threshold must be at least 1 day.");
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
          largeExpenseThreshold: largeExp,
          batchNearCompletionThreshold: batchNear,
          dormantCustomerDays: dormantDays,
          dailySummaryEnabled,
          weeklySummaryEnabled,
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
      {/* Standardized Page Header */}
      <PageHeader
        title="Settings"
        subtitle="Grouped settings & system configurations"
      />

      {loading ? (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-12 bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-spin" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading business settings...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION: APPEARANCE & THEME */}
          <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Sun className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Appearance & Theme</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select your preferred color theme across Avencia 2.0 interface.
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  theme === "light"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-500"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>☀ Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  theme === "dark"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-500"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>☾ Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  theme === "system"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-500"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>◐ System</span>
              </button>
            </div>
          </div>

          {/* SECTION 1: BUSINESS PROFILE LINK BANNER */}
          <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Business Profile & Identity</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage business legal name, contact phone, store address, and owner credentials.
                </p>
              </div>
            </div>
            <a
              href="/profile"
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shrink-0"
            >
              Manage Business Profile
            </a>
          </div>

          {/* SECTION 2: PREFERENCES (CURRENCY, THRESHOLDS, PAYMENT METHODS & AUTOMATION RULES) */}
          <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Preferences & Operating Thresholds</h3>
            </div>

            {saveError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Business preferences and automation rules saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* General Operating Preferences */}
              <div className="space-y-4">
                {/* Low Stock Threshold */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    Global Low-Stock Alert Threshold (Units)
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Products with stock levels at or below this number will display low-stock warning badges.
                  </p>
                  <input
                    type="number"
                    min="1"
                    required
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full sm:w-64 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                  />
                </div>

                {/* Business Currency */}
                <div className="space-y-1 pt-2">
                  <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Default Business Currency
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Select the standard currency code used across sales receipts and financial summaries.
                  </p>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full sm:w-64 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
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
                  <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Default Payment Method for Rapid Sales
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Default selected option when creating new sale entry.
                  </p>
                  <select
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                    className="w-full sm:w-64 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="MOBILE_MONEY">Mobile Money (MoMo)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
              </div>

              {/* AUTOMATION ENGINE RULES & CONTROLS */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 pb-2">
                  <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Automation Engine Rules & Controls</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Large Expense Threshold */}
                  <div className="space-y-1 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                    <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                      Large Expense Alert Threshold (GH₵)
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Expenses exceeding this amount will trigger high-priority alerts (default GH₵1,000).
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      required
                      value={largeExpenseThreshold}
                      onChange={(e) => setLargeExpenseThreshold(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                    />
                  </div>

                  {/* Batch Near Completion Threshold */}
                  <div className="space-y-1 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                    <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Batch Near Completion Threshold (%)
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Batches at or below this stock percentage trigger restock notifications (default 10%).
                    </p>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={batchNearCompletionThreshold}
                      onChange={(e) => setBatchNearCompletionThreshold(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                    />
                  </div>

                  {/* Dormant Customer Threshold */}
                  <div className="space-y-1 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Dormant Customer Inactivity Threshold (Days)
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Customers with no purchases after this number of days are flagged for follow-up (default 30 days).
                    </p>
                    <input
                      type="number"
                      min="1"
                      required
                      value={dormantCustomerDays}
                      onChange={(e) => setDormantCustomerDays(e.target.value)}
                      className="w-full sm:w-64 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Automated Summary Toggles */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <div className="space-y-0.5">
                      <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Daily Business Summary Digest
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Automatically generate daily sales performance and inventory status reports.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDailySummaryEnabled(!dailySummaryEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        dailySummaryEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          dailySummaryEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <div className="space-y-0.5">
                      <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Weekly Performance Digest
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Automatically compile weekly revenue summaries, margins, and batch metrics.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWeeklySummaryEnabled(!weeklySummaryEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        weeklySummaryEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          weeklySummaryEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all font-bold text-xs disabled:opacity-50 flex items-center gap-2 touch-manipulation active:scale-95"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Business Preferences & Automation Rules"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 3: SECURITY & QUICK PIN */}
          <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Security & Quick PIN Access</h3>
            </div>

            {pinSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  {storedPin
                    ? "PIN updated successfully! The lock screen will protect app access."
                    : "PIN removed. Access lock disabled."}
                </span>
              </div>
            )}

            {pinError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {pinMode === "view" && (
              <div className="space-y-4">
                {storedPin ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/60 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-emerald-950 dark:text-emerald-200">4-Digit Quick PIN Active</h4>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          App requires PIN authentication to access dashboard and POS sales.
                        </p>
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
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-700"
                      >
                        Change PIN
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePin}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50"
                      >
                        Remove PIN
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">No Quick PIN Configured</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Set a 4-digit PIN to lock your Avencia POS session on mobile & desktop.
                        </p>
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
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
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
                    className="w-48 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-mono font-bold text-center tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
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
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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

          {/* SECTION 4: AUTOMATION & WHATSAPP ACTIVITY HISTORY */}
          <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Automation & WhatsApp Delivery Logs</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Live execution history, WhatsApp delivery statuses, deduplication refs & error diagnostics.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchAutomationHistory}
                disabled={historyLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* WhatsApp Message Delivery Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span>WhatsApp Delivery Logs</span>
              </h4>

              {whatsappLogs.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No WhatsApp messages recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Message Type</th>
                        <th className="px-4 py-3">Recipient</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Delivery Status</th>
                        <th className="px-4 py-3">Failure / Diagnostic</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {whatsappLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {new Date(log.sentAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" })}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {log.messageType}
                          </td>
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                            {log.customer?.name || log.recipientName || "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                            {log.recipientPhone}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {log.amount != null ? `GH₵${Number(log.amount).toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                log.status === "DELIVERED" || log.status === "SENT"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : log.status === "FAILED"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                            {log.failureReason || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Automation Execution Event History Table */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-500" />
                <span>Automation Execution Events</span>
              </h4>

              {automationExecutions.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No automation events recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Event Type</th>
                        <th className="px-4 py-3">Entity</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Deduplication Key</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {automationExecutions.map((exec) => (
                        <tr key={exec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {new Date(exec.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" })}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {exec.eventType}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">
                            {exec.entityType}: {exec.entityId}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                exec.status === "SUCCESS"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : exec.status === "SKIPPED"
                                  ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                            >
                              {exec.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-mono text-[11px] truncate max-w-xs">
                            {exec.dedupeKey || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
