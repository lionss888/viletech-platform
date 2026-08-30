import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { ROLES } from "@/lib/ved/roles";
import { STAGES, STATUS_META } from "@/lib/ved/statuses";
import { actionsFor } from "@/lib/ved/actions";
import type { VedRole } from "@/lib/ved/types";

export default defineTool({
  name: "describe_workflow",
  title: "Процесс сделки ВЭД",
  description:
    "Описание процесса: этапы жизненного цикла сделки, все статусы с этапами и роли платформы. Опционально — какие действия доступны роли на конкретном статусе.",
  inputSchema: {
    role: z
      .enum(ROLES.map((r) => r.id) as [VedRole, ...VedRole[]])
      .optional()
      .describe("Роль, для которой нужно показать доступные действия."),
    status: z.string().optional().describe("Статус сделки, для которого нужны действия роли."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ role, status }) => {
    const payload: Record<string, unknown> = {
      stages: STAGES,
      roles: ROLES.map((r) => ({ id: r.id, title: r.title, group: r.group })),
      statuses: Object.entries(STATUS_META).map(([id, meta]) => ({
        id,
        label: meta.label,
        stage: meta.stage,
        tone: meta.tone,
      })),
    };

    if (role && status) {
      payload["availableActions"] = actionsFor(role, status).map((a) => ({
        id: a.id,
        label: a.label,
        nextStatus: a.nextStatus,
        requiresReason: !!a.requiresReason,
        requiresMark: !!a.requiresMark,
        requiresFile: !!a.requiresFile,
      }));
    }

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
