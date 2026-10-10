"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  X,
  Package,
  ShoppingBag,
  Receipt,
  Users,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Trash2,
  Loader2,
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  category: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

export function NotificationCenter({
  isOpen,
  onClose,
  onUnreadCountChange,
}: NotificationCenterProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "INVENTORY" | "SALES" | "FINANCE" | "SECURITY">("ALL");
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const categoryParam = filter === "UNREAD" ? "ALL" : filter;
      const unreadParam = filter === "UNREAD" ? "true" : "false";

      const res = await fetch(`/api/notifications?category=${categoryParam}&unreadOnly=${unreadParam}`);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.notifications);
        const unread = json.notifications.filter((n: NotificationItem) => !n.isRead).length;
        onUnreadCountChange(unread);
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, filter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      const res = await fetch("/api/notifications/unread-count");
      const json = await res.json();
      if (json.success) onUnreadCountChange(json.count);
    } catch (err) {}
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    onUnreadCountChange(0);

    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
    } catch (err) {}
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      const res = await fetch("/api/notifications/unread-count");
      const json = await res.json();
      if (json.success) onUnreadCountChange(json.count);
    } catch (err) {}
  };

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.isRead) {
      handleMarkAsRead(n.id);
    }
    onClose();
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  };

  if (!isOpen) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "INVENTORY":
        return <Package className="w-4 h-4 text-gold-600 dark:text-gold-400" />;
      case "SALES":
        return <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "FINANCE":
        return <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "CUSTOMERS":
        return <Users className="w-4 h-4 text-[#C9A227]" />;
      case "SECURITY":
        return <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-[#737373] dark:text-[#A3A3A3]" />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div
      ref={panelRef}
      className="fixed top-16 right-4 sm:right-8 z-50 w-full sm:w-[390px] max-w-[calc(100vw-2rem)] bg-card rounded-lg border border-border shadow-xl overflow-hidden font-sans animate-in fade-in slide-in-from-top-3 duration-200 flex flex-col max-h-[80vh] text-foreground"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
          {notifications.filter((n) => !n.isRead).length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20">
              {notifications.filter((n) => !n.isRead).length} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleMarkAllAsRead}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-1.5 py-1 rounded cursor-pointer"
            title="Mark all as read"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="p-2.5 border-b border-border flex items-center gap-1 overflow-x-auto scrollbar-none flex-shrink-0 bg-card">
        {(["ALL", "UNREAD", "INVENTORY", "SALES", "FINANCE", "SECURITY"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              filter === f
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {f === "ALL" ? "All" : f === "UNREAD" ? "Unread" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Notifications Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-border p-2 space-y-1">
        {loading ? (
          <div className="p-8 text-center space-y-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-9 h-9 rounded-md bg-muted text-foreground flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <h4 className="font-semibold text-xs text-foreground">You&apos;re all caught up!</h4>
            <p className="text-[11px] text-muted-foreground">No new notifications in this category.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-2.5 rounded-md cursor-pointer transition-colors flex items-start gap-2.5 relative border ${
                !n.isRead
                  ? "bg-primary/5 border-primary/20"
                  : "border-transparent hover:bg-muted/50"
              }`}
            >
              <div className="p-1.5 rounded-md bg-muted/60 flex-shrink-0 mt-0.5 border border-border">
                {getCategoryIcon(n.category)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs text-[#171717] dark:text-[#F5F5F5] truncate">{n.title}</h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-gold-500 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-[#737373] dark:text-[#A3A3A3] font-semibold whitespace-nowrap">
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-[#525252] dark:text-[#D4D4D4] leading-snug line-clamp-2">{n.message}</p>

                {n.actionLabel && (
                  <div className="pt-1 flex items-center gap-1 text-[11px] font-extrabold text-gold-600 dark:text-gold-400 hover:text-gold-700">
                    <span>{n.actionLabel}</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                )}
              </div>

              <button
                onClick={(e) => handleDelete(n.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[#737373] dark:text-[#A3A3A3] hover:text-rose-600 transition-opacity"
                title="Dismiss"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
