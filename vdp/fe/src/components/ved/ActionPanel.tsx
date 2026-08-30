import { useMemo, useState } from "react";

import { Modal, ModalButton } from "@/components/ved/Modal";
import {
  ECO_ACTION_PANEL,
  MANAGER_CONTRACT_ACTION_PANEL,
  MANAGER_PAYMENT_ACTION_PANEL,
  MANAGER_REFUND_PANEL,
  PROVIDER_ACTION_PANEL,
  managerCloseReasonFields,
  managerContractReasonFields,
  managerPaymentReasonFields,
  providerReasonFields,
} from "@/lib/ved/copy";
import { actionsFor } from "@/lib/ved/actions";
import type { ContractType } from "@/lib/api/contract";
import { marksFor } from "@/lib/ved/compliance";
import { blocksPaymentStartWithoutProvider, PAYMENT_START_PROVIDER_LOCK } from "@/lib/ved/manager-payment";
import { usePlatformStore } from "@/lib/ved/platform-store";
import type { ActionTone, FormAction, PaymentForm } from "@/lib/ved/types";
import { cn } from "@/lib/utils";

const TONE: Record<ActionTone, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  accent: "bg-accent text-accent-foreground hover:opacity-90",
  quiet: "bg-card text-foreground shadow-[0_0_0_1px_var(--input)] hover:bg-muted",
  danger: "bg-destructive-soft text-destructive hover:bg-destructive hover:text-destructive-foreground",
};

type ActionExtraPayload = {
  reason?: string;
  fileName?: string;
  mark?: string;
  file?: File;
  providerId?: string;
  agentId?: string;
  deadline?: string;
  contractType?: ContractType;
  refundAmount?: string;
  refundCurrency?: string;
  confirmationHash?: string;
};

