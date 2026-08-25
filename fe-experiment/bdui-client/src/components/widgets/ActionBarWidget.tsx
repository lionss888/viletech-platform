import { useState } from 'react';
import type { BduiAction } from '../../types/bdui';

type ActionBarWidgetProps = {
  actionIds: string[];
  actions: BduiAction[];
  onAction: (action: BduiAction) => Promise<void>;
};

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
      await props.onAction(action);
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
