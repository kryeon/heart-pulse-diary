export interface N8nWebhookPayload {
  [key: string]: unknown;
}

const DEFAULT_WEBHOOK_URL = "http://https://forty-teeth-pull.loca.lt/webhook/app";

export async function callN8n(payload: N8nWebhookPayload): Promise<unknown> {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
  }

  return response.json().catch(() => undefined);
}

export interface CreateEmotionPayload {
  user_id: string | null;
  entry_date: string;
  text: string;
  image_url: string | null;
  profile: unknown;
  sleep_hours: number | null;
  energy_level: number | null;
}

export async function createEmotion(payload: CreateEmotionPayload): Promise<unknown> {
  const url = import.meta.env.VITE_N8N_WEBHOOK_URL || "http://https://forty-teeth-pull.loca.lt/webhook/app";
  if (!url) {
    throw new Error("VITE_N8N_WEBHOOK_URL 환경변수가 설정되지 않았습니다");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`create emotion failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