export function ActionPanel({
  form,
  title,
  lockNote,
  lockAcceptNote,
  note,
}: {
  form: PaymentForm;
  title?: string | undefined;
  note?: string | undefined;
  lockNote?: string | undefined;
  /** Soft lock: disables accept CTAs; start/take-in-work stays available. */
  lockAcceptNote?: string | undefined;
}) {
  const { session, applyAction, complianceTools, providers, paymentAgents, users } = usePlatformStore();
  const [pending, setPending] = useState<FormAction | null>(null);
  const [reason, setReason] = useState("");
  const [mark, setMark] = useState("");
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [providerId, setProviderId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [contractType, setContractType] = useState<ContractType>("agency");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundCurrency, setRefundCurrency] = useState(form.currency || "USD");
  const [confirmationHash, setConfirmationHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executionProviders = users.filter((u) => u.role === "provider" && !u.blocked);
  const providerOptions =
    executionProviders.length > 0
      ? executionProviders.map((u) => ({ id: u.id, name: u.name, country: u.organization ?? "—" }))
      : providers;

  const role = session?.role ?? "user";
  const isEco = role === "compliance_officer";
  const isManager = role === "manager";
  const isProvider = role === "provider";
  const panelCopy = isEco ? ECO_ACTION_PANEL : null;
  const managerPaymentPanel = isManager ? MANAGER_PAYMENT_ACTION_PANEL : null;
  const managerContractPanel = isManager ? MANAGER_CONTRACT_ACTION_PANEL : null;
  const providerPanel = isProvider ? PROVIDER_ACTION_PANEL : null;
  const actions = actionsFor(role, form.status);
  const panelTitle = title ?? "Доступные действия";
  const { operationalActions, rootCancelAction } = useMemo(() => {
    if (role !== "root") {
      return { operationalActions: actions, rootCancelAction: null as FormAction | null };
    }
    const rootCancelAction = actions.find((a) => a.id === "root_cancel_form") ?? null;
    const operationalActions = actions.filter((a) => a.id !== "root_cancel_form");
    return { operationalActions, rootCancelAction };
  }, [actions, role]);
  const marks = marksFor(complianceTools, "form");

  if (actions.length === 0) {
    return (
      <div className="panel p-4">
        <p className="label-caps">{panelTitle}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {panelCopy?.empty ??
            "На этом статусе для вашей роли действий нет — заявка у другого участника процесса."}
        </p>
      </div>
    );
  }

  function close() {
    setPending(null);
    setReason("");
    setMark("");
    setFileName("");
    setFile(null);
    setProviderId("");
    setAgentId("");
    setDeadline("");
    setContractType("agency");
    setRefundAmount("");
    setRefundCurrency(form.currency || "USD");
    setConfirmationHash("");
    setError(null);
    setBusy(false);
  }

  function needsModal(action: FormAction) {
    return (
      action.requiresReason ||
      action.requiresFile ||
      action.requiresMark ||
      action.confirm ||
      action.id === "mgr_assign_provider" ||
      action.id === "mgr_assign_agent" ||
      action.id === "mgr_assign_deadline" ||
      action.id === "mgr_contract_attach" ||
      action.id === "mgr_refund_init" ||
      action.id === "prov_attach_proof"
    );
  }

  function start(action: FormAction) {
    if (needsModal(action)) {
      setReason("");
      setMark("");
      setFileName("");
      setFile(null);
      setProviderId(providerOptions[0]?.id ?? "");
      setAgentId(paymentAgents[0]?.id ?? "");
      setDeadline("");
      setContractType("agency");
      setRefundAmount(form.amountMinor ? String(form.amountMinor / 100) : "");
      setRefundCurrency(form.currency || "USD");
      setConfirmationHash("");
      setError(null);
      setPending(action);
      return;
    }
    void runAction(action, {});
  }

  async function runAction(action: FormAction, extra: ActionExtraPayload) {
    setBusy(true);
    setError(null);
    try {
      await Promise.resolve(applyAction(form.id, action, extra));
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить действие");
      setBusy(false);
    }
  }

  function confirm() {
    if (!pending) return;
    void runAction(pending, {
      reason,
      fileName,
      mark,
      file: file ?? undefined,
      providerId,
      agentId,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      contractType,
      refundAmount,
      refundCurrency,
      confirmationHash,
    });
  }

  const blocked =
    !!pending &&
    (busy ||
      (pending.id === "mgr_assign_provider" && !providerId) ||
      (pending.id === "mgr_assign_agent" && !agentId) ||
      (pending.id === "mgr_assign_deadline" && !deadline) ||
      (pending.id === "mgr_refund_init" && (!refundAmount || Number(refundAmount) <= 0)) ||
      (pending.id === "prov_attach_proof" && !file && !confirmationHash.trim()) ||
      ((pending.requiresReason ?? false) && reason.trim().length < 3) ||
      ((pending.requiresFile ?? false) && !file) ||
      ((pending.requiresMark ?? false) && !mark));

  const isApproval = (action: FormAction) => action.id.includes("accept") || action.id.includes("start");
  const isAcceptOnly = (action: FormAction) => action.id.includes("accept");

  function renderActionButton(action: FormAction) {
    const hardDisabled = !!lockNote && isApproval(action);
    const softDisabled = !lockNote && !!lockAcceptNote && isAcceptOnly(action);
    const providerGate = blocksPaymentStartWithoutProvider(form.status, action.id, form.providerId);
    const disabled = hardDisabled || softDisabled || providerGate || busy;
    const tip = hardDisabled
      ? lockNote
      : softDisabled
        ? lockAcceptNote
        : providerGate
          ? PAYMENT_START_PROVIDER_LOCK
          : action.label;
    return (
      <button
        key={action.id}
        type="button"
        disabled={disabled || busy}
        title={tip}
        onClick={() => start(action)}
        className={cn(
          "w-full rounded-md px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          TONE[action.tone],
        )}
      >
        {action.label}
      </button>
    );
  }

  return (
    <div className="panel p-4">
      <p className="label-caps">{title}</p>
      {role === "root" && operationalActions.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Доступны действия всех ролей на текущем статусе.</p>
      )}
      {lockNote && <p className="mt-2 rounded-md bg-destructive-soft px-2 py-1.5 text-xs text-destructive">{lockNote}</p>}
      {!lockNote && lockAcceptNote && (
        <p className="mt-2 rounded-md bg-wait-soft px-2 py-1.5 text-xs text-wait">{lockAcceptNote}</p>
      )}
      {!lockNote && !lockAcceptNote && note && (
        <p className="mt-2 rounded-md bg-wait-soft px-2 py-1.5 text-xs text-wait">{note}</p>
      )}
      {form.status === "payment_received" && !form.providerId && (
        <p className="mt-2 rounded-md bg-wait-soft px-2 py-1.5 text-xs text-wait">{PAYMENT_START_PROVIDER_LOCK}</p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {operationalActions.map(renderActionButton)}
      </div>
      {rootCancelAction && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="label-caps text-destructive">Администрирование</p>
          <div className="mt-2">{renderActionButton(rootCancelAction)}</div>
        </div>
      )}

      <Modal
        open={pending !== null}
        onOpenChange={(v) => !v && close()}
        title={pending?.label ?? ""}
        description={
          pending?.confirm ??
          (isEco && pending?.id === "eco_form_reject"
            ? panelCopy!.rejectConfirm(form.number)
            : `Заявка ${form.number}. Подтвердите действие.`)
        }
        footer={
          <>
            <ModalButton variant="quiet" onClick={close} disabled={busy}>
              Отмена
            </ModalButton>
            <ModalButton
              variant={pending?.tone === "danger" ? "danger" : "primary"}
              onClick={confirm}
              disabled={blocked}
            >
              {busy ? "Выполнение…" : "Подтвердить"}
            </ModalButton>
          </>
        }
      >
        {error && <p className="mb-3 rounded-md bg-destructive-soft px-2 py-1.5 text-xs text-destructive">{error}</p>}
        {pending?.id === "mgr_assign_provider" && (
          <label className="block">
            <span className="label-caps">{managerPaymentPanel?.providerLabel ?? "Провайдер исполнения"}</span>
            <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="field mt-1">
              <option value="">{managerPaymentPanel?.providerPlaceholder ?? "Выберите провайдера"}</option>
              {providerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.country}
                </option>
              ))}
            </select>
          </label>
        )}
        {pending?.id === "mgr_assign_agent" && (
          <label className="block">
            <span className="label-caps">{managerContractPanel?.assignAgentLabel ?? "Платёжный агент"}</span>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="field mt-1">
              <option value="">{managerContractPanel?.assignAgentPlaceholder ?? "Выберите агента"}</option>
              {paymentAgents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.country}
                </option>
              ))}
            </select>
          </label>
        )}
        {pending?.id === "mgr_assign_deadline" && (
          <label className="block">
            <span className="label-caps">{managerPaymentPanel?.deadlineLabel ?? "Срок исполнения"}</span>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="field mt-1" />
          </label>
        )}
        {pending?.id === "mgr_contract_attach" && (
          <label className="block">
            <span className="label-caps">{managerContractPanel?.contractAttachLabel ?? "Тип договора"}</span>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value as ContractType)}
              className="field mt-1"
            >
              <option value="agency">Агентский</option>
              <option value="subagency">Субагентский</option>
              <option value="services">Оказание услуг</option>
            </select>
          </label>
        )}
        {pending?.id === "mgr_refund_init" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label-caps">{managerPaymentPanel?.refundAmountLabel ?? "Сумма возврата"}</span>
              <input
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                inputMode="decimal"
                className="field mt-1 font-mono"
              />
            </label>
            <label className="block">
              <span className="label-caps">{managerPaymentPanel?.refundCurrencyLabel ?? "Валюта"}</span>
              <input value={refundCurrency} onChange={(e) => setRefundCurrency(e.target.value)} className="field mt-1 font-mono" />
            </label>
          </div>
        )}
        {pending?.id === "prov_attach_proof" && (
          <label className="block">
            <span className="label-caps">{providerPanel?.proofHashLabel ?? "Хеш транзакции (crypto)"}</span>
            <input
              value={confirmationHash}
              onChange={(e) => setConfirmationHash(e.target.value)}
              placeholder={providerPanel?.proofHashPlaceholder ?? "0x… или txid"}
              className="field mt-1 font-mono text-xs"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {providerPanel?.proofHashHint ?? "Для fiat — прикрепите файл ниже."}
            </span>
          </label>
        )}
        {pending?.requiresMark && (
          <label className="block">
            <span className="label-caps">{panelCopy?.markLabel ?? "Отметка комплаенс"}</span>
            <select value={mark} onChange={(e) => setMark(e.target.value)} className="field mt-1">
              <option value="">Выберите отметку</option>
              {marks.map((tool) => (
                <option key={tool.id} value={tool.title}>
                  {tool.code} — {tool.title}
                </option>
              ))}
            </select>
            {marks.find((t) => t.title === mark) && (
              <span className="mt-1 block text-xs text-muted-foreground">
                {panelCopy?.markHint ?? "Клиент увидит:"} {marks.find((t) => t.title === mark)?.instruction}
              </span>
            )}
          </label>
        )}
        {pending?.requiresReason && (() => {
          const mgrReason =
            isManager && pending
              ? managerContractReasonFields(pending.id) ??
                managerPaymentReasonFields(pending.id) ??
                managerCloseReasonFields(pending.id)
              : undefined;
          const providerReason = isProvider && pending ? providerReasonFields(pending.id) : undefined;
          const reasonCopy = providerReason ?? mgrReason;
          return (
          <label className="block">
            <span className="label-caps">
              {reasonCopy?.label ?? (isEco ? panelCopy?.reasonLabel : undefined) ?? "Комментарий для клиента"}
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                reasonCopy?.placeholder ??
                (isEco ? panelCopy?.reasonPlaceholder : undefined) ??
                "Что именно нужно исправить или предоставить"
              }
              rows={3}
              className="field mt-1 resize-none"
            />
          </label>
          );
        })()}
        {(pending?.requiresFile || pending?.id === "prov_attach_proof") && (
          <label className="block">
            <span className="label-caps">
              {pending.id === "prov_attach_proof" && providerPanel?.proofFileLabel
                ? providerPanel.proofFileLabel
                : "Документ"}
            </span>
            <input
              type="file"
              onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                setFile(picked);
                setFileName(picked?.name ?? "");
              }}
              className="mt-1 block w-full text-xs text-muted-foreground"
            />
            {fileName && <span className="mt-1 block font-mono text-[11px] text-muted-foreground">{fileName}</span>}
          </label>
        )}
      </Modal>
    </div>
  );
}
