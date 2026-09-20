import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePickButton } from './file-pick-button';
import { mgrReturnToClientExecute } from '@/lib/api/return';
import { useToast } from '@/hooks/use-toast';

interface ManagerReturnExecuteFormProps {
  formId: string;
  reportedAmount: string;
  reportedCurrency: string;
  rate: string;
  consentFileId: string;
  onSuccess?: () => void;
}

export function ManagerReturnExecuteForm({
  formId,
  reportedAmount,
  reportedCurrency,
  rate,
  consentFileId,
  onSuccess,
}: ManagerReturnExecuteFormProps) {
  const [rubPaymentFileId, setRubPaymentFileId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!rubPaymentFileId) {
      toast({
        title: 'Ошибка',
        description: 'Приложите рублёвую платёжку',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await mgrReturnToClientExecute(formId, { rub_payment_file_id: rubPaymentFileId });
      toast({
        title: 'Успешно',
        description: 'Выплата подтверждена',
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось подтвердить выплату',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Выплата клиенту</CardTitle>
        <CardDescription>
          Сумма: {reportedAmount} {reportedCurrency} • Курс: {rate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm">
              <span className="font-medium">Письмо-согласие клиента:</span>{' '}
              <a 
                href={`/api/v1/files/${consentFileId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Скачать
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label>Рублёвая платёжка (обязательно)</Label>
            <FilePickButton
              testId="rub-payment-file"
              onFileSelected={(fileId) => setRubPaymentFileId(fileId)}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            {!rubPaymentFileId && (
              <p className="text-sm text-muted-foreground">
                Приложите документ, подтверждающий выплату в рублях
              </p>
            )}
          </div>
          
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !rubPaymentFileId}
          >
            {isSubmitting ? 'Отправка...' : 'Выплатить'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
