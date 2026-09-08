import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Modal, ModalButton } from "@/components/ved/Modal";
import { createCounterparty } from "@/lib/api/catalog-mutations";
import { nestFormPrefixForRole, patchForm } from "@/lib/api/forms";
import { ApiError } from "@/lib/api/client";
import type { Counterparty } from "@/lib/ved/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  role: string | undefined;
  counterparties: Counterparty[];
  selectedId?: string | undefined;
};

/**
 * Pick or create a counterparty without leaving the form card.
 */
export function CounterpartyPickDialog({
  open,
  onOpenChange,
  formId,
  role,
  counterparties,
  selectedId,
}: Props) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPickedId(selectedId && selectedId !== "—" ? selectedId : "");
    setQuery("");
    setCreating(false);
    setError(null);
  }, [open, selectedId]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return counterparties;
    return counterparties.filter(
      (cp) =>
        cp.name.toLowerCase().includes(q) ||
        (cp.country ?? "").toLowerCase().includes(q) ||
        (cp.countryCode ?? "").toLowerCase().includes(q),
    );
  }, [counterparties, query]);

  async function assign(counterpartyId: string) {
    setBusy(true);
    setError(null);
    try {
      await patchForm(formId, nestFormPrefixForRole(role), { counterparty_id: counterpartyId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["form", formId] }),
        queryClient.invalidateQueries({ queryKey: ["forms"] }),
        queryClient.invalidateQueries({ queryKey: ["counterparties"] }),
      ]);
      onOpenChange(false);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Не удалось привязать контрагента",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createAndAssign() {
    const name = newName.trim();
    if (!name) {
      setError("Укажите наименование");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createCounterparty({
        name,
        country: newCountry.trim() || undefined,
      });
      await patchForm(formId, nestFormPrefixForRole(role), { counterparty_id: created.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["form", formId] }),
        queryClient.invalidateQueries({ queryKey: ["forms"] }),
        queryClient.invalidateQueries({ queryKey: ["counterparties"] }),
      ]);
      setCreating(false);
      setNewName("");
      setNewCountry("");
      onOpenChange(false);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Не удалось создать контрагента",
      );
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
      title="Контрагент заявки"
      description="Выберите из справочника или создайте нового — останетесь на карточке заявки."
      wide
      footer={
        <>
          <ModalButton variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Отмена
          </ModalButton>
          {!creating && (
            <ModalButton
              disabled={busy || !pickedId}
              onClick={() => {
                if (pickedId) void assign(pickedId);
              }}
            >
              {busy ? "Сохраняем…" : "Привязать к заявке"}
            </ModalButton>
          )}
          {creating && (
            <ModalButton disabled={busy} onClick={() => void createAndAssign()}>
              {busy ? "Создаём…" : "Создать и привязать"}
            </ModalButton>
          )}
        </>
      }
    >
      {!creating ? (
        <div className="space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию или стране"
            className="field w-full"
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            {rows.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                {counterparties.length === 0
                  ? "Справочник пуст — создайте контрагента."
                  : "Ничего не найдено."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((cp) => (
                  <li key={cp.id}>
                    <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-muted/60">
                      <input
                        type="radio"
                        name="counterparty-pick"
                        className="mt-1"
                        checked={pickedId === cp.id}
                        onChange={() => setPickedId(cp.id)}
                      />
                      <span>
                        <span className="font-medium">{cp.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {cp.country ?? "—"}
                          {cp.bank && cp.bank !== "—" ? ` · ${cp.bank}` : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-accent hover:underline"
            onClick={() => {
              setCreating(true);
              setError(null);
            }}
          >
            Создать нового контрагента
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-muted-foreground">
            Наименование
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="field mt-1 w-full"
              placeholder="Shenzhen Kaiyuan Electronics"
              autoFocus
            />
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Страна
            <input
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              className="field mt-1 w-full"
              placeholder="Китай"
            />
          </label>
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() => {
              setCreating(false);
              setError(null);
            }}
          >
            Назад к списку
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </Modal>
  );
}
