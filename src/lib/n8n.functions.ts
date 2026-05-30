import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  N8N_WEBHOOK_HEADERS,
  parseN8nWebhookResponse,
  type N8nWebhookPayload,
  type N8nWebhookResponse,
} from "@/lib/n8n";

const N8nWebhookPayloadSchema = z.object({
  user_id: z.string().min(1).max(128),
  text: z.string().min(1).max(5000),
  image_url: z.string().max(2_500_000),
  sleep_hours: z.number().min(0).max(24),
  energy_level: z.number().min(1).max(10),
  profile: z.object({
    nickname: z.string().min(1).max(80),
    age_group: z.number().min(0).max(120),
    main_stress_area: z.string().min(1).max(80),
    preferred_tone: z.string().min(1).max(80),
  }),
});

function getWebhookUrl() {
  const webhookUrl = process.env.VITE_N8N_WEBHOOK_URL || import.meta.env.VITE_N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("Webhook URL이 설정되지 않았습니다.");
  }
  return webhookUrl;
}

export const sendN8nWebhook = createServerFn({ method: "POST" })
  .inputValidator((payload: N8nWebhookPayload) => N8nWebhookPayloadSchema.parse(payload))
  .handler(async ({ data }): Promise<N8nWebhookResponse> => {
    const webhookUrl = getWebhookUrl();
    console.log("WEBHOOK URL:", webhookUrl);

    const response = await fetch(webhookUrl, {
      method: "POST",
      mode: "cors",
      headers: N8N_WEBHOOK_HEADERS,
      body: JSON.stringify(data),
    });

    const raw = await response.text();

    if (!response.ok) {
      const detail = raw.trim() ? `: ${raw.slice(0, 300)}` : "";
      throw new Error(`분석 요청 실패: ${response.status} ${response.statusText}${detail}`);
    }

    const parsed = parseN8nWebhookResponse(raw);

    if (parsed.success === false) {
      throw new Error("분석에 실패했어요");
    }

    return parsed;
  });