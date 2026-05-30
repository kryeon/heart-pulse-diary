export interface N8nWebhookPayload {
  [key: string]: unknown;
}

export async function callN8n(payload: N8nWebhookPayload): Promise<unknown> {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("VITE_N8N_WEBHOOK_URL is not defined");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
  }

  return response.json().catch(() => undefined);
}
