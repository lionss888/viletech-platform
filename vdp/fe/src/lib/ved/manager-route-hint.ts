/**
 * Manager-facing copy: assemble route from existing levers (not a BPM editor).
 * Source: заметки/конструктор-сценариев (approved wording).
 */

/** Roles that see the route-assembly hint on form detail. */
export function shouldShowManagerRouteHint(role: string): boolean {
  return role === "manager" || role === "root";
}

export const MANAGER_ROUTE_HINT_TITLE = "Как собрать путь заявки";

export const MANAGER_ROUTE_HINT_LEAD =
  "Рабочий путь собирается из готовых рычагов платформы — не из свободного редактора этапов.";

export const MANAGER_ROUTE_HINT_BULLETS: readonly string[] = [
  "Кто участвует в процессе — настраивает суперадмин (роли процесса). Менеджер сделки эти слоты не переключает.",
  "Денежный маршрут — аванс, постоплата или экспортный путь в рамках уже готовых лестниц сделки.",
  "Ветки по ходу — возврат на правки, возврат денег, отгрузка (если нужна): действия в заявке, не новый сценарий в коде.",
  "Новый вид участника или новый этап процесса — отдельный кастом, не кнопка в кабинете.",
];
