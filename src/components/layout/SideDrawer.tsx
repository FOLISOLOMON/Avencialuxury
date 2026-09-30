"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { navigationSections } from "./Sidebar";

interface SideDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SideDrawer({ isOpen: controlledIsOpen, onClose: controlledOnClose }: SideDrawerProps) {
  const pathname = usePathname();
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isDrawerOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  useEffect(() => {
    const handleOpenEvent = () => {
      setInternalIsOpen(true);
    };

    window.addEventListener("avencia:open-drawer", handleOpenEvent);
    return () => {
      window.removeEventListener("avencia:open-drawer", handleOpenEvent);
    };
  }, []);

  if (!isDrawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Drawer"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0D0D0D]/70 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Slide-over Drawer */}
      <div className="relative w-80 max-w-[85vw] bg-white dark:bg-[#151515] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 border-r border-[#E5E2D8] dark:border-[#2A2A2A]">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#E5E2D8] dark:border-[#2A2A2A] flex items-center justify-between bg-white dark:bg-[#151515]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#0D0D0D] border border-gold-500/30 p-1 flex items-center justify-center shadow-md shadow-gold-500/10 flex-shrink-0 overflow-hidden">
              <Image
                src="/logo/Avencia gold icon logo.png"
                alt="Avencia Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black leading-none text-[#171717] dark:text-[#F5F5F5] truncate">
                  Avencia
                </h2>
                <span className="px-1.5 py-0.5 rounded-full bg-gold-500/15 text-gold-600 dark:text-gold-400 text-[10px] font-extrabold border border-gold-500/30">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] font-medium mt-0.5 truncate">
                Perfume Business OS
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-[#F8F7F3] dark:bg-[#181818] text-[#737373] dark:text-[#A3A3A3] hover:bg-gold-500/15 hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 flex-shrink-0"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5 text-gold-600 dark:text-gold-400" />
          </button>
        </div>

        {/* Drawer Navigation grouped by sections */}
        <nav className="flex-1 p-3.5 space-y-5 overflow-y-auto">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3.5 py-1 text-[10px] font-extrabold text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => {
                        if (isActive) e.preventDefault();
                        handleClose();
                      }}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-gold-500 text-white shadow-lg shadow-gold-500/25 font-black"
                          : "text-[#525252] dark:text-[#D4D4D4] hover:bg-gold-500/10 dark:hover:bg-gold-500/15 hover:text-[#171717] dark:hover:text-[#F5F5F5]"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? "text-white" : "text-[#737373] dark:text-[#A3A3A3]"
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Profile Link */}
        <div className="p-3.5 border-t border-[#E5E2D8] dark:border-[#2A2A2A] bg-[#F8F7F3] dark:bg-[#181818]">
          <Link
            href="/profile"
            onClick={handleClose}
            className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all ${
              pathname === "/profile"
                ? "bg-gold-500 text-white border-gold-500 shadow-md shadow-gold-500/20"
                : "bg-white dark:bg-[#151515] border-[#E5E2D8] dark:border-[#2A2A2A] text-[#171717] dark:text-[#F5F5F5] hover:bg-gold-500/10"
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-[#0D0D0D] border border-gold-500/30 flex items-center justify-center p-0.5 flex-shrink-0">
              <Image
                src="/logo/Avencia gold icon logo.png"
                alt="Profile"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="flex-1 truncate">Profile & Security</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
