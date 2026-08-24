export interface IOcrService {
  isAvailable: boolean;

  recognizeTextAsync(data: IRecognizeAsync): Promise<any>;

  getRecognition(operationId: string): Promise<any>;

  tryGetRecognition(operationId: string, options?: ITryGetRecognitionOptions): Promise<any>;

  parseRecognition(recognition: any): any[];
}

export const OCR_SERVICE = 'IOcrService';

export interface IRecognizeAsync {
  mimeType: string;
  languageCodes: string[];
  model: string;
  content: string;
}

export interface ITryGetRecognitionOptions {
  maxAttempts?: number;
  timeoutIncrement?: number;
}
