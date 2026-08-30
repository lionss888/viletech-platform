import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { COUNTERPARTIES, ORGANIZATIONS } from "@/lib/ved/mock";
import { COMPLIANCE_TOOLS, COUNTRIES, CURRENCIES, HS_CODES, PROVIDERS } from "@/lib/ved/reference";

const REGISTRIES = {
  organizations: () => ORGANIZATIONS.map(({ id: _id, ...rest }) => rest),
  counterparties: () => COUNTERPARTIES.map(({ id: _id, ...rest }) => rest),
  providers: () => PROVIDERS.map(({ id: _id, ...rest }) => rest),
  currencies: () => CURRENCIES,
  hs_codes: () => HS_CODES,
  countries: () => COUNTRIES,
  compliance_tools: () => COMPLIANCE_TOOLS.map(({ id: _id, ...rest }) => rest),
} as const;

export default defineTool({
  name: "list_reference",
  title: "Справочники платформы",
  description:
    "Записи справочника платформы: организации, контрагенты, провайдеры, валюты, коды ТН ВЭД, страны с уровнем риска или инструменты комплаенс.",
  inputSchema: {
    registry: z
      .enum(Object.keys(REGISTRIES) as [keyof typeof REGISTRIES, ...(keyof typeof REGISTRIES)[]])
      .describe("Какой справочник вернуть."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ registry }) => {
    const items = REGISTRIES[registry]();
    return {
      content: [{ type: "text", text: JSON.stringify({ registry, count: items.length, items }, null, 2) }],
      structuredContent: { registry, count: items.length, items },
    };
  },
});
