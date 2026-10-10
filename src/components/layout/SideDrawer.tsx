"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
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
      <div className="relative w-80 max-w-[85vw] bg-card h-full shadow-lg flex flex-col z-10 animate-in slide-in-from-left duration-200 border-r border-border">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-[#0D0D0D] border border-border p-1 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <Image
                src="/logo/Avencia gold icon logo.png"
                alt="Avencia Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold leading-none text-foreground truncate">
                  Avencia
                </h2>
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium border border-primary/20">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-normal mt-0.5 truncate">
                Perfume Business OS
              </p>
            </div>
          </div>
          <IconButton
            icon={X}
            size="sm"
            variant="ghost"
            onClick={handleClose}
            aria-label="Close navigation menu"
          />
        </div>

        {/* Drawer Navigation grouped by sections */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? "text-primary-foreground" : "text-muted-foreground"
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
        <div className="p-3 border-t border-border bg-card">
          <Link
            href="/profile"
            onClick={handleClose}
            className={`flex items-center gap-2.5 p-2.5 rounded-md border text-xs font-medium transition-colors ${
              pathname === "/profile"
                ? "bg-primary text-primary-foreground border-primary font-semibold"
                : "bg-muted/40 border-border text-foreground hover:bg-muted"
            }`}
          >
            <div className="w-6 h-6 rounded-sm bg-[#0D0D0D] border border-border flex items-center justify-center p-0.5 flex-shrink-0">
              <Image
                src="/logo/Avencia gold icon logo.png"
                alt="Profile"
                width={20}
                height={20}
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
