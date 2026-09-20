import { useState } from "react";
import { mgrReturnRepeat } from "@/lib/api/return";

interface ManagerReturnRepeatFormProps {
  formId: string;
  onSuccess?: () => void;
}

export function ManagerReturnRepeatForm({ formId, onSuccess }: ManagerReturnRepeatFormProps) {
  const [comment, setComment] = useState("");
  const [newProviderOrgId, setNewProviderOrgId] = useState("");
  const [newAccountId, setNewAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!comment.trim()) {
      setError("Комментарий обязателен");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: { comment: string; new_provider_org_id?: string; new_account_id?: string } = {
        comment: comment.trim(),
      };
      
      // Include optional provider org/account change if specified
      if (newProviderOrgId.trim()) {
        payload.new_provider_org_id = newProviderOrgId.trim();
      }
      if (newAccountId.trim()) {
        payload.new_account_id = newAccountId.trim();
      }

      await mgrReturnRepeat(formId, payload);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось инициировать повтор");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="repeat-comment" className="block text-sm font-medium mb-1">
          Комментарий (обязательно)
        </label>
        <textarea
          id="repeat-comment"
          data-testid="repeat-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border rounded px-3 py-2"
          rows={3}
          placeholder="Причина повтора платежа"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="new-provider-org" className="block text-sm font-medium mb-1">
          Новая организация провайдера (опционально)
        </label>
        <input
          type="text"
          id="new-provider-org"
          data-testid="new-provider-org"
          value={newProviderOrgId}
          onChange={(e) => setNewProviderOrgId(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="ID организации"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="new-account" className="block text-sm font-medium mb-1">
          Новый счёт (опционально)
        </label>
        <input
          type="text"
          id="new-account"
          data-testid="new-account"
          value={newAccountId}
          onChange={(e) => setNewAccountId(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="ID счёта"
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm" data-testid="repeat-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !comment.trim()}
        data-testid="repeat-submit"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Отправка..." : "Повторить платёж"}
      </button>
    </form>
  );
}
