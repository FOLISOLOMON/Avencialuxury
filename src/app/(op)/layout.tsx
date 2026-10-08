import React from "react";
import { AppShell } from "@/components/layout/AppShell";

export const metadata = {
  title: "Avencia OP | Business Management System",
  description: "Avencia full operations & business management platform",
};

export default function OpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
