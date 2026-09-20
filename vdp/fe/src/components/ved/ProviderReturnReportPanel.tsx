import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { provReturnReport } from "@/lib/api/return";
import type { ReturnEpisode } from "@/lib/api/return";

interface ProviderReturnReportPanelProps {
  formId: string;
  currency: string;
  returnEpisode?: ReturnEpisode;
  onSuccess?: () => void;
}

/**
 * Provider CTA to report return after payment execution (stage 1).
 * Visible: role=provider, after execution (payment_sent+), !returnEpisode.active
 */
export function ProviderReturnReportPanel({
  formId,
  currency,
  returnEpisode,
  onSuccess,
}: ProviderReturnReportPanelProps) {
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hide if episode already active
  if (returnEpisode?.active) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError("Сумма обязательна и должна быть больше 0");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await provReturnReport(formId, {
        amount,
        currency: selectedCurrency,
        reason: reason.trim() || undefined,
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при отправке");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Сообщить о возврате</CardTitle>
        <CardDescription>
          Деньги вернулись на ваш счёт после исполнения платежа
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="return-amount">Сумма возврата *</Label>
            <Input
              id="return-amount"
              data-testid="return-report-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000.00"
              required
              disabled={submitting}
            />
          </div>
          <div>
            <Label htmlFor="return-currency">Валюта</Label>
            <Input
              id="return-currency"
              data-testid="return-report-currency"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
              disabled={submitting}
            />
          </div>
          <div>
            <Label htmlFor="return-reason">Причина (опционально)</Label>
            <Textarea
              id="return-reason"
              data-testid="return-report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Chargeback, отказ получателя, и т.д."
              disabled={submitting}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" data-testid="return-report-submit" disabled={submitting || !amount}>
            {submitting ? "Отправка..." : "Сообщить о возврате"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
