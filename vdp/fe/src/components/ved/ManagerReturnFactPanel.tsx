import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReturnEpisode } from "@/lib/api/return";

interface ManagerReturnFactPanelProps {
  returnEpisode?: ReturnEpisode;
}

/**
 * Manager sees the fact of return reported by provider (stage 1).
 * Visible: role=manager, returnEpisode.active=true
 * Note: Three decision buttons (clarify/return/repeat) are NOT in stage 1.
 */
export function ManagerReturnFactPanel({ returnEpisode }: ManagerReturnFactPanelProps) {
  if (!returnEpisode?.active) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Провайдер сообщил о возврате</CardTitle>
        <CardDescription>
          Деньги вернулись на счёт провайдера после исполнения платежа
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <span className="font-medium">Сумма:</span>{" "}
          <span className="text-lg">{returnEpisode.reported_amount} {returnEpisode.reported_currency}</span>
        </div>
        {returnEpisode.reason && (
          <div>
            <span className="font-medium">Причина:</span>{" "}
            <span>{returnEpisode.reason}</span>
          </div>
        )}
        {returnEpisode.reported_at && (
          <div className="text-sm text-muted-foreground">
            Сообщено: {new Date(returnEpisode.reported_at).toLocaleString("ru-RU")}
          </div>
        )}
        <div className="mt-4 p-3 bg-muted rounded-md text-sm">
          Выберите действие (реализация в этапах 2-4):
          <ul className="list-disc list-inside mt-2">
            <li>Уточнить у клиента</li>
            <li>Вернуть клиенту (курс → письмо → рубли)</li>
            <li>Повторить платёж</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
