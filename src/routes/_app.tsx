import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
  errorComponent: ({ error, reset }) => {
    const navigate = useNavigate();
    useEffect(() => {
      if (/Unauthorized/i.test(error?.message ?? "")) {
        navigate({ to: "/login", replace: true });
      }
    }, [error, navigate]);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>잠시 문제가 있었어요.</p>
        <button onClick={reset} className="text-primary underline">다시 시도</button>
      </div>
    );
  },
});

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session?.access_token) navigate({ to: "/login", replace: true });
  }, [session?.access_token, loading, navigate]);

  if (loading || !session?.access_token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        마음을 불러오는 중…
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
