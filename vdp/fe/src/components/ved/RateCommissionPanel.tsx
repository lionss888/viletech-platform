import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { setCommission, setRate } from "@/lib/api/forms";
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
};

/**
 * Manager panel on payment_sent for POSTPAY_RATE_ON_PP: set FX rate + commission (§10.3/10.5).
 */
export function RateCommissionPanel({
  formId,
  canEdit,
  rate,
  commission,
  invoiceAmount,
  currency,
}: Props) {
  const qc = useQueryClient();
  const [rateValue, setRateValue] = useState(rate?.value ?? "");
  const [rateCurrency, setRateCurrency] = useState(rate?.currency || currency || "USD");
  const [rewardMode, setRewardMode] = useState<RewardMode>(
    (commission?.rewardMode as RewardMode) || "percent",
  );
  const [feePercent, setFeePercent] = useState(commission?.feePercent ?? "");
  const [feeFix, setFeeFix] = useState(commission?.feeFix ?? commission?.feeAmount ?? "");
  const [feeCurrency, setFeeCurrency] = useState(commission?.feeCurrency || currency || "USD");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      void qc.invalidateQueries({ queryKey: ["form", formId] });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Не удалось сохранить курс и комиссию");
    },
  });

  const hasRate = Boolean(rate?.value?.trim());
  const canSubmit =
    rateValue.trim().length > 0 &&
    (rewardMode === "fixed"
      ? feeFix.trim().length > 0
      : rewardMode === "percent"
        ? feePercent.trim().length > 0
        : feePercent.trim().length > 0 && feeFix.trim().length > 0);

  return (
    <div className="panel p-4" data-testid="rate-commission-panel">
      <p className="label-caps">Курс и вознаграждение</p>
      <p className="mt-1 text-xs text-muted-foreground">
        После ПП зафиксируйте курс и режим вознаграждения — затем сформируйте доп. поручение.
        {invoiceAmount ? ` Инвойс: ${invoiceAmount} ${currency}.` : null}
      </p>

      {(hasRate || commission?.feeAmount) && (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {hasRate && (
            <div>
              <dt className="label-caps">Текущий курс</dt>
              <dd className="font-mono">
                {rate?.value} {rate?.currency || currency}
                {rate?.source ? ` · ${rate.source}` : ""}
              </dd>
            </div>
          )}
          {commission?.rewardMode && (
            <div>
              <dt className="label-caps">Режим</dt>
              <dd>
                {REWARD_MODE_LABEL[commission.rewardMode as RewardMode] ?? commission.rewardMode}
              </dd>
            </div>
          )}
          {commission?.feeAmount && (
            <div>
              <dt className="label-caps">Вознаграждение</dt>
              <dd className="font-mono">
                {commission.feeAmount} {commission.feeCurrency || currency}
                {commission.feePercent ? ` (${commission.feePercent}%)` : ""}
                {commission.feeFix ? ` + фикс ${commission.feeFix}` : ""}
              </dd>
            </div>
          )}
        </dl>
      )}

      {canEdit && (
        <div className="mt-4 space-y-3" data-testid="rate-commission-edit">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-muted-foreground">
              Курс
              <input
                className="field mt-1 w-28"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                placeholder="95.5"
                data-testid="rate-value"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Валюта курса
              <input
                className="field mt-1 w-20"
                value={rateCurrency}
                onChange={(e) => setRateCurrency(e.target.value.toUpperCase())}
                data-testid="rate-currency"
              />
            </label>
          </div>

          <label className="block text-xs text-muted-foreground">
            Режим вознаграждения
            <select
              className="field mt-1"
              value={rewardMode}
              onChange={(e) => setRewardMode(e.target.value as RewardMode)}
              data-testid="reward-mode"
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
              <label className="text-xs text-muted-foreground">
                Процент
                <input
                  className="field mt-1 w-24"
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  placeholder="1.5"
                  data-testid="fee-percent"
                />
              </label>
            )}
            {(rewardMode === "fixed" || rewardMode === "percent_plus_fixed") && (
              <label className="text-xs text-muted-foreground">
                Фикс
                <input
                  className="field mt-1 w-28"
                  value={feeFix}
                  onChange={(e) => setFeeFix(e.target.value)}
                  placeholder="100"
                  data-testid="fee-fix"
                />
              </label>
            )}
            <label className="text-xs text-muted-foreground">
              Валюта комиссии
              <input
                className="field mt-1 w-20"
                value={feeCurrency}
                onChange={(e) => setFeeCurrency(e.target.value.toUpperCase())}
                data-testid="fee-currency"
              />
            </label>
          </div>

          <button
            type="button"
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
            disabled={!canSubmit || save.isPending}
            onClick={() => save.mutate()}
            data-testid="save-rate-commission"
          >
            {save.isPending ? "Сохранение…" : "Сохранить курс и комиссию"}
          </button>
          {ack ? (
            <p className="text-xs text-accent" data-testid="rate-commission-ack">
              Сохранено — можно сформировать доп. поручение.
            </p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      )}

      {!canEdit && !hasRate && (
        <p className="mt-3 text-xs text-muted-foreground">
          Курс ещё не задан. Менеджер фиксирует курс и вознаграждение после ПП.
        </p>
      )}
    </div>
  );
}
