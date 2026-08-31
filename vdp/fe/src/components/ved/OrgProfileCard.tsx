import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { patchOrganizationProfile } from "@/lib/api/catalog-mutations";
import type { Organization } from "@/lib/ved/types";

const BUSINESS_FORMS = ["ООО", "ОАО", "ПАО", "ИП", "АО", "ОсОО", "ТОО", "ФЗКО"] as const;

const SIGNER_POSITIONS: { value: string; label: string }[] = [
  { value: "general_director", label: "Генеральный директор" },
  { value: "executive_director", label: "Исполнительный директор" },
  { value: "managing_director", label: "Управляющий директор" },
  { value: "finance_director", label: "Финансовый директор" },
  { value: "chief_accountant", label: "Главный бухгалтер" },
  { value: "other", label: "Другое" },
];

type OrgProfileCardProps = {
  org: Organization;
};

/** Org card for generated PDFs — phone/email/signer ≠ Account login. */
export function OrgProfileCard({ org }: OrgProfileCardProps) {
  const queryClient = useQueryClient();
  const frozen = org.fieldsFrozen ?? false;
  const [draft, setDraft] = useState({
    businessForm: org.businessForm ?? "",
    phone: org.phone ?? "",
    email: org.email ?? "",
    signerName: org.signerName ?? "",
    signerPosition: org.signerPosition ?? "",
    signerOtherPosition: org.signerOtherPosition ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      patchOrganizationProfile(org.id, {
        business_form: draft.businessForm,
        phone: draft.phone,
        email: draft.email,
        signer_name: draft.signerName,
        signer_position: draft.signerPosition,
        signer_other_position: draft.signerPosition === "other" ? draft.signerOtherPosition : "",
      }),
    onSuccess: async () => {
      setSaved(true);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    },
  });

  return (
    <div className="panel p-4">
      <p className="label-caps">Карточка организации</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Контакты и подписант для генерируемых документов. Не путать с e-mail входа в аккаунт.
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="label-caps">Наименование</dt>
          <dd className="text-sm font-semibold">{org.name}</dd>
        </div>
        <div>
          <dt className="label-caps">ИНН</dt>
          <dd className="font-mono text-sm">{org.inn}</dd>
        </div>
      </dl>
      {frozen && (
        <p className="mt-3 rounded-md bg-wait-soft px-2 py-1.5 text-xs text-wait">
          Реквизиты заморожены после одобления ICO — редактирование недоступно.
        </p>
      )}
      {error && <p className="mt-3 rounded-md bg-destructive-soft px-2 py-1.5 text-xs text-destructive">{error}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Форма бизнеса">
          <select
            disabled={frozen || mutation.isPending}
            value={draft.businessForm}
            onChange={(e) => setDraft((d) => ({ ...d, businessForm: e.target.value }))}
            className="field"
          >
            <option value="">—</option>
            {BUSINESS_FORMS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Телефон организации">
          <input
            disabled={frozen || mutation.isPending}
            value={draft.phone}
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
            className="field"
            placeholder="+7 …"
          />
        </Field>
        <Field label="E-mail организации">
          <input
            disabled={frozen || mutation.isPending}
            type="email"
            value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            className="field"
            placeholder="org@company.ru"
          />
        </Field>
        <Field label="ФИО подписанта">
          <input
            disabled={frozen || mutation.isPending}
            value={draft.signerName}
            onChange={(e) => setDraft((d) => ({ ...d, signerName: e.target.value }))}
            className="field"
          />
        </Field>
        <Field label="Должность подписанта">
          <select
            disabled={frozen || mutation.isPending}
            value={draft.signerPosition}
            onChange={(e) => setDraft((d) => ({ ...d, signerPosition: e.target.value }))}
            className="field"
          >
            <option value="">—</option>
            {SIGNER_POSITIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        {draft.signerPosition === "other" && (
          <Field label="Другая должность">
            <input
              disabled={frozen || mutation.isPending}
              value={draft.signerOtherPosition}
              onChange={(e) => setDraft((d) => ({ ...d, signerOtherPosition: e.target.value }))}
              className="field"
            />
          </Field>
        )}
      </div>
      {!frozen && (
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {mutation.isPending ? "Сохранение…" : saved ? "Сохранено" : "Сохранить карточку"}
        </button>
      )}
    </div>
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
