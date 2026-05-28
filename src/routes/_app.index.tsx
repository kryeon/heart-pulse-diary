import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeEntry, getTodayEntry } from "@/lib/analyze.functions";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ImagePlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "오늘 하루 · 마음결" }] }),
  component: InputPage,
});

function InputPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const fetchToday = useServerFn(getTodayEntry);
  const analyze = useServerFn(analyzeEntry);
  const { data: today, isLoading } = useQuery({ queryKey: ["today"], queryFn: () => fetchToday() });

  const [content, setContent] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // If already analyzed today, jump straight to analysis page
  if (!isLoading && today) {
    navigate({ to: "/analysis", replace: true });
    return null;
  }

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) { toast.error("2MB 이하 이미지를 올려주세요"); return; }
    const r = new FileReader();
    r.onload = () => setImageDataUrl(r.result as string);
    r.readAsDataURL(f);
  };

  const onAnalyze = async () => {
    if (!content.trim()) { toast.error("오늘의 마음을 한 줄이라도 적어주세요"); return; }
    setBusy(true);
    try {
      await analyze({ data: { content: content.trim(), image_url: imageDataUrl } });
      await router.invalidate();
      navigate({ to: "/analysis" });
    } catch (e: any) {
      toast.error(e.message ?? "분석에 실패했어요");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 animate-float-up">
      <header className="pt-4">
        <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug">
          오늘 하루는 어땠나요?<br />
          <span className="text-primary">당신의 마음을 들려주세요</span>
        </h1>
      </header>

      <div className="rounded-3xl bg-card border border-border p-5 shadow-sm">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          placeholder="복잡했던 회의, 작은 행복, 떠오른 생각… 무엇이든 좋아요."
          className="w-full min-h-[180px] bg-transparent outline-none text-[15px] leading-relaxed resize-none placeholder:text-muted-foreground/70"
        />
        <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
          <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ImagePlus className="h-4 w-4" />
            <span>{imageDataUrl ? "이미지 변경" : "이미지 (선택)"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </label>
          <span className="text-[11px] text-muted-foreground">{content.length}/2000</span>
        </div>
        {imageDataUrl && (
          <img src={imageDataUrl} alt="첨부" className="mt-3 rounded-2xl max-h-40 object-cover" />
        )}
      </div>

      <button
        onClick={onAnalyze}
        disabled={busy}
        className="w-full rounded-3xl bg-primary py-4 font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_rgba(150,120,200,0.5)] disabled:opacity-70 transition-transform active:scale-[0.98] inline-flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <Sparkles className="h-4 w-4 animate-spin" />
            마음의 결을 살피고 있어요…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            내 마음 흐름 분석하기
          </>
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        하루에 한 번, 자정이 지나면 다시 기록할 수 있어요 ✨
      </p>
    </div>
  );
}
