/** Repeatable bank rows for counterparty create/edit. */
export type BankDraftRow = {
  name: string;
  swift: string;
  account: string;
};

type Props = {
  rows: BankDraftRow[];
  onChange: (rows: BankDraftRow[]) => void;
  disabled?: boolean;
};

export function emptyBankRow(): BankDraftRow {
  return { name: "", swift: "", account: "" };
}

export function BanksEditor({ rows, onChange, disabled }: Props) {
  function update(index: number, patch: Partial<BankDraftRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-2" data-testid="banks-editor">
      <div className="flex items-center justify-between gap-2">
        <span className="label-caps">Банки</span>
        <button
          type="button"
          disabled={disabled}
          className="text-xs font-semibold text-accent hover:underline"
          onClick={() => onChange([...rows, emptyBankRow()])}
        >
          + Банк
        </button>
      </div>
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">Можно добавить позже в справочнике.</p>
      )}
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-3">
          <input
            value={row.name}
            disabled={disabled}
            onChange={(e) => update(index, { name: e.target.value })}
            placeholder="Название банка"
            className="field"
          />
          <input
            value={row.swift}
            disabled={disabled}
            onChange={(e) => update(index, { swift: e.target.value })}
            placeholder="SWIFT"
            className="field font-mono"
          />
          <div className="flex gap-2">
            <input
              value={row.account}
              disabled={disabled}
              onChange={(e) => update(index, { account: e.target.value })}
              placeholder="Счёт (опц.)"
              className="field font-mono flex-1"
            />
            <button
              type="button"
              disabled={disabled}
              className="rounded-md px-2 text-xs font-semibold text-destructive hover:bg-destructive-soft"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              aria-label="Удалить банк"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Serialize UI bank rows to core Counterparty.Banks JSON shape. */
export function banksDraftToPayload(rows: BankDraftRow[]): Array<{
  uuid: string;
  name: string;
  swift?: string;
  accounts: Array<{ uuid: string; number?: string }>;
}> {
  return rows
    .map((row) => ({
      name: row.name.trim(),
      swift: row.swift.trim(),
      account: row.account.trim(),
    }))
    .filter((row) => row.name || row.swift || row.account)
    .map((row, i) => ({
      uuid: `bank-${i + 1}`,
      name: row.name || `Bank ${i + 1}`,
      ...(row.swift ? { swift: row.swift } : {}),
      accounts: row.account
        ? [{ uuid: `acc-${i + 1}`, number: row.account }]
        : [],
    }));
}
