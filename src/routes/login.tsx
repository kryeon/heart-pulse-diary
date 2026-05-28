import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "로그인 · 마음결" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("환영해요! 마음을 기록해 보세요.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "다시 시도해 주세요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 animate-float-up">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/20 mb-4">
            <Heart className="h-7 w-7 text-primary" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold">마음결</h1>
          <p className="text-sm text-muted-foreground mt-1.5">오늘의 마음을 부드럽게 들여다봐요</p>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-card border border-border p-6 shadow-sm space-y-3">
          <input
            type="email" required placeholder="이메일"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="password" required minLength={6} placeholder="비밀번호 (6자 이상)"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit" disabled={loading}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 transition-transform active:scale-[0.98]"
          >
            {loading ? "잠시만요…" : mode === "signin" ? "들어가기" : "시작하기"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs text-muted-foreground hover:text-foreground pt-1"
          >
            {mode === "signin" ? "처음이신가요? 가입하기" : "이미 계정이 있어요"}
          </button>
        </form>
      </div>
    </div>
  );
}
