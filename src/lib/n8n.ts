export interface N8nWebhookPayload {
  user_id: string;
  text: string;
  image_url: string;
  sleep_hours: number;
  energy_level: number;
  profile: {
    nickname: string;
    age_group: number;
    main_stress_area: string;
    preferred_tone: string;
  };
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type N8nWebhookResponse = { [key: string]: JsonValue };

export const N8N_WEBHOOK_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "ngrok-skip-browser-warning": "true",
} as const;

export function parseN8nWebhookResponse(raw: string): N8nWebhookResponse {
  if (!raw || !raw.trim()) {
    throw new Error("분석 응답이 비어 있어요");
  }

  try {
    return JSON.parse(raw) as N8nWebhookResponse;
  } catch (error) {
    console.error("응답 JSON 파싱 실패:", error, raw);
    throw new Error("분석 응답을 해석할 수 없어요");
  }
}
