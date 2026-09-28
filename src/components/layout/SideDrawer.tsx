"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X, User } from "lucide-react";
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
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Slide-over Drawer */}
      <div className="relative w-80 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-slate-900 dark:bg-slate-950 p-1 flex items-center justify-center shadow-md shadow-indigo-500/10 flex-shrink-0 overflow-hidden">
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
                <h2 className="text-base font-black leading-none text-slate-900 dark:text-slate-100 truncate">
                  Avencia
                </h2>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold border border-amber-200/80 dark:border-amber-800/60">
                  v2.0.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                Perfume Business OS
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 flex-shrink-0"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Navigation grouped by sections */}
        <nav className="flex-1 p-3.5 space-y-5 overflow-y-auto">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3.5 py-1 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
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
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? "text-white" : "text-slate-400 dark:text-slate-400"
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
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Link
            href="/profile"
            onClick={handleClose}
            className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all ${
              pathname === "/profile"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-slate-950 flex items-center justify-center p-0.5 flex-shrink-0">
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
