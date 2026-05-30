import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Translates only the values that look non-Korean to natural warm Korean.
// Values already in Korean (or numeric/hex) are returned as-is.
export const koreanizeTexts = createServerFn({ method: "POST" })
  .inputValidator((d: { items: Record<string, string> }) =>
    z.object({ items: z.record(z.string()) }).parse(d),
  )
  .handler(async ({ data }) => {
    const items = data.items ?? {};
    const keys = Object.keys(items);
    if (keys.length === 0) return items;

    // Only translate entries that contain ASCII letters and are NOT already
    // dominated by Korean Hangul characters.
    const needs: Record<string, string> = {};
    const hangul = /[\uAC00-\uD7AF]/;
    const ascii = /[A-Za-z]/;
    for (const k of keys) {
      const v = items[k];
      if (typeof v !== "string" || !v.trim()) continue;
      const hangulMatches = (v.match(/[\uAC00-\uD7AF]/g) ?? []).length;
      const letterMatches = (v.match(/[A-Za-z\uAC00-\uD7AF]/g) ?? []).length;
      const koreanRatio = letterMatches > 0 ? hangulMatches / letterMatches : 1;
      if (ascii.test(v) && (!hangul.test(v) || koreanRatio < 0.6)) {
        needs[k] = v;
      }
    }
    if (Object.keys(needs).length === 0) return items;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return items;

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
                "당신은 영어를 따뜻하고 자연스러운 한국어로 번역하는 번역가입니다. 모든 응답은 반드시 한국어로 작성하세요. 영어 단어, 영어 문장, 영어 제목을 사용하지 마세요. 입력은 {key: 영어/혼합 문자열} 형태의 JSON 객체이며, 각 값을 자연스러운 한국어로 번역해 동일한 키 구조의 JSON으로만 반환하세요. 숫자/날짜/HEX 색상/URL/사람 이름은 그대로 유지하고, 그 외 사용자에게 노출되는 모든 텍스트는 100% 한국어로 출력하세요. 절대로 마크다운이나 코드블록을 사용하지 말고, 오직 JSON만 반환하세요.",
            },
            { role: "user", content: JSON.stringify(needs) },
          ],
        }),
      });
      if (!res.ok) return items;
      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const translated = JSON.parse(cleaned) as Record<string, string>;
      const out: Record<string, string> = { ...items };
      for (const k of Object.keys(needs)) {
        if (typeof translated[k] === "string" && translated[k].trim()) {
          out[k] = translated[k];
        }
      }
      return out;
    } catch {
      return items;
    }
  });
