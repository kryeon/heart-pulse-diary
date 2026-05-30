import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import logo from "@/assets/synclr-logo.png";

// Gradient sampled from the Syncl#r logo (lavender → pink → peach)
const LOGO_GRADIENT = "linear-gradient(135deg, #aea3d6 0%, #c8a9c1 45%, #ddb9c8 75%, #f0c9a8 100%)";

export function SynclrWordmark({ className = "", style }: { className?: string; style?: CSSProperties }) {
  const gradientStyle: CSSProperties = {
    backgroundImage: LOGO_GRADIENT,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };
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
      <span style={gradientStyle}>Syncl</span>
      <span
        aria-hidden="true"
        style={{
          ...gradientStyle,
          display: "inline",
          opacity: 1,
          visibility: "visible",
          fontFamily: 'Arial, Helvetica, "Apple SD Gothic Neo", sans-serif',
          fontWeight: "inherit",
          lineHeight: "inherit",
          transform: "none",
          marginInline: "0.015em",
        }}
      >
        {"\u0023"}
      </span>
      <span style={gradientStyle}>r</span>
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
