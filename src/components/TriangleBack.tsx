import { useRouter } from "@tanstack/react-router";

export function TriangleBack({
  onClick,
  label = "뒤로",
  className = "",
}: {
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const handle = () => {
    if (onClick) return onClick();
    router.history.back();
  };
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={label}
      className={
        "inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors " +
        className
      }
    >
      <span
        aria-hidden
        className="block"
        style={{
          width: 0,
          height: 0,
          borderTop: "7px solid transparent",
          borderBottom: "7px solid transparent",
          borderRight: "10px solid currentColor",
        }}
      />
      <span>{label}</span>
    </button>
  );
}
