import { Job } from 'bull';
import { IFormPaymentQuery } from '../service/form-payment.service.interface';
import { IGenerateAgentReport } from '../service/additional/generate-docs.service.interface';
import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import { SocketMessageAction } from '../../../lib/enums/models/socket.enum';

export interface IFormPaymentProcessor {
  handleGenerateAgentReport(job: Job<IGenerateAgentReportJobData>): Promise<void>;
  handleSendUpdateNotifications(job: Job<ISendUpdateNotificationsJobData>): Promise<void>;
  handleParseExcel(job: Job<IParseExcelJobData>): Promise<void>;
}

export interface IGenerateAgentReportJobData {
  findData: IFormPaymentQuery;
  data: IGenerateAgentReport;
}

export interface ISendUpdateNotificationsJobData {
  action: SocketMessageAction;
  formPayment: IFormPayment;
}

export interface IParseExcelJobData {
  formPaymentId: string;
  fileId: string;
  templateId: string;
  accountId: string;
}

export type IFormPaymentQueueData = IGenerateAgentReportJobData | ISendUpdateNotificationsJobData | IParseExcelJobData;
