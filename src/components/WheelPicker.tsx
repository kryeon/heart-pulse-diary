import { useEffect, useRef, useState } from "react";

interface WheelPickerProps {
  value: number;
  min?: number;
  max?: number;
  onConfirm: (n: number) => void;
  onClose: () => void;
  label?: string;
}

/**
 * Drum/wheel picker — scrollable column of numbers with the centered value
 * enlarged and outer values fading + shrinking. Snap-to-center via CSS
 * scroll-snap. Selection is held in a temp state and only committed via the
 * 완료 button (or discarded by clicking the backdrop).
 */
export function WheelPicker({
  value,
  min = 0,
  max = 9,
  onConfirm,
  onClose,
  label = "선택",
}: WheelPickerProps) {
  const ITEM_H = 44;
  const VISIBLE = 5;
  const PAD = ((VISIBLE - 1) / 2) * ITEM_H;
  const items = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [temp, setTemp] = useState(value);

  // initial scroll to value (no animation)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (value - min) * ITEM_H;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollTop / ITEM_H);
    const next = Math.max(min, Math.min(max, idx + min));
    if (next !== temp) setTemp(next);
  };

  const handleConfirm = () => {
    // snap to the exact temp before committing
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: (temp - min) * ITEM_H, behavior: "smooth" });
    }
    onConfirm(temp);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl border border-border shadow-2xl p-5 w-64 mb-6 sm:mb-0 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-xs text-muted-foreground tracking-wider mb-3">{label}</p>
        <div className="relative" style={{ height: VISIBLE * ITEM_H }}>
          {/* center highlight band */}
          <div
            className="absolute left-2 right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary/10 border-y border-primary/20 pointer-events-none"
            style={{ height: ITEM_H }}
          />
          {/* top/bottom fade gradients */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-card to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent pointer-events-none z-10" />

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            style={{ scrollSnapType: "y mandatory" }}
          >
            <div style={{ height: PAD }} />
            {items.map((n) => {
              const dist = Math.abs(n - temp);
              const scale = Math.max(0.55, 1 - dist * 0.18);
              const opacity = Math.max(0.2, 1 - dist * 0.32);
              return (
                <div
                  key={n}
                  className="snap-center flex items-center justify-center transition-[transform,opacity] duration-150 will-change-transform"
                  style={{
                    height: ITEM_H,
                    transform: `scale(${scale})`,
                    opacity,
                  }}
                >
                  <span className="text-3xl font-bold tabular-nums">{n}</span>
                </div>
              );
            })}
            <div style={{ height: PAD }} />
          </div>
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-4 w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold py-2.5 hover:opacity-90 transition active:scale-[0.98]"
        >
          완료
        </button>
      </div>
    </div>
  );
}

