import { ToolError, defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { FORMS, cpById, orgById } from "@/lib/ved/mock";
import { statusMeta } from "@/lib/ved/statuses";
import { roleTitle } from "@/lib/ved/roles";
import { money } from "@/lib/ved/format";

export default defineTool({
  name: "get_deal",
  title: "Карточка сделки",
  description:
    "Полная карточка одной платёжной заявки по её номеру: стороны, сумма, статус, комментарии комплаенс, документы и хронология событий.",
  inputSchema: {
    number: z.string().describe("Номер заявки, например ВЭД-2026-0107."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ number }) => {
    const needle = number.trim().toLowerCase();
    const form = FORMS.find((f) => f.number.toLowerCase() === needle || f.id.toLowerCase() === needle);
    if (!form) throw new ToolError(`Сделка «${number}» не найдена.`);

    const meta = statusMeta(form.status);
    const org = orgById(form.organizationId);
    const cp = cpById(form.counterpartyId);

    const deal = {
      number: form.number,
      status: form.status,
      statusLabel: meta.label,
      stage: meta.stage,
      direction: form.direction,
      kind: form.kind,
      condition: form.condition,
      amount: money(form.amountMinor, form.currency),
      currency: form.currency,
      hsCode: form.hsCode,
      invoiceNumber: form.invoiceNumber,
      organization: org ? { name: org.name, inn: org.inn, status: org.status, address: org.legalAddress } : null,
      counterparty: cp ? { name: cp.name, country: cp.country, bank: cp.bank, swift: cp.swift, status: cp.status } : null,
      participants: { client: form.ownerName, manager: form.managerName ?? null, provider: form.providerName ?? null },
      complianceReturn: form.rejectText ? { mark: form.rejectMark ?? null, comment: form.rejectText } : null,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      documents: form.documents.map((d) => ({
        title: d.title,
        kind: d.kind,
        ext: d.ext,
        size: d.size,
        uploadedAt: d.uploadedAt,
      })),
      timeline: form.timeline.map((t) => ({
        title: t.title,
        at: t.at,
        actor: roleTitle(t.actorRole),
        done: t.done,
      })),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(deal, null, 2) }],
      structuredContent: { deal },
    };
  },
});
