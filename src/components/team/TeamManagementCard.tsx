"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  RefreshCw,
  AlertTriangle,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Worker {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "WORKER";
  isActive: boolean;
  createdAt: string;
  _count: {
    sales: number;
    debtPayments: number;
  };
}

interface Invitation {
  id: string;
  email: string;
  name: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
  invitationUrl?: string;
}

export function TeamManagementCard() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [lastCreatedInviteUrl, setLastCreatedInviteUrl] = useState<string | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestMsg, setEmailTestMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team");
      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || `Failed to load team data (${res.status})`);
      }
      const json = await res.json();
      if (json && json.success) {
        const workersList = json.workers || json.data?.workers || [];
        const invitationsList = json.invitations || json.data?.invitations || [];
        setWorkers(Array.isArray(workersList) ? workersList : []);
        setInvitations(Array.isArray(invitationsList) ? invitationsList : []);
      } else {
        setError(json?.error || "Failed to load team data");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch team records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setInviteSuccessMsg(null);
    setLastCreatedInviteUrl(null);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create invitation");
      }

      setInviteSuccessMsg(json.message || `Invitation generated for ${inviteName}!`);
      const inviteLink = json.inviteUrl || json.invitationUrl || json.data?.inviteUrl || json.data?.invitationUrl;
      if (inviteLink) {
        setLastCreatedInviteUrl(inviteLink);
      }
      setInviteName("");
      setInviteEmail("");
      fetchTeam();
    } catch (err: any) {
      setError(err.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleToggleWorkerStatus = async (workerId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/team/${workerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: currentActive ? "deactivate" : "activate",
          isActive: !currentActive,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTeam();
      } else {
        setError(json.error || "Failed to update worker status");
      }
    } catch (err: any) {
      setError(err.message || "Error updating worker");
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/team/invitations/${invitationId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        fetchTeam();
      } else {
        setError(json.error || "Failed to revoke invitation");
      }
    } catch (err: any) {
      setError(err.message || "Error revoking invitation");
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setEmailTestMsg(null);
    try {
      const res = await fetch("/api/team/test-email", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setEmailTestMsg({ type: "success", text: json.message || "Email connection verified successfully!" });
      } else {
        setEmailTestMsg({ type: "error", text: json.error || "Failed to connect to email server" });
      }
    } catch (err: any) {
      setEmailTestMsg({ type: "error", text: err.message || "Failed to test email connection" });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setResendingId(invitationId);
    setError(null);
    try {
      const res = await fetch(`/api/team/invitations/${invitationId}`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setInviteSuccessMsg(json.message || "Invitation email resent!");
        if (json.inviteUrl) setLastCreatedInviteUrl(json.inviteUrl);
        fetchTeam();
      } else {
        setError(json.error || "Failed to resend invitation");
      }
    } catch (err: any) {
      setError(err.message || "Error resending invitation");
    } finally {
      setResendingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Invite link copied to clipboard!");
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Worker Team & Access Management
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Invite workers to the mobile app, manage roles, and deactivate accounts with instant session revocation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestEmail}
            isLoading={testingEmail}
            className="gap-1.5 text-xs"
            title="Send a live test email using your configured SMTP / Gmail credentials"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Test Email Service</span>
          </Button>

          <Button
            variant={showInviteForm ? "secondary" : "primary"}
            size="sm"
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>{showInviteForm ? "Close Form" : "Invite New Worker"}</span>
          </Button>
        </div>
      </div>

      {emailTestMsg && (
        <div
          className={`p-3 rounded-md text-xs font-medium flex items-center justify-between gap-2 ${
            emailTestMsg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {emailTestMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{emailTestMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setEmailTestMsg(null)}
            className="text-neutral-400 hover:text-neutral-200"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {inviteSuccessMsg && (
        <div className="p-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{inviteSuccessMsg}</span>
          </div>
          {lastCreatedInviteUrl && (
            <div className="bg-black/40 p-2.5 rounded border border-emerald-500/30 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-neutral-300 truncate">
                {lastCreatedInviteUrl}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(lastCreatedInviteUrl)}
                className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors flex-shrink-0"
                title="Copy Link"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invite Form Drawer */}
      {showInviteForm && (
        <form
          onSubmit={handleSendInvite}
          className="p-4 rounded-lg bg-muted/40 border border-border space-y-3 animate-in fade-in duration-150"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Worker Full Name</label>
              <Input
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Ama Mensah"
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Worker Email</label>
              <Input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="worker@example.com"
                className="text-xs h-9"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowInviteForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={inviting}>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Generate Invitation Token
            </Button>
          </div>
        </form>
      )}

      {/* Active Team Table */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Active Team Members ({workers.length})
        </h4>

        {loading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Loading team...</div>
        ) : workers.length === 0 ? (
          <div className="p-4 rounded border border-dashed border-border text-center text-xs text-muted-foreground">
            No registered workers yet. Use the invite button above to add workers.
          </div>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border bg-card overflow-hidden">
            {workers.map((w) => (
              <div
                key={w.id}
                className="p-3 sm:px-4 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">{w.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        w.role === "OWNER"
                          ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                          : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {w.role}
                    </span>
                    {!w.isActive && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                        Deactivated
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{w.email}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Attributed: {w._count?.sales ?? 0} sales • {w._count?.debtPayments ?? 0} debt collections
                  </p>
                </div>

                {w.role !== "OWNER" && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant={w.isActive ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => handleToggleWorkerStatus(w.id, w.isActive)}
                      className="text-xs h-7 px-2.5"
                    >
                      {w.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations Table */}
      {invitations.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pending Invitations ({invitations.length})
          </h4>

          <div className="divide-y divide-border rounded-md border border-border bg-card overflow-hidden">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="p-3 sm:px-4 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{inv.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400">
                      Pending Acceptance
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{inv.email}</p>
                  <p className="text-[10px] text-neutral-500">
                    Expires: {new Date(inv.expiresAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResendInvitation(inv.id)}
                    isLoading={resendingId === inv.id}
                    className="text-xs h-7 px-2.5 gap-1"
                    title="Resend invitation email"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Resend</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeInvitation(inv.id)}
                    className="text-xs h-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
