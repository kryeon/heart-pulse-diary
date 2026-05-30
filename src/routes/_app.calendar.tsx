import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getEntriesInRange } from "@/lib/analyze.functions";
import { translateReport } from "@/lib/translate.functions";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, BarChart3, Loader2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { TriangleBack } from "@/components/TriangleBack";
import { useAuth } from "@/lib/auth-context";
import { getOrCreateUserId } from "@/lib/userId";

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
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["range", session?.user.id, from, to],
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

  if (showStats) return <StatsPage onBack={() => setShowStats(false)} entries={entries} entriesLoading={entriesLoading} />;

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

const EMOTION_KO: Record<string, string> = {
  positive: "긍정", negative: "부정", mixed: "복합",
  anxiety: "불안", anxious: "불안", worry: "걱정", fear: "두려움", scared: "두려움",
  sadness: "슬픔", sad: "슬픔", grief: "비탄", lonely: "외로움", loneliness: "외로움",
  anger: "분노", angry: "분노", frustration: "좌절", frustrated: "좌절", irritation: "짜증",
  stress: "스트레스", stressed: "스트레스", overwhelmed: "압도감", tired: "피로", fatigue: "피로",
  joy: "기쁨", happy: "행복", happiness: "행복", excitement: "설렘", excited: "설렘",
  calm: "평온", peace: "평온", peaceful: "평온", relaxed: "편안",
  hope: "희망", hopeful: "희망", gratitude: "감사", grateful: "감사", love: "사랑",
  confidence: "자신감", confident: "자신감", pride: "뿌듯함", proud: "뿌듯함",
  confusion: "혼란", confused: "혼란", boredom: "지루함", bored: "지루함",
  shame: "수치심", guilt: "죄책감", disappointment: "실망", disappointed: "실망",
  neutral: "중립",
};

const DOMAIN_KO: Record<string, string> = {
  study: "학업", school: "학교", work: "업무", job: "일", career: "커리어",
  relationship: "관계", family: "가족", friend: "친구", friends: "친구", love: "연애",
  health: "건강", sleep: "수면", exercise: "운동", finance: "재정", money: "돈",
  hobby: "취미", self: "자기계발", future: "미래", daily: "일상", life: "삶",
};

function tEmotion(s?: string) {
  if (!s) return "-";
  return EMOTION_KO[s.toLowerCase().trim()] ?? s;
}
function tDomain(s?: string) {
  if (!s) return "-";
  return DOMAIN_KO[s.toLowerCase().trim()] ?? s;
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 text-center">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

const INSIGHT_TONES: Record<string, { chip: string }> = {
  pattern: { chip: "bg-[#F2EEFF] text-[#7D6FB3]" },
  load: { chip: "bg-[#FFF0F2] text-[#B07A86]" },
  trigger: { chip: "bg-[#FFF4EA] text-[#B68A63]" },
  recovery: { chip: "bg-[#EEF7F2] text-[#6F9A87]" },
};

function InsightBlock({
  label,
  text,
  keywords,
  tone = "pattern",
}: {
  label: string;
  text?: string;
  keywords?: string[];
  tone?: keyof typeof INSIGHT_TONES;
}) {
  if (!text && (!keywords || keywords.length === 0)) return null;
  const t = INSIGHT_TONES[tone];
  return (
    <div className="rounded-3xl bg-card/80 border border-border/30 p-4 space-y-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[11px] font-medium tracking-wider text-muted-foreground/90">{label}</p>
      {keywords && keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((k, i) => (
            <span key={i} className={`px-3 py-1 rounded-full text-sm font-medium ${t.chip}`}>
              {k}
            </span>
          ))}
        </div>
      )}
      {text && <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>}
    </div>
  );
}

const REC_TONES = [
  { bg: "bg-[#F2EEFF]", fg: "text-[#7D6FB3]", arrow: "text-[#7D6FB3]/40" },
  { bg: "bg-[#EEF7F2]", fg: "text-[#6F9A87]", arrow: "text-[#6F9A87]/40" },
  { bg: "bg-[#FFF4EA]", fg: "text-[#B68A63]", arrow: "text-[#B68A63]/40" },
];


type EntryRow = {
  entry_date: string;
  cognitive_load: number | null;
  color_hex: string | null;
  summary: string | null;
};

