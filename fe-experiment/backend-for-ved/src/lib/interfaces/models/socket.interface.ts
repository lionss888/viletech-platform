import { SocketMessageAction, SocketMessageContext, FormPaymentSocketEventType } from '../../enums/models/socket.enum';
import { FileParseStatus } from '../../enums/models/file.enums';
import { IFormPaymentParsedData } from '../excel-parser.interface';
import { SenderAccountEvents } from '../../enums/models/sender.account.enums';

export interface ISocketMessage<Payload = unknown> {
  account: string;
  data: ISocketMessageData<Payload>;
}

export interface ISocketMessageData<Payload = unknown> {
  context: SocketMessageContext;
  action: SocketMessageAction;
  payload?: Payload;
  room?: string;
}

export interface IFormPaymentExcelParsedPayload {
  eventType: FormPaymentSocketEventType.EXCEL_PARSED;
  formPaymentId: string;
  fileId: string;
  parsedData: IFormPaymentParsedData;
  parseStatus: FileParseStatus.SUCCESS;
  warnings?: string[];
}

export interface IFormPaymentExcelParseFailedPayload {
  eventType: FormPaymentSocketEventType.EXCEL_PARSE_FAILED;
  formPaymentId: string;
  fileId: string;
  error: string;
  parseStatus: FileParseStatus.FAILED;
}

export interface IFormPaymentExcelParseCancelledPayload {
  eventType: FormPaymentSocketEventType.EXCEL_PARSE_CANCELLED;
  formPaymentId: string;
  fileId: string;
  reason: string;
}

export interface IFormPaymentComplianceReportCompletedPayload {
  eventType: FormPaymentSocketEventType.COMPLIANCE_REPORT_COMPLETED;
  formPaymentId: string;
  complianceReport: {
    text?: string;
    status?: string;
    error?: {
      message: string;
      statusCode?: number;
      timestamp: Date;
      attempts: number;
    };
    createdDate?: Date;
    updatedDate?: Date;
    requestCount?: number;
  };
}

export interface IAccountCorporateFlagEnabledPayload {
  eventType: SenderAccountEvents.CORPORATE_FLAG_ENABLED;
  accountId: string;
  email: string;
  isCorporateClient: boolean;
}

export type FormPaymentSocketPayload =
  | IFormPaymentExcelParsedPayload
  | IFormPaymentExcelParseFailedPayload
  | IFormPaymentExcelParseCancelledPayload
  | IFormPaymentComplianceReportCompletedPayload;
