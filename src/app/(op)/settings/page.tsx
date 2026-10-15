"use client";

import React, { useState, useEffect, Suspense, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
} from "@/components/ui";
import {
  Building2,
  Package,
  ShoppingBag,
  PiggyBank,
  Bell,
  Users,
  Shield,
  Palette,
  Database,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Download,
  LogOut,
  Sun,
  Moon,
  Monitor,
  RefreshCw,
  ExternalLink,
  Laptop,
  Smartphone,
  CreditCard,
  Sliders,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { NotificationSettingsCard } from "@/components/notifications/NotificationSettingsCard";
import { TeamManagementCard } from "@/components/team/TeamManagementCard";
import { CancellationQueueCard } from "@/components/sales/CancellationQueueCard";
import { AuditLogCard } from "@/components/audit/AuditLogCard";

import {
  SETTINGS_CATEGORIES,
  type SettingsCategory,
  type CategoryMeta,
} from "@/components/settings/categories";
import { useSettings } from "@/components/settings/SettingsContext";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 space-y-4 animate-pulse">
          <div className="h-8 w-64 bg-muted rounded-md" />
          <div className="h-4 w-96 bg-muted/60 rounded-md" />
          <div className="h-96 w-full bg-muted/30 rounded-lg mt-6" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const {
    activeCategory,
    activeCategoryMeta,
    selectCategory,
    currentUser,
    userLoading,
    mobileView,
    setMobileView,
    handleGoToAvencia,
    setIsDirty,
  } = useSettings();

  const isOwner = currentUser?.role === "OWNER";

  return (
    <div className="space-y-6 pb-28 md:pb-12 font-sans w-full">
      {/* =========================================================================
          1. MOBILE DIRECTORY VIEW (< md only, when mobileView === "list")
         ========================================================================= */}
      <div
        className={cn(
          "space-y-4 md:hidden",
          mobileView === "list" ? "block" : "hidden"
        )}
      >
        {/* Mobile Navigation Header: Go to Avencia + Title */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
          <button
            type="button"
            onClick={handleGoToAvencia}
            aria-label="Return to Avencia application"
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5 -ml-1 rounded-md bg-secondary/70 hover:bg-secondary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Go to Avencia</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <h1 className="text-base font-bold text-foreground">Avencia Settings</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a category to view and configure business preferences
            </p>
          </div>
        </div>

        {/* Mobile Categories Directory */}
        <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden shadow-xs">
          {SETTINGS_CATEGORIES.map((cat) => {
            const Icon = cat.icon;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => selectCategory(cat.id)}
                className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-secondary/40 active:bg-secondary/70 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                      {cat.name}
                      {cat.ownerOnly && (
                        <span className="text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border">
                          Owner
                        </span>
                      )}
                      {cat.badge && (
                        <span className="text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                          {cat.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {cat.shortDesc}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          2. CATEGORY CONTENT PANEL
          - Always visible on Desktop & Tablet (md:block)
          - Visible on Mobile only when mobileView === "content"
         ========================================================================= */}
      <div
        className={cn(
          "w-full",
          mobileView === "content" ? "block" : "hidden md:block"
        )}
      >
        <div className="rounded-xl border border-border bg-card shadow-xs p-4 sm:p-6 md:p-8">
          {/* Mobile Back Control */}
          <div className="md:hidden pb-3 mb-4 border-b border-border/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileView("list")}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground py-1 px-2 rounded-md bg-secondary/60 hover:bg-secondary transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-primary" />
              <span>Categories</span>
            </button>
            <span className="text-[11px] text-muted-foreground">Settings</span>
          </div>

          {/* Category Header */}
          <div className="pb-4 mb-6 border-b border-border flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <activeCategoryMeta.icon className="w-5 h-5 text-primary shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                  {activeCategoryMeta.name}
                </h2>
                {activeCategoryMeta.ownerOnly && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 shrink-0"
                  >
                    Owner Protected
                  </Badge>
                )}
                {activeCategoryMeta.badge && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-primary border-primary/30 shrink-0"
                  >
                    {activeCategoryMeta.badge}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeCategoryMeta.shortDesc}
              </p>
            </div>
          </div>

          {/* Role Check Guard for Protected Categories */}
          {activeCategoryMeta.ownerOnly && !isOwner && !userLoading ? (
            <div className="p-8 text-center space-y-3 rounded-lg border border-dashed border-border bg-muted/20">
              <Shield className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="font-bold text-sm text-foreground">Owner Privileges Required</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                This configuration section is restricted to the business owner account to protect business finances and security rules.
              </p>
            </div>
          ) : (
            <>
              {activeCategory === "profile" && <BusinessProfileSection setIsParentDirty={setIsDirty} />}
              {activeCategory === "inventory" && <ProductsInventorySection setIsParentDirty={setIsDirty} />}
              {activeCategory === "sales" && <SalesCustomersSection isOwner={isOwner} setIsParentDirty={setIsDirty} />}
              {activeCategory === "finance" && <FinanceAllocationsSection setIsParentDirty={setIsDirty} />}
              {activeCategory === "notifications" && <NotificationsSection />}
              {activeCategory === "team" && <TeamAccessSection />}
              {activeCategory === "security" && <SecuritySessionsSection currentUser={currentUser} />}
              {activeCategory === "appearance" && <AppearancePreferencesSection />}
              {activeCategory === "data" && <DataMaintenanceSection />}
              {activeCategory === "about" && <AboutAvenciaSection />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
   CATEGORY A: BUSINESS PROFILE SECTION
   ========================================================================================= */
function BusinessProfileSection({
  setIsParentDirty,
}: {
  setIsParentDirty?: (dirty: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  // Baseline to detect dirty changes
  const [initialData, setInitialData] = useState<any>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setName(d.name || "");
        setPhone(d.phone || "");
        setAddress(d.address || "");
        setDescription(d.description || "");
        setOwnerName(d.owner?.name || "");
        setOwnerEmail(d.owner?.email || "");
        setInitialData({
          name: d.name || "",
          phone: d.phone || "",
          address: d.address || "",
          description: d.description || "",
          ownerName: d.owner?.name || "",
          ownerEmail: d.owner?.email || "",
        });
      } else {
        setError(json.error || "Failed to load business profile");
      }
    } catch (e: any) {
      setError(e.message || "Network error loading profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleReset = () => {
    if (initialData) {
      setName(initialData.name);
      setPhone(initialData.phone);
      setAddress(initialData.address);
      setDescription(initialData.description);
      setOwnerName(initialData.ownerName);
      setOwnerEmail(initialData.ownerEmail);
      setError(null);
    }
  };

  const isDirty =
    initialData &&
    (name !== initialData.name ||
      phone !== initialData.phone ||
      address !== initialData.address ||
      description !== initialData.description ||
      ownerName !== initialData.ownerName ||
      ownerEmail !== initialData.ownerEmail);

  useEffect(() => {
    setIsParentDirty?.(Boolean(isDirty));
    return () => {
      setIsParentDirty?.(false);
    };
  }, [isDirty, setIsParentDirty]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Business Name is required.");
      return;
    }
    if (!ownerName.trim()) {
      setError("Owner Name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Update business details
      const bRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "business",
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          description: description.trim() || null,
        }),
      });
      const bJson = await bRes.json();
      if (!bJson.success) throw new Error(bJson.error || "Failed to update business profile");

      // 2. Update owner details
      const oRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "owner",
          name: ownerName.trim(),
          email: ownerEmail.trim() || undefined,
        }),
      });
      const oJson = await oRes.json();
      if (!oJson.success) throw new Error(oJson.error || "Failed to update owner credentials");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
      fetchProfile();
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-muted/40 rounded-lg" />
        <div className="h-10 bg-muted/40 rounded-md" />
        <div className="h-10 bg-muted/40 rounded-md" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Brand Identity Preview */}
      <div className="p-4 rounded-lg border border-border bg-secondary/30 flex flex-col sm:flex-row items-center sm:items-start gap-4">
        <div className="w-14 h-14 rounded-md bg-black border border-border p-1.5 flex items-center justify-center shrink-0">
          <Image
            src="/logo/Avencia gold logo.png"
            alt="Avencia Brand"
            width={50}
            height={50}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="text-center sm:text-left min-w-0">
          <h4 className="font-bold text-sm text-foreground">{name || "Avencia Luxury Fragrances"}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified Fragrance Retail OS — Logo and receipt headers use official high-resolution vector assets.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-md bg-success/10 text-success text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Business identity and owner credentials updated successfully.</span>
        </div>
      )}

      {/* Business Details Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Store Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Trading Business Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Avencia Perfumes"
            required
            hint="Printed on customer receipts and audit exports"
          />

          <Input
            label="Business Contact Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +233 24 123 4567"
            hint="Contact number shown on receipts"
          />
        </div>

        <Input
          label="Physical Location or Store Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. Shop 4, Galleria Mall, Accra"
        />

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Business Tagline / Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground focus:outline-hidden focus:border-primary"
            placeholder="e.g. Luxury bespoke fragrance curation, decants, and niche perfumes."
          />
        </div>
      </div>

      {/* Owner Credentials Grid */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Owner Primary Account
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Owner Legal Name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="e.g. Foli Solomon"
            required
          />

          <Input
            label="Owner Notification Email"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="e.g. owner@avencialuxury.com"
            required
            hint="Receives automated summaries and security alerts"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!isDirty || saving}
          onClick={handleReset}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!isDirty || saving}
          isLoading={saving}
        >
          Save Business Profile
        </Button>
      </div>
    </form>
  );
}

