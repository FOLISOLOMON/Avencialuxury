"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  Button,
  IconButton,
  Input,
  Select,
  Card,
  Badge,
} from "@/components/ui";
import {
  Settings,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Bell,
  Building2,
  Sliders,
  Lock,
  Sun,
  Moon,
  Monitor,
  Activity,
  History,
  KeyRound,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { NotificationSettingsCard } from "@/components/notifications/NotificationSettingsCard";


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
  const [pinMode, setPinMode] = useState<"view" | "set">("view");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Automation & WhatsApp History State
  const [automationExecutions, setAutomationExecutions] = useState<any[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, histRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/automation/history").catch(() => null),
      ]);

      const json = await settingsRes.json();
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

      if (histRes) {
        const histJson = await histRes.json();
        if (histJson.success) {
          setAutomationExecutions(histJson.data.automationExecutions || []);
          setWhatsappLogs(histJson.data.whatsappLogs || []);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setStoredPin(localStorage.getItem("avencia_quick_pin"));
    fetchSettings();
  }, []);

  const handleSavePin = () => {
    setPinError(null);
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError("PIN must be exactly 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("PIN codes do not match. Please verify.");
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    const threshold = parseInt(lowStockThreshold, 10);
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
          largeExpenseThreshold: parseFloat(largeExpenseThreshold || "1000"),
          batchNearCompletionThreshold: parseFloat(batchNearCompletionThreshold || "10"),
          dormantCustomerDays: parseInt(dormantCustomerDays || "30", 10),
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
      setSaveError(err.message || "Failed to submit settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-24 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          System Preferences & Configuration
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Operating rules, theme appearance, security PIN and notification thresholds
        </p>
      </div>

      {/* Unified Settings Form Container */}
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {/* SECTION 1: THEME & DISPLAY */}
        <div className="p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Interface Appearance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose your interface color scheme. Adapts seamlessly across light stone and graphite dark.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 max-w-xs pt-1">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-medium transition-colors ${
                theme === "light"
                  ? "border-primary bg-primary/10 text-gold-ink font-semibold"
                  : "border-border text-foreground hover:bg-secondary"
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-medium transition-colors ${
                theme === "dark"
                  ? "border-primary bg-primary/10 text-gold-ink font-semibold"
                  : "border-border text-foreground hover:bg-secondary"
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-medium transition-colors ${
                theme === "system"
                  ? "border-primary bg-primary/10 text-gold-ink font-semibold"
                  : "border-border text-foreground hover:bg-secondary"
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: BUSINESS ENTITY REFERENCE */}
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Business Entity & Credentials</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Store legal trade name, contact phone, physical location and owner credentials
            </p>
          </div>

          <Link href="/profile">
            <Button variant="outline" size="sm" className="gap-1 font-medium">
              <span>Manage Profile</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {/* SECTION 3: OPERATING THRESHOLDS & PREFERENCES */}
        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Operating Rules & Thresholds</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Parameters governing POS payment options, stock alert levels, and expenditure warnings
            </p>
          </div>

          {saveError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-md bg-success/10 text-success text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Business preferences saved successfully.</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Low Stock Alert Threshold"
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                hint="Triggers warning when bottles fall to this count"
              />

              <Select
                label="Operating Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: "GHS", label: "Ghanaian Cedi (GH₵)" },
                  { value: "USD", label: "US Dollar ($)" },
                  { value: "NGN", label: "Nigerian Naira (₦)" },
                ]}
              />

              <Select
                label="Default POS Tender"
                value={defaultPaymentMethod}
                onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                options={[
                  { value: "CASH", label: "Cash" },
                  { value: "BANK_TRANSFER", label: "Bank Transfer" },
                  { value: "MOMO", label: "Mobile Money (MoMo)" },
                  { value: "CARD", label: "POS Card Payment" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
              <Input
                label="Large Expense Alert (GH₵)"
                type="number"
                min="0"
                value={largeExpenseThreshold}
                onChange={(e) => setLargeExpenseThreshold(e.target.value)}
                hint="Flags expenditure above this sum"
              />

              <Input
                label="Batch Sell-Out Alert (%)"
                type="number"
                min="1"
                max="100"
                value={batchNearCompletionThreshold}
                onChange={(e) => setBatchNearCompletionThreshold(e.target.value)}
                hint="Warns when remaining stock is <= %"
              />

              <Input
                label="Dormant Client Days"
                type="number"
                min="1"
                value={dormantCustomerDays}
                onChange={(e) => setDormantCustomerDays(e.target.value)}
                hint="Days before client is flagged dormant"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" isLoading={saving}>
                Save Preferences
              </Button>
            </div>
          </form>
        </div>

        {/* SECTION 4: SECURITY & PIN LOCK */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Register Security & Screen Lock</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set a 4-digit code to protect your business ledger on shared counters or tablets
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {storedPin ? "PIN Active" : "No PIN Set"}
            </span>
          </div>

          {pinSuccess && (
            <div className="p-3 rounded-md bg-success/10 text-success text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>PIN security settings updated.</span>
            </div>
          )}

          {pinError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {pinMode === "view" ? (
            <div className="flex items-center gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewPin("");
                  setConfirmPin("");
                  setPinMode("set");
                }}
              >
                <span>{storedPin ? "Change 4-Digit PIN" : "Configure 4-Digit PIN"}</span>
              </Button>

              {storedPin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePin}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Disable PIN
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-md bg-secondary/50 border border-border max-w-sm pt-2">
              <Input
                label="Enter 4-Digit PIN"
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
              />
              <Input
                label="Confirm 4-Digit PIN"
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
              />
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setPinMode("view")}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={handleSavePin}
                >
                  Save PIN
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: EXTERNAL WEB PUSH NOTIFICATIONS & DEBT REMINDERS */}
        <div className="p-5 space-y-4">
          <NotificationSettingsCard />
        </div>
      </div>
    </div>
  );
}
