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
    throw new Error(
      "n8n에서 빈 응답이 왔어요. Webhook 노드의 Respond 모드를 'When Last Node Finishes'로 바꾸고 워크플로우를 Active 상태로 저장해주세요.",
    );
  }

  try {
    return JSON.parse(raw) as N8nWebhookResponse;
  } catch (error) {
    console.error("응답 JSON 파싱 실패:", error, raw);
    throw new Error("분석 응답을 해석할 수 없어요 (JSON 형식이 아님)");
  }
}
