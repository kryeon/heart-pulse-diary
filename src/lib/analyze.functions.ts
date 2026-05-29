import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AnalysisSchema = z.object({
  summary: z.string(),
  cognitive_load: z.number().min(0).max(100),
  unconscious: z.string(),
  emotion_score: z.number().min(0).max(100),
  hue: z.number().min(0).max(360),
  routines: z.array(z.object({ title: z.string(), description: z.string() })).min(2).max(3),
});

function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export const analyzeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { content: string; image_url?: string | null; local_date?: string }) =>
    z.object({
      content: z.string().min(1).max(5000),
      image_url: z.string().nullable().optional(),
      local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check today's entry first (use user's local date when provided)
    const today = data.local_date ?? new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("entries").select("*").eq("user_id", userId).eq("entry_date", today).maybeSingle();
    if (existing) return existing;

    // Call Lovable AI
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const sys = `당신은 따뜻한 한국어 감정 분석가입니다. 사용자의 일기를 분석해 JSON으로 답하세요.
필드:
- summary: 한 줄 요약(한국어, 25자 이내)
- cognitive_load: 인지부하도(0-100 정수, 글이 복잡하고 걱정 많을수록 높음)
- unconscious: AI가 추론한 무의식 정리(한국어 2-3문장, 따뜻한 어조)
- emotion_score: 감정 긍정도(0=매우 어두움, 100=매우 밝음, 정수)
- hue: 감정에 어울리는 색상의 HSL hue(0-360)
- routines: 추천 활동 2-3개 [{title, description}], 한국어, 부드럽고 실행 쉬운 활동`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: data.content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI error ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed;
    try { parsed = AnalysisSchema.parse(JSON.parse(raw)); }
    catch {
      parsed = {
        summary: "오늘의 마음을 기록했어요",
        cognitive_load: 40,
        unconscious: "마음의 결을 조용히 들여다보는 하루였어요.",
        emotion_score: 60,
        hue: 280,
        routines: [
          { title: "따뜻한 차 한 잔", description: "5분 동안 향을 음미해 보세요" },
          { title: "느린 호흡", description: "4초 들이쉬고 6초 내쉬기를 5번" },
        ],
      };
    }

    // brightness/saturation from emotion_score
    const sat = 55 + (parsed.emotion_score / 100) * 25; // 55-80
    const light = 60 + (parsed.emotion_score / 100) * 20; // 60-80
    const color_hex = hslToHex(parsed.hue, sat, light);

    const insertRow = {
      user_id: userId,
      entry_date: today,
      content: data.content,
      image_url: data.image_url ?? null,
      summary: parsed.summary,
      cognitive_load: parsed.cognitive_load,
      unconscious: parsed.unconscious,
      color_hex,
      emotion_score: parsed.emotion_score,
      routines: parsed.routines,
    };

    const { data: inserted, error } = await supabase
      .from("entries").insert(insertRow).select().single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const getTodayEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { local_date?: string }) =>
    z.object({ local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const today = data.local_date ?? new Date().toISOString().slice(0, 10);
    const { data: row } = await context.supabase
      .from("entries").select("*").eq("user_id", context.userId).eq("entry_date", today).maybeSingle();
    return row;
  });


export const getEntriesInRange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) =>
    z.object({ from: z.string(), to: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("entries").select("*")
      .eq("user_id", context.userId)
      .gte("entry_date", data.from)
      .lte("entry_date", data.to)
      .order("entry_date", { ascending: true });
    return rows ?? [];
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles").select("*").eq("id", context.userId).maybeSingle();
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username?: string; display_name?: string }) =>
    z.object({ username: z.string().min(1).max(60).optional(), display_name: z.string().min(1).max(60).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles").update({ ...data, updated_at: new Date().toISOString() }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
