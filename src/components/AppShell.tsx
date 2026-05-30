import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import logo from "@/assets/synclr-logo.png";

export function SynclrWordmark({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      className={className}
      aria-label={"Syncl\u0023r"}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        fontFamily: 'Arial, Helvetica, "Apple SD Gothic Neo", sans-serif',
        letterSpacing: "0",
        lineHeight: 1,
        ...style,
      }}
    >
      <span>Syncl</span>
      <span
        aria-hidden="true"
        style={{
          display: "inline",
          color: "inherit",
          opacity: 1,
          visibility: "visible",
          WebkitTextFillColor: "currentColor",
          fontFamily: 'Arial, Helvetica, "Apple SD Gothic Neo", sans-serif',
          fontWeight: "inherit",
          lineHeight: "inherit",
          transform: "none",
          marginInline: "0.015em",
        }}
      >
        {"\u0023"}
      </span>
      <span>r</span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative">
      <header className="mx-auto max-w-md px-5 pt-5 flex items-center">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <img
            src={logo}
            alt={"Syncl\u0023r"}
            className="h-8 w-8 rounded-lg object-cover shadow-sm group-active:scale-95 transition-transform"
          />
          <SynclrWordmark className="text-base font-bold text-primary" />
        </Link>
      </header>
      <main className="mx-auto max-w-md px-5 pt-3 pb-32">{children}</main>
      <BottomNav />
    </div>
  );
}
