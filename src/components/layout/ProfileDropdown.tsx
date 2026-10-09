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
        <div className="absolute right-0 mt-2 w-60 bg-card rounded-md border border-border shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1 text-foreground">
          {/* Header Info */}
          <div className="px-3.5 py-2 border-b border-border">
            <p className="text-xs font-semibold text-foreground truncate">Avencia Perfumes</p>
            <p className="text-[11px] text-muted-foreground font-normal truncate">owner@avencialuxury.com</p>
          </div>

          {/* Compact Theme Selector Sub-Menu */}
          <div className="px-3 py-1.5 border-b border-border space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Theme Mode
            </p>
            <div className="p-0.5 bg-muted rounded-md grid grid-cols-3 gap-1 border border-border">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                  theme === "light"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Light Mode"
              >
                <Sun className="w-3 h-3" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                  theme === "dark"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Dark Mode"
              >
                <Moon className="w-3 h-3" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                  theme === "system"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="System Mode"
              >
                <Monitor className="w-3 h-3" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Menu Items */}
          <div className="px-1.5 space-y-0.5">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <User className="w-4 h-4 text-primary" />
              <span>Business Profile</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Settings className="w-4 h-4 text-primary" />
              <span>Business Settings</span>
            </Link>

            <button
              onClick={handleLockPin}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span>Lock Session PIN</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
