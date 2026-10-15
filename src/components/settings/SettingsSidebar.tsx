"use client";

import React from "react";
import Image from "next/image";
import { ArrowLeft, ChevronRight, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "./SettingsContext";
import { SETTINGS_CATEGORIES } from "./categories";
import { UnsavedChangesModal } from "./UnsavedChangesModal";

export function SettingsSidebar() {
  const {
    activeCategory,
    activeCategoryMeta,
    selectCategory,
    handleGoToAvencia,
    showUnsavedModal,
    confirmDiscardAndExit,
    cancelExit,
    currentUser,
    userLoading,
  } = useSettings();

  const isOwner = currentUser?.role === "OWNER";

  return (
    <>
      <aside
        aria-label="Settings navigation"
        className="hidden md:flex flex-col w-64 lg:w-72 bg-card border-r border-border h-full z-30 select-none flex-shrink-0 font-sans"
      >
        {/* Settings Navigation Header */}
        <div className="p-4 border-b border-border space-y-3 bg-card">
          {/* Working "Go to Avencia" Back Navigation Control */}
          <button
            type="button"
            onClick={handleGoToAvencia}
            aria-label="Return to Avencia application"
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5 -ml-1 rounded-md hover:bg-secondary/70 transition-all group cursor-pointer focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
          >
            <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-1 transition-transform shrink-0" />
            <span className="tracking-tight">Go to Avencia</span>
          </button>

          {/* Settings Section Title and Concise Description */}
          <div className="pt-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                Settings
              </h2>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Preferences & business configuration
            </p>
          </div>
        </div>

        {/* Categories Navigation List */}
        <nav
          aria-label="Settings categories"
          className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar"
        >
          <div className="px-2 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Categories
          </div>

          <div className="space-y-0.5">
            {SETTINGS_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left text-xs font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        isActive ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                    {cat.ownerOnly && !isActive && (
                      <span className="text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border">
                        Owner
                      </span>
                    )}
                    {cat.badge && !isActive && (
                      <span className="text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                        {cat.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={cn(
                        "w-3.5 h-3.5 opacity-60",
                        isActive ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer: User Identity & Business Context */}
        <div className="p-3 border-t border-border bg-card">
          <div className="flex items-center gap-2.5 p-2 rounded-md bg-secondary/40 border border-border">
            <div className="w-7 h-7 rounded-md bg-black border border-border flex items-center justify-center shrink-0 overflow-hidden">
              <Image
                src="/logo/Avencia gold icon logo.png"
                alt="Avencia"
                width={20}
                height={20}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate leading-tight">
                {currentUser?.name || "Avencia"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground truncate leading-tight">
                  {currentUser?.role === "OWNER" ? "Business Owner" : "Worker Account"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Confirmation modal if user clicks Go to Avencia with unsaved form edits */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        categoryName={activeCategoryMeta.name}
        onConfirm={confirmDiscardAndExit}
        onCancel={cancelExit}
      />
    </>
  );
}
