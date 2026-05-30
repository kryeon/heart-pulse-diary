// Frontend helpers for ensuring AI text is shown in Korean.

const EMOTION_KO_MAP: Record<string, string> = {
  positive: "긍정", negative: "부정", neutral: "중립",
  happy: "행복", happiness: "행복", joy: "기쁨",
  sad: "슬픔", sadness: "슬픔", grief: "비탄",
  calm: "평온", peace: "평온", peaceful: "평온", relaxed: "편안",
  excited: "설렘", excitement: "설렘",
  anxious: "불안", anxiety: "불안", worry: "걱정",
  angry: "분노", anger: "분노", frustrated: "좌절", frustration: "좌절",
  stressed: "스트레스", stress: "스트레스", overwhelmed: "압도감",
  tired: "피로", fatigue: "피로",
  hopeful: "희망", hope: "희망", grateful: "감사", gratitude: "감사",
  love: "사랑", confident: "자신감", confidence: "자신감",
  proud: "뿌듯함", pride: "뿌듯함", lonely: "외로움", loneliness: "외로움",
  fear: "두려움", scared: "두려움", confused: "혼란", confusion: "혼란",
  bored: "지루함", boredom: "지루함", shame: "수치심", guilt: "죄책감",
  disappointed: "실망", disappointment: "실망",
};

export function localizeEmotion(s?: string | null): string {
  if (!s) return "";
  const key = s.toLowerCase().trim();
  return EMOTION_KO_MAP[key] ?? s;
}

export function isMostlyKorean(s?: string | null): boolean {
  if (!s) return true;
  const hangul = (s.match(/[\uAC00-\uD7AF]/g) ?? []).length;
  const ascii = (s.match(/[A-Za-z]/g) ?? []).length;
  if (ascii === 0) return true;
  // Mostly Korean if hangul count dominates ascii letters
  return hangul / (hangul + ascii) >= 0.6;
}

export function needsKoreanization(s?: string | null): boolean {
  return !isMostlyKorean(s);
}
