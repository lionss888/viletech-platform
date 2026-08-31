import type { PaymentForm } from "./types";

/** Channel marker for registry and detail headers. */
export function ChannelBadge({ channel, labeled = false }: { channel?: PaymentForm["channel"]; labeled?: boolean }) {
  if (channel === "bank") {
    return (
      <span className="rounded-md bg-wait-soft px-1.5 py-0.5 text-[10px] font-semibold text-wait" title="Bank API">
        {labeled ? "Канал: Bank API" : "Bank API"}
      </span>
    );
  }
  if (channel === "ui") {
    return (
      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground" title="UI">
        {labeled ? "Канал: UI" : "UI"}
      </span>
    );
  }
  return null;
}
