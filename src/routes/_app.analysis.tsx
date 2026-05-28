import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getTodayEntry } from "@/lib/analyze.functions";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Brain, Download, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";

export const Route = createFileRoute("/_app/analysis")({
  head: () => ({ meta: [{ title: "오늘의 분석 · 마음결" }] }),
  component: AnalysisPage,
});

// Pick a readable foreground (black/white) for a given hex background
function readableOn(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // perceived luminance
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return l > 0.62 ? "#2b1d3a" : "#ffffff";
}

function loadLabel(n: number) {
  if (n < 30) return "여유로워요";
  if (n < 60) return "보통이에요";
  if (n < 80) return "조금 무거워요";
  return "많이 지쳤어요";
}

function AnalysisPage() {
  const fetchToday = useServerFn(getTodayEntry);
  const { data: entry, isLoading } = useQuery({ queryKey: ["today"], queryFn: () => fetchToday() });
  const navigate = useNavigate();
  const [spread, setSpread] = useState(60); // 20-100, controls size + blur
  const [intensity, setIntensity] = useState(70); // 20-100, controls color strength/opacity
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !entry) navigate({ to: "/", replace: true });
  }, [isLoading, entry, navigate]);

  if (isLoading || !entry) {
    return <div className="text-center text-muted-foreground text-sm pt-20">불러오는 중…</div>;
  }

  const color = entry.color_hex ?? "#c8b6ff";
  const fg = readableOn(color);
  const cloudSize = 140 + spread * 1.6; // px
  const blurAmount = Math.max(0, (spread - 30) * 0.35); // blur edges as spread grows
  const cloudOpacity = 0.35 + (intensity / 100) * 0.65;

  async function handleSave() {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: color,
      });
      const link = document.createElement("a");
      link.download = `maeumgyeol-${entry.entry_date ?? "today"}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 animate-float-up">
      <header className="text-center pt-2">
        <p className="text-xs text-muted-foreground tracking-wider">TODAY'S MIND</p>
        <h1 className="mt-1 text-xl font-bold">오늘 마음의 빛</h1>
      </header>

      {/* Quadrant II layout: vertical slider top, horizontal slider left, cloud bottom-right */}
      <div className="relative mx-auto" style={{ width: "100%", maxWidth: 360, height: 360 }}>
        {/* Vertical slider — above cloud */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center gap-2 h-36">
          <span className="text-[10px] text-muted-foreground tracking-wider">퍼짐 {spread}</span>
          <input
            type="range"
            min={20}
            max={100}
            value={spread}
            onChange={(e) => setSpread(Number(e.target.value))}
            className="vertical-range accent-[var(--primary)]"
            style={{ writingMode: "vertical-lr" as const, WebkitAppearance: "slider-vertical" as const, width: 8, height: 110 }}
          />
        </div>

        {/* Horizontal slider — left of cloud */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 flex items-center gap-2 w-36 rotate-180">
          <input
            type="range"
            min={20}
            max={100}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-28 accent-[var(--primary)]"
          />
          <span className="text-[10px] text-muted-foreground tracking-wider rotate-180">강도 {intensity}</span>
        </div>

        {/* Cloud — bottom-right of the quadrant frame */}
        <div className="absolute right-0 bottom-0 flex items-center justify-center" style={{ width: 260, height: 260 }}>
          {/* soft outer halo */}
          <div
            className="absolute animate-blob-drift"
            style={{
              width: cloudSize * 1.15,
              height: cloudSize * 1.15,
              backgroundColor: color,
              opacity: cloudOpacity * 0.35,
              filter: `blur(${blurAmount + 18}px)`,
              borderRadius: "50%",
            }}
          />
          {/* main blob */}
          <div
            className="absolute animate-blob-morph"
            style={{
              width: cloudSize,
              height: cloudSize,
              backgroundColor: color,
              opacity: cloudOpacity,
              filter: `blur(${blurAmount}px)`,
            }}
          />
          {/* inner highlight */}
          <div
            className="absolute animate-blob-morph"
            style={{
              width: cloudSize * 0.6,
              height: cloudSize * 0.6,
              backgroundColor: "#ffffff",
              opacity: 0.18,
              filter: `blur(${blurAmount * 0.6 + 6}px)`,
              animationDirection: "reverse",
            }}
          />
        </div>

        <p className="absolute bottom-0 right-0 text-[10px] text-muted-foreground font-mono">{color}</p>
      </div>

      {/* Square emotion card */}
      <div className="space-y-3">
        <div
          ref={cardRef}
          className="aspect-square w-full rounded-3xl p-6 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)]"
          style={{ backgroundColor: color, color: fg }}
        >
          {/* decorative blobs inside card */}
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
            style={{ backgroundColor: fg, opacity: 0.08, filter: "blur(20px)" }}
          />
          <div
            className="absolute -bottom-12 -left-8 w-44 h-44 rounded-full"
            style={{ backgroundColor: fg, opacity: 0.06, filter: "blur(24px)" }}
          />

          <div className="relative h-full flex flex-col justify-between">
            <div>
              <p className="text-[11px] opacity-70 tracking-widest">한 줄 요약</p>
              <p className="mt-2 text-xl font-bold leading-snug">{entry.summary}</p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] opacity-70 tracking-widest">인지부하도</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold">{entry.cognitive_load ?? 0}%</p>
                  <p className="text-xs opacity-80">{loadLabel(entry.cognitive_load ?? 0)}</p>
                </div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: fg, opacity: 0.18 }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${entry.cognitive_load ?? 0}%`, backgroundColor: fg, opacity: 0.9 }}
                  />
                </div>
              </div>

              <div>
                <p className="text-[11px] opacity-70 tracking-widest flex items-center gap-1">
                  <Brain className="h-3 w-3" /> 무의식 정리
                </p>
                <p className="mt-1 text-sm leading-relaxed opacity-95">{entry.unconscious}</p>
              </div>
            </div>

            <p className="text-[10px] opacity-60 font-mono pt-1">마음결 · {entry.entry_date}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-card border border-border py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary/50 transition disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {saving ? "저장 중…" : "이미지로 저장"}
        </button>
      </div>

      {/* Routines */}
      {Array.isArray(entry.routines) && entry.routines.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" /> 오늘의 추천 루틴
          </h2>
          <div className="space-y-2.5">
            {(entry.routines as Array<{ title: string; description: string }>).map((r, i) => (
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
      )}
    </div>
  );
}
