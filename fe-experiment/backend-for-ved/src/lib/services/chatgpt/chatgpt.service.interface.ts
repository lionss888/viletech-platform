export type JobId = string;

export interface IChatGptPromptResult {
  text: string | null;
  error?: {
    message: string;
    statusCode?: number;
    attempts: number;
  };
}

export interface IChatGptService {
  promptWithError(
    promptTemplate: string,
    counterpartyData?: string,
    options?: IChatGptPromptOptions,
    invoiceFileId?: string,
  ): Promise<IChatGptPromptResult>;
  addAnalyzeCounterpartyToQueue(
    formPaymentId: string,
    promptTemplate: string,
    counterpartyData: string,
    requestCount?: number,
  ): Promise<JobId>;
  uploadFile(buffer: Buffer, fileName: string, mimeType: string): Promise<{ id: string }>;
  deleteFile(fileId: string): Promise<void>;
}

export interface IChatGptPromptOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  retries?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  };
}

export const CHATGPT_SERVICE = 'IChatGptService';
