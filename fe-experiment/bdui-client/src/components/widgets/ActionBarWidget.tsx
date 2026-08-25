import { useRef, useState, type ChangeEvent } from 'react';
import { apiUploadFile } from '../../api/client';
import type { BduiAction, BduiFileUploadSpec } from '../../types/bdui';

type ActionBarWidgetProps = {
  actionIds: string[];
  actions: BduiAction[];
  onAction: (action: BduiAction, body?: Record<string, unknown>) => Promise<void>;
};

type UploadedFile = { _id?: string };

function normalizeUploadSpecs(
  spec: BduiFileUploadSpec | BduiFileUploadSpec[] | undefined,
): BduiFileUploadSpec[] {
  if (!spec) {
    return [];
  }
  return Array.isArray(spec) ? spec : [spec];
}

/**
 * Renders CTA buttons from schema action ids; prompts for reason / provider / file when required.
 */
export function ActionBarWidget(props: ActionBarWidgetProps): JSX.Element {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<BduiAction | null>(null);
  const [pendingSpecIndex, setPendingSpecIndex] = useState(0);
  const [uploadedBody, setUploadedBody] = useState<Record<string, unknown>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const available = props.actions.filter((action) => props.actionIds.includes(action.id));

  if (available.length === 0) {
    return <p className="bdui-muted">Нет доступных действий</p>;
  }

  function pickFileFor(action: BduiAction, specIndex: number, bodySoFar: Record<string, unknown>): void {
    setPendingAction(action);
    setPendingSpecIndex(specIndex);
    setUploadedBody(bodySoFar);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  async function finishAction(action: BduiAction, body: Record<string, unknown>): Promise<void> {
    setBusyId(action.id);
    setErrorMessage(null);
    try {
      let requestBody: Record<string, unknown> = { ...body };
      if (action.requiresTextReason) {
        const text = window.prompt('Комментарий (обязательно):', '')?.trim();
        if (!text) {
          setErrorMessage('Нужен комментарий для этого действия');
          return;
        }
        requestBody = { ...requestBody, text };
      }
      if (action.requiresContractMeta) {
        const number = window.prompt('Номер договора:', `BDUI-MGR-${Date.now()}`)?.trim();
        if (!number) {
          setErrorMessage('Нужен номер договора');
          return;
        }
        const dateInput = window.prompt('Дата договора (ISO или YYYY-MM-DD):', new Date().toISOString())?.trim();
        if (!dateInput) {
          setErrorMessage('Нужна дата договора');
          return;
        }
        const date = dateInput.includes('T') ? dateInput : `${dateInput}T00:00:00.000Z`;
        requestBody = { ...requestBody, number, date };
      }
      if (action.requiresProviderId) {
        const provider = window
          .prompt('Provider account id:', action.defaultProviderId ?? '')
          ?.trim();
        if (!provider) {
          setErrorMessage('Нужен id аккаунта Provider');
          return;
        }
        requestBody = { ...requestBody, provider };
      }
      if (action.requiresTxHash) {
        const hash = window.prompt('Transaction hash:', '')?.trim();
        if (!hash) {
          setErrorMessage('Нужен tx hash');
          return;
        }
        const chain = window.prompt('Chain (ETH/TRON/…):', 'ETH')?.trim() || 'ETH';
        requestBody = {
          ...requestBody,
          addTransactions: [{ hash, chain }],
        };
      }
      await props.onAction(action, Object.keys(requestBody).length > 0 ? requestBody : undefined);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setBusyId(null);
      setPendingAction(null);
      setUploadedBody({});
    }
  }

  async function handleClick(action: BduiAction): Promise<void> {
    setErrorMessage(null);
    const specs = normalizeUploadSpecs(action.requiresFileUpload);
    if (specs.length > 0) {
      pickFileFor(action, 0, {});
      return;
    }
    await finishAction(action, {});
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!pendingAction || !file) {
      setPendingAction(null);
      return;
    }
    const specs = normalizeUploadSpecs(pendingAction.requiresFileUpload);
    const spec = specs[pendingSpecIndex];
    if (!spec) {
      setPendingAction(null);
      return;
    }
    setBusyId(pendingAction.id);
    setErrorMessage(null);
    try {
      const uploaded = await apiUploadFile<UploadedFile>({
        path: spec.uploadPath,
        file,
      });
      if (!uploaded._id) {
        throw new Error('Upload returned no file id');
      }
      const nextBody: Record<string, unknown> = {
        ...uploadedBody,
        [spec.bodyField]: spec.asArray ? [uploaded._id] : uploaded._id,
      };
      const nextIndex = pendingSpecIndex + 1;
      if (nextIndex < specs.length) {
        pickFileFor(pendingAction, nextIndex, nextBody);
        setBusyId(null);
        return;
      }
      await finishAction(pendingAction, nextBody);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setBusyId(null);
      setPendingAction(null);
      setUploadedBody({});
    }
  }

  const pendingAccept =
    pendingAction && normalizeUploadSpecs(pendingAction.requiresFileUpload)[pendingSpecIndex]?.accept;

  return (
    <div className="bdui-action-bar">
      <input
        ref={fileInputRef}
        type="file"
        accept={pendingAccept || 'application/pdf,.pdf'}
        style={{ display: 'none' }}
        onChange={(event) => void handleFileSelected(event)}
      />
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
