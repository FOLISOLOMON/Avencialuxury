"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Settings, Lock, ChevronDown, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  const handleLockPin = () => {
    sessionStorage.removeItem("avencia_pin_unlocked");
    window.dispatchEvent(new CustomEvent("avencia:lock-pin"));
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Trigger Button: Avatar + Dropdown Indicator */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-1 rounded-full hover:bg-gold-500/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        aria-label="User Profile & Settings Menu"
        aria-expanded={isOpen}
      >
        <div className="w-9 h-9 rounded-full bg-[#0D0D0D] border border-gold-500/30 p-1 flex items-center justify-center overflow-hidden shadow-xs">
          <Image
            src="/logo/Avencia gold icon logo.png"
            alt="Avencia Profile"
            width={32}
            height={32}
            className="w-full h-full object-contain"
          />
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gold-600 dark:text-gold-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#151515] rounded-2xl border border-[#E5E2D8] dark:border-[#2A2A2A] shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1 text-[#171717] dark:text-[#F5F5F5]">
          {/* Header Info */}
          <div className="px-3.5 py-2 border-b border-[#E5E2D8] dark:border-[#2A2A2A]">
            <p className="text-xs font-black text-[#171717] dark:text-[#F5F5F5] truncate">Avencia Perfumes</p>
            <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] font-medium truncate">owner@avencialuxury.com</p>
          </div>

          {/* Compact Theme Selector Sub-Menu */}
          <div className="px-3 py-1.5 border-b border-[#E5E2D8] dark:border-[#2A2A2A] space-y-1">
            <p className="text-[10px] font-extrabold text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider">
              Theme Mode
            </p>
            <div className="p-1 bg-[#F8F7F3] dark:bg-[#181818] rounded-xl grid grid-cols-3 gap-1 border border-[#E5E2D8] dark:border-[#2A2A2A]">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-500 ${
                  theme === "light"
                    ? "bg-white dark:bg-[#2A2A2A] text-gold-600 dark:text-gold-400 shadow-xs font-black"
                    : "text-[#525252] dark:text-[#D4D4D4] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
                }`}
                title="Light Mode"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-500 ${
                  theme === "dark"
                    ? "bg-white dark:bg-[#2A2A2A] text-gold-600 dark:text-gold-400 shadow-xs font-black"
                    : "text-[#525252] dark:text-[#D4D4D4] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
                }`}
                title="Dark Mode"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-500 ${
                  theme === "system"
                    ? "bg-white dark:bg-[#2A2A2A] text-gold-600 dark:text-gold-400 shadow-xs font-black"
                    : "text-[#525252] dark:text-[#D4D4D4] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
                }`}
                title="System Mode"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Menu Items */}
          <div className="px-1.5 space-y-0.5">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#525252] dark:text-[#D4D4D4] hover:bg-gold-500/10 dark:hover:bg-gold-500/15 hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors"
            >
              <User className="w-4 h-4 text-gold-600 dark:text-gold-400" />
              <span>Business Profile</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#525252] dark:text-[#D4D4D4] hover:bg-gold-500/10 dark:hover:bg-gold-500/15 hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors"
            >
              <Settings className="w-4 h-4 text-gold-600 dark:text-gold-400" />
              <span>Business Settings</span>
            </Link>

            <button
              onClick={handleLockPin}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#525252] dark:text-[#D4D4D4] hover:bg-gold-500/10 dark:hover:bg-gold-500/15 hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors text-left"
            >
              <Lock className="w-4 h-4 text-[#737373] dark:text-[#A3A3A3]" />
              <span>Lock Session PIN</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
