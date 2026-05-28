import { Link } from "@tanstack/react-router";
import { PencilLine, CalendarDays, User } from "lucide-react";

const items = [
  { to: "/", label: "입력", Icon: PencilLine },
  { to: "/calendar", label: "달력", Icon: CalendarDays },
  { to: "/me", label: "내 정보", Icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-4 pb-4">
        <div className="rounded-3xl bg-card/90 backdrop-blur-xl border border-border shadow-[0_10px_40px_-10px_rgba(150,120,200,0.25)] flex items-center justify-around py-3">
          {items.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl text-muted-foreground transition-all data-[status=active]:text-primary data-[status=active]:bg-primary/10"
              activeOptions={{ exact: true }}
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
