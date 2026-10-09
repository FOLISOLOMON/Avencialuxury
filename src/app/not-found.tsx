import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground text-center">
      <div className="w-14 h-14 rounded-md bg-card border border-border p-2 flex items-center justify-center mb-4 shadow-sm">
        <Image
          src="/logo/Avencia gold icon logo.png"
          alt="Avencia"
          width={40}
          height={40}
          className="object-contain"
        />
      </div>

      <h1 className="text-xl font-semibold text-foreground mb-1">Page Not Found</h1>
      <p className="text-xs text-muted-foreground max-w-xs mb-6">
        The page you are looking for does not exist or has been moved.
      </p>

      <div className="flex gap-3">
        <Link
          href="/"
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          Open Avencia OP
        </Link>
        <Link
          href="/mobile"
          className="px-4 py-2 rounded-md bg-card border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors"
        >
          Open Avencia Mobile
        </Link>
      </div>
    </div>
  );
}
