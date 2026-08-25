import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';

export interface IRecognitionService {
  recognizeFormInvoices(form: IFormPayment): Promise<void>;
  recognizeFormPayment(form: IFormPayment): Promise<void>;
}

export interface IRecognizePdfOptions<Y, A> {
  anthropicRequest: string;
  onYandexRecognize?: (lines: string[]) => Y;
  onAnthropicRecognize?: (result: unknown[]) => A;
}

export interface IRecognizePdfResult<Y, A> {
  yandex?: Y;
  anthropic?: A;
}
