import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getEntriesInRange } from "@/lib/analyze.functions";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, BarChart3, Loader2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { TriangleBack } from "@/components/TriangleBack";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/calendar")({
  head: () => ({ meta: [{ title: "달력 · Syncl\u0023r" }] }),
  component: CalendarPage,
});

function fmt(d: Date) { return d.toISOString().slice(0, 10); }
function fmtLocal(y: number, m: number, day: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function monthBounds(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  return { from: fmt(first), to: fmt(last) };
}

function CalendarPage() {
  const { session } = useAuth();
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [showStats, setShowStats] = useState(false);
  const [editingYear, setEditingYear] = useState(false);
  const [editingMonth, setEditingMonth] = useState(false);
  const navigate = useNavigate();

  const { from, to } = useMemo(() => monthBounds(cursor.y, cursor.m), [cursor]);
  const fetchRange = useServerFn(getEntriesInRange);
  const { data: entries = [] } = useQuery({
    queryKey: ["range", from, to],
    queryFn: () => fetchRange({ data: { from, to } }),
    enabled: !!session?.access_token,
    retry: false,
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

  if (showStats) return <StatsPage onBack={() => setShowStats(false)} initialYear={cursor.y} initialMonth={cursor.m} />;

  return (
    <div className="space-y-5 animate-float-up">
      <header className="flex items-center justify-between pt-2">
        <div>
          {editingYear ? (
            <input
              type="number" min={2000} max={2100} autoFocus defaultValue={cursor.y}
              onBlur={(e) => {
                const v = Math.max(2000, Math.min(2100, parseInt(e.target.value) || cursor.y));
                setCursor((c) => ({ ...c, y: v })); setEditingYear(false);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="text-xs text-muted-foreground bg-transparent border-b border-primary/40 outline-none w-16"
            />
          ) : (
            <button onClick={() => setEditingYear(true)} className="text-xs text-muted-foreground hover:text-foreground">{cursor.y}</button>
          )}
          {editingMonth ? (
            <input
              type="number" min={1} max={12} autoFocus defaultValue={cursor.m + 1}
              onBlur={(e) => {
                const v = Math.max(1, Math.min(12, parseInt(e.target.value) || cursor.m + 1));
                setCursor((c) => ({ ...c, m: v - 1 })); setEditingMonth(false);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="block text-2xl font-bold bg-transparent border-b border-primary/40 outline-none w-20"
            />
          ) : (
            <button onClick={() => setEditingMonth(true)} className="block text-2xl font-bold hover:text-primary">
              {cursor.m + 1}월
            </button>
          )}
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
            const localKey = fmtLocal(cursor.y, cursor.m, day);
            const e = byDate.get(localKey);
            const clickable = !!e;
            return (
              <button
                key={localKey}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && navigate({ to: "/analysis", search: { date: localKey } })}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-xs relative transition ${clickable ? "hover:scale-105 cursor-pointer" : "cursor-default"}`}
                style={e ? { backgroundColor: e.color_hex + "55", color: "var(--foreground)" } : { backgroundColor: "var(--muted)" }}
                title={e?.summary ?? ""}
              >
                <span className="font-semibold">{day}</span>
                {e && <span className="h-1.5 w-1.5 rounded-full mt-0.5" style={{ backgroundColor: e.color_hex }} />}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        연도·월을 눌러 직접 입력하거나, 기록된 날짜를 눌러 그 날의 분석을 확인하세요
      </p>
    </div>
  );
}

function buildSummary(entries: any[], periodLabel: string): string {
  if (entries.length === 0) return `${periodLabel} 동안 기록이 없어요. 짧은 한 줄이라도 마음을 남겨보세요.`;
  const avgLoad = Math.round(entries.reduce((s, e) => s + (e.cognitive_load ?? 0), 0) / entries.length);
  const avgEmo = Math.round(entries.reduce((s, e) => s + (e.emotion_score ?? 0), 0) / entries.length);
  const counts = new Map<string, number>();
  entries.forEach((e) => { if (e.color_hex) counts.set(e.color_hex, (counts.get(e.color_hex) ?? 0) + 1); });
  const dominant = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];

  const loadMood = avgLoad < 35 ? "비교적 여유로웠고" : avgLoad < 65 ? "적당히 분주했고" : "꽤 무겁고 복잡했고";
  const emoMood = avgEmo > 65 ? "마음은 대체로 밝게 빛났어요" : avgEmo > 40 ? "마음은 잔잔히 흐르고 있었어요" : "마음에는 그늘이 자주 머물렀어요";
  const dominantLine = dominant
    ? ` 가장 자주 떠오른 색은 ${dominant[0].toUpperCase()} 였어요.`
    : "";
  return `${periodLabel} 동안 ${entries.length}번 마음을 기록했어요. 머리는 ${loadMood}, ${emoMood}.${dominantLine}`;
}

function ReportSection({
  title, periodLabel, from, to, onPrev, onNext,
}: {
  title: string; periodLabel: string; from: string; to: string;
  onPrev: () => void; onNext: () => void;
}) {
  const { session } = useAuth();
  const fetchRange = useServerFn(getEntriesInRange);
  const { data: entries = [] } = useQuery({
    queryKey: ["report-range", from, to],
    queryFn: () => fetchRange({ data: { from, to } }),
    enabled: !!session?.access_token,
    retry: false,
  });

  const counts = new Map<string, number>();
  entries.forEach((e: any) => { if (e.color_hex) counts.set(e.color_hex, (counts.get(e.color_hex) ?? 0) + 1); });
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);

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
      stops.push(`${hex}00 ${Math.max(0, start - 10).toFixed(1)}%`);
      stops.push(`${hex} ${mid.toFixed(1)}%`);
      stops.push(`${hex}00 ${Math.min(100, end + 10).toFixed(1)}%`);
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
    .sort((a: any, b: any) => a.entry_date.localeCompare(b.entry_date))
    .map((e: any) => ({ date: e.entry_date.slice(5), 부하: e.cognitive_load, 감정: e.emotion_score }));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold">{title}</h2>
        <div className="flex items-center gap-1.5">
          <button onClick={onPrev} className="h-8 w-8 rounded-xl bg-card border border-border grid place-items-center hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[11px] text-muted-foreground min-w-[100px] text-center">{periodLabel}</span>
          <button onClick={onNext} className="h-8 w-8 rounded-xl bg-card border border-border grid place-items-center hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative h-40 rounded-3xl overflow-hidden shadow-[0_20px_60px_-20px_rgba(150,120,200,0.35)]">
        <motion.div className="absolute inset-0" style={{
          backgroundImage: baseGradient, backgroundSize: "260% 260%",
          filter: "blur(18px) saturate(1.05)",
        }} animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 14, ease: "easeInOut", repeat: Infinity }} />
        {auroraLayers && (
          <motion.div className="absolute inset-0" style={{
            backgroundImage: auroraLayers, backgroundSize: "220% 220%",
            filter: "blur(24px)", mixBlendMode: "screen", opacity: 0.95,
          }} animate={{ backgroundPosition: ["20% 30%", "80% 70%", "20% 30%"] }}
            transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }} />
        )}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.25) 0%, transparent 60%)",
        }} />
      </div>

      <div className="rounded-3xl bg-card/80 backdrop-blur-sm border border-border p-4">
        <p className="text-sm font-semibold mb-3 text-center">인지부하 · 감정 추이</p>
        <div className="h-52 mx-auto" style={{ maxWidth: 520 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={28} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)" }} />
              <Line type="monotone" dataKey="부하" stroke="#7B88C3" strokeWidth={3} strokeLinecap="round"
                dot={{ r: 3.5, fill: "#A8B2DB", stroke: "#7B88C3", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: "#A8B2DB", stroke: "#7B88C3", strokeWidth: 2 }} />
              <Line type="monotone" dataKey="감정" stroke="#8FB89A" strokeWidth={3} strokeLinecap="round"
                dot={{ r: 3.5, fill: "#B7D3BF", stroke: "#8FB89A", strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: "#B7D3BF", stroke: "#8FB89A", strokeWidth: 2 }} />
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

      <div className="rounded-3xl bg-gradient-to-br from-secondary/40 to-card border border-border p-4">
        <p className="text-[11px] text-muted-foreground tracking-wider mb-1.5">전체 요약</p>
        <p className="text-sm leading-relaxed">{buildSummary(entries, periodLabel)}</p>
      </div>
    </section>
  );
}

function StatsPage({ onBack, initialYear, initialMonth }: { onBack: () => void; initialYear: number; initialMonth: number }) {
  // Weekly state — anchor is Sunday of the displayed week
  const today = new Date();
  const todaySunday = new Date(today); todaySunday.setDate(today.getDate() - today.getDay());
  const [weekAnchor, setWeekAnchor] = useState(todaySunday);
  const weekFrom = new Date(weekAnchor);
  const weekTo = new Date(weekAnchor); weekTo.setDate(weekFrom.getDate() + 6);
  const weeklyFrom = fmtLocalDate(weekFrom);
  const weeklyTo = fmtLocalDate(weekTo);
  const weeklyLabel = `${weeklyFrom.slice(5)} ~ ${weeklyTo.slice(5)}`;
  const shiftWeek = (delta: number) => {
    const d = new Date(weekAnchor); d.setDate(d.getDate() + delta * 7); setWeekAnchor(d);
  };

  // Monthly state
  const [month, setMonth] = useState({ y: initialYear, m: initialMonth });
  const mb = monthBounds(month.y, month.m);
  const monthlyLabel = `${month.y}.${String(month.m + 1).padStart(2, "0")}`;
  const shiftMonth = (delta: number) => {
    setMonth(({ y, m }) => {
      const nm = m + delta;
      if (nm < 0) return { y: y - 1, m: 11 };
      if (nm > 11) return { y: y + 1, m: 0 };
      return { y, m: nm };
    });
  };

  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex items-center justify-between pt-2">
        <TriangleBack label="달력" onClick={onBack} />
        <h1 className="text-base font-bold">리포트</h1>
        <span className="w-12" />
      </header>


      <ReportSection title="주간 리포트" periodLabel={weeklyLabel}
        from={weeklyFrom} to={weeklyTo}
        onPrev={() => shiftWeek(-1)} onNext={() => shiftWeek(1)} />
      <div className="h-px bg-border" />
      <ReportSection title="월간 리포트" periodLabel={monthlyLabel}
        from={mb.from} to={mb.to}
        onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />
    </div>
  );
}

function fmtLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
