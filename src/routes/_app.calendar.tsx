import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getEntriesInRange } from "@/lib/analyze.functions";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

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

function StatsPage({ entries, onBack, label }: { entries: any[]; onBack: () => void; label: string }) {
  const colors = entries.map((e) => e.color_hex).filter(Boolean);
  const aurora = colors.length
    ? `linear-gradient(120deg, ${colors.concat(colors).slice(0, Math.max(3, colors.length)).join(", ")})`
    : "linear-gradient(120deg, var(--lavender), var(--mint), var(--peach))";

  const chartData = entries.map((e) => ({
    date: e.entry_date.slice(5),
    부하: e.cognitive_load,
    감정: e.emotion_score,
  }));

  return (
    <div className="space-y-5 animate-float-up">
      <header className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="text-sm text-muted-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> 달력
        </button>
        <h1 className="text-base font-bold">{label} 리포트</h1>
        <span className="w-12" />
      </header>

      <div
        className="h-44 rounded-3xl animate-aurora shadow-[0_20px_60px_-20px_rgba(150,120,200,0.4)]"
        style={{ backgroundImage: aurora }}
      />
      <p className="text-center text-xs text-muted-foreground -mt-2">이번 달 마음 오로라</p>

      <div className="rounded-3xl bg-card border border-border p-4">
        <p className="text-sm font-semibold mb-3">인지부하 · 감정 추이</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)" }} />
              <Line type="monotone" dataKey="부하" stroke="var(--lavender)" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="감정" stroke="var(--mint)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-3xl bg-card border border-border p-5">
        <p className="text-sm font-semibold mb-2">기록한 날</p>
        <p className="text-3xl font-bold">{entries.length}<span className="text-base font-medium text-muted-foreground"> 일</span></p>
      </div>
    </div>
  );
}
