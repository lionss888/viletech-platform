import { Job } from 'bull';

export interface IChatGptQueueProcessor {
  handleAnalyzeCounterparty(job: Job<IChatGptAnalyzeCounterpartyJobData>): Promise<void>;
}

export interface IChatGptAnalyzeCounterpartyJobData {
  formPaymentId: string;
  promptTemplate: string;
  counterpartyData: string;
  requestCount?: number;
}

export type IChatGptQueueData = IChatGptAnalyzeCounterpartyJobData;

/**
 * Тип для ошибки ChatGPT, сохраняемой в БД
 * Включает timestamp для отслеживания времени возникновения ошибки
 */
export interface IChatGptError {
  message: string;
  statusCode?: number;
  timestamp: Date;
  attempts: number;
}