function StatsPage({
  onBack,
  entries,
  entriesLoading,
}: {
  onBack: () => void;
  entries: EntryRow[];
  entriesLoading: boolean;
}) {
  const { user } = useAuth();
  const translate = useServerFn(translateReport);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("리포트를 생성하는 중이에요...");
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    if (!user?.id) return;
    const userId = getOrCreateUserId();
    console.log("REPORT USER ID:", userId);
    let cancelled = false;
    setLoading(true);
    setLoadingMsg("리포트를 생성하는 중이에요...");
    setError(null);
    setReportData(null);
    (async () => {
      try {
        const r = await fetch(import.meta.env.VITE_N8N_REPORT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, report_type: "weekly", days: 7 }),
        });
        if (!r.ok) throw new Error("bad");
        const d = await r.json();
        if (cancelled) return;
        const payload = Array.isArray(d) ? d[0] : d;
        setLoadingMsg("한국어로 번역하는 중이에요...");
        try {
          const translated = await translate({ data: { report: payload } });
          if (!cancelled) setReportData(translated);
        } catch {
          if (!cancelled) setReportData(payload);
        }
      } catch {
        if (!cancelled) setError("리포트를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, translate]);


  const chartData = useMemo(() => {
    return entries
      .slice()
      .sort((a, b) => String(a.entry_date).localeCompare(String(b.entry_date)))
      .map((t) => ({
        date: String(t.entry_date).slice(5),
        load: t.cognitive_load,
        color: t.color_hex,
      }))
      .filter((t) => typeof t.load === "number");
  }, [entries]);

  return (
    <div className="space-y-5 animate-float-up pb-8">
      <header className="flex items-center justify-between pt-2">
        <TriangleBack label="달력" onClick={onBack} />
        <h1 className="text-base font-bold">감정 리포트</h1>
        <span className="w-12" />
      </header>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">{loadingMsg}</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl bg-card border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}

      {!loading && !error && reportData && (
        <>
          <section className="space-y-2">
            <h2 className="text-xl font-bold">{reportData.report_title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{reportData.one_line_summary}</p>
          </section>

          {reportData.enough_data === false ? (
            <>
              {reportData.report_body && (
                <div className="rounded-3xl bg-card border border-border p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-line">{reportData.report_body}</p>
                </div>
              )}
              {Array.isArray(reportData.recommendations) && reportData.recommendations.length > 0 && (
                <section className="space-y-2">
                  <p className="text-[11px] text-muted-foreground tracking-wider px-1">추천 행동</p>
                  <div className="grid gap-2">
                    {reportData.recommendations.map((r: string, i: number) => (
                      <div key={i} className="rounded-2xl bg-card border border-border p-3 text-sm leading-relaxed">
                        {r}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-2">
                <StatCard label="평균 인지 부하" value={reportData.average_cognitive_load ?? "-"} />
                <StatCard label="최대 인지 부하" value={reportData.max_cognitive_load ?? "-"} />
                <StatCard label="기록 수" value={reportData.record_count ?? 0} />
                <StatCard label="가장 많은 감정" value={tEmotion(reportData.dominant_emotion)} />
              </section>

              {chartData.length > 0 && (
                <div className="rounded-3xl bg-card border border-border p-4">
                  <p className="text-sm font-semibold mb-3 text-center">감정 흐름</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                        <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={28} domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)" }} />
                        <Line
                          type="monotone"
                          dataKey="load"
                          stroke="#7B88C3"
                          strokeWidth={3}
                          strokeLinecap="round"
                          dot={(props: any) => {
                            const { cx, cy, payload, index } = props;
                            return (
                              <circle key={index} cx={cx} cy={cy} r={5} fill={payload.color || "#A8B2DB"} stroke="#fff" strokeWidth={1.5} />
                            );
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {reportData.chart_caption && (
                    <p className="text-[11px] text-muted-foreground text-center mt-2">{reportData.chart_caption}</p>
                  )}
                </div>
              )}

              <section className="space-y-2">
                <p className="text-[11px] text-muted-foreground tracking-wider px-1">인사이트</p>
                <InsightBlock label="주요 패턴" text={reportData.dominant_pattern} keywords={reportData.insight_keywords?.dominant_pattern} tone="pattern" />
                <InsightBlock label="가장 높은 부하" text={reportData.highest_load_insight} keywords={reportData.insight_keywords?.highest_load_insight} tone="load" />
                <InsightBlock label="트리거" text={reportData.trigger_insight} keywords={reportData.insight_keywords?.trigger_insight} tone="trigger" />
                <InsightBlock label="회복" text={reportData.recovery_insight} keywords={reportData.insight_keywords?.recovery_insight} tone="recovery" />
              </section>

              {Array.isArray(reportData.recommendations) && reportData.recommendations.length > 0 && (
                <section className="space-y-2">
                  <p className="text-[11px] text-muted-foreground tracking-wider px-1">추천 행동</p>
                  <div className="grid gap-2">
                    {reportData.recommendations.slice(0, 3).map((r: string, i: number) => {
                      const tone = REC_TONES[i % REC_TONES.length];
                      const kw = reportData.recommendation_keywords?.[i] as string | undefined;
                      return (
                        <div key={i} className={`${tone.bg} p-4 rounded-2xl flex items-center justify-between gap-3`}>
                          <div className="min-w-0 flex-1">
                            {kw ? (
                              <>
                                <p className={`text-base font-semibold leading-tight ${tone.fg}`}>{kw}</p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{r}</p>
                              </>
                            ) : (
                              <p className={`text-sm font-medium leading-snug ${tone.fg}`}>{r}</p>
                            )}

                          </div>
                          <span className={`shrink-0 ${tone.arrow}`}>→</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {reportData.gentle_warning && (
                <div className="rounded-2xl bg-muted/50 border border-border p-3 text-xs text-muted-foreground leading-relaxed">
                  {reportData.gentle_warning}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

