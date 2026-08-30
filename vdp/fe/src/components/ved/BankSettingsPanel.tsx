import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Modal, ModalButton } from "@/components/ved/Modal";
import { setBankSettings } from "@/lib/api/bank";
import { BANK_SETTINGS_PANEL } from "@/lib/ved/copy/bank-copy";
import { usePlatformMode } from "@/lib/ved/platform-mode";
import { usePlatformStore } from "@/lib/ved/platform-store";
import type { Organization } from "@/lib/ved/types";

export function BankSettingsPanel({ org }: { org: Organization }) {
  const mode = usePlatformMode();
  const queryClient = useQueryClient();
  const { session, paymentAgents } = usePlatformStore();
  const canEdit = mode === "app" && (session?.role === "root" || session?.role === "manager");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientType, setClientType] = useState<"ui" | "bank">(org.clientType ?? "ui");
  const [commission, setCommission] = useState(org.bankFixedCommissionPercent ?? "0.5");
  const [markup, setMarkup] = useState(org.applyPlatformMarkup ?? true);
  const [agentId, setAgentId] = useState(org.defaultAgentId ?? "");
  const [webhookUrl, setWebhookUrl] = useState(org.bankWebhookUrl ?? "");
  const [webhookSecret, setWebhookSecret] = useState("");

  if (!canEdit) return null;

  function openModal() {
    setClientType(org.clientType ?? "ui");
    setCommission(org.bankFixedCommissionPercent ?? "0.5");
    setMarkup(org.applyPlatformMarkup ?? true);
    setAgentId(org.defaultAgentId ?? "");
    setWebhookUrl(org.bankWebhookUrl ?? "");
    setWebhookSecret("");
    setError(null);
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await setBankSettings(org.id, {
        client_type: clientType,
        bank_fixed_commission_percent: clientType === "bank" ? commission : undefined,
        apply_platform_markup: markup,
        default_agent_id: agentId || undefined,
        bank_webhook_url: webhookUrl || undefined,
        bank_webhook_secret: webhookSecret || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : BANK_SETTINGS_PANEL.saveError);
    } finally {
      setBusy(false);
    }
  }

  const openLabel =
    org.clientType === "bank" ? BANK_SETTINGS_PANEL.openButtonActive : BANK_SETTINGS_PANEL.openButton;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-md bg-card px-2.5 py-1.5 text-xs font-semibold shadow-[0_0_0_1px_var(--input)] hover:bg-muted"
      >
        {openLabel}
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={BANK_SETTINGS_PANEL.modalTitle(org.name)}
        description={BANK_SETTINGS_PANEL.modalDescription}
        footer={
          <>
            <ModalButton variant="quiet" onClick={() => setOpen(false)} disabled={busy}>
              {BANK_SETTINGS_PANEL.cancel}
            </ModalButton>
            <ModalButton variant="primary" onClick={() => void save()} disabled={busy}>
              {busy ? BANK_SETTINGS_PANEL.saving : BANK_SETTINGS_PANEL.save}
            </ModalButton>
          </>
        }
      >
        {error && <p className="mb-3 rounded-md bg-destructive-soft px-2 py-1.5 text-xs text-destructive">{error}</p>}
        <div className="grid gap-3">
          <label className="block">
            <span className="label-caps">{BANK_SETTINGS_PANEL.clientTypeLabel}</span>
            <select value={clientType} onChange={(e) => setClientType(e.target.value as "ui" | "bank")} className="field mt-1">
              <option value="ui">{BANK_SETTINGS_PANEL.clientTypeUi}</option>
              <option value="bank">{BANK_SETTINGS_PANEL.clientTypeBank}</option>
            </select>
          </label>
          <label className="block">
            <span className="label-caps">{BANK_SETTINGS_PANEL.commissionLabel}</span>
            <input value={commission} onChange={(e) => setCommission(e.target.value)} className="field mt-1 font-mono" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={markup} onChange={(e) => setMarkup(e.target.checked)} />
            {BANK_SETTINGS_PANEL.markupLabel}
          </label>
          <label className="block">
            <span className="label-caps">{BANK_SETTINGS_PANEL.defaultAgentLabel}</span>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="field mt-1">
              <option value="">{BANK_SETTINGS_PANEL.defaultAgentEmpty}</option>
              {paymentAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-caps">{BANK_SETTINGS_PANEL.webhookUrlLabel}</span>
            <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="field mt-1 text-xs" />
          </label>
          <label className="block">
            <span className="label-caps">{BANK_SETTINGS_PANEL.webhookSecretLabel}</span>
            <input value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="field mt-1 font-mono text-xs" />
          </label>
        </div>
      </Modal>
    </>
  );
}
