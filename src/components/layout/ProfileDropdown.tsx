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
        className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        aria-label="User Profile & Settings Menu"
        aria-expanded={isOpen}
      >
        <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700/60 p-1 flex items-center justify-center overflow-hidden shadow-2xs">
          <Image
            src="/logo/Avencia gold icon logo.png"
            alt="Avencia Profile"
            width={32}
            height={32}
            className="w-full h-full object-contain"
          />
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1 text-slate-900 dark:text-slate-100">
          {/* Header Info */}
          <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">Avencia Perfumes</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">owner@avencialuxury.com</p>
          </div>

          {/* Compact Theme Selector Sub-Menu */}
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Theme Mode
            </p>
            <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 ${
                  theme === "light"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="Light Mode"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 ${
                  theme === "dark"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="Dark Mode"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 ${
                  theme === "system"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
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
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Business Profile</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Business Settings</span>
            </Link>

            <button
              onClick={handleLockPin}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-left"
            >
              <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Lock Session PIN</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

