import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { DemoAppShell } from "@/components/ved/DemoAppShell";
import { useVed } from "@/lib/ved/store";
import type { FormCondition, FormDirection, FormKind } from "@/lib/ved/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demo/forms/new")({
  head: () => ({
    meta: [
      { title: "Новая платёжная заявка — Viletech ВЭД" },
      { name: "description", content: "Пошаговое создание платёжной заявки ВЭД: направление, контрагент, сумма, инвойс и отправка на комплаенс." },
      { property: "og:title", content: "Новая платёжная заявка — Viletech ВЭД" },
      { property: "og:description", content: "Мастер создания заявки: направление, контрагент, сумма и документы." },
    ],
  }),
  component: NewForm,
});

const STEPS = ["Направление", "Стороны", "Сумма и инвойс", "Проверка"];

function NewForm() {
  const { organizations, counterparties, createForm } = useVed();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({
    direction: "import" as FormDirection,
    kind: "good" as FormKind,
    condition: "advance" as FormCondition,
    organizationId: organizations[0]!.id,
    counterpartyId: counterparties[0]!.id,
    amount: "",
    currency: "USD",
    hsCode: "",
    invoiceNumber: "",
    fileName: "",
  });

  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    const created = createForm({
      direction: draft.direction,
      kind: draft.kind,
      condition: draft.condition,
      organizationId: draft.organizationId,
      counterpartyId: draft.counterpartyId,
      amountMinor: Math.round(Number(draft.amount || 0) * 100),
      currency: draft.currency,
      hsCode: draft.hsCode || "—",
      invoiceNumber: draft.invoiceNumber || "—",
      documents: draft.fileName
        ? [
            {
              id: "doc-invoice",
              title: draft.fileName,
              ext: "PDF",
              size: "—",
              uploadedAt: new Date().toISOString(),
              kind: "invoice",
            },
          ]
        : [],
    });
    navigate({ to: "/demo/forms/$id", params: { id: created.id } });
  }

  return (
    <DemoAppShell title="Новая платёжная заявка" subtitle="Черновик создаётся локально и попадает в реестр со статусом «Черновик»">
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
            <Field label="Сумма">
              <input value={draft.amount} onChange={(e) => set("amount", e.target.value)} inputMode="decimal" placeholder="1250000" className="field font-mono" />
            </Field>
            <Field label="Валюта">
              <select value={draft.currency} onChange={(e) => set("currency", e.target.value)} className="field">
                {["USD", "CNY", "AED", "TRY", "EUR", "KZT"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Код ТН ВЭД">
              <input value={draft.hsCode} onChange={(e) => set("hsCode", e.target.value)} placeholder="8542 31 90" className="field font-mono" />
            </Field>
            <Field label="Номер инвойса">
              <input value={draft.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} placeholder="INV-2026-0001" className="field font-mono" />
            </Field>
            <Field label="Инвойс (файл)">
              <input type="file" onChange={(e) => set("fileName", e.target.files?.[0]?.name ?? "")} className="text-xs text-muted-foreground" />
            </Field>
          </div>
        )}

        {step === 3 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ["Направление", draft.direction === "import" ? "Импорт" : "Экспорт"],
              ["Предмет", draft.kind === "good" ? "Товар" : "Услуга"],
              ["Условие", draft.condition === "advance" ? "Аванс" : "Постоплата"],
              ["Организация", organizations.find((o) => o.id === draft.organizationId)?.name ?? ""],
              ["Контрагент", counterparties.find((c) => c.id === draft.counterpartyId)?.name ?? ""],
              ["Сумма", `${draft.amount || 0} ${draft.currency}`],
              ["ТН ВЭД", draft.hsCode || "—"],
              ["Инвойс", draft.invoiceNumber || "—"],
              ["Файл", draft.fileName || "не приложен"],
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
            <button type="button" onClick={() => setStep(step + 1)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Далее
            </button>
          ) : (
            <button type="button" onClick={submit} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
              Создать черновик
            </button>
          )}
        </div>
      </div>
    </DemoAppShell>
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
