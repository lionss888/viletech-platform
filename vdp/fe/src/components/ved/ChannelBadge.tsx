import { BANK_CHANNEL_BADGE } from "@/lib/ved/copy/bank-copy";

import type { PaymentForm } from "./types";

/** Channel marker for registry and detail headers. */
export function ChannelBadge({ channel, labeled = false }: { channel?: PaymentForm["channel"]; labeled?: boolean }) {
  if (channel === "bank") {
    return (
      <span
        className="rounded-md bg-wait-soft px-1.5 py-0.5 text-[10px] font-semibold text-wait"
        title={BANK_CHANNEL_BADGE.bankTitle}
      >
        {labeled ? BANK_CHANNEL_BADGE.bankLabeled : BANK_CHANNEL_BADGE.bankShort}
      </span>
    );
  }
  if (channel === "ui") {
    return (
      <span
        className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
        title={BANK_CHANNEL_BADGE.uiTitle}
      >
        {labeled ? BANK_CHANNEL_BADGE.uiLabeled : BANK_CHANNEL_BADGE.uiShort}
      </span>
    );
  }
  return null;
}
