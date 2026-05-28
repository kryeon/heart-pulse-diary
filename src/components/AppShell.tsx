import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background relative">
      {/* soft pastel ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-secondary/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
      </div>
      <main className="mx-auto max-w-md px-5 pt-8 pb-32">{children}</main>
      <BottomNav />
    </div>
  );
}
