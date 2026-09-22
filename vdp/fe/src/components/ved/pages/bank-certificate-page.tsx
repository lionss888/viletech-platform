import { VedAppShell } from "@/components/ved/VedAppShell";

/** Bank-certified deal certificate — empty until a real source exists. */
export function BankCertificatePage() {
  return (
    <VedAppShell
      title="Справка о совершении сделки, заверенная банком"
      subtitle="Отдельный экран без имитации PDF"
    >
      <div className="panel max-w-lg space-y-2 p-6" data-testid="bank-certificate-empty">
        <p className="text-sm font-semibold">Справок от банка пока нет</p>
        <p className="text-sm text-muted-foreground">
          Источника заверения банком ещё нет. Генерацию PDF здесь не имитируем.
        </p>
      </div>
    </VedAppShell>
  );
}
