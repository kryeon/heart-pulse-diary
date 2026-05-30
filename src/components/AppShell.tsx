import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import logo from "@/assets/synclr-logo.png";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative">
      <header className="mx-auto max-w-md px-5 pt-5 flex items-center">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <img
            src={logo}
            alt="Synclr"
            className="h-8 w-8 rounded-lg object-cover shadow-sm group-active:scale-95 transition-transform"
          />
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-[#c4a8ff] via-[#ff9eb5] to-[#ffd28a] bg-clip-text text-transparent">
            Synclr
          </span>
        </Link>
      </header>
      <main className="mx-auto max-w-md px-5 pt-3 pb-32">{children}</main>
      <BottomNav />
    </div>
  );
}
