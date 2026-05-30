import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getTodayEntry } from "@/lib/analyze.functions";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Brain, Download, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { getEmotionResult, type EmotionResult } from "@/lib/emotionResult";

export const Route = createFileRoute("/_app/analysis")({
  head: () => ({ meta: [{ title: "오늘의 분석 · 마음결" }] }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(s),
  component: AnalysisPage,
});

function readableOn(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return l > 0.62 ? "#2b1d3a" : "#ffffff";
}

function loadLabel(n: number) {
  if (n < 30) return "여유로워요";
  if (n < 60) return "보통이에요";
  if (n < 80) return "조금 무거워요";
  return "많이 지쳤어요";
}

function SmoothSlider({
  value, onChange, orientation = "horizontal", length, label,
}: {
  value: number; onChange: (n: number) => void;
  orientation?: "horizontal" | "vertical"; length: number; label: string;
}) {
  const [active, setActive] = useState(false);
  const scale = useSpring(1, { stiffness: 400, damping: 22 });
  useEffect(() => { scale.set(active ? 1.4 : 1); }, [active, scale]);
  const isV = orientation === "vertical";
  return (
    <SliderPrimitive.Root
      value={[value]} onValueChange={(v) => onChange(v[0])}
      min={20} max={100} step={1} orientation={orientation}
      onPointerDown={() => setActive(true)}
      onPointerUp={() => setActive(false)}
      onLostPointerCapture={() => setActive(false)}
      aria-label={label}
      className={`relative flex touch-none select-none items-center justify-center ${isV ? "flex-col h-full w-5" : "h-5 w-full"}`}
      style={isV ? { height: length } : { width: length }}
    >
      <SliderPrimitive.Track className={`relative grow overflow-hidden rounded-full bg-primary/15 ${isV ? "w-1.5 h-full" : "h-1.5 w-full"}`}>
        <SliderPrimitive.Range className="absolute rounded-full" style={{
          background: "linear-gradient(135deg, var(--lavender), var(--peach))",
          ...(isV ? { width: "100%" } : { height: "100%" }),
        }} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb asChild>
        <motion.div style={{ scale }} className="block h-5 w-5 rounded-full bg-white border-2 border-primary/60 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-grab active:cursor-grabbing active:shadow-lg" />
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  );
}

function hexToHsl(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh *= 60;
  }
  return { h: hh, s: s * 100, l: l * 100 };
}
function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const ch = (n: number) => Math.round(Math.max(0, Math.min(1, f(n))) * 255).toString(16).padStart(2, "0");
  return `#${ch(0)}${ch(8)}${ch(4)}`;
}


