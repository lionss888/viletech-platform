import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FilePickButton } from "./file-pick-button";
import { clientReturnClarifyReply } from "@/lib/api/return";
import type { FormPayment } from "@/lib/ved/types";

interface ClientReturnClarifyReplyFormProps {
  form: FormPayment;
  onSuccess?: () => void;
}

/**
 * Client clarification reply form (stage 2).
 * Visible when: role=client, status=return_awaiting_client_clarify.
 * Shows manager's question and file (if any).
 * After reply, status → return_mgr_decision (episode remains active).
 */
export function ClientReturnClarifyReplyForm({ form, onSuccess }: ClientReturnClarifyReplyFormProps) {
  const [answer, setAnswer] = useState("");
  const [fileId, setFileId] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!answer.trim()) {
      setError("Ответ обязателен");
      return;
    }

    setIsSubmitting(true);
    try {
      await clientReturnClarifyReply(form.id, {
        answer: answer.trim(),
        file_id: fileId,
      });
      setAnswer("");
      setFileId(undefined);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки ответа");
    } finally {
      setIsSubmitting(false);
    }
  };

  const question = form.return_episode?.clarify_question;
  const questionFileId = form.return_episode?.clarify_file_id;

  if (!question) {
    return null;
  }

  return (
    <div className="space-y-4 border p-4 rounded-lg bg-muted/30">
      <h3 className="font-medium">Вопрос от менеджера</h3>
      
      <div className="bg-background p-3 rounded border-l-4 border-primary">
        <p className="whitespace-pre-wrap">{question}</p>
        {questionFileId && (
          <p className="text-sm text-muted-foreground mt-2">
            📎 Приложен документ
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <Label htmlFor="clarify-answer">Ваш ответ *</Label>
          <Textarea
            id="clarify-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Введите ответ на вопрос менеджера"
            className="mt-1"
            rows={3}
          />
        </div>

        <div>
          <Label>Документ (опционально)</Label>
          <FilePickButton
            testId="clarify-answer-file"
            onFileSelect={(file) => {
              // TODO: upload file and get file_id
              console.log("File selected:", file.name);
              // setFileId(uploadedFileId);
            }}
          />
          {fileId && <p className="text-sm text-muted-foreground mt-1">Файл приложен</p>}
        </div>

        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !answer.trim()}
          className="w-full"
        >
          {isSubmitting ? "Отправка..." : "Отправить ответ"}
        </Button>
      </form>
    </div>
  );
}
