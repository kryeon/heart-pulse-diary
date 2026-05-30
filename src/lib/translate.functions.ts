import { createServerFn } from "@tanstack/react-start";

export const translateReport = createServerFn({ method: "POST" })
  .inputValidator((d: { report: any }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return data.report;

    const stringFields = [
      "report_title",
      "one_line_summary",
      "report_body",
      "dominant_pattern",
      "highest_load_insight",
      "trigger_insight",
      "recovery_insight",
      "chart_caption",
      "gentle_warning",
      "dominant_emotion",
      "top_domain",
    ];
    const insightFields = [
      "dominant_pattern",
      "highest_load_insight",
      "trigger_insight",
      "recovery_insight",
    ];

    const toTranslate: Record<string, string> = {};
    for (const k of stringFields) {
      if (typeof data.report?.[k] === "string" && data.report[k].trim()) {
        toTranslate[k] = data.report[k];
      }
    }
    const recs: string[] = Array.isArray(data.report?.recommendations)
      ? data.report.recommendations.filter((x: any) => typeof x === "string")
      : [];
    recs.forEach((r, i) => { toTranslate[`__rec_${i}`] = r; });

    const timeline: any[] = Array.isArray(data.report?.timeline) ? data.report.timeline : [];
    timeline.forEach((t, i) => {
      if (typeof t?.journal_title === "string") toTranslate[`__tl_title_${i}`] = t.journal_title;
      if (typeof t?.primary_emotion === "string") toTranslate[`__tl_emo_${i}`] = t.primary_emotion;
      if (typeof t?.summary === "string") toTranslate[`__tl_sum_${i}`] = t.summary;
      if (typeof t?.domain === "string") toTranslate[`__tl_dom_${i}`] = t.domain;
    });

    if (Object.keys(toTranslate).length === 0) return data.report;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You return a JSON object with two parts: 1) 'translated' — every input key with its value translated to natural warm Korean (keep numbers/hex/dates/URLs as-is). 2) 'keywords' — for each insight key (dominant_pattern, highest_load_insight, trigger_insight, recovery_insight) that exists in input, an array of 1–3 SHORT Korean noun keywords (each 2–8 글자, no particles like 을/를/이/가, no full sentences). Also for each __rec_<i> key, a SHORT Korean action keyword (2–8 글자, 동사/명사구, e.g. '시간 관리', '짧은 휴식'). [언어 규칙 - 매우 중요] 모든 출력은 반드시 자연스러운 한국어여야 한다. 영어 단어, 영어 문장, 영어 제목, 영어 감정명(Positive/Negative/Happy/Sad 등)을 절대 사용하지 마라. 입력값이 이미 한국어더라도 어색하거나 영어가 섞여 있으면 자연스러운 한국어로 다시 표현하라. 감정명도 한국어로 통일하라(예: Positive→긍정, Negative→부정, Neutral→중립, Happy→행복, Sad→슬픔, Calm→평온, Excited→설렘, Anxious→불안). Output shape exactly: {\"translated\":{...},\"keywords\":{\"dominant_pattern\":[...],\"trigger_insight\":[...],\"__rec_0\":\"...\",...}}. Return ONLY valid JSON, no markdown.",
            },
            {
              role: "user",
              content: JSON.stringify(toTranslate),
            },
          ],
        }),
      });

      if (!res.ok) return data.report;
      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      const translated = parsed.translated ?? parsed;
      const keywords = parsed.keywords ?? {};

      const out: any = { ...data.report };
      for (const k of stringFields) {
        if (translated[k]) out[k] = translated[k];
      }
      if (recs.length) {
        out.recommendations = recs.map((_, i) => translated[`__rec_${i}`] ?? recs[i]);
        out.recommendation_keywords = recs.map((_, i) => {
          const k = keywords[`__rec_${i}`];
          return typeof k === "string" ? k : "";
        });
      }
      const insightKw: Record<string, string[]> = {};
      for (const k of insightFields) {
        const arr = keywords[k];
        if (Array.isArray(arr)) {
          insightKw[k] = arr.filter((x: any) => typeof x === "string" && x.trim()).slice(0, 3);
        }
      }
      out.insight_keywords = insightKw;

      if (timeline.length) {
        out.timeline = timeline.map((t, i) => ({
          ...t,
          journal_title: translated[`__tl_title_${i}`] ?? t.journal_title,
          primary_emotion: translated[`__tl_emo_${i}`] ?? t.primary_emotion,
          summary: translated[`__tl_sum_${i}`] ?? t.summary,
          domain: translated[`__tl_dom_${i}`] ?? t.domain,
        }));
      }
      return out;
    } catch {
      return data.report;
    }
  });
