import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { useAuth } from "@/lib/auth/session";
import {
  approveJoin,
  listPendingJoins,
  listWorkChats,
  rejectJoin,
  requestWorkChatJoin,
  type WorkChatView,
} from "@/lib/api/notifications";
import { usePlatformMode } from "@/lib/ved/platform-mode";

const DEMO_CHATS: WorkChatView[] = [
  { id: "wc-ops", title: "Операционка", kind: "ops", active: true, join_status: "none" },
  { id: "wc-compliance", title: "Комплаенс", kind: "compliance", active: true, join_status: "none" },
];

function joinLabel(status: WorkChatView["join_status"]): string {
  switch (status) {
    case "pending":
      return "Заявка на рассмотрении";
    case "approved":
      return "Вы в чате";
    case "rejected":
      return "Отклонено";
    default:
      return "Не в чате";
  }
}

export function ChatsPage() {
  const mode = usePlatformMode();
  const auth = useAuth();
  const qc = useQueryClient();
  const isApp = mode === "app";
  const canModerate = auth.role === "manager" || auth.role === "root";

  const chatsQuery = useQuery({
    queryKey: ["work-chats"],
    queryFn: listWorkChats,
    enabled: isApp,
  });
  const joinsQuery = useQuery({
    queryKey: ["work-chat-joins"],
    queryFn: listPendingJoins,
    enabled: isApp && canModerate,
  });

  const joinMut = useMutation({
    mutationFn: requestWorkChatJoin,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["work-chats"] }),
  });
  const decideMut = useMutation({
    mutationFn: ({ id, ok }: { id: string; ok: boolean }) => (ok ? approveJoin(id) : rejectJoin(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["work-chats"] });
      void qc.invalidateQueries({ queryKey: ["work-chat-joins"] });
    },
  });

  const chats = isApp ? (chatsQuery.data ?? []) : DEMO_CHATS;

  return (
    <VedAppShell title="Рабочие чаты" subtitle="Запрос на вступление в операционные группы Telegram">
      <div className="space-y-4">
        <section className="panel overflow-x-auto p-4">
          <p className="label-caps">Чаты платформы</p>
          {!isApp && (
            <p className="mt-2 text-sm text-muted-foreground">
              В демо список показан как ориентир. Запрос на добавление работает после входа через API.
            </p>
          )}
          <ul className="mt-3 divide-y divide-border">
            {chats.map((chat) => {
              const pending = chat.join_status === "pending";
              const approved = chat.join_status === "approved";
              return (
                <li key={chat.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{chat.title}</p>
                    <p className="text-xs text-muted-foreground">{joinLabel(chat.join_status)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!isApp || pending || approved || joinMut.isPending}
                    title={pending ? "Заявка уже отправлена — ожидайте решения менеджера" : undefined}
                    onClick={() => joinMut.mutate(chat.id)}
                    className="min-h-11 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? "Ожидает решения" : approved ? "Добавлен" : "Запросить добавление"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {isApp && canModerate && (
          <section className="panel p-4">
            <p className="label-caps">Заявки на вступление</p>
            {(joinsQuery.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Нет заявок в статусе pending.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {(joinsQuery.data ?? []).map((join) => (
                  <li key={join.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{join.account_id.slice(0, 8)}</span>
                    <span className="text-sm text-muted-foreground">{join.chat_id}</span>
                    <button
                      type="button"
                      className="min-h-11 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                      onClick={() => decideMut.mutate({ id: join.id, ok: true })}
                    >
                      Одобрить
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded-md px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive-soft"
                      onClick={() => decideMut.mutate({ id: join.id, ok: false })}
                    >
                      Отклонить
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </VedAppShell>
  );
}
