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
      className="fixed top-16 right-4 sm:right-8 z-50 w-full sm:w-[390px] max-w-[calc(100vw-2rem)] bg-white dark:bg-[#151515] rounded-3xl border border-[#E5E2D8] dark:border-[#2A2A2A] shadow-2xl overflow-hidden font-sans animate-in fade-in slide-in-from-top-3 duration-200 flex flex-col max-h-[80vh] text-[#171717] dark:text-[#F5F5F5]"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#E5E2D8] dark:border-[#2A2A2A] flex items-center justify-between bg-[#F8F7F3] dark:bg-[#181818] flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-sm text-[#171717] dark:text-[#F5F5F5]">Notifications</h3>
          {notifications.filter((n) => !n.isRead).length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-600 dark:text-gold-400 text-[10px] font-extrabold border border-gold-500/30">
              {notifications.filter((n) => !n.isRead).length} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllAsRead}
            className="text-[11px] font-bold text-gold-600 dark:text-gold-400 hover:text-gold-700 transition-colors flex items-center gap-1 px-1.5 py-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
            title="Mark all as read"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white dark:bg-[#2A2A2A] text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="p-3 border-b border-[#E5E2D8] dark:border-[#2A2A2A] flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0 bg-white dark:bg-[#151515]">
        {(["ALL", "UNREAD", "INVENTORY", "SALES", "FINANCE", "SECURITY"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
              filter === f
                ? "bg-gold-500 text-white font-black shadow-md shadow-gold-500/20"
                : "bg-[#F8F7F3] dark:bg-[#181818] text-[#525252] dark:text-[#D4D4D4] hover:bg-gold-500/10"
            }`}
          >
            {f === "ALL" ? "All" : f === "UNREAD" ? "Unread" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Notifications Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#E5E2D8] dark:divide-[#2A2A2A] p-2 space-y-1">
        {loading ? (
          <div className="p-8 text-center space-y-2">
            <Loader2 className="w-6 h-6 text-gold-500 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-[#737373] dark:text-[#A3A3A3]">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/15 text-gold-600 dark:text-gold-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <h4 className="font-extrabold text-xs text-[#171717] dark:text-[#F5F5F5]">You're all caught up!</h4>
            <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3]">No new notifications in this category.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-3 rounded-2xl cursor-pointer transition-all flex items-start gap-3 relative group ${
                !n.isRead
                  ? "bg-gold-500/10 dark:bg-gold-500/15 border border-gold-500/30"
                  : "hover:bg-[#F8F7F3] dark:hover:bg-[#181818]"
              }`}
            >
              <div className="p-2 rounded-xl bg-[#F8F7F3] dark:bg-[#181818] flex-shrink-0 mt-0.5 border border-[#E5E2D8] dark:border-[#2A2A2A]">
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
