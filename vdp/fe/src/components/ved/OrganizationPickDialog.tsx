import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Modal, ModalButton } from "@/components/ved/Modal";
import { AddressAutocomplete } from "@/components/ved/AddressAutocomplete";
import {
  createOrganization,
  patchOrganizationProfile,
} from "@/lib/api/catalog-mutations";
import { nestFormPrefixForRole, patchForm } from "@/lib/api/forms";
import { ApiError } from "@/lib/api/client";
import type { Organization } from "@/lib/ved/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, selected/created org is patched onto the form. */
  formId?: string;
  role?: string | undefined;
  organizations: Organization[];
  selectedId?: string | undefined;
  /** Wizard / local pick without PATCH. */
  onSelect?: (organizationId: string) => void;
};

/** Pick or create client organization without leaving the form card / wizard. */
export function OrganizationPickDialog({
  open,
  onOpenChange,
  formId,
  role,
  organizations,
  selectedId,
  onSelect,
}: Props) {
  const queryClient = useQueryClient();
  const createFormRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInn, setNewInn] = useState("");
  const [newAddress, setNewAddress] = useState("");
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
    if (!q) return organizations;
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        (org.inn ?? "").toLowerCase().includes(q),
    );
  }, [organizations, query]);

  /** Адреса уже заведённых организаций дополняют справочник подсказок. */
  const knownAddresses = useMemo(
    () => organizations.map((org) => org.legalAddress).filter(Boolean),
    [organizations],
  );


  async function finish(organizationId: string) {
    if (formId) {
      await patchForm(formId, nestFormPrefixForRole(role), { organization_id: organizationId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["form", formId] }),
        queryClient.invalidateQueries({ queryKey: ["forms"] }),
        queryClient.refetchQueries({ queryKey: ["form", formId] }),
      ]);
    }
    await queryClient.invalidateQueries({ queryKey: ["organizations"] });
    await queryClient.refetchQueries({ queryKey: ["organizations"] });
    onSelect?.(organizationId);
    onOpenChange(false);
  }

  async function assign(organizationId: string) {
    setBusy(true);
    setError(null);
    try {
      await finish(organizationId);
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

  async function createAndAssign(fromForm?: HTMLFormElement | null) {
    const fd = fromForm ? new FormData(fromForm) : null;
    const name = String(fd?.get("name") ?? newName).trim();
    const inn = String(fd?.get("inn") ?? newInn).trim();
    const address = String(fd?.get("legal_address") ?? newAddress).trim();
    const country = String(fd?.get("country") ?? newCountry).trim();
    if (!name || !inn) {
      setError("Укажите наименование и ИНН");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createOrganization({
        name,
        inn,
        ...(country ? { country } : {}),
        ...(address ? { legal_address: address } : {}),
      });
      if (!created?.id) {
        throw new Error("Организация создана без id");
      }
      if (address) {
        try {
          await patchOrganizationProfile(created.id, { legal_address: address });
        } catch {
          /* create may already persist legal_address */
        }
      }
      await finish(created.id);
      setCreating(false);
      setNewName("");
      setNewInn("");
      setNewAddress("");
      setNewCountry("");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Не удалось создать организацию",
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
      description="Выберите из списка или создайте новую — останетесь в текущем сценарии."
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
              {busy ? "Сохраняем…" : formId ? "Привязать к заявке" : "Выбрать"}
            </ModalButton>
          )}
          {creating && (
            <ModalButton
              disabled={busy}
              data-testid="org-create-submit"
              onClick={() => void createAndAssign(createFormRef.current)}
            >
              {busy ? "Создаём…" : "Создать и выбрать"}
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
            placeholder="Поиск по названию или ИНН"
            className="field w-full"
            autoFocus
            data-testid="org-pick-search"
          />
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            {rows.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                {organizations.length === 0
                  ? "Нет доступных организаций — создайте первую."
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
          <button
            type="button"
            className="text-sm font-semibold text-accent hover:underline"
            data-testid="org-pick-create"
            onClick={() => {
              setCreating(true);
              setError(null);
            }}
          >
            Создать организацию
          </button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <form
            ref={createFormRef}
            className="space-y-3"
            data-testid="org-create-form"
            onSubmit={(e) => {
              e.preventDefault();
              void createAndAssign(e.currentTarget);
            }}
          >
            <label className="block">
              <span className="label-caps">Наименование</span>
              <input
                name="name"
                defaultValue=""
                className="field mt-1 w-full"
                autoFocus
                data-testid="org-create-name"
              />
            </label>
            <label className="block">
              <span className="label-caps">ИНН</span>
              <input
                name="inn"
                defaultValue=""
                className="field mt-1 w-full font-mono"
                data-testid="org-create-inn"
              />
            </label>
            <div className="block">
              <span className="label-caps">Юридический адрес</span>
              <AddressAutocomplete
                name="legal_address"
                value={newAddress}
                onChange={setNewAddress}
                testId="org-create-address"
                knownAddresses={knownAddresses}
              />
            </div>
            <label className="block">
              <span className="label-caps">Страна (необязательно)</span>
              <input
                name="country"
                defaultValue=""
                className="field mt-1 w-full"
                placeholder="RU"
                data-testid="org-create-country"
              />
            </label>
          </form>
          <button
            type="button"
            className="text-sm font-semibold text-muted-foreground hover:underline"
            onClick={() => setCreating(false)}
          >
            ← К списку
          </button>
          {error && (
            <p className="text-xs text-destructive" data-testid="org-create-error">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
