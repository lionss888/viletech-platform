import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Modal, ModalButton } from "@/components/ved/Modal";
import { attachFormHsCodes, nestFormPrefixForRole, patchForm } from "@/lib/api/forms";
import { ApiError } from "@/lib/api/client";
import { usePlatformStore } from "@/lib/ved/platform-store";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  role: string | undefined;
  amountMinor: number;
  currency: string;
  hsCode: string;
};

/** Edit draft/correction params without leaving the form card. */
export function FormParamsEditDialog({
  open,
  onOpenChange,
  formId,
  role,
  amountMinor,
  currency,
  hsCode,
}: Props) {
  const queryClient = useQueryClient();
  const { currencies, hsCodes } = usePlatformStore();
  const [amount, setAmount] = useState("");
  const [cur, setCur] = useState(currency);
  const [hs, setHs] = useState(hsCode === "—" ? "" : hsCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount((amountMinor / 100).toString());
    setCur(currency || "USD");
    setHs(hsCode === "—" ? "" : hsCode);
    setError(null);
  }, [open, amountMinor, currency, hsCode]);

  async function save() {
    const value = Number(String(amount).replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Укажите сумму больше нуля");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await patchForm(formId, nestFormPrefixForRole(role), {
        invoice_amount: String(value),
        currency: cur,
      });
      if (hs.trim()) {
        await attachFormHsCodes(formId, [hs.trim()]);
      }
      await queryClient.invalidateQueries({ queryKey: ["form", formId] });
      await queryClient.invalidateQueries({ queryKey: ["forms"] });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
      title="Редактировать параметры"
      description="Сумма, валюта и код ТН ВЭД — без ухода с карточки заявки."
      footer={
        <>
          <ModalButton variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Отмена
          </ModalButton>
          <ModalButton
            disabled={busy}
            onClick={() => {
              void save();
            }}
          >
            {busy ? "Сохранение…" : "Сохранить"}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="label-caps">Сумма</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="field mt-1 font-mono"
            inputMode="decimal"
          />
        </label>
        <label className="block text-sm">
          <span className="label-caps">Валюта</span>
          <select value={cur} onChange={(e) => setCur(e.target.value)} className="field mt-1">
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="label-caps">Код ТН ВЭД</span>
          <select value={hs} onChange={(e) => setHs(e.target.value)} className="field mt-1">
            <option value="">Не выбран</option>
            {hsCodes.map((h) => (
              <option key={h.code} value={h.code}>
                {h.code} — {h.title}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}
