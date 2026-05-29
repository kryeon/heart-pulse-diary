import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getEntriesInRange } from "@/lib/analyze.functions";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/calendar")({
  head: () => ({ meta: [{ title: "달력 · 마음결" }] }),
  component: CalendarPage,
});

function fmt(d: Date) { return d.toISOString().slice(0, 10); }
function monthBounds(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  return { from: fmt(first), to: fmt(last) };
}

function CalendarPage() {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [showStats, setShowStats] = useState(false);

  const { from, to } = useMemo(() => monthBounds(cursor.y, cursor.m), [cursor]);
  const fetchRange = useServerFn(getEntriesInRange);
  const { data: entries = [] } = useQuery({
    queryKey: ["range", from, to],
    queryFn: () => fetchRange({ data: { from, to } }),
  });

  const byDate = useMemo(() => {
    const m = new Map<string, any>();
    entries.forEach((e: any) => m.set(e.entry_date, e));
    return m;
  }, [entries]);

  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const firstWeekday = new Date(cursor.y, cursor.m, 1).getDay();

  const prev = () => setCursor(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
  const next = () => setCursor(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 });

  if (showStats) return <StatsPage entries={entries} onBack={() => setShowStats(false)} label={`${cursor.y}.${cursor.m + 1}`} />;

  return (
    <div className="space-y-5 animate-float-up">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs text-muted-foreground">{cursor.y}</p>
          <h1 className="text-2xl font-bold">{cursor.m + 1}월</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="h-10 w-10 rounded-2xl bg-card border border-border grid place-items-center hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={next} className="h-10 w-10 rounded-2xl bg-card border border-border grid place-items-center hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => setShowStats(true)} className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground grid place-items-center">
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="rounded-3xl bg-card border border-border p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-2">
          {["일","월","화","수","목","금","토"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstWeekday }).map((_, i) => <div key={"e" + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = fmt(new Date(Date.UTC(cursor.y, cursor.m, day)));
            const e = byDate.get(date);
            return (
              <div
                key={date}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center text-xs relative"
                style={e ? { backgroundColor: e.color_hex + "55", color: "var(--foreground)" } : { backgroundColor: "var(--muted)" }}
                title={e?.summary ?? ""}
              >
                <span className="font-semibold">{day}</span>
                {e && <span className="h-1.5 w-1.5 rounded-full mt-0.5" style={{ backgroundColor: e.color_hex }} />}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        화살표로 달을 이동하고, 그래프 아이콘으로 리포트를 확인하세요
      </p>
    </div>
  );
}

function ReportSection({ entries, title, subtitle }: { entries: any[]; title: string; subtitle: string }) {
  // Weighted aurora — energy intensity, not hard borders
  const counts = new Map<string, number>();
  entries.forEach((e) => {
    if (!e.color_hex) return;
    counts.set(e.color_hex, (counts.get(e.color_hex) ?? 0) + 1);
  });
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);

  // Build a soft, blurred multi-layer aurora. Each color gets an elliptical glow
  // sized by its frequency ratio — energy radiates rather than abruptly stops.
  let auroraLayers = "";
  let baseGradient = "linear-gradient(120deg, var(--lavender), var(--sage), var(--peach))";
  if (total > 0) {
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const stops: string[] = [];
    let acc = 0;
    const layers: string[] = [];
    sorted.forEach(([hex, n], idx) => {
      const ratio = n / total;
      const start = (acc / total) * 100;
      acc += n;
      const end = (acc / total) * 100;
      const mid = (start + end) / 2;
      // Soft linear stops with wide transitions (blend zones outside hard edges)
      stops.push(`${hex}00 ${Math.max(0, start - 10).toFixed(1)}%`);
      stops.push(`${hex} ${mid.toFixed(1)}%`);
      stops.push(`${hex}00 ${Math.min(100, end + 10).toFixed(1)}%`);
      // Radial energy bloom — wider for more frequent colors
      const cx = mid;
      const cy = 30 + (idx % 2) * 40;
      const radius = 35 + ratio * 60;
      layers.push(
        `radial-gradient(ellipse ${radius}% ${radius * 0.85}% at ${cx}% ${cy}%, ${hex}cc 0%, ${hex}55 35%, transparent 75%)`
      );
    });
    baseGradient = `linear-gradient(110deg, ${stops.join(", ")})`;
    auroraLayers = layers.join(", ");
  }

  const chartData = entries
    .slice()
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    .map((e) => ({
      date: e.entry_date.slice(5),
      부하: e.cognitive_load,
      감정: e.emotion_score,
    }));

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-base font-bold">{title}</h2>
        <span className="text-[11px] text-muted-foreground">{subtitle}</span>
      </div>

      <div className="relative h-40 rounded-3xl overflow-hidden shadow-[0_20px_60px_-20px_rgba(150,120,200,0.35)]">
        {/* Base flowing gradient — slow wave */}
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: baseGradient,
            backgroundSize: "260% 260%",
            filter: "blur(18px) saturate(1.05)",
          }}
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 14, ease: "easeInOut", repeat: Infinity }}
        />
        {/* Energy bloom layer */}
        {auroraLayers && (
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: auroraLayers,
              backgroundSize: "220% 220%",
              filter: "blur(24px)",
              mixBlendMode: "screen",
              opacity: 0.95,
            }}
            animate={{ backgroundPosition: ["20% 30%", "80% 70%", "20% 30%"] }}
            transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
          />
        )}
        {/* Subtle highlight wash */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.25) 0%, transparent 60%)",
          }}
        />
      </div>

      <div className="rounded-3xl bg-card/80 backdrop-blur-sm border border-border p-4">
        <p className="text-sm font-semibold mb-3 text-center">인지부하 · 감정 추이</p>
        <div className="h-52 mx-auto" style={{ maxWidth: 520 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={28} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)" }} />
              <Line
                type="monotone"
                dataKey="부하"
                stroke="#7B88C3"
                strokeWidth={3}
                strokeLinecap="round"
                dot={{ r: 3.5, fill: "#A8B2DB", stroke: "#7B88C3", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: "#A8B2DB", stroke: "#7B88C3", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="감정"
                stroke="#8FB89A"
                strokeWidth={3}
                strokeLinecap="round"
                dot={{ r: 3.5, fill: "#B7D3BF", stroke: "#8FB89A", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: "#B7D3BF", stroke: "#8FB89A", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#7B88C3" }} /> 부하</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#8FB89A" }} /> 감정</span>
        </div>
      </div>


      <div className="rounded-3xl bg-card/80 backdrop-blur-sm border border-border p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">기록한 날</p>
        <p className="text-2xl font-bold">{entries.length}<span className="text-sm font-medium text-muted-foreground"> 일</span></p>
      </div>
    </section>
  );
}

function StatsPage({ entries, onBack, label }: { entries: any[]; onBack: () => void; label: string }) {
  // Weekly = last 7 days from today (within current data set)
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const weekly = entries.filter((e) => e.entry_date >= cutoffStr);

  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="text-sm text-muted-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> 달력
        </button>
        <h1 className="text-base font-bold">{label} 리포트</h1>
        <span className="w-12" />
      </header>

      <ReportSection entries={weekly} title="주간 리포트" subtitle="최근 7일" />
      <div className="h-px bg-border" />
      <ReportSection entries={entries} title="월간 리포트" subtitle={label} />
    </div>
  );
}