function CloudBlob({ color, spread, intensity }: { color: string; spread: MotionValue<number>; intensity: MotionValue<number>; }) {
  // Derive a small palette of analogous + complementary tints so the aurora
  // contains "all emotion colors blended in proportion" while staying anchored
  // to the day's signature hue.
  const { h, s, l } = hexToHsl(color);
  const palette = [
    color,
    hslToHex((h + 30) % 360, Math.min(s + 5, 90), Math.min(l + 6, 92)),
    hslToHex((h - 30 + 360) % 360, Math.min(s + 5, 90), Math.min(l + 8, 92)),
    hslToHex((h + 60) % 360, Math.max(s - 10, 30), Math.min(l + 4, 90)),
    hslToHex((h - 60 + 360) % 360, Math.max(s - 10, 30), Math.min(l + 4, 90)),
    hslToHex((h + 180) % 360, Math.max(s - 25, 25), Math.min(l + 10, 92)),
  ];

  // spread → blob size & blur, intensity → opacity
  const baseOpacity = useTransform(intensity, (i) => 0.35 + (i / 100) * 0.45);
  const sizeScale = useTransform(spread, (sp) => 0.85 + (sp / 100) * 0.4);
  const blurAmt = useTransform(spread, (sp) => 28 + (sp / 100) * 22);

  // Six blobs distributed around the square that drift slowly on independent
  // orbits. All drift values stay well inside the container so puffs never
  // spill past the rounded edge (the parent also clips with overflow-hidden).
  const blobs = [
    { cx: 28, cy: 32, sz: 170, dur: 26, path: { x: [0, 14, -10, 8, 0], y: [0, -10, 12, -8, 0] } },
    { cx: 72, cy: 28, sz: 190, dur: 30, path: { x: [0, -12, 10, -6, 0], y: [0, 12, -8, 10, 0] } },
    { cx: 65, cy: 70, sz: 200, dur: 34, path: { x: [0, 10, -14, 6, 0], y: [0, -8, 10, -12, 0] } },
    { cx: 30, cy: 72, sz: 180, dur: 32, path: { x: [0, -8, 12, -10, 0], y: [0, 10, -10, 8, 0] } },
    { cx: 50, cy: 48, sz: 220, dur: 38, path: { x: [0, 6, -8, 10, 0], y: [0, -6, 8, -4, 0] } },
    { cx: 50, cy: 88, sz: 150, dur: 28, path: { x: [0, -10, 8, -6, 0], y: [0, 6, -10, 4, 0] } },
  ];

  return (
    <div className="relative w-full h-full pointer-events-none">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${b.cx}%`,
            top: `${b.cy}%`,
            width: useTransform(sizeScale, (k) => b.sz * k),
            height: useTransform(sizeScale, (k) => b.sz * k),
            x: useTransform(sizeScale, (k) => -(b.sz * k) / 2),
            y: useTransform(sizeScale, (k) => -(b.sz * k) / 2),
            background: `radial-gradient(circle at 50% 50%, ${palette[i % palette.length]} 0%, ${palette[i % palette.length]}99 35%, transparent 72%)`,
            filter: useTransform(blurAmt, (v) => `blur(${v}px)`),
            mixBlendMode: "screen",
            opacity: baseOpacity,
          }}
          animate={b.path}
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {/* gentle inner haze that very slowly orbits the whole stage */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `conic-gradient(from 0deg, ${palette[0]}33, ${palette[2]}22, ${palette[4]}22, ${palette[5]}22, ${palette[1]}33, ${palette[0]}33)`,
          filter: "blur(40px)",
          opacity: 0.45,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}


function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function AnalysisPage() {
  const { date: dateParam } = Route.useSearch();
  const fetchEntry = useServerFn(getTodayEntry);
  const targetDate = dateParam ?? localDateStr();
  const { data: entry, isLoading } = useQuery({
    queryKey: ["entry", targetDate],
    queryFn: () => fetchEntry({ data: { local_date: targetDate } }),
  });
  const navigate = useNavigate();

  const [spread, setSpread] = useState(60);
  const [intensity, setIntensity] = useState(70);
  const spreadMV = useSpring(spread, { stiffness: 120, damping: 20 });
  const intensityMV = useSpring(intensity, { stiffness: 120, damping: 20 });
  useEffect(() => { spreadMV.set(spread); }, [spread, spreadMV]);
  useEffect(() => { intensityMV.set(intensity); }, [intensity, intensityMV]);

  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const [emotionResult, setEmotionResultState] = useState<EmotionResult | null>(() => getEmotionResult());
  useEffect(() => {
    const sync = () => setEmotionResultState(getEmotionResult());
    window.addEventListener("emotionResult:update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("emotionResult:update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !entry && !emotionResult) navigate({ to: "/", replace: true });
  }, [isLoading, entry, emotionResult, navigate]);

  if (isLoading || (!entry && !emotionResult)) {
    return <div className="text-center text-muted-foreground text-sm pt-20">불러오는 중…</div>;
  }

  const color = entry.color_hex ?? "#c8b6ff";
  const fg = readableOn(color);

  async function handleSave() {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: undefined,
        style: { borderRadius: "24px" },
      });
      const link = document.createElement("a");
      link.download = `maeumgyeol-${entry?.entry_date ?? "today"}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setSaving(false);
    }
  }

  const SQUARE = 280;
  const GUTTER = 26;
  const STAGE_W = SQUARE + GUTTER + 24;
  const STAGE_H = SQUARE + GUTTER + 32;

  return (
    <div className="space-y-8 animate-float-up">
      <header className="text-center pt-2">
        <p className="text-xs text-muted-foreground tracking-wider">
          {dateParam ? entry.entry_date : "TODAY'S MIND"}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{dateParam ? "그 날의 마음의 빛" : "오늘 마음의 빛"}</h1>
      </header>

      {/* Cloud + sliders grouped: centered horizontally as one unit */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: STAGE_W, height: STAGE_H }}>
          {/* Aurora/cloud square — rounded + overflow hidden so puffs never spill */}
          <div
            className="absolute top-0 left-0 rounded-3xl border border-primary/15 bg-gradient-to-br from-background to-secondary/20 overflow-hidden"
            style={{ width: SQUARE, height: SQUARE }}
          >
            <div className="absolute inset-0">
              <CloudBlob color={color} spread={spreadMV} intensity={intensityMV} />
            </div>
          </div>

          {/* Right vertical slider */}
          <div className="absolute flex flex-col items-center gap-2"
            style={{ left: SQUARE + GUTTER - 10, top: 0, height: SQUARE }}>
            <SmoothSlider orientation="vertical" value={intensity} onChange={setIntensity} length={SQUARE} label="강도" />
          </div>

          {/* Bottom horizontal slider */}
          <div className="absolute flex items-center gap-2"
            style={{ top: SQUARE + GUTTER - 10, left: 0, width: SQUARE }}>
            <SmoothSlider orientation="horizontal" value={spread} onChange={setSpread} length={SQUARE} label="퍼짐" />
          </div>

          <span className="absolute text-[10px] text-muted-foreground tracking-wider"
            style={{ left: SQUARE + GUTTER + 12, top: -2 }}>강도</span>
          <span className="absolute text-[10px] text-muted-foreground tracking-wider"
            style={{ left: -2, top: SQUARE + GUTTER + 12 }}>퍼짐 · {color}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div
          ref={cardRef}
          className="aspect-square w-full rounded-3xl p-6 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)]"
          style={{
            backgroundImage: `linear-gradient(180deg, ${color} 0%, ${color} 35%, #ffffff 130%)`,
            backgroundColor: color,
            color: fg,
          }}
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
            style={{ backgroundColor: fg, opacity: 0.08, filter: "blur(20px)" }} />
          <div className="absolute -bottom-12 -left-8 w-44 h-44 rounded-full"
            style={{ backgroundColor: fg, opacity: 0.06, filter: "blur(24px)" }} />

          <div className="relative h-full flex flex-col justify-between">
            <div>
              <p className="text-[11px] opacity-70 tracking-widest">한 줄 요약</p>
              <p className="mt-2 text-xl font-bold leading-snug">{entry.summary}</p>
              <p className="mt-1 text-[11px] font-mono opacity-50 tracking-wider">
                {(entry.color_hex ?? color).toUpperCase()}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] opacity-70 tracking-widest">인지부하도</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold">{entry.cognitive_load ?? 0}%</p>
                  <p className="text-xs opacity-80">{loadLabel(entry.cognitive_load ?? 0)}</p>
                </div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: fg, opacity: 0.18 }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${entry.cognitive_load ?? 0}%`, backgroundColor: fg, opacity: 0.9 }} />
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

        <button type="button" onClick={handleSave} disabled={saving}
          className="w-full rounded-2xl bg-card border border-border py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary/50 transition disabled:opacity-60">
          <Download className="h-4 w-4" />
          {saving ? "저장 중…" : "이미지로 저장"}
        </button>
      </div>

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
