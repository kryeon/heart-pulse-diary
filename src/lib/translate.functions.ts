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

    // Collect fields to translate
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
                "You translate values of a JSON object from any language into natural, warm Korean. Keep the SAME JSON keys. Keep numbers, hex colors, dates, URLs unchanged. Translate only string values. If a value is already Korean, return it as-is. Return ONLY a valid JSON object, no markdown, no commentary.",
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
      const translated = JSON.parse(cleaned);

      const out: any = { ...data.report };
      for (const k of stringFields) {
        if (translated[k]) out[k] = translated[k];
      }
      if (recs.length) {
        out.recommendations = recs.map((_, i) => translated[`__rec_${i}`] ?? recs[i]);
      }
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
