import { statusMeta } from "@/lib/ved/statuses";
import type { FormStatus, StatusTone } from "@/lib/ved/types";
import { cn } from "@/lib/utils";

const TONE: Record<StatusTone, string> = {
  wait: "bg-wait-soft text-wait",
  work: "bg-work-soft text-work",
  return: "bg-return-soft text-return",
  done: "bg-done-soft text-done",
  neutral: "bg-neutral-tone-soft text-neutral-tone",
};

export function StatusBadge({
  status,
  full = false,
  className,
}: {
  status: FormStatus;
  full?: boolean;
  className?: string;
}) {
  const meta = statusMeta(status);
  return (
    <span
      title={meta.label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold whitespace-nowrap",
        TONE[meta.tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {full ? meta.label : meta.short}
    </span>
  );
}

export function DirectionTag({ direction }: { direction: "import" | "export" }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase",
        direction === "import" ? "bg-work-soft text-work" : "bg-export-tone-soft text-export-tone",
      )}
    >
      {direction === "import" ? "IMP" : "EXP"}
    </span>
  );
}
