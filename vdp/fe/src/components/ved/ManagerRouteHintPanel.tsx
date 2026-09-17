import {
  MANAGER_ROUTE_HINT_BULLETS,
  MANAGER_ROUTE_HINT_LEAD,
  MANAGER_ROUTE_HINT_TITLE,
  shouldShowManagerRouteHint,
} from "@/lib/ved/manager-route-hint";

type Props = {
  role: string;
};

/**
 * Short education block: assemble application path from existing levers.
 * Not a BPM editor; process-roles stay with root.
 */
export function ManagerRouteHintPanel({ role }: Props) {
  if (!shouldShowManagerRouteHint(role)) {
    return null;
  }
  return (
    <div className="panel mt-4 p-4" data-testid="manager-route-hint">
      <p className="label-caps">{MANAGER_ROUTE_HINT_TITLE}</p>
      <p className="mt-2 text-sm">{MANAGER_ROUTE_HINT_LEAD}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        {MANAGER_ROUTE_HINT_BULLETS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        Блок «Следующий шаг» справа показывает действие по текущему статусу. Эта подсказка —
        про сборку маршрута из рычагов, а не про смену порядка этапов.
      </p>
    </div>
  );
}
