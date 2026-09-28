"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { NotificationCenter } from "./NotificationCenter";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCenterOpen, setIsCenterOpen] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      const json = await res.json();
      if (json.success) {
        setUnreadCount(json.count);
      }
    } catch (e) {
      console.error("Failed to fetch unread count", e);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Poll unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    const handleCreated = () => fetchUnreadCount();
    window.addEventListener("avencia:notification-created", handleCreated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("avencia:notification-created", handleCreated);
    };
  }, []);

  return (
    <>
      <button
        onClick={() => setIsCenterOpen(!isCenterOpen)}
        className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        title="Notifications"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-extrabold text-white bg-rose-600 rounded-full border-2 border-white dark:border-slate-900 animate-in zoom-in-50 duration-150">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationCenter
        isOpen={isCenterOpen}
        onClose={() => setIsCenterOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
}
