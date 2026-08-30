import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { FORMS, cpById, orgById } from "@/lib/ved/mock";
import { STAGES, statusMeta } from "@/lib/ved/statuses";
import { money } from "@/lib/ved/format";

export default defineTool({
  name: "list_deals",
  title: "Список сделок ВЭД",
  description:
    "Список платёжных заявок (сделок) с фильтрами по этапу, направлению, валюте и текстовому поиску. Возвращает номер, статус, этап, стороны и сумму.",
  inputSchema: {
    stage: z
      .enum(STAGES.map((s) => s.id) as [string, ...string[]])
      .optional()
      .describe("Этап жизненного цикла сделки."),
    direction: z.enum(["import", "export"]).optional().describe("Направление сделки."),
    currency: z.string().optional().describe("Код валюты, например USD или CNY."),
    query: z.string().optional().describe("Поиск по номеру заявки, инвойсу, организации или контрагенту."),
    limit: z.number().int().optional().describe("Максимум записей в ответе (по умолчанию 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ stage, direction, currency, query, limit }) => {
    const q = (query ?? "").trim().toLowerCase();
    const rows = FORMS.filter((form) => {
      const meta = statusMeta(form.status);
      if (stage && meta.stage !== stage) return false;
      if (direction && form.direction !== direction) return false;
      if (currency && form.currency.toUpperCase() !== currency.toUpperCase()) return false;
      if (!q) return true;
      const org = orgById(form.organizationId)?.name ?? "";
      const cp = cpById(form.counterpartyId)?.name ?? "";
      return [form.number, form.invoiceNumber, org, cp, meta.label].join(" ").toLowerCase().includes(q);
    })
      .slice(0, Math.min(Math.max(limit ?? 25, 1), 100))
      .map((form) => {
        const meta = statusMeta(form.status);
        return {
          number: form.number,
          status: form.status,
          statusLabel: meta.label,
          stage: meta.stage,
          direction: form.direction,
          kind: form.kind,
          condition: form.condition,
          amount: money(form.amountMinor, form.currency),
          currency: form.currency,
          organization: orgById(form.organizationId)?.name ?? form.organizationId,
          counterparty: cpById(form.counterpartyId)?.name ?? form.counterpartyId,
          hsCode: form.hsCode,
          invoiceNumber: form.invoiceNumber,
          updatedAt: form.updatedAt,
        };
      });

    return {
      content: [{ type: "text", text: JSON.stringify({ count: rows.length, deals: rows }, null, 2) }],
      structuredContent: { count: rows.length, deals: rows },
    };
  },
});
