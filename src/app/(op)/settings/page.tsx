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
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Settings & Preferences
        </h1>
        <p className="text-sm text-muted-foreground">
          System configurations, theme appearance, security PIN & alert automation
        </p>
      </div>

      {/* SECTION 1: APPEARANCE & THEME */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Sun className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">Appearance & Theme</h3>
        </div>

        <p className="text-xs text-muted-foreground">
          Choose your interface appearance. Avencia adapts smoothly across light stone and graphite dark modes.
        </p>

        <div className="grid grid-cols-3 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
              theme === "light"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border text-foreground hover:bg-muted/40"
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
              theme === "dark"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border text-foreground hover:bg-muted/40"
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
              theme === "system"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border text-foreground hover:bg-muted/40"
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>System</span>
          </button>
        </div>
      </Card>

      {/* SECTION 2: BUSINESS PROFILE LINK */}
      <Card className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Business Profile & Credentials</h3>
            <p className="text-xs text-muted-foreground">
              Store legal trade name, phone contacts, address & owner email
            </p>
          </div>
        </div>

        <Link href="/profile">
          <Button variant="outline" size="sm" className="gap-1 font-bold">
            <span>Manage Profile</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </Card>

      {/* SECTION 3: OPERATING THRESHOLDS & PREFERENCES */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Sliders className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">Operating Rules & Thresholds</h3>
        </div>

        {saveError && (
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-success/10 text-success text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Business preferences saved successfully!</span>
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
              hint="Alert when bottles fall to this count"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
            <Input
              label="Large Expense Alert (GH₵)"
              type="number"
              min="0"
              value={largeExpenseThreshold}
              onChange={(e) => setLargeExpenseThreshold(e.target.value)}
              hint="Flags expenses above this amount"
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
              hint="Days before client is marked dormant"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="primary" className="font-black" isLoading={saving}>
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>

      {/* SECTION 4: SECURITY & QUICK PIN LOCK */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">Screen Lock & Quick PIN</h3>
          </div>
          <Badge variant={storedPin ? "success" : "outline"}>
            {storedPin ? "PIN Active" : "No PIN Set"}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          Set a 4-digit numeric code to lock and secure your Avencia register on shared shop devices.
        </p>

        {pinSuccess && (
          <div className="p-3 rounded-xl bg-success/10 text-success text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>PIN security settings updated!</span>
          </div>
        )}

        {pinError && (
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{pinError}</span>
          </div>
        )}

        {pinMode === "view" ? (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewPin("");
                setConfirmPin("");
                setPinMode("set");
              }}
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5 text-primary" />
              <span>{storedPin ? "Change 4-Digit PIN" : "Setup 4-Digit PIN"}</span>
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
          <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border max-w-sm">
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
                className="flex-1 font-black"
                onClick={handleSavePin}
              >
                Save PIN
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
