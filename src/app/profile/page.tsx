"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Building2,
  User,
  ShieldCheck,
  Package,
  Layers,
  Users,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Phone,
  MapPin,
  FileText,
  Mail,
  Lock,
  Boxes,
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

  const [activeTab, setActiveTab] = useState<"BUSINESS" | "OWNER" | "SECURITY" | "SYSTEM">("BUSINESS");

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
  const [pinMode, setPinMode] = useState<"view" | "set" | "confirm">("view");
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
          name: busName,
          phone: busPhone || undefined,
          address: busAddress || undefined,
          description: busDescription || undefined,
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
    if (!ownerEmail.trim()) {
      setOwnerError("Owner Email is required.");
      return;
    }

    setOwnerSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "owner",
          ownerId: profile?.ownerId,
          name: ownerName,
          email: ownerEmail,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOwnerSuccess(true);
        setTimeout(() => setOwnerSuccess(false), 3000);
        fetchProfileData();
      } else {
        setOwnerError(json.error || "Could not update owner account");
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
    if (confirmPin !== newPin) {
      setPinError("PINs do not match.");
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

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading business profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span>{error || "Failed to load profile"}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Standardized Page Header */}
      <PageHeader
        title="Profile"
        subtitle="User info & business details"
      />

      {/* Profile Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 p-2 flex items-center justify-center shadow-lg border border-slate-700/60 flex-shrink-0 overflow-hidden">
          <Image
            src="/logo/Avencia gold logo.png"
            alt="Avencia Logo"
            width={60}
            height={60}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight">{profile.name}</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 w-fit mx-auto sm:mx-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Business
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Owned by <strong className="text-slate-200">{profile.owner?.name}</strong> ({profile.owner?.email})
          </p>
          {profile.description && (
            <p className="text-xs text-amber-300/90 pt-1 italic font-serif">"{profile.description}"</p>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("BUSINESS")}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "BUSINESS"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeTab === "BUSINESS" ? "text-amber-300" : "text-slate-400"}`} /> Business Info
        </button>

        <button
          onClick={() => setActiveTab("OWNER")}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "OWNER"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <User className={`w-4 h-4 ${activeTab === "OWNER" ? "text-indigo-200" : "text-slate-400"}`} /> Account Owner
        </button>

        <button
          onClick={() => setActiveTab("SECURITY")}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "SECURITY"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${activeTab === "SECURITY" ? "text-emerald-300" : "text-slate-400"}`} /> PIN Security
        </button>

        <button
          onClick={() => setActiveTab("SYSTEM")}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "SYSTEM"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Boxes className={`w-4 h-4 ${activeTab === "SYSTEM" ? "text-rose-300" : "text-slate-400"}`} /> System Metrics
        </button>
      </div>

      {/* TAB 1: Business Info Form */}
      {activeTab === "BUSINESS" && (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Business Identity Details</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update store name, contact numbers & physical shop address</p>
            </div>
          </div>

          {busSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Business profile updated successfully!</span>
            </div>
          )}

          {busError && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3.5 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{busError}</span>
            </div>
          )}

          <form onSubmit={handleSaveBusiness} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Business Name *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Avencia Perfumes"
                    value={busName}
                    onChange={(e) => setBusName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Business Phone / WhatsApp</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="tel"
                    placeholder="e.g. +233 24 000 0000"
                    value={busPhone}
                    onChange={(e) => setBusPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Physical Location / Address</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. Accra, Ghana"
                    value={busAddress}
                    onChange={(e) => setBusAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Business Description / Tagline</label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
                  <textarea
                    rows={3}
                    placeholder="e.g. Premium luxury fragrances, designer colognes & oil perfumes"
                    value={busDescription}
                    onChange={(e) => setBusDescription(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={busSubmitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all text-xs font-bold disabled:opacity-50 flex items-center gap-2 active:scale-95"
              >
                {busSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Business Profile ✓"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Owner Account Form */}
      {activeTab === "OWNER" && (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Account Owner Information</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage owner credentials & primary email address</p>
          </div>

          {ownerSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Owner account details saved!</span>
            </div>
          )}

          {ownerError && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3.5 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{ownerError}</span>
            </div>
          )}

          <form onSubmit={handleSaveOwner} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Business Owner"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. owner@avencia.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={ownerSubmitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all text-xs font-bold disabled:opacity-50 flex items-center gap-2 active:scale-95"
              >
                {ownerSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Update Owner Account ✓"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Quick PIN Security */}
      {activeTab === "SECURITY" && (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Security & 4-Digit Quick PIN</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Require 4-digit PIN authentication upon opening the app</p>
            </div>
          </div>

          {pinSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{storedPin ? "PIN updated! PIN prompt active." : "PIN removed. App will open without authentication."}</span>
            </div>
          )}

          {pinError && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3.5 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {pinMode === "view" && (
            <div className="space-y-4 max-w-md mx-auto">
              {storedPin ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">PIN Protection Active</p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">4-digit PIN ●●●● is active</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setNewPin(""); setConfirmPin(""); setPinMode("set"); setPinError(null); }}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Change PIN
                    </button>
                    <button
                      onClick={handleRemovePin}
                      className="flex-1 py-2.5 rounded-xl border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    >
                      Remove PIN
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No PIN Set</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">App opens without authentication. Set a PIN to secure access.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setNewPin(""); setConfirmPin(""); setPinMode("set"); setPinError(null); }}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all text-xs font-bold"
                  >
                    Set 4-Digit PIN
                  </button>
                </div>
              )}
            </div>
          )}

          {(pinMode === "set" || pinMode === "confirm") && (
            <div className="space-y-4 max-w-xs mx-auto text-center">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {pinMode === "set" ? "Enter a 4-digit PIN" : "Confirm your 4-digit PIN"}
              </p>

              {/* Digit Indicator */}
              <div className="flex gap-2 justify-center py-2">
                {[0, 1, 2, 3].map((i) => {
                  const val = pinMode === "set" ? newPin : confirmPin;
                  return (
                    <div
                      key={i}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-black transition-all ${
                        i < val.length
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                      }`}
                    >
                      {i < val.length ? "●" : "○"}
                    </div>
                  );
                })}
              </div>

              {/* Custom Keypad */}
              <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (pinMode === "set" && newPin.length < 4) setNewPin(newPin + num);
                      if (pinMode === "confirm" && confirmPin.length < 4) setConfirmPin(confirmPin + num);
                    }}
                    className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => (pinMode === "set" ? setNewPin("") : setConfirmPin(""))}
                  className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                >
                  CLR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pinMode === "set" && newPin.length < 4) setNewPin(newPin + "0");
                    if (pinMode === "confirm" && confirmPin.length < 4) setConfirmPin(confirmPin + "0");
                  }}
                  className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pinMode === "set") setNewPin(newPin.slice(0, -1));
                    if (pinMode === "confirm") setConfirmPin(confirmPin.slice(0, -1));
                  }}
                  className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center text-lg"
                >
                  ⌫
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setPinMode("view"); setNewPin(""); setConfirmPin(""); setPinError(null); }}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                {pinMode === "set" ? (
                  <button
                    type="button"
                    disabled={newPin.length < 4}
                    onClick={() => { setPinMode("confirm"); setConfirmPin(""); }}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all text-xs font-bold disabled:opacity-40"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={confirmPin.length < 4 || confirmPin !== newPin}
                    onClick={handleSavePin}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40"
                  >
                    Save PIN ✓
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: System Metrics */}
      {activeTab === "SYSTEM" && (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 p-6 bg-white dark:bg-slate-900 space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Operating System Summary</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Live operational counts & configuration parameters</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Package className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold">Product Catalog</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{profile.metrics.productCount}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Active product items</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold">Active Batches</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{profile.metrics.activeBatchCount}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Stock batches in rotation</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold">Client Directory</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{profile.metrics.customerCount}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Registered customers</p>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 text-white rounded-2xl text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Database Currency:</span>
              <span className="font-bold text-amber-400">{profile.currency} (Ghana Cedi)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Member Since:</span>
              <span>{new Date(profile.owner.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