/* =========================================================================================
   CATEGORY B: PRODUCTS & INVENTORY SECTION
   ========================================================================================= */
function ProductsInventorySection({
  setIsParentDirty,
}: {
  setIsParentDirty?: (dirty: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Values
  const [lowStockThreshold, setLowStockThreshold] = useState("3");
  const [batchNearCompletionThreshold, setBatchNearCompletionThreshold] = useState("10");
  const [initialValues, setInitialValues] = useState<{ low: string; batch: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.data) {
        const low = (json.data.lowStockThreshold ?? 3).toString();
        const batch = (json.data.batchNearCompletionThreshold ?? 10).toString();
        setLowStockThreshold(low);
        setBatchNearCompletionThreshold(batch);
        setInitialValues({ low, batch });
      }
    } catch (e: any) {
      setError(e.message || "Failed to load inventory configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const isDirty =
    initialValues &&
    (lowStockThreshold !== initialValues.low ||
      batchNearCompletionThreshold !== initialValues.batch);

  useEffect(() => {
    setIsParentDirty?.(Boolean(isDirty));
    return () => {
      setIsParentDirty?.(false);
    };
  }, [isDirty, setIsParentDirty]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const threshold = parseInt(lowStockThreshold, 10);
    if (isNaN(threshold) || threshold < 1) {
      setError("Low stock threshold must be at least 1 bottle.");
      return;
    }

    const batchThreshold = parseFloat(batchNearCompletionThreshold);
    if (isNaN(batchThreshold) || batchThreshold < 1 || batchThreshold > 100) {
      setError("Batch completion alert must be between 1% and 100%.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lowStockThreshold: threshold,
          batchNearCompletionThreshold: batchThreshold,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(json.error || "Failed to save inventory settings");
      }
    } catch (err: any) {
      setError(err.message || "Network error saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-40 bg-muted/30 rounded-lg animate-pulse" />;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-md bg-success/10 text-success text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Inventory alert thresholds saved successfully.</span>
        </div>
      )}

      {/* Setting Rows Container */}
      <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
        {/* Row 1: Low Stock Threshold */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="max-w-md">
            <h4 className="text-sm font-semibold text-foreground">Low Stock Alert Threshold</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              When remaining bottle count falls to or below this number, products are flagged with amber alerts across POS, Inventory Ledger, and Push Notifications.
            </p>
          </div>
          <div className="w-full sm:w-36">
            <Input
              type="number"
              min="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              placeholder="3"
            />
          </div>
        </div>

        {/* Row 2: Batch Sell-Out Warning Threshold */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="max-w-md">
            <h4 className="text-sm font-semibold text-foreground">Consignment Batch Sell-Out Warning (%)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Flags warning when a purchase consignment has sold down past this remaining stock percentage to plan replenishment.
            </p>
          </div>
          <div className="w-full sm:w-36">
            <Input
              type="number"
              min="1"
              max="100"
              value={batchNearCompletionThreshold}
              onChange={(e) => setBatchNearCompletionThreshold(e.target.value)}
              placeholder="10"
            />
          </div>
        </div>

        {/* Informational Guidance Callout */}
        <div className="p-4 bg-muted/30 flex items-start gap-3">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground font-semibold">Strict Rule Protection:</strong> Threshold changes take effect immediately across all live ledger monitors and stock status calculations without modifying historical batch purchase costs or stock movement records.
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="sm" isLoading={saving}>
          Save Inventory Settings
        </Button>
      </div>
    </form>
  );
}

/* =========================================================================================
   CATEGORY C: SALES & CUSTOMERS SECTION
   ========================================================================================= */
function SalesCustomersSection({
  isOwner,
  setIsParentDirty,
}: {
  isOwner: boolean;
  setIsParentDirty?: (dirty: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Values
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState("CASH");
  const [dormantCustomerDays, setDormantCustomerDays] = useState("30");
  const [overdueIntervalDays, setOverdueIntervalDays] = useState("3");
  const [upcomingDaysAdvance, setUpcomingDaysAdvance] = useState("1");
  const [dueTodayEnabled, setDueTodayEnabled] = useState(true);
  const [initialValues, setInitialValues] = useState<any>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.data) {
        const dMethod = json.data.defaultPaymentMethod || "CASH";
        const dDays = (json.data.dormantCustomerDays ?? 30).toString();
        const oDays = (json.data.overdueIntervalDays ?? 3).toString();
        const uDays = (json.data.upcomingDaysAdvance ?? 1).toString();
        const dEnabled = json.data.dueTodayEnabled ?? true;

        setDefaultPaymentMethod(dMethod);
        setDormantCustomerDays(dDays);
        setOverdueIntervalDays(oDays);
        setUpcomingDaysAdvance(uDays);
        setDueTodayEnabled(dEnabled);

        setInitialValues({
          defaultPaymentMethod: dMethod,
          dormantCustomerDays: dDays,
          overdueIntervalDays: oDays,
          upcomingDaysAdvance: uDays,
          dueTodayEnabled: dEnabled,
        });
      }
    } catch (e: any) {
      setError(e.message || "Failed to load sales configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const isDirty =
    initialValues &&
    (defaultPaymentMethod !== initialValues.defaultPaymentMethod ||
      dormantCustomerDays !== initialValues.dormantCustomerDays ||
      overdueIntervalDays !== initialValues.overdueIntervalDays ||
      upcomingDaysAdvance !== initialValues.upcomingDaysAdvance ||
      dueTodayEnabled !== initialValues.dueTodayEnabled);

  useEffect(() => {
    setIsParentDirty?.(Boolean(isDirty));
    return () => {
      setIsParentDirty?.(false);
    };
  }, [isDirty, setIsParentDirty]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultPaymentMethod,
          dormantCustomerDays: parseInt(dormantCustomerDays, 10) || 30,
          overdueIntervalDays: parseInt(overdueIntervalDays, 10) || 3,
          upcomingDaysAdvance: parseInt(upcomingDaysAdvance, 10) || 1,
          dueTodayEnabled,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(json.error || "Failed to save sales settings");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-40 bg-muted/30 rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-md bg-success/10 text-success text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Sales & customer operational rules updated.</span>
          </div>
        )}

        <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
          {/* Row 1: Default POS Tender */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="max-w-md">
              <h4 className="text-sm font-semibold text-foreground">Default POS Tender Method</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pre-selected tender when launching a new transaction at the register or on mobile POS.
              </p>
            </div>
            <div className="w-full sm:w-52">
              <Select
                value={defaultPaymentMethod}
                onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                options={[
                  { value: "CASH", label: "Cash" },
                  { value: "BANK_TRANSFER", label: "Bank Transfer" },
                  { value: "MOMO", label: "Mobile Money (MoMo)" },
                  { value: "CARD", label: "POS Card Payment" },
                  { value: "OTHER", label: "Other Method" },
                ]}
              />
            </div>
          </div>

          {/* Row 2: Dormant Client Days */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="max-w-md">
              <h4 className="text-sm font-semibold text-foreground">Dormant Client Days Window</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Number of days without recorded sales after which a customer is flagged as dormant for re-engagement.
              </p>
            </div>
            <div className="w-full sm:w-36">
              <Input
                type="number"
                min="7"
                max="365"
                value={dormantCustomerDays}
                onChange={(e) => setDormantCustomerDays(e.target.value)}
                placeholder="30"
              />
            </div>
          </div>

          {/* Row 3: Overdue Reminder Frequency */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="max-w-md">
              <h4 className="text-sm font-semibold text-foreground">Overdue Debt Reminder Interval (Days)</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Minimum days between automated debt notification reminders to avoid duplicate alerts.
              </p>
            </div>
            <div className="w-full sm:w-36">
              <Input
                type="number"
                min="1"
                max="30"
                value={overdueIntervalDays}
                onChange={(e) => setOverdueIntervalDays(e.target.value)}
                placeholder="3"
              />
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              Save Sales Defaults
            </Button>
          </div>
        )}
      </form>

      {/* Sale Cancellation Review Queue (Only for authorized Owner) */}
      {isOwner && (
        <div className="pt-6 border-t border-border space-y-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Pending Sale Cancellation Requests</h3>
            <p className="text-xs text-muted-foreground">
              Review and authorize worker-requested transaction voidings and inventory restitutions.
            </p>
          </div>
          <CancellationQueueCard />
        </div>
      )}
    </div>
  );
}

/* =========================================================================================
   CATEGORY D: FINANCE & ALLOCATIONS SECTION
   ========================================================================================= */
function FinanceAllocationsSection({
  setIsParentDirty,
}: {
  setIsParentDirty?: (dirty: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [currency, setCurrency] = useState("GHS");
  const [largeExpenseThreshold, setLargeExpenseThreshold] = useState("1000");
  const [initialValues, setInitialValues] = useState<{ currency: string; expense: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.data) {
        const cur = json.data.currency || "GHS";
        const exp = (json.data.largeExpenseThreshold ?? 1000).toString();
        setCurrency(cur);
        setLargeExpenseThreshold(exp);
        setInitialValues({ currency: cur, expense: exp });
      }
    } catch (e: any) {
      setError(e.message || "Failed to load financial settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const isDirty =
    initialValues &&
    (currency !== initialValues.currency ||
      largeExpenseThreshold !== initialValues.expense);

  useEffect(() => {
    setIsParentDirty?.(Boolean(isDirty));
    return () => {
      setIsParentDirty?.(false);
    };
  }, [isDirty, setIsParentDirty]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const expenseLimit = parseFloat(largeExpenseThreshold);
    if (isNaN(expenseLimit) || expenseLimit < 0) {
      setError("Large expense threshold must be a positive number.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          largeExpenseThreshold: expenseLimit,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(json.error || "Failed to save financial configuration");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-40 bg-muted/30 rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-md bg-success/10 text-success text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Financial rules and currency updated successfully.</span>
          </div>
        )}

        <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
          {/* Row 1: Operating Currency */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="max-w-md">
              <h4 className="text-sm font-semibold text-foreground">Operating Currency</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Primary business tender used for catalog pricing, receipts, cost basis, and balance sheets.
              </p>
            </div>
            <div className="w-full sm:w-56">
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: "GHS", label: "Ghanaian Cedi (GH₵)" },
                  { value: "USD", label: "US Dollar ($)" },
                  { value: "NGN", label: "Nigerian Naira (₦)" },
                  { value: "EUR", label: "Euro (€)" },
                  { value: "GBP", label: "British Pound (£)" },
                ]}
              />
            </div>
          </div>

          {/* Row 2: Large Expense Warning */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="max-w-md">
              <h4 className="text-sm font-semibold text-foreground">Large Expense Alert Threshold ({currency})</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Expenditures logged above this sum trigger an immediate security alert and owner push notification.
              </p>
            </div>
            <div className="w-full sm:w-44">
              <Input
                type="number"
                min="0"
                value={largeExpenseThreshold}
                onChange={(e) => setLargeExpenseThreshold(e.target.value)}
                placeholder="1000"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="sm" isLoading={saving}>
            Save Financial Settings
          </Button>
        </div>
      </form>

      {/* Established Financial Allocation Policy (Read-Only Transparency) */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div>
          <h3 className="text-sm font-bold text-foreground">Established Financial Policy (50 / 30 / 20)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Avencia&apos;s cash-backed allocation rules govern profit distributions to protect business liquidity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Operational Needs</span>
              <Badge variant="outline" className="font-bold">50%</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Dedicated to inventory restocking, consignment imports, shipping, and store operational expenses.
            </p>
          </Card>

          <Card className="p-4 border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Owner Wants</span>
              <Badge variant="outline" className="font-bold">30%</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Discretionary personal profit distributions available only upon physical cash collection.
            </p>
          </Card>

          <Card className="p-4 border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Business Savings</span>
              <Badge variant="outline" className="font-bold">20%</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Untouchable emergency buffer and reserve liquidity capital preserved in the business treasury.
            </p>
          </Card>
        </div>

        <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-foreground space-y-1">
            <p className="font-semibold text-primary">Cash-Backed Policy Enforcement</p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              In accordance with core financial directives, profit is eligible for allocation only once cash has been collected. Unpaid customer debt does not inflate distributable profits.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link href="/profit">
                <Button variant="outline" size="sm" className="h-7 text-xs font-medium">
                  Open Profit Dashboard
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
              <Link href="/expenses">
                <Button variant="ghost" size="sm" className="h-7 text-xs font-medium">
                  View Expense Ledger
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
   CATEGORY E: NOTIFICATIONS & REMINDERS SECTION
   ========================================================================================= */
function NotificationsSection() {
  return (
    <div className="space-y-6">
      <NotificationSettingsCard />
    </div>
  );
}

/* =========================================================================================
   CATEGORY F: TEAM & ACCESS SECTION
   ========================================================================================= */
function TeamAccessSection() {
  return (
    <div className="space-y-6">
      <TeamManagementCard />
    </div>
  );
}

/* =========================================================================================
   CATEGORY G: SECURITY & SESSIONS SECTION
   ========================================================================================= */
function SecuritySessionsSection({
  currentUser,
}: {
  currentUser: { id: string; name: string; email: string; role: string } | null;
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sessions");
      const json = await res.json();
      if (json.success && json.data) {
        setSessions(json.data);
      }
    } catch (e: any) {
      console.warn("Error fetching sessions:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSingle = async (sessionId: string) => {
    setRevokingId(sessionId);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/auth/sessions?sessionId=${sessionId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setActionMsg({ type: "success", text: "Session successfully revoked." });
        fetchSessions();
      } else {
        setActionMsg({ type: "error", text: json.error || "Failed to revoke session" });
      }
    } catch (e: any) {
      setActionMsg({ type: "error", text: e.message || "Failed to revoke session" });
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!confirm("Are you sure you want to sign out all other devices?")) return;
    setLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/auth/sessions?allOthers=true", {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setActionMsg({ type: "success", text: "All other sessions have been revoked." });
        fetchSessions();
      } else {
        setActionMsg({ type: "error", text: json.error || "Failed to revoke other sessions" });
      }
    } catch (e: any) {
      setActionMsg({ type: "error", text: e.message || "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutCurrent = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    window.location.href = "/login";
  };

  return (
    <div className="space-y-6">
      {/* Account Info Card */}
      <Card className="p-5 border-border space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
              {currentUser?.name?.slice(0, 2).toUpperCase() || "AV"}
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">{currentUser?.name || "Authenticating..."}</h4>
              <p className="text-xs text-muted-foreground">{currentUser?.email || ""}</p>
            </div>
          </div>
          <Badge variant={currentUser?.role === "OWNER" ? "success" : "outline"} className="uppercase font-bold">
            {currentUser?.role || "WORKER"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-md bg-muted/30 border border-border">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Session Security Model</span>
            <span className="text-foreground font-medium mt-0.5 block">
              Cryptographically Signed JWT with Database Revocation Check
            </span>
          </div>
          <div className="p-3 rounded-md bg-muted/30 border border-border">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Session Policies</span>
            <span className="text-foreground font-medium mt-0.5 block">
              30-Day Expiry • 7-Day Inactivity Auto-Revocation Window
            </span>
          </div>
        </div>
      </Card>

      {/* Active Device Sessions List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Active Device Sessions</h3>
            <p className="text-xs text-muted-foreground">
              Authorized browsers and devices currently signed in to your account.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeAllOthers}
              className="text-xs text-destructive hover:bg-destructive/10"
              disabled={loading || sessions.filter((s) => !s.isCurrent).length === 0}
            >
              Sign Out Other Devices
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSessions}
              className="h-8 w-8 p-0"
              title="Refresh Sessions"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {actionMsg && (
          <div
            className={`p-3 rounded-md text-xs font-semibold flex items-center gap-2 ${
              actionMsg.type === "success"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {actionMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
        )}

        <div className="border border-border rounded-lg bg-card overflow-hidden divide-y divide-border">
          {loading ? (
            <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
              Loading active sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No active sessions recorded.
            </div>
          ) : (
            sessions.map((sess) => (
              <div key={sess.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-md bg-muted text-muted-foreground shrink-0">
                    {sess.userAgent.toLowerCase().includes("mobile") ? (
                      <Smartphone className="w-4 h-4" />
                    ) : (
                      <Laptop className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground truncate max-w-xs sm:max-w-md">
                        {sess.userAgent}
                      </span>
                      {sess.isCurrent && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          This Device
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>IP: {sess.ipAddress}</span>
                      <span>•</span>
                      <span>Last active: {new Date(sess.lastActiveAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10 shrink-0"
                    disabled={revokingId === sess.id}
                    onClick={() => handleRevokeSingle(sess.id)}
                  >
                    {revokingId === sess.id ? "Revoking..." : "Revoke"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Immediate Sign-out Box */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-foreground">Sign Out Current Session</h4>
          <p className="text-[11px] text-muted-foreground">End this active session and return to login</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOutCurrent} className="text-destructive">
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

/* =========================================================================================
   CATEGORY H: APPEARANCE & PREFERENCES SECTION
   ========================================================================================= */
function AppearancePreferencesSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Interface Appearance Mode</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select your personal theme preference. Automatically applied across POS, reports, sheets, and mobile views.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* LIGHT */}
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`p-4 rounded-xl border text-left transition-all ${
            theme === "light"
              ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/30"
              : "border-border bg-card hover:bg-secondary/40"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sun className="w-4 h-4" />
            </div>
            {theme === "light" && (
              <Badge variant="gold" className="text-[10px]">Active</Badge>
            )}
          </div>
          <div className="text-sm font-bold text-foreground">Light Theme</div>
          <p className="text-xs text-muted-foreground mt-1">
            Clean natural stone backdrop with crisp contrast for bright store counters.
          </p>
        </button>

        {/* DARK */}
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`p-4 rounded-xl border text-left transition-all ${
            theme === "dark"
              ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/30"
              : "border-border bg-card hover:bg-secondary/40"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Moon className="w-4 h-4" />
            </div>
            {theme === "dark" && (
              <Badge variant="gold" className="text-[10px]">Active</Badge>
            )}
          </div>
          <div className="text-sm font-bold text-foreground">Dark Theme</div>
          <p className="text-xs text-muted-foreground mt-1">
            Deep obsidian graphite background engineered for battery efficiency and evening operation.
          </p>
        </button>

        {/* SYSTEM */}
        <button
          type="button"
          onClick={() => setTheme("system")}
          className={`p-4 rounded-xl border text-left transition-all ${
            theme === "system"
              ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/30"
              : "border-border bg-card hover:bg-secondary/40"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
            {theme === "system" && (
              <Badge variant="gold" className="text-[10px]">Active</Badge>
            )}
          </div>
          <div className="text-sm font-bold text-foreground">System Synchronized</div>
          <p className="text-xs text-muted-foreground mt-1">
            Automatically aligns with your tablet, mobile phone, or desktop OS display settings.
          </p>
        </button>
      </div>
    </div>
  );
}

/* =========================================================================================
   CATEGORY I: DATA & MAINTENANCE SECTION
   ========================================================================================= */
function DataMaintenanceSection() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = (type: "products" | "customers" | "sales") => {
    setDownloading(type);
    window.location.href = `/api/data/export?type=${type}`;
    setTimeout(() => setDownloading(null), 2500);
  };

  return (
    <div className="space-y-8">
      {/* EXPORTS CARD */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Business Data Exports</h3>
          <p className="text-xs text-muted-foreground">
            Generate authenticated CSV spreadsheets for accounting, inventory stocktakes, or client audits.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 border-border flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground">Products Catalog</h4>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                All fragrances, SKUs, barcodes, remaining batch quantities, and cost baselines.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              disabled={downloading === "products"}
              onClick={() => handleExport("products")}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {downloading === "products" ? "Generating..." : "Export Products (.csv)"}
            </Button>
          </Card>

          <Card className="p-4 border-border flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground">Customer Directory</h4>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Client contact cards, order totals, outstanding credit dues, and notes.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              disabled={downloading === "customers"}
              onClick={() => handleExport("customers")}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {downloading === "customers" ? "Generating..." : "Export Clients (.csv)"}
            </Button>
          </Card>

          <Card className="p-4 border-border flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground">Sales Ledger</h4>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Complete sales transactions, receipt numbers, paid tenders, and debt status.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              disabled={downloading === "sales"}
              onClick={() => handleExport("sales")}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {downloading === "sales" ? "Generating..." : "Export Sales (.csv)"}
            </Button>
          </Card>
        </div>
      </div>

      {/* BACKUP & DISASTER RECOVERY RESILIENCE */}
      <div className="p-5 rounded-lg border border-border bg-secondary/20 space-y-3">
        <div className="flex items-center gap-2 text-foreground">
          <Database className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold">Cloud Infrastructure & Backup Architecture</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Avencia operates on serverless Neon PostgreSQL backed by AWS storage. All transactional tables (Sales, Batches, Inventory, Ledger, Audit Logs) benefit from continuous Write-Ahead Log (WAL) archiving and Point-in-Time Recovery (PITR).
        </p>
        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Continuous WAL Replication Active
          </span>
          <span>•</span>
          <span>Automated Daily Snapshot Retained</span>
          <span>•</span>
          <span>Multi-AZ Redundant Storage</span>
        </div>
      </div>

      {/* IMMUTABLE AUDIT LOGS */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div>
          <h3 className="text-sm font-bold text-foreground">System Audit Trail</h3>
          <p className="text-xs text-muted-foreground">
            Searchable, tamper-evident log of administrative and operational actions across Avencia.
          </p>
        </div>
        <AuditLogCard />
      </div>
    </div>
  );
}

/* =========================================================================================
   CATEGORY J: ABOUT AVENCIA SECTION
   ========================================================================================= */
function AboutAvenciaSection() {
  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="p-6 rounded-xl border border-border bg-secondary/30 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-16 h-16 rounded-lg bg-black border border-border p-2 flex items-center justify-center shrink-0 shadow-sm">
          <Image
            src="/logo/Avencia gold logo.png"
            alt="Avencia Logo"
            width={60}
            height={60}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="text-lg font-bold text-foreground">Avencia Fragrance Retail OS</h3>
            <Badge variant="gold" className="text-xs font-bold">v2.0.0</Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            A bespoke operating system designed for premium perfume retail, consignment batch tracking, POS sales, and cash-backed financial allocations.
          </p>
        </div>
      </div>

      {/* System Specifications */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 border-border space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Architecture Stack</h4>
          <ul className="text-xs space-y-1.5 text-foreground">
            <li className="flex justify-between border-b border-border/60 pb-1">
              <span className="text-muted-foreground">Frontend Framework</span>
              <span className="font-semibold">Next.js 15 App Router & React 19</span>
            </li>
            <li className="flex justify-between border-b border-border/60 pb-1">
              <span className="text-muted-foreground">Database Engine</span>
              <span className="font-semibold">PostgreSQL (Prisma ORM)</span>
            </li>
            <li className="flex justify-between border-b border-border/60 pb-1">
              <span className="text-muted-foreground">Notification Gateway</span>
              <span className="font-semibold">Standard W3C Web Push & VAPID</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Authentication</span>
              <span className="font-semibold">HTTP-Only Signed Session Cookies</span>
            </li>
          </ul>
        </Card>

        <Card className="p-4 border-border space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Technical Support & Contact</h4>
          <div className="text-xs space-y-2 text-foreground">
            <p className="text-muted-foreground">
              For technical inquiries, feature updates, or support regarding this installation:
            </p>
            <div className="p-2.5 rounded-md bg-muted/40 border border-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Support Desk:</span>
                <span className="font-semibold text-primary">support@avencialuxury.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">System Status:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Operational • Connected</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
