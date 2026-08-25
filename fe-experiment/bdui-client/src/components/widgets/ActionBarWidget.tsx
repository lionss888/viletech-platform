import { useState } from 'react';
import type { BduiAction } from '../../types/bdui';

type ActionBarWidgetProps = {
  actionIds: string[];
  actions: BduiAction[];
  onAction: (action: BduiAction, body?: Record<string, unknown>) => Promise<void>;
};

/**
 * Renders CTA buttons from schema action ids; prompts for reason / provider when required.
 */
export function ActionBarWidget(props: ActionBarWidgetProps): JSX.Element {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const available = props.actions.filter((action) => props.actionIds.includes(action.id));

  if (available.length === 0) {
    return <p className="bdui-muted">Нет доступных действий</p>;
  }

  async function handleClick(action: BduiAction): Promise<void> {
    setBusyId(action.id);
    setErrorMessage(null);
    try {
      let body: Record<string, unknown> | undefined;
      if (action.requiresTextReason) {
        const text = window.prompt('Комментарий (обязательно):', '')?.trim();
        if (!text) {
          setErrorMessage('Нужен комментарий для этого действия');
          return;
        }
        body = { text };
      }
      if (action.requiresProviderId) {
        const provider = window.prompt('Provider account id:', '')?.trim();
        if (!provider) {
          setErrorMessage('Нужен id аккаунта Provider');
          return;
        }
        body = { ...(body ?? {}), provider };
      }
      if (action.requiresTxHash) {
        const hash = window.prompt('Transaction hash:', '')?.trim();
        if (!hash) {
          setErrorMessage('Нужен tx hash');
          return;
        }
        const chain = window.prompt('Chain (ETH/TRON/…):', 'ETH')?.trim() || 'ETH';
        body = {
          ...(body ?? {}),
          addTransactions: [{ hash, chain }],
        };
      }
      await props.onAction(action, body);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bdui-action-bar">
      {available.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={busyId !== null}
          onClick={() => void handleClick(action)}
        >
          {busyId === action.id ? '…' : action.label}
        </button>
      ))}
      {errorMessage ? <p className="bdui-error">{errorMessage}</p> : null}
    </div>
  );
}
