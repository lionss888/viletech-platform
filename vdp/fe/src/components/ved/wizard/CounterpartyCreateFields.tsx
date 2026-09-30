export type CounterpartyCreateFieldsValue = {
  name?: string;
  country?: string;
  registrationNumber?: string;
  legalAddress?: string;
};

type Props = {
  value: CounterpartyCreateFieldsValue;
  onChange: (next: CounterpartyCreateFieldsValue) => void;
  disabled?: boolean;
  /** When false, hide name/country (dialog already has them). Default true. */
  showIdentity?: boolean;
};

/**
 * Optional counterparty registration fields for wizard / create dialog (§2).
 */
export function CounterpartyCreateFields({
  value,
  onChange,
  disabled = false,
  showIdentity = true,
}: Props) {
  return (
    <div className="space-y-3" data-testid="counterparty-create-fields">
      {showIdentity ? (
        <>
          <label className="block text-xs font-medium text-muted-foreground">
            Наименование
            <input
              data-testid="counterparty-name-input"
              value={value.name ?? ""}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              className="field mt-1 w-full"
              placeholder="Например, Acme Trading Ltd"
              disabled={disabled}
            />
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Страна
            <input
              data-testid="counterparty-country-input"
              value={value.country ?? ""}
              onChange={(e) => onChange({ ...value, country: e.target.value })}
              className="field mt-1 w-full"
              placeholder="Китай"
              disabled={disabled}
            />
          </label>
        </>
      ) : null}
      <label className="block text-xs font-medium text-muted-foreground">
        Регистрационный номер
        <span className="ml-1 font-normal text-muted-foreground/80">(необязательно)</span>
        <input
          data-testid="counterparty-registration-number-input"
          value={value.registrationNumber ?? ""}
          onChange={(e) => onChange({ ...value, registrationNumber: e.target.value })}
          className="field mt-1 w-full"
          placeholder="ОГРН / ИНН / рег. номер"
          disabled={disabled}
        />
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        Юридический адрес
        <span className="ml-1 font-normal text-muted-foreground/80">(необязательно)</span>
        <textarea
          data-testid="counterparty-legal-address-input"
          value={value.legalAddress ?? ""}
          onChange={(e) => onChange({ ...value, legalAddress: e.target.value })}
          className="field mt-1 w-full"
          placeholder="Полный адрес регистрации"
          rows={3}
          disabled={disabled}
        />
      </label>
    </div>
  );
}
