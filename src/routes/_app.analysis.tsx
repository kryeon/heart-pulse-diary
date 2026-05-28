import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getTodayEntry } from "@/lib/analyze.functions";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Brain, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/analysis")({
  head: () => ({ meta: [{ title: "오늘의 분석 · 마음결" }] }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const fetchToday = useServerFn(getTodayEntry);
  const { data: entry, isLoading } = useQuery({ queryKey: ["today"], queryFn: () => fetchToday() });
  const navigate = useNavigate();
  const [spread, setSpread] = useState(60); // % radius
  const [intensity, setIntensity] = useState(70); // % opacity

  useEffect(() => {
    if (!isLoading && !entry) navigate({ to: "/", replace: true });
  }, [isLoading, entry, navigate]);

  if (isLoading || !entry) {
    return <div className="text-center text-muted-foreground text-sm pt-20">불러오는 중…</div>;
  }

  const color = entry.color_hex ?? "#c8b6ff";
  const routines = Array.isArray(entry.routines) ? (entry.routines as Array<{ title: string; description: string }>) : [];

  return (
    <div className="space-y-7 animate-float-up">
      <header className="text-center pt-2">
        <p className="text-xs text-muted-foreground tracking-wider">TODAY'S MIND</p>
        <h1 className="mt-1 text-xl font-bold">오늘 마음의 빛</h1>
      </header>

      {/* Color wave */}
      <div className="relative h-72 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute rounded-full animate-pulse-wave"
            style={{
              width: `${spread * 1.6}px`,
              height: `${spread * 1.6}px`,
              backgroundColor: color,
              opacity: intensity / 100,
              animationDelay: `${i * 1}s`,
            }}
          />
        ))}
        <span
          className="relative rounded-full animate-breathe shadow-[0_0_60px_0_rgba(0,0,0,0.08)]"
          style={{
            width: `${spread * 1.2}px`,
            height: `${spread * 1.2}px`,
            backgroundColor: color,
            opacity: Math.min(1, intensity / 100 + 0.2),
          }}
        />
      </div>

      {/* Sliders */}
      <div className="rounded-3xl bg-card border border-border p-5 space-y-4">
        <SliderRow label="퍼짐" value={spread} onChange={setSpread} />
        <SliderRow label="강도" value={intensity} onChange={setIntensity} />
        <p className="text-[11px] text-muted-foreground text-center pt-1">
          색상 <span className="font-mono">{color}</span>
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-3">
        <SquareCard title="한 줄 요약" body={entry.summary ?? ""} accent={color} />
        <SquareCard
          title="인지부하도"
          body={`${entry.cognitive_load ?? 0}%`}
          subtitle={loadLabel(entry.cognitive_load ?? 0)}
          accent={color}
        />
      </div>
      <div className="rounded-3xl bg-card border border-border p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Brain className="h-3.5 w-3.5" /> 무의식 정리
        </div>
        <p className="text-sm leading-relaxed">{entry.unconscious}</p>
      </div>

      {/* Routines */}
      <section>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" /> 오늘의 추천 루틴
        </h2>
        <div className="space-y-2.5">
          {routines.map((r, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-4 flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-2xl bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function loadLabel(n: number) {
  if (n < 30) return "여유로워요";
  if (n < 60) return "보통이에요";
  if (n < 80) return "조금 무거워요";
  return "많이 지쳤어요";
}

function SquareCard({ title, body, subtitle, accent }: { title: string; body: string; subtitle?: string; accent: string }) {
  return (
    <div className="aspect-square rounded-3xl bg-card border border-border p-4 flex flex-col justify-between relative overflow-hidden">
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-40 blur-xl" style={{ backgroundColor: accent }} />
      <p className="text-[11px] text-muted-foreground relative">{title}</p>
      <div className="relative">
        <p className="text-lg font-bold leading-tight">{body}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
        <span>{label}</span><span>{value}</span>
      </div>
      <input
        type="range" min={20} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </div>
  );
}
