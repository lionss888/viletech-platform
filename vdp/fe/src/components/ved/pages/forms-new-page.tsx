import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { VedAppShell } from "@/components/ved/VedAppShell";
import { usePlatformBasePath, usePlatformMode } from "@/lib/ved/platform-mode";
import { usePlatformStore } from "@/lib/ved/platform-store";
import type { FormCondition, FormDirection, FormKind } from "@/lib/ved/types";
import { cn } from "@/lib/utils";

const STEPS = ["Направление", "Стороны", "Условия", "Документы", "Проверка"];

export function NewForm() {
  const { organizations, counterparties, createForm } = usePlatformStore();
  const navigate = useNavigate();
  const base = usePlatformBasePath();
  const mode = usePlatformMode();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    direction: "import" as FormDirection,
    kind: "good" as FormKind,
    condition: "advance" as FormCondition,
    organizationId: organizations[0]?.id ?? "",
    counterpartyId: counterparties[0]?.id ?? "",
    amount: "",
    currency: "USD",
    clientCurrency: "RUB",
    counterpartyCurrency: "USD",
    hsCode: "",
    invoiceNumber: "",
    contractNumber: "",
    contractDate: "",
    shipmentDate: "",
    noDocuments: false,
    invoiceFile: null as File | null,
    contractFile: null as File | null,
  });

  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(): string | null {
    if (step === 2) {
      if (draft.kind === "good" && !draft.hsCode.trim()) return "Для товара укажите код ТН ВЭД";
      if (draft.kind === "good" && draft.condition === "advance" && !draft.shipmentDate.trim()) {
        return "Для товара с авансом укажите дату отгрузки";
      }
    }
    if (step === 3 && !draft.noDocuments) {
      if (!draft.invoiceFile && mode === "app") return "Загрузите инвойс или выберите «У меня нет документов»";
      if (!draft.contractFile && mode === "app") return "Загрузите контракт или выберите «У меня нет документов»";
    }
    if (step === 3 && draft.noDocuments) {
      if (!draft.contractNumber.trim() || !draft.contractDate.trim()) {
        return "Без документов укажите номер и дату контракта вручную";
      }
    }
    return null;
  }

  function nextStep() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(step + 1);
  }

  async function submit() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        direction: draft.direction,
        kind: draft.kind,
        condition: draft.condition,
        organizationId: draft.organizationId,
        counterpartyId: draft.counterpartyId,
        amountMinor: Math.round(Number(draft.amount || 0) * 100),
        currency: draft.currency,
        clientCurrency: draft.clientCurrency,
        counterpartyCurrency: draft.counterpartyCurrency,
        hsCode: draft.hsCode || "—",
        invoiceNumber: draft.noDocuments ? draft.contractNumber : draft.invoiceNumber || "—",
        shipmentDate: draft.shipmentDate || undefined,
        noDocuments: draft.noDocuments,
        invoiceFile: draft.invoiceFile ?? undefined,
        contractFile: draft.contractFile ?? undefined,
        documents:
          draft.invoiceFile || draft.contractFile
            ? [
                ...(draft.invoiceFile
                  ? [
                      {
                        id: "doc-invoice",
                        title: draft.invoiceFile.name,
                        ext: "PDF" as const,
                        size: "—",
                        uploadedAt: new Date().toISOString(),
                        kind: "invoice" as const,
                      },
                    ]
                  : []),
                ...(draft.contractFile
                  ? [
                      {
                        id: "doc-contract",
                        title: draft.contractFile.name,
                        ext: "PDF" as const,
                        size: "—",
                        uploadedAt: new Date().toISOString(),
                        kind: "contract" as const,
                      },
                    ]
                  : []),
              ]
            : [],
      };
      const created = await Promise.resolve(createForm(payload));
      navigate({ to: `${base}/forms/$id` as "/forms/$id", params: { id: created.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать заявку");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <VedAppShell
      title="Новая платёжная заявка"
      subtitle={
        mode === "demo"
          ? "Черновик создаётся локально; после create — CTA «Завершить распознавание» на статусе creating"
          : "Черновик создаётся в ядре; документы загружаются через API после create"
      }
    >
      <div className="panel p-4">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold",
                i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-done-soft text-done" : "text-subtle-foreground",
              )}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>
      </div>

      <div className="panel mt-4 max-w-2xl p-5">
        {error && <p className="mb-4 rounded-md bg-destructive-soft px-2 py-1.5 text-xs text-destructive">{error}</p>}

        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Направление">
              <select value={draft.direction} onChange={(e) => set("direction", e.target.value as FormDirection)} className="field">
                <option value="import">Импорт</option>
                <option value="export">Экспорт</option>
              </select>
            </Field>
            <Field label="Предмет">
              <select value={draft.kind} onChange={(e) => set("kind", e.target.value as FormKind)} className="field">
                <option value="good">Товар</option>
                <option value="service">Услуга</option>
              </select>
            </Field>
            <Field label="Условие оплаты">
              <select value={draft.condition} onChange={(e) => set("condition", e.target.value as FormCondition)} className="field">
                <option value="advance">Аванс</option>
                <option value="postPayment">Постоплата</option>
              </select>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4">
            <Field label="Организация клиента">
              <select value={draft.organizationId} onChange={(e) => set("organizationId", e.target.value)} className="field">
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · ИНН {o.inn}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Контрагент">
              <select value={draft.counterpartyId} onChange={(e) => set("counterpartyId", e.target.value)} className="field">
                {counterparties.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.country}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Сумма инвойса">
              <input value={draft.amount} onChange={(e) => set("amount", e.target.value)} inputMode="decimal" placeholder="1250000" className="field font-mono" />
            </Field>
            <Field label="Валюта инвойса">
              <select value={draft.currency} onChange={(e) => set("currency", e.target.value)} className="field">
                {["USD", "CNY", "AED", "TRY", "EUR", "KZT", "USDT"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Валюта клиента">
              <select value={draft.clientCurrency} onChange={(e) => set("clientCurrency", e.target.value)} className="field">
                {["RUB", "USD", "EUR", "CNY"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Валюта контрагента">
              <select value={draft.counterpartyCurrency} onChange={(e) => set("counterpartyCurrency", e.target.value)} className="field">
                {["USD", "CNY", "AED", "EUR"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            {draft.kind === "good" && (
              <Field label="Код ТН ВЭД">
                <input value={draft.hsCode} onChange={(e) => set("hsCode", e.target.value)} placeholder="8542 31 90" className="field font-mono" />
              </Field>
            )}
            {draft.kind === "good" && draft.condition === "advance" && (
              <Field label="Дата отгрузки">
                <input type="date" value={draft.shipmentDate} onChange={(e) => set("shipmentDate", e.target.value)} className="field" />
              </Field>
            )}
            <Field label="Номер инвойса">
              <input value={draft.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} placeholder="INV-2026-0001" className="field font-mono" />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => set("noDocuments", !draft.noDocuments)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-semibold",
                draft.noDocuments ? "bg-wait-soft text-wait" : "bg-muted text-muted-foreground",
              )}
            >
              {draft.noDocuments ? "✓ У меня нет документов" : "У меня нет документов"}
            </button>
            {!draft.noDocuments && (
              <>
                <Field label="Инвойс (PDF)">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => set("invoiceFile", e.target.files?.[0] ?? null)}
                    className="text-xs text-muted-foreground"
                  />
                </Field>
                <Field label="Контракт (PDF)">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => set("contractFile", e.target.files?.[0] ?? null)}
                    className="text-xs text-muted-foreground"
                  />
                </Field>
              </>
            )}
            {draft.noDocuments && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Номер контракта">
                  <input value={draft.contractNumber} onChange={(e) => set("contractNumber", e.target.value)} className="field font-mono" />
                </Field>
                <Field label="Дата контракта">
                  <input type="date" value={draft.contractDate} onChange={(e) => set("contractDate", e.target.value)} className="field" />
                </Field>
              </div>
            )}
            {draft.condition === "postPayment" && (
              <p className="text-xs text-muted-foreground">Постоплата: closing docs можно загрузить на этапе shipment_waiting.</p>
            )}
          </div>
        )}

        {step === 4 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ["Направление", draft.direction === "import" ? "Импорт" : "Экспорт"],
              ["Предмет", draft.kind === "good" ? "Товар" : "Услуга"],
              ["Условие", draft.condition === "advance" ? "Аванс" : "Постоплата"],
              ["Организация", organizations.find((o) => o.id === draft.organizationId)?.name ?? ""],
              ["Контрагент", counterparties.find((c) => c.id === draft.counterpartyId)?.name ?? ""],
              ["Сумма", `${draft.amount || 0} ${draft.currency}`],
              ["Валюты", `${draft.clientCurrency} / ${draft.counterpartyCurrency}`],
              ["ТН ВЭД", draft.hsCode || "—"],
              ["Документы", draft.noDocuments ? "Без файлов (ручной контракт)" : "Инвойс + контракт"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="label-caps">{k}</dt>
                <dd className="text-sm">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
              Назад
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={nextStep} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Далее
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {submitting ? "Создание…" : "Создать заявку"}
            </button>
          )}
        </div>
      </div>
    </VedAppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-caps">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
