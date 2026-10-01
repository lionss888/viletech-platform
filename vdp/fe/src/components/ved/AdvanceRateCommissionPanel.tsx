import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { setCommission, setRate } from "@/lib/api/forms";
import {
  currencyOptionsForSelect,
  isRateCommissionFormVisible,
  type RateCurrencyOption,
} from "@/lib/ved/rate-commission-ui";
import type { FormCommission, FormRate, RewardMode } from "@/lib/ved/types";

const REWARD_MODE_LABEL: Record<RewardMode, string> = {
  fixed: "Фиксированная сумма",
  percent: "Процент от суммы",
  percent_plus_fixed: "Процент + фикс",
};

type Props = {
  formId: string;
  canEdit: boolean;
  rate?: FormRate;
  commission?: FormCommission;
  invoiceAmount?: string;
  currency: string;
  currencies?: readonly RateCurrencyOption[];
};

/**
 * Manager panel before primary signing order on import advance (§3.1):
 * fix FX rate + commission, then form the order.
 * Default view is a summary widget; fields open via «Редактировать».
 */
export function AdvanceRateCommissionPanel({
  formId,
  canEdit,
  rate,
  commission,
  invoiceAmount,
  currency,
  currencies = [],
}: Props) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [rateValue, setRateValue] = useState(rate?.value ?? "");
  const [rateCurrency, setRateCurrency] = useState(rate?.currency || currency || "USD");
  const [rewardMode, setRewardMode] = useState<RewardMode>(
    (commission?.rewardMode as RewardMode) || "fixed",
  );
  const [feePercent, setFeePercent] = useState(commission?.feePercent ?? "");
  const [feeFix, setFeeFix] = useState(commission?.feeFix ?? commission?.feeAmount ?? "");
  const [feeCurrency, setFeeCurrency] = useState(commission?.feeCurrency || currency || "USD");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rateCurrencyOptions = currencyOptionsForSelect(currencies, rateCurrency);
  const feeCurrencyOptions = currencyOptionsForSelect(currencies, feeCurrency);
  const save = useMutation({
    mutationFn: async () => {
      await setRate(formId, {
        value: rateValue.trim(),
        currency: rateCurrency.trim() || "USD",
        source: "manual",
      });
      const commissionBody =
        rewardMode === "fixed"
          ? { reward_mode: rewardMode, fee_fix: feeFix.trim(), fee_currency: feeCurrency }
          : rewardMode === "percent"
            ? { reward_mode: rewardMode, fee_percent: feePercent.trim(), fee_currency: feeCurrency }
            : {
                reward_mode: rewardMode,
                fee_percent: feePercent.trim(),
                fee_fix: feeFix.trim(),
                fee_currency: feeCurrency,
              };
      await setCommission(formId, commissionBody);
    },
    onSuccess: () => {
      setAck(true);
      setError(null);
      setIsEditing(false);
      void qc.invalidateQueries({ queryKey: ["form", formId] });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Не удалось сохранить курс и комиссию");
    },
  });
  const hasRate = Boolean(rate?.value?.trim());
  const hasCommission = Boolean(
    commission?.feeAmount || commission?.feePercent || commission?.feeFix || commission?.rewardMode,
  );
  const canSubmit =
    rateValue.trim().length > 0 &&
    (rewardMode === "fixed"
      ? feeFix.trim().length > 0
      : rewardMode === "percent"
        ? feePercent.trim().length > 0
        : feePercent.trim().length > 0 && feeFix.trim().length > 0);
  const showForm = isRateCommissionFormVisible(canEdit, isEditing);
  return (
    <div className="panel p-4" data-testid="advance-rate-commission-panel">
      <p className="label-caps">Выбор курса и комиссии</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Зафиксируйте курс и режим вознаграждения до первичного поручения.
        {invoiceAmount ? ` Инвойс: ${invoiceAmount} ${currency}.` : null}
      </p>
      <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2" data-testid="advance-rate-commission-widget">
        {hasRate || hasCommission ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {hasRate ? (
              <div>
                <dt className="label-caps">Курс</dt>
                <dd className="font-mono" data-testid="form-rate-display">
                  {rate?.value} {rate?.currency || currency}
                  {rate?.source ? ` · ${rate.source}` : ""}
                </dd>
              </div>
            ) : null}
            {commission?.rewardMode ? (
              <div>
                <dt className="label-caps">Режим</dt>
                <dd>
                  {REWARD_MODE_LABEL[commission.rewardMode as RewardMode] ?? commission.rewardMode}
                </dd>
              </div>
            ) : null}
            {commission?.feePercent ? (
              <div>
                <dt className="label-caps">Процент</dt>
                <dd className="font-mono">{commission.feePercent}%</dd>
              </div>
            ) : null}
            {(commission?.feeAmount || commission?.feeFix) && (
              <div>
                <dt className="label-caps">Вознаграждение</dt>
                <dd className="font-mono">
                  {commission.feeAmount || commission.feeFix} {commission.feeCurrency || currency}
                  {commission.feeFix && commission.feeAmount && commission.feeFix !== commission.feeAmount
                    ? ` · фикс ${commission.feeFix}`
                    : ""}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Курс и вознаграждение ещё не заданы.</p>
        )}
        {canEdit && !showForm ? (
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-accent hover:underline"
            onClick={() => {
              setIsEditing(true);
              setAck(false);
            }}
            data-testid="advance-rate-commission-edit-open"
          >
            Редактировать
          </button>
        ) : null}
      </div>
      {showForm ? (
        <div className="mt-4 space-y-3" data-testid="advance-rate-commission-edit">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-muted-foreground" htmlFor="advance-rate-input">
              Курс FX
              <input
                id="advance-rate-input"
                className="field mt-1 w-28"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                placeholder="95.50"
                data-testid="advance-rate-input"
              />
            </label>
            <label className="text-xs text-muted-foreground" htmlFor="advance-rate-currency">
              Валюта курса
              <select
                id="advance-rate-currency"
                className="field mt-1 w-36"
                value={rateCurrency}
                onChange={(e) => setRateCurrency(e.target.value)}
                data-testid="advance-rate-currency"
              >
                {rateCurrencyOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} — {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs text-muted-foreground" htmlFor="advance-commission-mode-select">
            Режим комиссии
            <select
              id="advance-commission-mode-select"
              className="field mt-1"
              value={rewardMode}
              onChange={(e) => setRewardMode(e.target.value as RewardMode)}
              data-testid="advance-commission-mode-select"
            >
              {(Object.keys(REWARD_MODE_LABEL) as RewardMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {REWARD_MODE_LABEL[mode]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            {(rewardMode === "percent" || rewardMode === "percent_plus_fixed") && (
              <label className="text-xs text-muted-foreground" htmlFor="advance-fee-percent">
                Процент
                <input
                  id="advance-fee-percent"
                  className="field mt-1 w-24"
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  placeholder="1.5"
                  data-testid="advance-fee-percent"
                />
              </label>
            )}
            {(rewardMode === "fixed" || rewardMode === "percent_plus_fixed") && (
              <label className="text-xs text-muted-foreground" htmlFor="advance-commission-value-input">
                Значение комиссии
                <input
                  id="advance-commission-value-input"
                  className="field mt-1 w-28"
                  value={feeFix}
                  onChange={(e) => setFeeFix(e.target.value)}
                  placeholder="1000"
                  data-testid="advance-commission-value-input"
                />
              </label>
            )}
            <label className="text-xs text-muted-foreground" htmlFor="advance-fee-currency">
              Валюта комиссии
              <select
                id="advance-fee-currency"
                className="field mt-1 w-36"
                value={feeCurrency}
                onChange={(e) => setFeeCurrency(e.target.value)}
                data-testid="advance-fee-currency"
              >
                {feeCurrencyOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} — {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
              disabled={!canSubmit || save.isPending}
              onClick={() => save.mutate()}
              data-testid="set-advance-rate-button"
            >
              {save.isPending ? "Сохранение…" : "Зафиксировать условия"}
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              onClick={() => setIsEditing(false)}
              data-testid="advance-rate-commission-edit-cancel"
            >
              Отмена
            </button>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      ) : null}
      {ack && !showForm ? (
        <p className="mt-2 text-xs text-accent" data-testid="advance-rate-commission-ack">
          Условия зафиксированы — можно формировать первичное поручение.
        </p>
      ) : null}
      {!canEdit && !hasRate ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Курс ещё не задан. Менеджер фиксирует курс и вознаграждение до первичного поручения.
        </p>
      ) : null}
    </div>
  );
}
