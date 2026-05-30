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
import { SynclrWordmark } from "@/components/AppShell";
import { TriangleBack } from "@/components/TriangleBack";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/analysis")({
  head: () => ({ meta: [{ title: "오늘의 분석 · Syncl\u0023r" }] }),
  validateSearch: (s: Record<string, unknown>) =>
    z
      .object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(s),
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
  value,
  onChange,
  orientation = "horizontal",
  length,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  orientation?: "horizontal" | "vertical";
  length: number;
  label: string;
}) {
  const [active, setActive] = useState(false);
  const scale = useSpring(1, { stiffness: 400, damping: 22 });
  useEffect(() => {
    scale.set(active ? 1.4 : 1);
  }, [active, scale]);
  const isV = orientation === "vertical";
  return (
    <SliderPrimitive.Root
      value={[value]}
      onValueChange={(v) => onChange(v[0])}
      min={20}
      max={100}
      step={1}
      orientation={orientation}
      onPointerDown={() => setActive(true)}
      onPointerUp={() => setActive(false)}
      onLostPointerCapture={() => setActive(false)}
      aria-label={label}
      className={`relative flex touch-none select-none items-center justify-center ${isV ? "flex-col h-full w-5" : "h-5 w-full"}`}
      style={isV ? { height: length } : { width: length }}
    >
      <SliderPrimitive.Track
        className={`relative grow overflow-hidden rounded-full bg-primary/15 ${isV ? "w-1.5 h-full" : "h-1.5 w-full"}`}
      >
        <SliderPrimitive.Range
          className="absolute rounded-full"
          style={{
            background: "linear-gradient(135deg, var(--lavender), var(--peach))",
            ...(isV ? { width: "100%" } : { height: "100%" }),
          }}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb asChild>
        <motion.div
          style={{ scale }}
          className="block h-5 w-5 rounded-full bg-white border-2 border-primary/60 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-grab active:cursor-grabbing active:shadow-lg"
        />
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  );
}

