import { SenderFormPaymentEvents, SenderTelegramChannels } from '../../lib/enums/models/sender.enums';
import { FormPaymentTelegramDto } from './dto/form-payment.telegram.dto';
import { CommentTelegramDto } from './dto/comment.telegram.dto';
import { ClassConstructor } from 'class-transformer';

export const TELEGRAM_CLIENT = 'TELEGRAM_CLIENT';

export type MapDtoEventEntry = [[ClassConstructor<unknown>, string], SenderFormPaymentEvents[]];

export const mapDtoEvent: MapDtoEventEntry[] = [
  [
    [FormPaymentTelegramDto, 'formPaymentSent'],
    [SenderFormPaymentEvents.PAYMENT_SENT],
  ],
  [
    [FormPaymentTelegramDto, 'form'],
    [
      SenderFormPaymentEvents.COMPLETED,
      SenderFormPaymentEvents.CANCELED_BY_ADMIN,
      SenderFormPaymentEvents.CANCELED_BY_COMPLIANCE_OFFICER,
      SenderFormPaymentEvents.CANCELED_BY_USER,
      SenderFormPaymentEvents.FORM_ACCEPTED,
      SenderFormPaymentEvents.ACCEPT_CONTRACT,
      SenderFormPaymentEvents.USER_ACCEPTED_FORM,
      SenderFormPaymentEvents.MANAGER_REJECT_FORM,
      SenderFormPaymentEvents.SIGNING_ORDER,
      SenderFormPaymentEvents.REJECT_ORDER,
      SenderFormPaymentEvents.ORDER_SIGN_UPLOADED,
      SenderFormPaymentEvents.ORDER_ACCEPT,
      SenderFormPaymentEvents.PAYMENT_RECEIVED_IMPORT,
      SenderFormPaymentEvents.PAYMENT_RECEIVED_EXPORT,
      SenderFormPaymentEvents.PAYMENT_RECEIVED,
      SenderFormPaymentEvents.REPORT_WAITING,
      SenderFormPaymentEvents.REPORT_SIGN_UPLOADED,
      SenderFormPaymentEvents.SHIPMENT_WAITING,
      SenderFormPaymentEvents.SHIPMENT_WAITING_CORRECTIONS,
      SenderFormPaymentEvents.SHIPMENT_UPLOADED,
      SenderFormPaymentEvents.MANAGER_CHECKING,
      SenderFormPaymentEvents.REFUND_WAITING,
      SenderFormPaymentEvents.REFUND_SENT,
      SenderFormPaymentEvents.EXPIRES_PAID_DATE,
      SenderFormPaymentEvents.ORGANIZATION_WAITING_VERIFICATION,
      SenderFormPaymentEvents.PAYMENT_REJECTED,
    ],
  ],
  [
    [CommentTelegramDto, 'comment'],
    [
      SenderFormPaymentEvents.FORM_PAYMENT_EXTERNAL_COMMENT_CREATED,
      SenderFormPaymentEvents.FORM_PAYMENT_INTERNAL_COMMENT_CREATED,
      SenderFormPaymentEvents.FORM_PAYMENT_INTERNAL_COMMENT_CREATED_MANAGER,
      SenderFormPaymentEvents.FORM_PAYMENT_INTERNAL_COMMENT_CREATED_PROVIDER,
    ],
  ],
];

export const mapEventChannels: Partial<{ [key in SenderFormPaymentEvents]: SenderTelegramChannels[] }> = {
  [SenderFormPaymentEvents.ORGANIZATION_WAITING_VERIFICATION]: [SenderTelegramChannels.COMPLIANCE_OFFICER],
  [SenderFormPaymentEvents.USER_ACCEPTED_FORM]: [SenderTelegramChannels.COMPLIANCE_OFFICER],
  [SenderFormPaymentEvents.ORDER_ACCEPT]: [SenderTelegramChannels.PROVIDER],
  [SenderFormPaymentEvents.FORM_ACCEPTED]: [SenderTelegramChannels.MANAGER, SenderTelegramChannels.LAWYER],
  [SenderFormPaymentEvents.ORDER_SIGN_UPLOADED]: [SenderTelegramChannels.MANAGER],
  [SenderFormPaymentEvents.MANAGER_CHECKING]: [SenderTelegramChannels.MANAGER],
  [SenderFormPaymentEvents.PAYMENT_RECEIVED]: [SenderTelegramChannels.PAYMENTS],
  [SenderFormPaymentEvents.PAYMENT_SENT]: [SenderTelegramChannels.MANAGER, SenderTelegramChannels.PAYMENTS],
  [SenderFormPaymentEvents.REPORT_SIGN_UPLOADED]: [SenderTelegramChannels.MANAGER],
  [SenderFormPaymentEvents.PAYMENT_REJECTED]: [SenderTelegramChannels.MANAGER],
  [SenderFormPaymentEvents.FORM_PAYMENT_EXTERNAL_COMMENT_CREATED]: [SenderTelegramChannels.COMPLIANCE_OFFICER],
  [SenderFormPaymentEvents.FORM_PAYMENT_INTERNAL_COMMENT_CREATED_MANAGER]: [SenderTelegramChannels.PROVIDER],
  [SenderFormPaymentEvents.FORM_PAYMENT_INTERNAL_COMMENT_CREATED_PROVIDER]: [SenderTelegramChannels.MANAGER],
  [SenderFormPaymentEvents.EXPIRES_PAID_DATE]: [SenderTelegramChannels.MANAGER, SenderTelegramChannels.PROVIDER],
  [SenderFormPaymentEvents.ACCEPT_CONTRACT]: [SenderTelegramChannels.LAWYER],
};
