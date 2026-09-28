import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { FloatingActionButton } from "@/components/layout/FloatingActionButton";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Avencia | Business Management & Sales Platform",
  description: "Lightweight perfume business operating system",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo/Avencia gold icon logo.png",
    shortcut: "/logo/Avencia gold icon logo.png",
    apple: "/logo/Avencia gold icon logo.png",
  },
};

const themeScript = `(function() {
  try {
    var theme = localStorage.getItem('avencia_theme');
    var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (!theme && supportDarkMode) || (theme === 'system' && supportDarkMode)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased flex`}>
        <ThemeProvider>
          <ToastProvider>
            {/* Desktop Navigation Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-20 md:pb-8">
              <Header />
              <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
                {children}
              </main>
            </div>

            {/* Mobile Navigation Bar */}
            <MobileNav />

            {/* Context-Aware Floating Action Button */}
            <FloatingActionButton />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


