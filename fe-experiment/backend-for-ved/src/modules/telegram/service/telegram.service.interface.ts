import { Lang } from '../../../lib/enums/common.enums';
import { SenderFormPaymentEvents } from '../../../lib/enums/models/sender.enums';
import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import { IComment } from '../../../lib/interfaces/models/comment.interface';
import { IAccountTelegram } from '../../../lib/interfaces/models/account.interface';

export interface ITelegramService {
  send(telegramSend: ITelegramSend): Promise<void>;
}

export interface ITelegramSendDataBase {
  event: SenderFormPaymentEvents;
}

export interface ITelegramSendDataFormPayment extends ITelegramSendDataBase {
  form: IFormPayment;
}

export interface ITelegramSendDataComment extends ITelegramSendDataBase {
  comment: IComment;
}

export type TelegramSendData = ITelegramSendDataFormPayment | ITelegramSendDataComment;

export interface ITelegramSend<D = TelegramSendData | unknown> {
  telegram?: IAccountTelegram;
  event: SenderFormPaymentEvents;
  language: Lang;
  data: D;
}
