import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile, updateMyProfile } from "@/lib/analyze.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { LogOut, User as UserIcon, KeyRound, AtSign, Quote } from "lucide-react";
import { toast } from "sonner";

const QUOTES = [
  "오늘의 당신은 어제보다 한 뼘 더 따뜻해요.",
  "작은 숨을 깊게, 마음의 결을 부드럽게.",
  "잘 쉬는 것도 잘 사는 일이에요.",
  "흐린 날에도 별은 그 자리에 있어요.",
  "괜찮지 않아도 괜찮아요.",
  "오늘 하루, 당신을 응원할게요.",
  "느려도 좋아요, 당신만의 속도로.",
];

export const Route = createFileRoute("/_app/me")({
  head: () => ({ meta: [{ title: "내 정보 · Syncl\u0023r" }] }),
  component: MePage,
});

function MePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const updateProfile = useServerFn(updateMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(),
    enabled: !!user,
  });


  const quote = useMemo(() => QUOTES[new Date().getDate() % QUOTES.length], []);
  const [editing, setEditing] = useState<null | "username" | "password">(null);
  const [value, setValue] = useState("");

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const saveUsername = async () => {
    if (!value.trim()) return;
    try {
      await updateProfile({ data: { username: value.trim(), display_name: value.trim() } });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("아이디가 변경됐어요");
      setEditing(null); setValue("");
    } catch (e: any) { toast.error(e.message); }
  };

  const savePassword = async () => {
    if (value.length < 6) { toast.error("6자 이상 입력해주세요"); return; }
    const { error } = await supabase.auth.updateUser({ password: value });
    if (error) { toast.error(error.message); return; }
    toast.success("비밀번호가 변경됐어요");
    setEditing(null); setValue("");
  };

  return (
    <div className="space-y-6 animate-float-up">
      <header className="pt-2 flex items-center gap-4">
        <div className="h-16 w-16 rounded-3xl bg-primary/20 grid place-items-center">
          <UserIcon className="h-7 w-7 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">{profile?.display_name ?? "친구"}</h1>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </header>

      <div className="rounded-3xl p-5 text-foreground/90 border border-border bg-gradient-to-br from-secondary/60 via-accent/40 to-primary/30">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1.5">
          <Quote className="h-3 w-3" /> 오늘의 한 줄
        </div>
        <p className="text-[15px] leading-relaxed font-medium">{quote}</p>
      </div>

      <div className="rounded-3xl bg-card border border-border overflow-hidden">
        <MenuRow icon={AtSign} label="아이디 수정" onClick={() => { setEditing("username"); setValue(profile?.username ?? ""); }} />
        <Divider />
        <MenuRow icon={KeyRound} label="비밀번호 수정" onClick={() => { setEditing("password"); setValue(""); }} />
        <Divider />
        <MenuRow icon={LogOut} label="로그아웃" onClick={signOut} danger />
      </div>

      {editing && (
        <div className="rounded-3xl bg-card border border-border p-5 space-y-3 animate-float-up">
          <p className="text-sm font-semibold">{editing === "username" ? "새 아이디" : "새 비밀번호"}</p>
          <input
            type={editing === "password" ? "password" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            placeholder={editing === "username" ? "새 아이디" : "6자 이상"}
          />
          <div className="flex gap-2">
            <button onClick={() => { setEditing(null); setValue(""); }} className="flex-1 rounded-2xl bg-muted py-2.5 text-sm">취소</button>
            <button onClick={editing === "username" ? saveUsername : savePassword} className="flex-1 rounded-2xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold">저장</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Divider() { return <div className="h-px bg-border mx-5" />; }

function MenuRow({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-5 py-4 text-sm hover:bg-muted/50 transition ${danger ? "text-destructive" : ""}`}>
      <Icon className="h-4 w-4" />
      <span className="font-medium">{label}</span>
    </button>
  );
}
