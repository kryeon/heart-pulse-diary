import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeEntry, getMyProfile, getTodayEntry } from "@/lib/analyze.functions";
import { setEmotionResult, type EmotionResult } from "@/lib/emotionResult";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ImagePlus, Moon, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WheelPicker } from "@/components/WheelPicker";
import logo from "@/assets/synclr-logo.png";
import { SynclrWordmark } from "@/components/AppShell";



export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "오늘 하루 · Syncl\u0023r" }] }),
  component: InputPage,
});

function localDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function InputPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { user } = useAuth();
  const fetchToday = useServerFn(getTodayEntry);
  const analyze = useServerFn(analyzeEntry);
  const fetchProfile = useServerFn(getMyProfile);
  const localDate = localDateStr();
  const { data: today, isLoading, isFetching } = useQuery({
    queryKey: ["today", localDate, user?.id],
    queryFn: () => fetchToday({ data: { local_date: localDate } }),
    enabled: !!user,
  });

  const [content, setContent] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sleepHour, setSleepHour] = useState<number | null>(null);
  const [sleepDecimal, setSleepDecimal] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);


  // Navigate to analysis only after the today-check completes
  useEffect(() => {
    if (!isLoading && !isFetching && today) {
      navigate({ to: "/analysis", replace: true });
    }
  }, [isLoading, isFetching, today, navigate]);

  // While checking (or about to redirect), show a full-screen breathing signature loader
  if (isLoading || isFetching || today) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-5">
        <div className="relative">
          <div className="absolute inset-0 rounded-full animate-signature-glow" />
          <img
            src={logo}
            alt={"Syncl\u0023r"}
            className="relative h-24 w-24 rounded-2xl object-cover shadow-lg animate-breathe"
          />

        </div>
        <SynclrWordmark className="text-lg font-bold text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">마음을 살피는 중…</p>
      </div>
    );
  }



  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) { toast.error("2MB 이하 이미지를 올려주세요"); return; }
    const r = new FileReader();
    r.onload = () => setImageDataUrl(r.result as string);
    r.readAsDataURL(f);
  };

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast.error("오늘의 마음을 한 줄이라도 적어주세요.");
      return;
    }

    console.log("WEBHOOK URL:", import.meta.env.VITE_N8N_WEBHOOK_URL);
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      toast.error("Webhook URL이 설정되지 않았습니다.");
      return;
    }

    setBusy(true);
    try {
      const sleep_hours =
        sleepHour !== null ? sleepHour + (sleepDecimal ?? 0) / 10 : 7;
      const energy_level = energyLevel ?? 3;

      const payload = {
        user_id: "u002",
        entry_date: new Date().toISOString().slice(0, 10),
        text: content.trim(),
        image_url: "",
        profile: {
          nickname: "ewha",
          email: "ewha@ewha.ac.kr",
          preferred_tone: "calm",
        },
        sleep_hours,
        energy_level,
      };

      console.log("Sending payload:", payload);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`분석 요청 실패: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as EmotionResult & { success?: boolean; entry_id?: string };
      console.log("n8n response:", data);

      if (data?.success === false) throw new Error("분석에 실패했어요");

      setEmotionResult(data);
      try {
        localStorage.setItem("latest_emotion_result", JSON.stringify(data));
        localStorage.setItem("latest_entry_id", (data as any)?.entry_id ?? "");
      } catch {}

      // Persist to DB in background so calendar/history still works.
      analyze({ data: { content: content.trim(), image_url: imageDataUrl, local_date: localDate } })
        .then(() => router.invalidate())
        .catch(() => {});

      navigate({ to: "/analysis" });
    } catch (error: any) {
      console.error("Webhook fetch error:", error);
      toast.error(error?.message ?? "분석에 실패했어요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-float-up">
      <header className="pt-4">
        <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug">
          오늘 하루는 어땠나요?<br />
          <span className="text-primary">당신의 마음을 들려주세요</span>
        </h1>
      </header>

      <div className="rounded-3xl bg-card border border-border p-5 shadow-sm">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          placeholder="복잡했던 회의, 작은 행복, 떠오른 생각… 무엇이든 좋아요."
          className="w-full min-h-[180px] bg-transparent outline-none text-[15px] leading-relaxed resize-none placeholder:text-muted-foreground/70"
        />
        <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
          <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ImagePlus className="h-4 w-4" />
            <span>{imageDataUrl ? "이미지 변경" : "이미지 (선택)"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </label>
          <span className="text-[11px] text-muted-foreground">{content.length}/2000</span>
        </div>
        {imageDataUrl && (
          <img src={imageDataUrl} alt="첨부" className="mt-3 rounded-2xl max-h-40 object-cover" />
        )}
      </div>

      <div className="rounded-3xl bg-card border border-border p-5 shadow-sm space-y-6">
        {/* 수면 시간 */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">오늘의 수면 시간</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={24}
              step={1}
              value={sleepHour ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") { setSleepHour(null); return; }
                const n = Number(val);
                if (n >= 0 && n <= 24 && Number.isInteger(n)) setSleepHour(n);
              }}
              placeholder="0"
              className="w-16 h-12 rounded-2xl border border-input bg-transparent px-2 text-center text-lg font-semibold outline-none focus-visible:ring-1 focus-visible:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-2xl font-bold text-muted-foreground leading-none pb-1">.</span>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className={cn(
                "w-16 h-12 rounded-2xl border border-input bg-transparent text-center text-lg font-semibold outline-none transition",
                "hover:border-primary/50 focus-visible:ring-1 focus-visible:ring-ring",
                sleepDecimal === null && "text-muted-foreground"
              )}
              aria-label="소수점 선택"
            >
              {sleepDecimal ?? 0}
            </button>
            <span className="text-sm text-muted-foreground font-medium shrink-0">시간</span>
          </div>
          {pickerOpen && (
            <WheelPicker
              value={sleepDecimal ?? 0}
              min={0}
              max={9}
              label="소수점 선택"
              onConfirm={(n) => setSleepDecimal(n)}
              onClose={() => setPickerOpen(false)}
            />
          )}

        </div>


        {/* 에너지 레벨 */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">오늘의 에너지 레벨</label>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEnergyLevel(n)}
                className={cn(
                  "flex-1 h-10 rounded-xl text-sm font-semibold transition-colors cursor-pointer",
                  energyLevel === n
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-muted-foreground">
            <span>방전됨</span>
            <span>활기참</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={busy}
        className="w-full rounded-3xl bg-primary py-4 font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_rgba(150,120,200,0.5)] disabled:opacity-70 transition-transform active:scale-[0.98] inline-flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <Sparkles className="h-4 w-4 animate-spin" />
            마음의 결을 살피고 있어요…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            내 마음 흐름 분석하기
          </>
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        하루에 한 번, 자정이 지나면 다시 기록할 수 있어요 ✨
      </p>
    </div>
  );
}
