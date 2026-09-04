import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { VedAppShell } from "@/components/ved/VedAppShell";
import { useAuth } from "@/lib/auth/session";
import { linkTelegram, patchNotifyPrefs, unlinkTelegram } from "@/lib/api/notifications";
import { usePlatformMode } from "@/lib/ved/platform-mode";

export function ProfilePage() {
  const mode = usePlatformMode();
  const auth = useAuth();
  const qc = useQueryClient();
  const [linkError, setLinkError] = useState("");
  const [deepLink, setDeepLink] = useState("");

  const linked = Boolean(auth.account?.telegram_linked);
  const smsOn = Boolean(auth.account?.sms_notify_enabled);
  const isApp = mode === "app";

  const linkMut = useMutation({
    mutationFn: linkTelegram,
    onSuccess: (res) => {
      setLinkError("");
      setDeepLink(res.deep_link);
      window.open(res.deep_link, "_blank", "noopener,noreferrer");
    },
    onError: (err) => setLinkError(err instanceof Error ? err.message : "Не удалось создать ссылку"),
  });

  const unlinkMut = useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: async () => {
      setDeepLink("");
      await auth.refreshAccount();
      await qc.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (err) => setLinkError(err instanceof Error ? err.message : "Не удалось отвязать"),
  });

  const prefsMut = useMutation({
    mutationFn: (sms: boolean) => patchNotifyPrefs({ sms_notify_enabled: sms }),
    onSuccess: async () => {
      await auth.refreshAccount();
    },
  });

  return (
    <VedAppShell title="Профиль" subtitle="Привязка Telegram и уведомления">
      <div className="grid gap-4 lg:max-w-xl">
        <section className="panel p-4">
          <p className="label-caps">Telegram</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Один бот платформы. Личный чат — статусы заявки без ФИО и паспорта.
          </p>
          <p className="mt-2 text-sm">
            Статус:{" "}
            <span className="font-semibold">{linked ? "привязан" : "не привязан"}</span>
          </p>
          {isApp && !linked && (
            <button
              type="button"
              onClick={() => linkMut.mutate()}
              disabled={linkMut.isPending}
              className="mt-4 min-h-11 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:w-auto"
            >
              {linkMut.isPending ? "Готовим ссылку…" : "Привязать Telegram"}
            </button>
          )}
          {isApp && linked && (
            <button
              type="button"
              onClick={() => unlinkMut.mutate()}
              disabled={unlinkMut.isPending}
              className="mt-4 min-h-11 rounded-md px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive-soft"
            >
              Отвязать
            </button>
          )}
          {!isApp && (
            <p className="mt-3 text-sm text-muted-foreground">
              Привязка доступна после входа через API (не в демо).
            </p>
          )}
          {deepLink && (
            <p className="mt-3 text-sm">
              Откройте бота по ссылке, затем обновите страницу.{" "}
              <a href={deepLink} className="font-semibold text-accent underline" target="_blank" rel="noreferrer">
                Открыть Telegram
              </a>
            </p>
          )}
          {linkError && <p className="mt-2 text-sm font-semibold text-destructive">{linkError}</p>}
        </section>

        <section className="panel p-4">
          <p className="label-caps">SMS</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Только OTP и критичные события (отказ комплаенса, блок организации). По умолчанию выключено.
          </p>
          <label className="mt-4 flex min-h-11 items-center justify-between gap-3">
            <span className="text-sm font-medium">Получать SMS</span>
            <Switch
              checked={smsOn}
              disabled={!isApp || prefsMut.isPending}
              onCheckedChange={(v) => prefsMut.mutate(v)}
              aria-label="Получать SMS"
            />
          </label>
          {!isApp && <p className="mt-2 text-xs text-muted-foreground">Тумблер сохраняется только в API-контуре.</p>}
        </section>
      </div>
    </VedAppShell>
  );
}
