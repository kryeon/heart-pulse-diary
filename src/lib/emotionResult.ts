// Holds the latest n8n emotion analysis result across route changes.
export type EmotionResult = {
  mind_light?: any;
  card?: any;
  emotion?: any;
  routines?: Array<{ title: string; description: string }>;
  [k: string]: unknown;
};

const KEY = "latest_emotion_result";

export function setEmotionResult(r: EmotionResult) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
    window.dispatchEvent(new CustomEvent("emotionResult:update"));
  } catch {}
}

export function getEmotionResult(): EmotionResult | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as EmotionResult) : null;
  } catch {
    return null;
  }
}

export function clearEmotionResult() {
  try { localStorage.removeItem(KEY); } catch {}
}
