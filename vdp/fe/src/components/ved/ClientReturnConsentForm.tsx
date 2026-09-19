import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePickButton } from './file-pick-button';
import { clientReturnConsent, clientReturnRefuse } from '@/lib/api/return';
import { useToast } from '@/hooks/use-toast';

interface ClientReturnConsentFormProps {
  formId: string;
  reportedAmount: string;
  reportedCurrency: string;
  rate: string;
  onSuccess?: () => void;
}

export function ClientReturnConsentFormForm({
  formId,
  reportedAmount,
  reportedCurrency,
  rate,
  onSuccess,
}: ClientReturnConsentFormProps) {
  const [consentFileId, setConsentFileId] = useState<string>('');
  const [refusalReason, setRefusalReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'consent' | 'refuse' | null>(null);
  const { toast } = useToast();

  const handleConsent = async () => {
    if (!consentFileId) {
      toast({
        title: 'Ошибка',
        description: 'Приложите письмо-согласие',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await clientReturnConsent(formId, { consent_file_id: consentFileId });
      toast({
        title: 'Успешно',
        description: 'Согласие отправлено',
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось отправить согласие',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefuse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!refusalReason || refusalReason.trim() === '') {
      toast({
        title: 'Ошибка',
        description: 'Укажите причину отказа',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await clientReturnRefuse(formId, { reason: refusalReason.trim() });
      toast({
        title: 'Успешно',
        description: 'Отказ отправлен',
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось отправить отказ',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Возврат средств</CardTitle>
        <CardDescription>
          Сумма: {reportedAmount} {reportedCurrency} • Курс: {rate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mode === null && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Менеджер предложил курс возврата. Вы можете согласиться или отказаться.
            </p>
            <div className="flex gap-4">
              <Button onClick={() => setMode('consent')} variant="default">
                Согласен
              </Button>
              <Button onClick={() => setMode('refuse')} variant="outline">
                Не согласен
              </Button>
            </div>
          </div>
        )}

        {mode === 'consent' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Письмо-согласие (обязательно)</Label>
              <FilePickButton
                testId="consent-file"
                onFileSelected={(fileId) => setConsentFileId(fileId)}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {!consentFileId && (
                <p className="text-sm text-destructive">
                  Приложите письмо-согласие для продолжения
                </p>
              )}
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={handleConsent} 
                disabled={isSubmitting || !consentFileId}
              >
                {isSubmitting ? 'Отправка...' : 'Отправить согласие'}
              </Button>
              <Button 
                onClick={() => { setMode(null); setConsentFileId(''); }} 
                variant="ghost"
                disabled={isSubmitting}
              >
                Назад
              </Button>
            </div>
          </div>
        )}

        {mode === 'refuse' && (
          <form onSubmit={handleRefuse} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refusal-reason">Причина отказа (обязательно)</Label>
              <Textarea
                id="refusal-reason"
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                placeholder="Укажите причину отказа от предложенного курса"
                disabled={isSubmitting}
                required
                rows={4}
              />
            </div>
            
            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting} variant="destructive">
                {isSubmitting ? 'Отправка...' : 'Отправить отказ'}
              </Button>
              <Button 
                type="button"
                onClick={() => { setMode(null); setRefusalReason(''); }} 
                variant="ghost"
                disabled={isSubmitting}
              >
                Назад
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
