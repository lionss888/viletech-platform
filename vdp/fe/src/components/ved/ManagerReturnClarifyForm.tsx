import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FilePickButton } from "./file-pick-button";
import { mgrReturnClarify } from "@/lib/api/return";
import type { FormPayment } from "@/lib/ved/types";

interface ManagerReturnClarifyFormProps {
  form: FormPayment;
  onSuccess?: () => void;
}

/**
 * Manager clarification form (stage 2).
 * Visible when: role=manager, returnEpisode.active=true, status=return_reported or return_mgr_decision.
 * Not terminal: after client replies, manager back to decision point.
 */
export function ManagerReturnClarifyForm({ form, onSuccess }: ManagerReturnClarifyFormProps) {
  const [question, setQuestion] = useState("");
  const [fileId, setFileId] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!question.trim()) {
      setError("Вопрос обязателен");
      return;
    }

    setIsSubmitting(true);
    try {
      await mgrReturnClarify(form.id, {
        question: question.trim(),
        file_id: fileId,
      });
      setQuestion("");
      setFileId(undefined);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки вопроса");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-lg">
      <h3 className="font-medium">Уточнить у клиента</h3>
      
      <div>
        <Label htmlFor="clarify-question">Вопрос клиенту *</Label>
        <Textarea
          id="clarify-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Опишите, какую информацию нужно уточнить"
          className="mt-1"
          rows={3}
        />
      </div>

      <div>
        <Label>Документ (опционально)</Label>
        <FilePickButton
          testId="clarify-file"
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
        disabled={isSubmitting || !question.trim()}
        className="w-full"
      >
        {isSubmitting ? "Отправка..." : "Отправить вопрос клиенту"}
      </Button>
    </form>
  );
}
