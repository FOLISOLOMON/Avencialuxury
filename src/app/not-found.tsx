import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground text-center">
      <div className="w-16 h-16 rounded-2xl bg-card border border-primary/40 p-2 flex items-center justify-center mb-4 shadow-lg">
        <Image
          src="/logo/Avencia gold icon logo.png"
          alt="Avencia"
          width={48}
          height={48}
          className="object-contain"
        />
      </div>

      <h1 className="text-3xl font-black text-foreground mb-1">Page Not Found</h1>
      <p className="text-xs text-muted-foreground max-w-xs mb-6">
        The page you are looking for does not exist or has been moved.
      </p>

      <div className="flex gap-3">
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all"
        >
          Open Avencia OP
        </Link>
        <Link
          href="/mobile"
          className="px-4 py-2 rounded-xl bg-card border border-border text-foreground text-xs font-bold hover:bg-muted active:scale-95 transition-all"
        >
          Open Avencia Mobile
        </Link>
      </div>
    </div>
  );
}
