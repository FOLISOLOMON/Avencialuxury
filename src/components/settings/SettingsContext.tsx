"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useTransition,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SETTINGS_CATEGORIES,
  type SettingsCategory,
  type CategoryMeta,
} from "./categories";

interface SettingsContextValue {
  activeCategory: SettingsCategory;
  activeCategoryMeta: CategoryMeta;
  selectCategory: (cat: SettingsCategory) => void;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: "OWNER" | "WORKER";
  } | null;
  userLoading: boolean;
  mobileView: "list" | "content";
  setMobileView: (view: "list" | "content") => void;
  handleGoToAvencia: () => void;
  showUnsavedModal: boolean;
  confirmDiscardAndExit: () => void;
  cancelExit: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function SearchParamsSync({
  onParamChange,
}: {
  onParamChange: (param: SettingsCategory | null) => void;
}) {
  const searchParams = useSearchParams();
  const catParam = searchParams.get("category") as SettingsCategory | null;

  useEffect(() => {
    onParamChange(catParam);
  }, [catParam, onParamChange]);

  return null;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get("category") as SettingsCategory | null;
        if (cat && SETTINGS_CATEGORIES.some((c) => c.id === cat)) {
          return cat;
        }
      } catch (e) {}
    }
    return "profile";
  });

  // Mobile navigation view: 'list' (shows category directory) vs 'content' (shows category form full-width)
  const [mobileView, setMobileView] = useState<"list" | "content">(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get("category")) return "content";
      } catch (e) {}
    }
    return "list";
  });

  // Unsaved changes state tracking
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // User auth state
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: "OWNER" | "WORKER";
  } | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Load auth state
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const u = json?.user || json?.data?.user;
        if (json?.success && u) {
          setCurrentUser(u);
        }
      })
      .catch((e) => console.warn("Failed to load user:", e))
      .finally(() => setUserLoading(false));
  }, []);

  const handleSearchParamChange = useCallback(
    (catParam: SettingsCategory | null) => {
      if (catParam && SETTINGS_CATEGORIES.some((c) => c.id === catParam)) {
        setActiveCategory(catParam);
        setMobileView("content");
      }
    },
    []
  );

  const selectCategory = useCallback(
    (catId: SettingsCategory) => {
      setActiveCategory(catId);
      setMobileView("content");
      startTransition(() => {
        router.replace(`/settings?category=${catId}`, { scroll: false });
      });
    },
    [router]
  );

  const getSafeReturnRoute = useCallback((): string => {
    try {
      const stored = sessionStorage.getItem("avencia:lastSafeRoute");
      if (stored && !stored.startsWith("/settings") && stored !== "/settings") {
        return stored;
      }
    } catch (e) {}
    return "/";
  }, []);

  const handleGoToAvencia = useCallback(() => {
    if (isDirty) {
      setShowUnsavedModal(true);
      return;
    }
    const safeRoute = getSafeReturnRoute();
    router.push(safeRoute);
  }, [isDirty, getSafeReturnRoute, router]);

  const confirmDiscardAndExit = useCallback(() => {
    setIsDirty(false);
    setShowUnsavedModal(false);
    const safeRoute = getSafeReturnRoute();
    router.push(safeRoute);
  }, [getSafeReturnRoute, router]);

  const cancelExit = useCallback(() => {
    setShowUnsavedModal(false);
  }, []);

  const activeCategoryMeta =
    SETTINGS_CATEGORIES.find((c) => c.id === activeCategory) ||
    SETTINGS_CATEGORIES[0];

  return (
    <SettingsContext.Provider
      value={{
        activeCategory,
        activeCategoryMeta,
        selectCategory,
        isDirty,
        setIsDirty,
        currentUser,
        userLoading,
        mobileView,
        setMobileView,
        handleGoToAvencia,
        showUnsavedModal,
        confirmDiscardAndExit,
        cancelExit,
      }}
    >
      <Suspense fallback={null}>
        <SearchParamsSync onParamChange={handleSearchParamChange} />
      </Suspense>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

export function useOptionalSettings() {
  return useContext(SettingsContext);
}
