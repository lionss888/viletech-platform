import { useState } from "react";
import { provReturnRepeatExecute } from "@/lib/api/return";
import { FilePickButton } from "./file-pick-button";

interface ProviderReturnRepeatExecuteFormProps {
  formId: string;
  onSuccess?: () => void;
}

export function ProviderReturnRepeatExecuteForm({ formId, onSuccess }: ProviderReturnRepeatExecuteFormProps) {
  const [paymentFileId, setPaymentFileId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!paymentFileId) {
      setError("Приложите платёжное поручение");
      return;
    }

    setIsSubmitting(true);
    try {
      await provReturnRepeatExecute(formId, {
        payment_file_id: paymentFileId,
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось исполнить повтор");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Платёжное поручение (обязательно)
        </label>
        <FilePickButton
          testId="repeat-payment-file"
          onFileSelected={(fileId) => setPaymentFileId(fileId)}
          disabled={isSubmitting}
          accept=".pdf,.jpg,.jpeg,.png"
        />
        {paymentFileId && (
          <p className="text-sm text-green-600 mt-1">Файл прикреплён: {paymentFileId}</p>
        )}
      </div>

      {error && (
        <div className="text-red-600 text-sm" data-testid="repeat-execute-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !paymentFileId}
        data-testid="repeat-execute-submit"
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Отправка..." : "Подтвердить исполнение"}
      </button>
    </form>
  );
}
