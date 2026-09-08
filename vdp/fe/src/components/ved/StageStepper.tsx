import { STAGES, stageIndex, statusMeta } from "@/lib/ved/statuses";
import { stageIndexForProcess, stagesForProcess } from "@/lib/ved/process-stage-filters";
import type { ProcessRoleRow } from "@/lib/api/process-roles";
import type { FormStatus } from "@/lib/ved/types";
import { cn } from "@/lib/utils";

export function StageStepper({
  status,
  processRoles,
}: {
  status: FormStatus;
  processRoles?: ProcessRoleRow[];
}) {
  const stages = processRoles?.length ? stagesForProcess(processRoles) : STAGES;
  const current = processRoles?.length
    ? stageIndexForProcess(status, processRoles)
    : stageIndex(statusMeta(status).stage);
  const canceled = status.startsWith("canceled");

  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {stages.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={stage.id} className="flex items-center gap-1">
            <span
              className={cn(
                "rounded-md px-2 py-1 text-xs font-semibold",
                active && canceled && "bg-return-soft text-return",
                active && !canceled && "bg-primary text-primary-foreground",
                done && "bg-done-soft text-done",
                !done && !active && "text-subtle-foreground",
              )}
            >
              {stage.label}
            </span>
            {i < stages.length - 1 && <span className="text-subtle-foreground">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
