import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mgrReturnToClientRate, type RateHistoryEntry } from '@/lib/api/return';
import { useToast } from '@/hooks/use-toast';

interface ManagerReturnRateFormProps {
  formId: string;
  reportedAmount: string;
  reportedCurrency: string;
  rateHistory?: RateHistoryEntry[];
  onSuccess?: () => void;
}

export function ManagerReturnRateForm({
  formId,
  reportedAmount,
  reportedCurrency,
  rateHistory,
  onSuccess,
}: ManagerReturnRateFormProps) {
  const [rate, setRate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rate || rate.trim() === '') {
      toast({
        title: 'Ошибка',
        description: 'Курс возврата обязателен',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await mgrReturnToClientRate(formId, { rate: rate.trim() });
      toast({
        title: 'Успешно',
        description: 'Курс отправлен клиенту',
      });
      setRate('');
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось отправить курс',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Выставить курс для возврата клиенту</CardTitle>
        <CardDescription>
          Сумма возврата: {reportedAmount} {reportedCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {rateHistory && rateHistory.length > 0 && (
            <div className="mb-4 p-3 bg-muted rounded-md">
              <h4 className="text-sm font-medium mb-2">История курсов:</h4>
              <ul className="text-sm space-y-1">
                {rateHistory.map((entry, idx) => (
                  <li key={idx}>
                    {entry.rate} — {new Date(entry.set_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="rate">Курс возврата</Label>
            <Input
              id="rate"
              type="text"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="75.50"
              disabled={isSubmitting}
              required
            />
            <p className="text-sm text-muted-foreground">
              Укажите курс для расчёта суммы в рублях
            </p>
          </div>
          
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Отправка...' : 'Отправить клиенту'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
