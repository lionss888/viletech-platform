import { useMemo } from "react";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { VedFormLink } from "@/components/ved/VedLink";
import { dateTime } from "@/lib/ved/format";
import { listPaymentOrderRows } from "@/lib/ved/reference-docs-filter";
import { usePlatformStore, visibleForms } from "@/lib/ved/platform-store";

/** Already generated payment orders + empty templates block. */
export function PaymentOrdersPage() {
  const { forms, session } = usePlatformStore();
  const mine = visibleForms(forms, session?.role, session?.name);
  const rows = useMemo(() => listPaymentOrderRows(mine), [mine]);

  return (
    <VedAppShell title="Платёжные поручения" subtitle="Сформированные поручения и шаблоны">
      <section className="mb-6 space-y-3">
        <h2 className="text-sm font-semibold">Поручения</h2>
        {rows.length === 0 ? (
          <div className="panel max-w-lg space-y-2 p-6" data-testid="payment-orders-empty">
            <p className="text-sm font-semibold">Поручений пока нет</p>
            <p className="text-sm text-muted-foreground">
              Уже сформированные payment_order появятся здесь. Генерация остаётся на карточке заявки.
            </p>
          </div>
        ) : (
          <ul className="panel divide-y divide-border" data-testid="payment-orders-list">
            {rows.map(({ doc, form }) => (
              <li key={`${form.id}-${doc.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Заявка {form.number} · {dateTime(form.createdAt)}
                  </p>
                </div>
                <VedFormLink id={form.id} className="text-xs font-semibold text-primary hover:underline">
                  К заявке
                </VedFormLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Шаблоны</h2>
        <div className="panel max-w-lg space-y-2 p-6" data-testid="payment-order-templates-empty">
          <p className="text-sm font-semibold">Шаблонов пока нет</p>
          <p className="text-sm text-muted-foreground">
            Загрузка шаблона поручения — следующий срез. В этом экране файлы не сохраняются.
          </p>
        </div>
      </section>
    </VedAppShell>
  );
}
