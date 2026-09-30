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
        className="relative p-2 rounded-xl bg-[#F8F7F3] dark:bg-[#181818] hover:bg-gold-500/15 text-[#525252] dark:text-[#D4D4D4] hover:text-[#171717] dark:hover:text-[#F5F5F5] border border-[#E5E2D8] dark:border-[#2A2A2A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        title="Notifications"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-4 h-4 text-gold-600 dark:text-gold-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-extrabold text-white bg-gold-600 rounded-full border-2 border-white dark:border-[#151515] animate-in zoom-in-50 duration-150">
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
