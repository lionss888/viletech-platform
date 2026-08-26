import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/ved/AppShell";
import { ApiError } from "@/lib/api/client";
import { createForm } from "@/lib/api/forms";

export const Route = createFileRoute("/forms/new")({
  head: () => ({
    meta: [{ title: "Новая заявка — Viletech ВЭД" }],
  }),
  component: NewFormPage,
});

function NewFormPage() {
  const navigate = useNavigate();
  const [direction, setDirection] = useState("import");
  const [kind, setKind] = useState("good");
  const [amount, setAmount] = useState("1000");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = amount.replace(/\s/g, "").replace(",", ".");
    if (!normalized || Number.isNaN(Number.parseFloat(normalized))) {
      setError("Укажите корректную сумму");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const created = await createForm({
        direction,
        kind,
        invoice_amount: normalized,
        currency,
      });
      void navigate({ to: "/forms/$id", params: { id: created.id } });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Не удалось создать заявку");
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell title="Новая заявка" subtitle="POST /api/v1/forms">
      <form onSubmit={submit} className="panel max-w-lg space-y-4 p-5">
        <div>
          <label className="label-caps" htmlFor="direction">
            Направление
          </label>
          <select id="direction" className="field mt-1" value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="import">Импорт</option>
            <option value="export">Экспорт</option>
          </select>
        </div>
        <div>
          <label className="label-caps" htmlFor="kind">
            Предмет
          </label>
          <select id="kind" className="field mt-1" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="good">Товар</option>
            <option value="service">Услуга</option>
          </select>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label className="label-caps" htmlFor="amount">
              Сумма инвойса
            </label>
            <input
              id="amount"
              className="field mt-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              required
            />
          </div>
          <div>
            <label className="label-caps" htmlFor="currency">
              Валюта
            </label>
            <input
              id="currency"
              className="field mt-1 w-24"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
              required
            />
          </div>
        </div>
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          {pending ? "Создание…" : "Создать"}
        </button>
      </form>
    </AppShell>
  );
}
