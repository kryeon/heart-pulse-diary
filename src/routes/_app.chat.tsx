import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getOrCreateUserId } from "@/lib/userId";
import { koreanizeTexts } from "@/lib/koreanize.functions";
import { needsKoreanization } from "@/lib/koreanize";

export const Route = createFileRoute("/_app/chat")({
  component: ChatPage,
});

type Msg = {
  role: "bot" | "user";
  text: string;
  suggested_action?: string;
  reflection_question?: string;
};

type N8nResponse = {
  success?: boolean;
  mode?: string;
  has_today_record?: boolean;
  reply?: string;
  opening_summary?: string;
  reflection_question?: string;
  suggested_action?: string;
  remaining_messages?: number;
  limit_exceeded?: boolean;
};

const WEBHOOK_URL = import.meta.env.VITE_N8N_CHATBOT_WEBHOOK_URL as string;
const MAX_MESSAGES = 5;

function ChatPage() {
  const userId = getOrCreateUserId();
  const koreanize = useServerFn(koreanizeTexts);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sentCount, setSentCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitExceeded, setLimitExceeded] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const initRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().slice(0, 10);

  async function ensureKoreanFields(d: N8nResponse): Promise<N8nResponse> {
    const items: Record<string, string> = {};
    if (typeof d.reply === "string" && needsKoreanization(d.reply)) items.reply = d.reply;
    if (typeof d.opening_summary === "string" && needsKoreanization(d.opening_summary))
      items.opening_summary = d.opening_summary;
    if (typeof d.suggested_action === "string" && needsKoreanization(d.suggested_action))
      items.suggested_action = d.suggested_action;
    if (typeof d.reflection_question === "string" && needsKoreanization(d.reflection_question))
      items.reflection_question = d.reflection_question;
    if (Object.keys(items).length === 0) return d;
    try {
      const translated = await koreanize({ data: { items } });
      return { ...d, ...translated };
    } catch {
      return d;
    }
  }


  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (initRef.current || !userId) return;
    initRef.current = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            mode: "init",
            entry_date: today,
            message_count: 0,
            is_paid: false,
          }),
        });
        if (!res.ok) throw new Error("init failed");
        const data: N8nResponse = await res.json();
        const reply =
          data.reply ??
          (data.has_today_record === false
            ? "오늘 기록이 아직 없어요. 지금 마음을 한 문장으로 적어볼까요?"
            : "안녕하세요. 오늘의 마음 이야기를 들려주세요.");
        setMessages([
          {
            role: "bot",
            text: reply,
            suggested_action: data.suggested_action,
            reflection_question: data.reflection_question,
          },
        ]);
        if (typeof data.remaining_messages === "number") setRemaining(data.remaining_messages);
        if (data.limit_exceeded) setLimitExceeded(true);
      } catch {
        setError("챗봇 응답을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, today]);

  const remainingDisplay = remaining ?? Math.max(0, MAX_MESSAGES - sentCount);
  const disabled = loading || limitExceeded || sentCount >= MAX_MESSAGES || !userId;

  async function handleSend() {
    const text = input.trim();
    if (!text || disabled) return;
    const nextCount = sentCount + 1;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSentCount(nextCount);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          mode: "chat",
          entry_date: today,
          message: text,
          message_count: nextCount,
          is_paid: false,
        }),
      });
      if (!res.ok) throw new Error("chat failed");
      const data: N8nResponse = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: data.reply ?? "",
          suggested_action: data.suggested_action,
          reflection_question: data.reflection_question,
        },
      ]);
      if (typeof data.remaining_messages === "number") setRemaining(data.remaining_messages);
      if (data.limit_exceeded) setLimitExceeded(true);
    } catch {
      setError("챗봇 응답을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      <div className="px-1 pb-3">
        <h1 className="text-xl font-bold text-foreground">오늘의 마음 대화</h1>
        <p className="text-sm text-muted-foreground mt-1">오늘 기록을 바탕으로 짧게 대화해요</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 px-1 py-2">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className="max-w-[85%] space-y-2">
              <div
                className={
                  m.role === "user"
                    ? "rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-4 py-2.5 text-sm"
                    : "rounded-2xl rounded-tl-md bg-card border border-border px-4 py-2.5 text-sm text-foreground"
                }
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                {m.reflection_question && (
                  <p className="mt-2 text-sm text-muted-foreground italic">
                    {m.reflection_question}
                  </p>
                )}
              </div>
              {m.suggested_action && (
                <div className="rounded-xl bg-accent/40 border border-accent px-3 py-2 text-xs text-foreground">
                  <span className="font-semibold mr-1">제안:</span>
                  {m.suggested_action}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-md bg-card border border-border px-4 py-2.5 text-sm text-muted-foreground">
              생각 중…
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>

      <div className="pt-2">
        <div className="text-xs text-muted-foreground text-center mb-1.5">
          {limitExceeded || sentCount >= MAX_MESSAGES
            ? "무료 버전에서는 오늘의 챗봇 대화를 5번까지 이어갈 수 있어요."
            : `남은 대화 ${remainingDisplay}회`}
        </div>
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={disabled ? "대화를 보낼 수 없어요" : "마음을 적어보세요…"}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none px-2 py-1.5 max-h-28 disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
            aria-label="전송"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
