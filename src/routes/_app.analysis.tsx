import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getTodayEntry } from "@/lib/analyze.functions";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Brain, Download, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";

export const Route = createFileRoute("/_app/analysis")({
  head: () => ({ meta: [{ title: "오늘의 분석 · 마음결" }] }),
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

/** Smooth slider with spring-eased thumb feedback. */
function SmoothSlider({
  value,
  onChange,
  orientation = "horizontal",
  length = 140,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  orientation?: "horizontal" | "vertical";
  length?: number;
  label: string;
}) {
  const [active, setActive] = useState(false);
  const scale = useSpring(1, { stiffness: 400, damping: 22 });

  useEffect(() => {
    scale.set(active ? 1.35 : 1);
  }, [active, scale]);

  const isV = orientation === "vertical";

  return (
    <div
      className={`flex items-center gap-2 ${isV ? "flex-col" : "flex-row"}`}
      style={isV ? { height: length + 30 } : { width: length + 50 }}
    >
      {isV && <span className="text-[10px] text-muted-foreground tracking-wider">{label} {value}</span>}
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
        className={`relative flex touch-none select-none items-center justify-center ${
          isV ? "h-full w-5 flex-col" : "w-full h-5"
        }`}
        style={isV ? { height: length } : { width: length }}
      >
        <SliderPrimitive.Track
          className={`relative grow overflow-hidden rounded-full bg-primary/20 ${
            isV ? "w-1.5 h-full" : "h-1.5 w-full"
          }`}
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
            className="block h-5 w-5 rounded-full bg-white border-2 border-primary/60 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-grab active:cursor-grabbing"
          />
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>
      {!isV && <span className="text-[10px] text-muted-foreground tracking-wider">{label} {value}</span>}
    </div>
  );
}

/** A wispy, irregular cloud built from multiple offset blurred blobs. */
function CloudBlob({
  color,
  spread,
  intensity,
}: {
  color: string;
  spread: MotionValue<number>;
  intensity: MotionValue<number>;
}) {
  const size = useTransform(spread, (s) => 140 + s * 1.6);
  const blur = useTransform(spread, (s) => Math.max(2, (s - 20) * 0.45));
  const opacity = useTransform(intensity, (i) => 0.35 + (i / 100) * 0.6);
  const haloBlur = useTransform(spread, (s) => Math.max(18, (s - 10) * 0.7 + 18));
  const haloOpacity = useTransform(intensity, (i) => 0.15 + (i / 100) * 0.3);

  // Irregular cloud puffs — offsets relative to center.
  const puffs = [
    { x: 0, y: 0, scale: 1.0, delay: 0 },
    { x: -55, y: -10, scale: 0.7, delay: 0.7 },
    { x: 50, y: -20, scale: 0.65, delay: 1.2 },
    { x: -30, y: 30, scale: 0.55, delay: 0.4 },
    { x: 40, y: 35, scale: 0.6, delay: 1.5 },
    { x: 0, y: -45, scale: 0.5, delay: 0.9 },
  ];

  return (
    <div className="relative w-[260px] h-[260px] grid place-items-center pointer-events-none">
      {/* outer halo */}
      <motion.div
        className="absolute rounded-full animate-blob-drift"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          filter: useTransform(haloBlur, (b) => `blur(${b}px)`),
          opacity: haloOpacity,
          scale: 1.25,
        }}
      />
      {puffs.map((p, i) => (
        <motion.div
          key={i}
          className="absolute animate-blob-morph"
          style={{
            width: useTransform(size, (s) => s * p.scale),
            height: useTransform(size, (s) => s * p.scale),
            x: p.x,
            y: p.y,
            backgroundColor: color,
            opacity,
            filter: useTransform(blur, (b) => `blur(${b}px)`),
            animationDelay: `${p.delay}s`,
          }}
          animate={{
            x: [p.x, p.x + 6, p.x - 4, p.x],
            y: [p.y, p.y - 5, p.y + 4, p.y],
          }}
          transition={{ duration: 6 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {/* soft highlight */}
      <motion.div
        className="absolute rounded-full animate-blob-morph"
        style={{
          width: useTransform(size, (s) => s * 0.45),
          height: useTransform(size, (s) => s * 0.45),
          y: -20,
          x: -15,
          backgroundColor: "#ffffff",
          opacity: 0.22,
          filter: useTransform(blur, (b) => `blur(${b * 0.6 + 8}px)`),
        }}
      />
    </div>
  );
}

function AnalysisPage() {
  const fetchToday = useServerFn(getTodayEntry);
  const { data: entry, isLoading } = useQuery({ queryKey: ["today"], queryFn: () => fetchToday() });
  const navigate = useNavigate();

  const [spread, setSpread] = useState(60);
  const [intensity, setIntensity] = useState(70);

  // Smooth motion values driven by state, used to animate the cloud at 60fps.
  const spreadMV = useSpring(spread, { stiffness: 120, damping: 20 });
  const intensityMV = useSpring(intensity, { stiffness: 120, damping: 20 });

  useEffect(() => { spreadMV.set(spread); }, [spread, spreadMV]);
  useEffect(() => { intensityMV.set(intensity); }, [intensity, intensityMV]);

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
      link.download = `maeumgyeol-${entry?.entry_date ?? "today"}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setSaving(false);
    }
  }

  // Cloud stage: 320 tall, cloud centered. Sliders offset 50px from center
  // toward Quadrant II (up and left).
  const STAGE = 320;
  const CENTER = STAGE / 2;

  return (
    <div className="space-y-8 animate-float-up">
      <header className="text-center pt-2">
        <p className="text-xs text-muted-foreground tracking-wider">TODAY'S MIND</p>
        <h1 className="mt-1 text-2xl font-bold">오늘 마음의 빛</h1>
      </header>

      <div className="relative mx-auto" style={{ width: "100%", maxWidth: 360, height: STAGE }}>
        {/* Centered cloud */}
        <div
          className="absolute"
          style={{ left: CENTER, top: CENTER, transform: "translate(-50%, -50%)" }}
        >
          <CloudBlob color={color} spread={spreadMV} intensity={intensityMV} />
        </div>

        {/* Vertical slider — 50px above center, centered horizontally on cloud */}
        <div
          className="absolute"
          style={{ left: CENTER, top: CENTER - 50, transform: "translate(-50%, -100%)" }}
        >
          <SmoothSlider
            orientation="vertical"
            value={spread}
            onChange={setSpread}
            length={110}
            label="퍼짐"
          />
        </div>

        {/* Horizontal slider — 50px left of center, centered vertically on cloud */}
        <div
          className="absolute"
          style={{ left: CENTER - 50, top: CENTER, transform: "translate(-100%, -50%)" }}
        >
          <SmoothSlider
            orientation="horizontal"
            value={intensity}
            onChange={setIntensity}
            length={110}
            label="강도"
          />
        </div>

        <p
          className="absolute text-[10px] text-muted-foreground font-mono"
          style={{ left: CENTER, bottom: 0, transform: "translateX(-50%)" }}
        >
          {color}
        </p>
      </div>

      {/* Square emotion card */}
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
