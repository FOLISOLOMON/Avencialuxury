"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Card,
  Badge,
} from "@/components/ui";
import {
  Building2,
  User,
  ShieldCheck,
  Package,
  Layers,
  Users,
  CheckCircle2,
  AlertTriangle,
  Phone,
  MapPin,
  Mail,
  Lock,
  KeyRound,
  Sparkles,
} from "lucide-react";

interface ProfileData {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  currency: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
  metrics: {
    productCount: number;
    activeBatchCount: number;
    customerCount: number;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"BUSINESS" | "OWNER" | "SECURITY">("BUSINESS");

  // Business Form State
  const [busName, setBusName] = useState("");
  const [busPhone, setBusPhone] = useState("");
  const [busAddress, setBusAddress] = useState("");
  const [busDescription, setBusDescription] = useState("");
  const [busSubmitting, setBusSubmitting] = useState(false);
  const [busError, setBusError] = useState<string | null>(null);
  const [busSuccess, setBusSuccess] = useState(false);

  // Owner Form State
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerSubmitting, setOwnerSubmitting] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [ownerSuccess, setOwnerSuccess] = useState(false);

  // Security / PIN Management State
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState<"view" | "set">("view");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  const fetchProfileData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (json.success && json.data) {
        setProfile(json.data);
        setBusName(json.data.name || "");
        setBusPhone(json.data.phone || "");
        setBusAddress(json.data.address || "");
        setBusDescription(json.data.description || "");
        setOwnerName(json.data.owner?.name || "");
        setOwnerEmail(json.data.owner?.email || "");
      } else {
        setError(json.error || "Failed to load profile details");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
    setStoredPin(localStorage.getItem("avencia_quick_pin"));
  }, []);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusError(null);
    setBusSuccess(false);

    if (!busName.trim()) {
      setBusError("Business Name is required.");
      return;
    }

    setBusSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "business",
          name: busName.trim(),
          phone: busPhone.trim() || undefined,
          address: busAddress.trim() || undefined,
          description: busDescription.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBusSuccess(true);
        setTimeout(() => setBusSuccess(false), 3000);
        fetchProfileData();
      } else {
        setBusError(json.error || "Could not update business details");
      }
    } catch (err: any) {
      setBusError(err.message || "Failed to connect to server");
    } finally {
      setBusSubmitting(false);
    }
  };

  const handleSaveOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerError(null);
    setOwnerSuccess(false);

    if (!ownerName.trim()) {
      setOwnerError("Owner Name is required.");
      return;
    }

    setOwnerSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "owner",
          name: ownerName.trim(),
          email: ownerEmail.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOwnerSuccess(true);
        setTimeout(() => setOwnerSuccess(false), 3000);
        fetchProfileData();
      } else {
        setOwnerError(json.error || "Could not update owner details");
      }
    } catch (err: any) {
      setOwnerError(err.message || "Failed to connect to server");
    } finally {
      setOwnerSubmitting(false);
    }
  };

  const handleSavePin = () => {
    setPinError(null);
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError("PIN must be exactly 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("PIN codes do not match.");
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

  return (
    <div className="space-y-6 max-w-4xl pb-24 md:pb-8">
      {/* Brand Header Card */}
      <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/5 border-primary/30">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-16 h-16 rounded-2xl bg-card border-2 border-primary/40 p-2 shadow-lg flex items-center justify-center shrink-0">
            <Image
              src="/logo/Avencia gold icon logo.png"
              alt="Avencia Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h1 className="text-xl font-black text-foreground">{profile?.name || "Avencia Luxury"}</h1>
              <Badge variant="gold">Retail Enterprise</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {profile?.description || "Luxury fragrances, bespoke perfume oils & scent consulting."}
            </p>
            <div className="text-xs text-muted-foreground pt-1 flex items-center justify-center sm:justify-start gap-3 flex-wrap">
              {profile?.phone && <span>📞 {profile.phone}</span>}
              {profile?.address && <span>📍 {profile.address}</span>}
            </div>
          </div>
        </div>

        {/* Quick Enterprise Metrics */}
        <div className="grid grid-cols-3 gap-3 pt-5 mt-5 border-t border-border/60 text-center">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Catalog SKUs</div>
            <div className="text-lg font-black text-foreground mt-0.5">
              {profile?.metrics.productCount || 0}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Active Consignments</div>
            <div className="text-lg font-black text-primary mt-0.5">
              {profile?.metrics.activeBatchCount || 0}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Client Accounts</div>
            <div className="text-lg font-black text-foreground mt-0.5">
              {profile?.metrics.customerCount || 0}
            </div>
          </div>
        </div>
      </Card>

      {/* Segmented Control */}
      <div className="inline-flex p-1 bg-muted rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setActiveTab("BUSINESS")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "BUSINESS"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Business Entity
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("OWNER")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "OWNER"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Owner Account
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("SECURITY")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "SECURITY"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          PIN Security
        </button>
      </div>

      {/* TAB 1: BUSINESS ENTITY */}
      {activeTab === "BUSINESS" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">Business Information</h3>
          </div>

          {busError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{busError}</span>
            </div>
          )}

          {busSuccess && (
            <div className="p-3 rounded-xl bg-success/10 text-success text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Business profile updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveBusiness} className="space-y-4">
            <Input
              label="Legal Trade Name"
              value={busName}
              onChange={(e) => setBusName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Store Phone Contact"
                value={busPhone}
                onChange={(e) => setBusPhone(e.target.value)}
                placeholder="+233 24 000 0000"
              />
              <Input
                label="Boutique / Physical Address"
                value={busAddress}
                onChange={(e) => setBusAddress(e.target.value)}
                placeholder="Accra Mall / East Legon"
              />
            </div>

            <Textarea
              label="Store Tagline / Bio"
              value={busDescription}
              onChange={(e) => setBusDescription(e.target.value)}
              placeholder="Boutique perfume business..."
            />

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" className="font-black" isLoading={busSubmitting}>
                Save Business Info
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 2: OWNER ACCOUNT */}
      {activeTab === "OWNER" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <User className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">Account Holder Credentials</h3>
          </div>

          {ownerError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{ownerError}</span>
            </div>
          )}

          {ownerSuccess && (
            <div className="p-3 rounded-xl bg-success/10 text-success text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Owner credentials updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveOwner} className="space-y-4">
            <Input
              label="Full Name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
            />

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" className="font-black" isLoading={ownerSubmitting}>
                Update Account
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 3: PIN SECURITY */}
      {activeTab === "SECURITY" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">Quick Screen Lock PIN</h3>
            </div>
            <Badge variant={storedPin ? "success" : "outline"}>
              {storedPin ? "PIN Active" : "Not Configured"}
            </Badge>
          </div>

          {pinSuccess && (
            <div className="p-3 rounded-xl bg-success/10 text-success text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>PIN security updated!</span>
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
                <span>{storedPin ? "Change PIN" : "Setup PIN"}</span>
              </Button>

              {storedPin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePin}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Disable
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
      )}
    </div>
  );
}
