import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Modal, ModalButton } from "@/components/ved/Modal";
import { nestFormPrefixForRole, patchForm } from "@/lib/api/forms";
import { ApiError } from "@/lib/api/client";
import type { Organization } from "@/lib/ved/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  role: string | undefined;
  organizations: Organization[];
  selectedId?: string | undefined;
};

/** Pick client organization without leaving the form card. */
export function OrganizationPickDialog({
  open,
  onOpenChange,
  formId,
  role,
  organizations,
  selectedId,
}: Props) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPickedId(selectedId && selectedId !== "—" ? selectedId : "");
    setQuery("");
    setError(null);
  }, [open, selectedId]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        (org.inn ?? "").toLowerCase().includes(q),
    );
  }, [organizations, query]);

  async function assign(organizationId: string) {
    setBusy(true);
    setError(null);
    try {
      await patchForm(formId, nestFormPrefixForRole(role), { organization_id: organizationId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["form", formId] }),
        queryClient.invalidateQueries({ queryKey: ["forms"] }),
        queryClient.invalidateQueries({ queryKey: ["organizations"] }),
      ]);
      onOpenChange(false);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Не удалось сменить организацию",
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
      title="Организация клиента"
      description="Выберите организацию из доступного списка — останетесь на карточке заявки."
      wide
      footer={
        <>
          <ModalButton variant="quiet" disabled={busy} onClick={() => onOpenChange(false)}>
            Отмена
          </ModalButton>
          <ModalButton
            disabled={busy || !pickedId}
            onClick={() => {
              if (pickedId) void assign(pickedId);
            }}
          >
            {busy ? "Сохраняем…" : "Привязать к заявке"}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию или ИНН"
          className="field w-full"
          autoFocus
        />
        <div className="max-h-64 overflow-y-auto rounded-md border border-border">
          {rows.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              {organizations.length === 0
                ? "Нет доступных организаций."
                : "Ничего не найдено."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((org) => (
                <li key={org.id}>
                  <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-muted/60">
                    <input
                      type="radio"
                      name="organization-pick"
                      className="mt-1"
                      checked={pickedId === org.id}
                      onChange={() => setPickedId(org.id)}
                    />
                    <span>
                      <span className="font-medium">{org.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        ИНН {org.inn ?? "—"}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}
