import { Controller, Inject } from '@nestjs/common';
import { RECOGNITION_SERVICE } from '../recognition.constants';
import { IRecognitionService } from '../service/recognition.service.interface';
import { CatcherExternalEventPattern } from '../../../lib/decorators/catcher-event-pattern.decorator';
import { RecognitionEventPattern } from '../../../lib/enums/models/recognition.enums';
import { FormPaymentDto } from '../../../lib/dto/models/form-payment.dto';

@Controller()
export class RecognitionEventController {
  constructor(@Inject(RECOGNITION_SERVICE) private readonly service: IRecognitionService) {}

  @CatcherExternalEventPattern(RecognitionEventPattern.INVOICE_RECOGNIZE_MANY)
  async recognizeInvoice(form: FormPaymentDto) {
    await this.service.recognizeFormInvoices(form);
  }

  @CatcherExternalEventPattern(RecognitionEventPattern.PAYMENT_RECOGNIZE_ONE)
  async recognizePayment(form: FormPaymentDto) {
    await this.service.recognizeFormPayment(form);
  }
}
