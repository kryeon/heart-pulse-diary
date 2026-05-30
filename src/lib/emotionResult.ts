// Holds the latest n8n emotion analysis result across route changes.
export type EmotionResult = {
  mind_light?: { color_hex?: string; label?: string; [k: string]: unknown };
  card?: { summary?: string; cognitive_load?: number; unconscious?: string; [k: string]: unknown };
  emotion?: { primary?: string; secondary?: string[]; [k: string]: unknown };
  routines?: Array<{ title: string; description: string }>;
  [k: string]: unknown;
};

const KEY = "emotionResult";

export function setEmotionResult(r: EmotionResult) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(r));
    window.dispatchEvent(new CustomEvent("emotionResult:update"));
  } catch {}
}

export function getEmotionResult(): EmotionResult | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v ? (JSON.parse(v) as EmotionResult) : null;
  } catch {
    return null;
  }
}

export function clearEmotionResult() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