function hexToHsl(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let hh = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hh = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        hh = (b - r) / d + 2;
        break;
      case b:
        hh = (r - g) / d + 4;
        break;
    }
    hh *= 60;
  }
  return { h: hh, s: s * 100, l: l * 100 };
}
function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const ch = (n: number) =>
    Math.round(Math.max(0, Math.min(1, f(n))) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(0)}${ch(8)}${ch(4)}`;
}

const PUFFS = [
  { x: 0, y: 0, scale: 1.0, dur: 11 },
  { x: -40, y: -8, scale: 0.7, dur: 13 },
  { x: 38, y: -14, scale: 0.66, dur: 14 },
  { x: -22, y: 22, scale: 0.56, dur: 12 },
  { x: 30, y: 26, scale: 0.6, dur: 15 },
  { x: 0, y: -32, scale: 0.48, dur: 10 },
] as const;

const MORPH_RADII = [
  "30% 70% 70% 30% / 30% 30% 70% 70%",
  "60% 40% 30% 70% / 60% 30% 70% 40%",
  "45% 55% 65% 35% / 50% 65% 35% 50%",
  "70% 30% 50% 50% / 40% 60% 40% 60%",
  "30% 70% 70% 30% / 30% 30% 70% 70%",
];

function Puff({
  size,
  blur,
  opacity,
  color,
  p,
}: {
  size: MotionValue<number>;
  blur: MotionValue<number>;
  opacity: MotionValue<number>;
  color: string;
  p: (typeof PUFFS)[number];
}) {
  const w = useTransform(size, (s) => s * p.scale);
  const f = useTransform(blur, (b) => `blur(${b}px)`);
  return (
    <motion.div
      className="absolute"
      style={{ width: w, height: w, backgroundColor: color, opacity, filter: f }}
      animate={{
        x: [p.x, p.x + 8, p.x - 6, p.x + 4, p.x],
        y: [p.y, p.y - 7, p.y + 5, p.y - 3, p.y],
        borderRadius: MORPH_RADII,
        rotate: [0, 6, -4, 3, 0],
      }}
      transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function CloudBlob({
  color,
  spread,
  intensity,
}: {
  color: string;
  spread: MotionValue<number>;
  intensity: MotionValue<number>;
}) {
  const size = useTransform(spread, (s) => 90 + s * 1.2);
  const blur = useTransform(spread, (s) => Math.max(2, (s - 20) * 0.4));
  const opacity = useTransform(intensity, (i) => 0.35 + (i / 100) * 0.6);
  const haloBlur = useTransform(spread, (s) => Math.max(16, (s - 10) * 0.6 + 16));
  const haloFilter = useTransform(haloBlur, (b) => `blur(${b}px)`);
  const haloOpacity = useTransform(intensity, (i) => 0.15 + (i / 100) * 0.3);
  const highlightSize = useTransform(size, (s) => s * 0.45);
  const highlightFilter = useTransform(blur, (b) => `blur(${b * 0.6 + 8}px)`);

  return (
    <div className="relative w-full h-full grid place-items-center pointer-events-none">
      {/* 배경 후광(Halo) */}
      <motion.div
        className="absolute"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          filter: haloFilter,
          opacity: haloOpacity,
          scale: 1.3,
          borderRadius: "50%",
        }}
        animate={{ x: [0, -6, 5, 0], y: [0, 4, -5, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 6개의 구름 조각들 */}
      {PUFFS.map((p, i) => (
        <Puff key={i} p={p} size={size} blur={blur} opacity={opacity} color={color} />
      ))}

      {/* 중앙의 하얀 하이라이트 */}
      <motion.div
        className="absolute"
        style={{
          width: highlightSize,
          height: highlightSize,
          backgroundColor: "#ffffff",
          opacity: 0.22,
          filter: highlightFilter,
        }}
        animate={{ x: [-15, -10, -18, -15], y: [-20, -25, -18, -20], borderRadius: MORPH_RADII }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Map the n8n webhook response into the same shape used by the existing UI.
function n8nResultToEntry(result: EmotionResult, fallbackDate: string) {
  const mind = (result.mind_light ?? {}) as Record<string, any>;
  const card = (result.card ?? {}) as Record<string, any>;
  const emotion = (result.emotion ?? {}) as Record<string, any>;
  const routines = Array.isArray(result.routines) ? result.routines : [];
  const entryDate =
    (result as any).entry_date ?? (result as any).calendar_marker?.date ?? fallbackDate;

  return {
    entry_date: entryDate,
    color_hex: mind.hex_color ?? "#c8b6ff",
    summary: card.one_line_summary ?? card.title ?? "오늘의 마음을 기록했어요",
    cognitive_load:
      typeof emotion.cognitive_load === "number"
        ? emotion.cognitive_load
        : typeof mind.strength === "number"
          ? mind.strength
          : 0,
    unconscious: card.summary ?? emotion.emotion_flow ?? "",
    routines,
  };
}


function AnalysisPage() {
  const { date: dateParam } = Route.useSearch();
  const { session } = useAuth();
  const fetchEntry = useServerFn(getTodayEntry);
  const targetDate = dateParam ?? localDateStr();
  const { data: entry, isLoading } = useQuery({
    queryKey: ["entry", targetDate],
    queryFn: () => fetchEntry({ data: { local_date: targetDate } }),
    enabled: !!session?.access_token,
    retry: false,
  });
  const navigate = useNavigate();

  const [spread, setSpread] = useState(60);
  const [intensity, setIntensity] = useState(70);
  const spreadMV = useSpring(spread, { stiffness: 120, damping: 20 });
  const intensityMV = useSpring(intensity, { stiffness: 120, damping: 20 });
  useEffect(() => {
    spreadMV.set(spread);
  }, [spread, spreadMV]);
  useEffect(() => {
    intensityMV.set(intensity);
  }, [intensity, intensityMV]);

  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const [emotionResult, setEmotionResultState] = useState<EmotionResult | null>(null);
  useEffect(() => {
    setEmotionResultState(getEmotionResult());
    const sync = () => setEmotionResultState(getEmotionResult());
    if (typeof window === "undefined") return;
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

  // Build a synthetic entry from n8n result so we can reuse the original design
  const synthetic = !entry && emotionResult ? n8nResultToEntry(emotionResult, targetDate) : null;
  const view = (entry ?? synthetic) as any;
  if (!view) return null;

  const color = view.color_hex ?? "#c8b6ff";
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
      link.download = `maeumgyeol-${view?.entry_date ?? "today"}.png`;
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
      {dateParam && (
        <div className="pt-2">
          <TriangleBack label="뒤로" />
        </div>
      )}
      <header className="text-center pt-2">
        <p className="text-xs text-muted-foreground tracking-wider">{dateParam ? view.entry_date : "TODAY'S MIND"}</p>
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
          <div
            className="absolute flex flex-col items-center gap-2"
            style={{ left: SQUARE + GUTTER - 10, top: 0, height: SQUARE }}
          >
            <SmoothSlider
              orientation="vertical"
              value={intensity}
              onChange={setIntensity}
              length={SQUARE}
              label="강도"
            />
          </div>

          {/* Bottom horizontal slider */}
          <div
            className="absolute flex items-center gap-2"
            style={{ top: SQUARE + GUTTER - 10, left: 0, width: SQUARE }}
          >
            <SmoothSlider orientation="horizontal" value={spread} onChange={setSpread} length={SQUARE} label="퍼짐" />
          </div>

          <span
            className="absolute text-[10px] text-muted-foreground tracking-wider"
            style={{ left: SQUARE + GUTTER + 12, top: -2 }}
          >
            강도
          </span>
          <span
            className="absolute text-[10px] text-muted-foreground tracking-wider"
            style={{ left: -2, top: SQUARE + GUTTER + 12 }}
          >
            퍼짐 · {color}
          </span>
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
              <p className="mt-2 text-xl font-bold leading-snug">{view.summary}</p>
              <p className="mt-1 text-[11px] font-mono opacity-50 tracking-wider">
                {(view.color_hex ?? color).toUpperCase()}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] opacity-70 tracking-widest">인지부하도</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold">{view.cognitive_load ?? 0}%</p>
                  <p className="text-xs opacity-80">{loadLabel(view.cognitive_load ?? 0)}</p>
                </div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: fg, opacity: 0.18 }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${view.cognitive_load ?? 0}%`, backgroundColor: fg, opacity: 0.9 }}
                  />
                </div>
              </div>

              <div>
                <p className="text-[11px] opacity-70 tracking-widest flex items-center gap-1">
                  <Brain className="h-3 w-3" /> 무의식 정리
                </p>
                <p className="mt-1 text-sm leading-relaxed opacity-95">{view.unconscious}</p>
              </div>
            </div>

            <p className="text-[10px] opacity-100 pt-1 inline-flex items-center gap-1">
              <SynclrWordmark className="font-bold" style={{ color: fg }} />
              <span style={{ color: fg, opacity: 0.6 }}>· {view.entry_date}</span>
            </p>
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

      {Array.isArray(view.routines) && view.routines.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" /> 오늘의 추천 루틴
          </h2>
          <div className="space-y-2.5">
            {(view.routines as Array<{ title: string; description: string }>).map((r, i) => (
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

function EmotionResultView({ result }: { result: EmotionResult }) {
  const mind = (result.mind_light ?? {}) as Record<string, any>;
  const card = (result.card ?? {}) as Record<string, any>;
  const emotion = (result.emotion ?? {}) as Record<string, any>;
  const routines = (result.routines ?? []) as Array<{ title: string; description: string }>;
  const color = mind.hex_color ?? "#c8b6ff";
  const fg = readableOn(color);

  return (
    <div className="space-y-8 animate-float-up">
      <header className="text-center pt-2">
        <p className="text-xs text-muted-foreground tracking-wider">TODAY'S MIND</p>
        <h1 className="mt-1 text-2xl font-bold">오늘 마음의 빛</h1>
      </header>

      {/* mind_light blob */}
      <section
        className="rounded-3xl p-6 shadow-sm flex items-center gap-4"
        style={{ backgroundColor: color, color: fg }}
      >
        <div
          className="h-16 w-16 rounded-full shrink-0 shadow-inner"
          style={{ backgroundColor: color, boxShadow: `0 0 32px ${color}` }}
          aria-label="mind light blob"
        />
        <div>
          <p className="text-[11px] opacity-70 tracking-widest">MIND LIGHT</p>
          <p className="mt-1 text-[11px] font-mono opacity-80">{String(color).toUpperCase()}</p>
        </div>
      </section>

      {/* card */}
      {(card.title || card.one_line_summary || card.summary) && (
        <section className="rounded-3xl bg-card border border-border p-5 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest">CARD</p>
          {card.title && <p className="text-xl font-bold leading-snug">{card.title}</p>}
          {card.one_line_summary && <p className="text-sm text-muted-foreground">{card.one_line_summary}</p>}
          {card.summary && <p className="text-sm leading-relaxed">{card.summary}</p>}
        </section>
      )}

      {/* emotion */}
      {(emotion.primary_emotion || emotion.emotion_flow || emotion.cognitive_load !== undefined) && (
        <section className="rounded-3xl bg-card border border-border p-5 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest">EMOTION</p>
          {emotion.primary_emotion && (
            <div>
              <p className="text-[11px] text-muted-foreground">대표 감정</p>
              <p className="text-xl font-bold">{emotion.primary_emotion}</p>
            </div>
          )}
          {emotion.emotion_flow && (
            <div>
              <p className="text-[11px] text-muted-foreground">감정 흐름</p>
              <p className="text-sm leading-relaxed">{emotion.emotion_flow}</p>
            </div>
          )}
          {emotion.cognitive_load !== undefined && (
            <div>
              <p className="text-[11px] text-muted-foreground">인지 부하</p>
              <p className="text-2xl font-bold">
                {emotion.cognitive_load}
                {typeof emotion.cognitive_load === "number" ? "%" : ""}
              </p>
            </div>
          )}
        </section>
      )}

      {/* routines */}
      {routines.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3">오늘의 추천 루틴</h2>
          <div className="space-y-2.5">
            {routines.slice(0, 3).map((r, i) => (
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
