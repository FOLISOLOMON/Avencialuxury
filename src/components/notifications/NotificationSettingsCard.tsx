"use client";

import React, { useState, useEffect } from "react";
import { useWebPush } from "@/lib/hooks/useWebPush";
import {
  Bell,
  BellRing,
  BellOff,
  Shield,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Send,
  RefreshCw,
  Trash2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface DeviceRecord {
  id: string;
  deviceName: string;
  browser: string;
  subscribedAt: string;
  lastActiveAt: string;
  endpointSnippet: string;
}

interface DeliveryLogRecord {
  id: string;
  notificationType: string;
  title: string;
  body: string;
  status: string;
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
}

export function NotificationSettingsCard() {
  const {
    isSupported,
    permission,
    isSubscribed,
    loading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
    sendTestNotification,
    refreshStatus,
  } = useWebPush();

  // Settings state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [upcomingRemindersEnabled, setUpcomingRemindersEnabled] = useState(true);
  const [upcomingDaysAdvance, setUpcomingDaysAdvance] = useState("1");
  const [dueTodayEnabled, setDueTodayEnabled] = useState(true);
  const [overdueEnabled, setOverdueEnabled] = useState(true);
  const [overdueIntervalDays, setOverdueIntervalDays] = useState("3");
  const [showCustomerDetailsInPush, setShowCustomerDetailsInPush] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState("");
  const [quietHoursEnd, setQuietHoursEnd] = useState("");
  const [timezone, setTimezone] = useState("Africa/Accra");

  // Device & delivery history state
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [logs, setLogs] = useState<DeliveryLogRecord[]>([]);
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettingsAndDevices = async () => {
    try {
      const [settingsRes, devicesRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/push/devices").catch(() => null),
      ]);

      const sJson = await settingsRes.json();
      if (sJson.success && sJson.data) {
        const s = sJson.data;
        setPushEnabled(s.pushEnabled ?? true);
        setUpcomingRemindersEnabled(s.upcomingRemindersEnabled ?? true);
        setUpcomingDaysAdvance(String(s.upcomingDaysAdvance ?? 1));
        setDueTodayEnabled(s.dueTodayEnabled ?? true);
        setOverdueEnabled(s.overdueEnabled ?? true);
        setOverdueIntervalDays(String(s.overdueIntervalDays ?? 3));
        setShowCustomerDetailsInPush(s.showCustomerDetailsInPush ?? false);
        setQuietHoursStart(s.quietHoursStart || "");
        setQuietHoursEnd(s.quietHoursEnd || "");
        setTimezone(s.timezone || "Africa/Accra");
      }

      if (devicesRes) {
        const dJson = await devicesRes.json();
        if (dJson.success) {
          setDevices(dJson.devices || []);
          setLogs(dJson.logs || []);
        }
      }
    } catch (err: any) {
      console.error("Error loading notification settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndDevices();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pushEnabled,
          upcomingRemindersEnabled,
          upcomingDaysAdvance: parseInt(upcomingDaysAdvance, 10),
          dueTodayEnabled,
          overdueEnabled,
          overdueIntervalDays: parseInt(overdueIntervalDays, 10),
          showCustomerDetailsInPush,
          quietHoursStart: quietHoursStart.trim() || null,
          quietHoursEnd: quietHoursEnd.trim() || null,
          timezone,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(json.error || "Failed to update notification settings");
      }
    } catch (err: any) {
      setSaveError(err.message || "Network error updating settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setTestSending(true);
    setTestFeedback(null);
    try {
      const res = await sendTestNotification();
      if (res.success) {
        setTestFeedback({ type: "success", text: res.message });
        fetchSettingsAndDevices();
      } else {
        setTestFeedback({ type: "error", text: res.message });
      }
    } catch (err: any) {
      setTestFeedback({ type: "error", text: err.message || "Failed to send test push" });
    } finally {
      setTestSending(false);
      setTimeout(() => setTestFeedback(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Device Subscription Status Card */}
      <Card className="p-5 border-border bg-card/60 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isSubscribed
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : "bg-primary/10 text-primary border border-primary/20"
              }`}
            >
              {isSubscribed ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">
                  This Device Push Notifications
                </h3>
                {isSubscribed ? (
                  <Badge variant="success" className="text-[10px] px-2 py-0.5">
                    Subscribed & Active
                  </Badge>
                ) : permission === "denied" ? (
                  <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                    Permission Blocked
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5">
                    Not Subscribed
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive real-time external alerts about upcoming & overdue customer debts even when
                Avencia is closed.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSubscribed ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestNotification}
                  disabled={testSending || pushLoading}
                >
                  <Send className={`w-3.5 h-3.5 mr-1.5 ${testSending ? "animate-spin" : ""}`} />
                  {testSending ? "Sending..." : "Send Test Alert"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={unsubscribe}
                  disabled={pushLoading}
                >
                  <BellOff className="w-3.5 h-3.5 mr-1.5" />
                  Unsubscribe
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={subscribe}
                disabled={pushLoading || !isSupported}
              >
                <BellRing className="w-3.5 h-3.5 mr-1.5" />
                {pushLoading ? "Connecting..." : "Enable on this Device"}
              </Button>
            )}
          </div>
        </div>

        {/* Informational notices */}
        {!isSupported && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-semibold">Web Push not supported on this browser</p>
              <p className="text-muted-foreground mt-0.5">
                If you are on an Apple iPhone or iPad, open Safari, tap the Share icon, and select
                <strong> &quot;Add to Home Screen&quot;</strong>. Launching Avencia from your home screen enables native
                push notifications.
              </p>
            </div>
          </div>
        )}

        {permission === "denied" && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-semibold">Notifications are blocked</p>
              <p className="text-muted-foreground mt-0.5">
                You previously denied notification permissions. Please open your browser or device
                site permissions and change Notifications to <strong>Allow</strong>.
              </p>
            </div>
          </div>
        )}

        {pushError && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            {pushError}
          </div>
        )}

        {testFeedback && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs border ${
              testFeedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }`}
          >
            {testFeedback.text}
          </div>
        )}
      </Card>

      {/* 2. Debt Reminders & Schedule Rules Form */}
      <form onSubmit={handleSavePreferences}>
        <Card className="p-5 border-border bg-card/60 space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Customer Debt Reminder Triggers
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure when and how often the server scheduler sends push alerts for debt accounts.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upcoming Payment Reminder */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-background/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Upcoming Due Date Reminder
                </span>
                <input
                  type="checkbox"
                  checked={upcomingRemindersEnabled}
                  onChange={(e) => setUpcomingRemindersEnabled(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Alert before a customer credit sale reaches its scheduled payment deadline.
              </p>
              <div className="pt-1">
                <label className="text-[10px] text-muted-foreground uppercase font-medium">
                  Notice in Advance
                </label>
                <select
                  value={upcomingDaysAdvance}
                  onChange={(e) => setUpcomingDaysAdvance(e.target.value)}
                  className="mt-1 w-full bg-input border border-border rounded-lg text-xs px-2.5 py-1.5 text-foreground focus:outline-hidden focus:border-primary"
                >
                  <option value="1">1 Day Before</option>
                  <option value="2">2 Days Before</option>
                  <option value="3">3 Days Before</option>
                </select>
              </div>
            </div>

            {/* Due Today Reminder */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-background/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Payment Due Today
                </span>
                <input
                  type="checkbox"
                  checked={dueTodayEnabled}
                  onChange={(e) => setDueTodayEnabled(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Alert on the exact date a recorded debt payment is expected.
              </p>
              <p className="text-[11px] text-primary/80 pt-2 font-medium">
                • Triggers on scheduled due date
              </p>
            </div>

            {/* Overdue Payment Reminder */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-background/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Overdue Payment Alerts
                </span>
                <input
                  type="checkbox"
                  checked={overdueEnabled}
                  onChange={(e) => setOverdueEnabled(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Alert when a credit sale has passed its due date with an outstanding balance.
              </p>
              <div className="pt-1">
                <label className="text-[10px] text-muted-foreground uppercase font-medium">
                  Repeat Interval
                </label>
                <select
                  value={overdueIntervalDays}
                  onChange={(e) => setOverdueIntervalDays(e.target.value)}
                  className="mt-1 w-full bg-input border border-border rounded-lg text-xs px-2.5 py-1.5 text-foreground focus:outline-hidden focus:border-primary"
                >
                  <option value="1">Repeat Daily</option>
                  <option value="2">Every 2 Days</option>
                  <option value="3">Every 3 Days (Recommended)</option>
                  <option value="5">Every 5 Days</option>
                  <option value="7">Weekly (Every 7 Days)</option>
                </select>
              </div>
            </div>

            {/* Quiet Hours & Timezone */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-background/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Quiet Hours</span>
                <span className="text-[10px] text-muted-foreground">{timezone}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Suppress push sounds during rest hours.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-medium">
                    Start (e.g. 21:00)
                  </label>
                  <input
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="mt-1 w-full bg-input border border-border rounded-lg text-xs px-2 py-1 text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-medium">
                    End (e.g. 08:00)
                  </label>
                  <input
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="mt-1 w-full bg-input border border-border rounded-lg text-xs px-2 py-1 text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Privacy & Lockscreen Protection */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-background/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-foreground">
                  Lockscreen Privacy Shield
                </span>
              </div>
              <input
                type="checkbox"
                checked={showCustomerDetailsInPush}
                onChange={(e) => setShowCustomerDetailsInPush(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              By default (recommended), push notifications disguise customer names and debt figures
              to prevent bystanders from seeing private financial data on lockscreens:
            </p>
            <div className="p-2 rounded-lg bg-card/80 border border-border text-[11px] font-mono text-muted-foreground">
              {showCustomerDetailsInPush
                ? 'Preview: "Payment of GH₵ 350.00 for Kofi Mensah is due today."'
                : 'Preview: "A customer payment is due today. Open Avencia to review the account."'}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {saveSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Preferences saved!
                </span>
              )}
              {saveError && <span className="text-xs text-red-400">{saveError}</span>}
            </div>
            <Button size="sm" variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </Card>
      </form>

      {/* 4. Registered Devices & Push Delivery History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Devices List */}
        <Card className="p-4 border-border bg-card/60 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              Registered Devices ({devices.length})
            </h4>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={fetchSettingsAndDevices}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>

          {devices.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No devices are currently subscribed. Click &quot;Enable on this Device&quot; above to subscribe.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {devices.map((d) => (
                <div
                  key={d.id}
                  className="p-2.5 rounded-lg border border-border/40 bg-background/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-foreground">{d.deviceName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {d.browser} • Subscribed {new Date(d.subscribedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    ...{d.endpointSnippet}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Delivery Logs */}
        <Card className="p-4 border-border bg-card/60 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-primary" />
              Recent Delivery Audit Log
            </h4>
            <span className="text-[10px] text-muted-foreground">Last {logs.length} events</span>
          </div>

          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No notifications dispatched yet. Try sending a test alert!
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg border border-border/40 bg-background/50 text-xs flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <p className="font-semibold text-foreground truncate">{log.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
                      {log.notificationType}
                    </p>
                  </div>
                  <Badge
                    variant={
                      log.status === "SENT"
                        ? "success"
                        : log.status === "NO_SUBSCRIBERS"
                        ? "warning"
                        : "destructive"
                    }
                    className="text-[9px] shrink-0"
                  >
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
