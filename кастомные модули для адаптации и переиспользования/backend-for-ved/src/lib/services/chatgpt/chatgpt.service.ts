import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { IChatGptService, IChatGptPromptOptions, IChatGptPromptResult, JobId } from './chatgpt.service.interface';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { JobQueueName } from '../../enums/models/job-queue.enums';
import { ChatGptPattern, ChatMessageRole } from '../../enums/models/chatgpt.enums';
import { IChatGptAnalyzeCounterpartyJobData } from './queue/chatgpt-queue.processor.interface';

// Network error codes, которые можно повторить
const RETRYABLE_NETWORK_ERROR_CODES: readonly string[] = [
  'ECONNRESET', // Соединение сброшено
  'ETIMEDOUT', // Таймаут соединения
  'ENOTFOUND', // DNS не найден
  'ECONNREFUSED', // Соединение отклонено
  'EHOSTUNREACH', // Хост недоступен
  'EPIPE', // Разрыв канала
  'EAI_AGAIN', // Временная ошибка DNS
];

@Injectable()
export class ChatGptService implements IChatGptService {
  private readonly openaiInstance: OpenAI;
  private readonly chatGptModel: string;
  private readonly logger: Logger = new Logger(ChatGptService.name);
  private readonly defaultRetryConfig: {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    retryableStatusCodes: number[];
    rateLimit: {
      maxRetriesPerWindow: number;
      windowMs: number;
    };
  };
  // Отслеживание ретраев для rate limiting
  private retryTimestamps: number[] = [];

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(JobQueueName.CHATGPT_QUEUE) private readonly chatGptQueue?: Queue<IChatGptAnalyzeCounterpartyJobData>,
  ) {
    const apiKey = this.configService.get<string>('openai.apiKey');

    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY не установлен. Сервис ChatGPT может не работать.');
      // Создаем экземпляр с заглушечным ключом, чтобы избежать ошибки при инициализации
      // При попытке использовать методы будет ошибка, но приложение не упадет при старте
      this.openaiInstance = new OpenAI({
        apiKey: 'dummy-key-for-initialization',
        project: 'proj_sOZ1NfvqOPlBKpgBbXLVZouM',
      });
    } else {
      this.openaiInstance = new OpenAI({
        apiKey: apiKey,
        project: 'proj_sOZ1NfvqOPlBKpgBbXLVZouM',
      });
    }

    this.chatGptModel = this.configService.get<string>('openai.model') || 'gpt-4o';

    // Получаем настройки retries из конфига
    const retryConfig = this.configService.get('openai.retries');
    this.defaultRetryConfig = {
      maxAttempts: retryConfig?.maxAttempts || 3,
      initialDelayMs: retryConfig?.initialDelayMs || 1000,
      maxDelayMs: retryConfig?.maxDelayMs || 30000,
      backoffMultiplier: retryConfig?.backoffMultiplier || 2,
      retryableStatusCodes: retryConfig?.retryableStatusCodes || [429, 500, 502, 503, 504],
      rateLimit: {
        maxRetriesPerWindow: retryConfig?.rateLimit?.maxRetriesPerWindow || 20,
        windowMs: retryConfig?.rateLimit?.windowMs || 60000,
      },
    };
  }

  /**
   * Выполняет задержку перед следующей попыткой
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Вычисляет задержку для следующей попытки с экспоненциальным backoff
   */
  private calculateDelay(
    attempt: number,
    initialDelayMs: number,
    maxDelayMs: number,
    backoffMultiplier: number,
  ): number {
    const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
    return Math.min(delay, maxDelayMs);
  }

  /**
   * Вспомогательная функция для безопасного доступа к свойствам объекта ошибки
   */
  private getErrorProperty(error: unknown, property: string): unknown {
    if (error && typeof error === 'object') {
      return (error as Record<string, unknown>)[property];
    }
    return undefined;
  }

  /**
   * Проверяет, является ли ошибка retryable (можно ли повторить запрос)
   */
  private isRetryableError(error: unknown, retryableStatusCodes: number[]): boolean {
    // Проверяем статус код HTTP ошибки (работает для всех типов ошибок, включая OpenAI.APIError)
    const statusCode = this.getStatusCode(error);
    if (statusCode && retryableStatusCodes.includes(statusCode)) {
      return true;
    }

    // Проверяем специфичные случаи для OpenAI SDK
    if (error instanceof OpenAI.APIError) {
      // Timeout ошибки (проверяем по сообщению, так как нет отдельного статус-кода)
      const message = this.getErrorMessage(error);
      if (message?.toLowerCase().includes('timeout')) {
        return true;
      }
    }

    // Network errors обычно можно повторить
    const code = this.getErrorProperty(error, 'code');
    if (typeof code === 'string' && RETRYABLE_NETWORK_ERROR_CODES.includes(code)) {
      return true;
    }

    return false;
  }

  /**
   * Получает статус код из ошибки
   * Проверяет различные возможные места, где может находиться статус код
   */
  private getStatusCode(error: unknown): number | null {
    // Проверяем напрямую свойство status
    const status = this.getErrorProperty(error, 'status');
    if (typeof status === 'number') {
      return status;
    }

    // Проверяем statusCode
    const statusCode = this.getErrorProperty(error, 'statusCode');
    if (typeof statusCode === 'number') {
      return statusCode;
    }

    // Проверяем вложенный response.status
    const response = this.getErrorProperty(error, 'response');
    if (response && typeof response === 'object') {
      const responseStatus = this.getErrorProperty(response, 'status');
      if (typeof responseStatus === 'number') {
        return responseStatus;
      }
    }

    return null;
  }

  /**
   * Безопасно извлекает текст сообщения ошибки
   */
  private getErrorMessage(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.message;
    }

    const message = this.getErrorProperty(error, 'message');
    return typeof message === 'string' ? message : undefined;
  }

  /**
   * Очищает старые записи ретраев из окна времени
   */
  private cleanupRetryTimestamps(windowMs: number): void {
    const now = Date.now();
    const cutoff = now - windowMs;
    this.retryTimestamps = this.retryTimestamps.filter((timestamp) => timestamp > cutoff);

    // Ограничиваем размер массива для предотвращения утечки памяти
    // Оставляем только последние maxRetriesPerWindow * 2 записей
    const maxSize = 1000; // Максимальный размер массива
    if (this.retryTimestamps.length > maxSize) {
      this.retryTimestamps = this.retryTimestamps.slice(-maxSize);
    }
  }

  /**
   * Проверяет, не превышен ли лимит ретраев
   */
  private isRateLimitExceeded(maxRetriesPerWindow: number, windowMs: number): boolean {
    this.cleanupRetryTimestamps(windowMs);
    return this.retryTimestamps.length >= maxRetriesPerWindow;
  }

  /**
   * Регистрирует попытку ретрая
   */
  private registerRetryAttempt(): void {
    this.retryTimestamps.push(Date.now());
  }

  async promptWithError(
    promptTemplate: string,
    counterpartyData?: string,
    options?: IChatGptPromptOptions,
    invoiceFileId?: string,
  ): Promise<IChatGptPromptResult> {
    // Получаем настройки retries из опций или используем дефолтные
    const retryConfig = {
      maxAttempts: options?.retries?.maxAttempts ?? this.defaultRetryConfig.maxAttempts,
      initialDelayMs: options?.retries?.initialDelayMs ?? this.defaultRetryConfig.initialDelayMs,
      maxDelayMs: options?.retries?.maxDelayMs ?? this.defaultRetryConfig.maxDelayMs,
      backoffMultiplier: options?.retries?.backoffMultiplier ?? this.defaultRetryConfig.backoffMultiplier,
      retryableStatusCodes: this.defaultRetryConfig.retryableStatusCodes,
      rateLimit: this.defaultRetryConfig.rateLimit,
    };

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        if (attempt === 1) {
          this.logger.log('Start request to chatgpt');
        } else {
          this.logger.warn(`Retry attempt ${attempt}/${retryConfig.maxAttempts} for ChatGPT request`);
        }

        // Примечание: Responses API не поддерживает max_tokens и temperature напрямую
        // Эти параметры игнорируются, но оставлены в интерфейсе для совместимости
        const stream = await this.openaiInstance.responses.create({
          model: options?.model || this.chatGptModel,
          tools: [
            {
              type: 'web_search_preview',
            },
          ],
          input: [
            {
              role: ChatMessageRole.SYSTEM,
              content: promptTemplate,
            },
            {
              role: ChatMessageRole.USER,
              content: invoiceFileId
                ? [
                    {
                      type: 'input_file',
                      file_id: invoiceFileId,
                    },
                  ]
                : `Counterparty data for analysis (JSON):\n${counterpartyData}`,
            },
          ],
          stream: true,
        });

        // Обрабатываем стрим: собираем все чанки в один полный ответ
        let fullResponse = '';
        for await (const event of stream) {
          // Обрабатываем события с текстовыми дельтами
          if (event.type === 'response.output_text.delta') {
            fullResponse += event.delta;
          }
          // Обрабатываем финальное событие с полным текстом
          else if (event.type === 'response.output_text.done') {
            // В done событии может быть полный текст, но обычно мы уже собрали его из delta
            // Используем text из done только если fullResponse пустой
            if (!fullResponse && event.text) {
              fullResponse = event.text;
            }
          }
        }

        this.logger.log(`Stream processed, full response length: ${fullResponse.length}`);

        if (attempt > 1) {
          this.logger.log(`ChatGPT request succeeded on attempt ${attempt}`);
        } else {
          this.logger.log('Finish request to chatgpt');
        }

        return {
          text: fullResponse || null,
        };
      } catch (err: unknown) {
        lastError = err;
        const statusCode = this.getStatusCode(err);
        const isRetryable = this.isRetryableError(err, retryConfig.retryableStatusCodes);

        this.logger.error(
          `ChatGPT request failed (attempt ${attempt}/${retryConfig.maxAttempts}): ${
            (err instanceof Error ? err.message : JSON.stringify(err)) || JSON.stringify(err)
          }${statusCode ? ` [Status: ${statusCode}]` : ''}`,
        );

        // Если это последняя попытка или ошибка не retryable, выходим
        if (attempt === retryConfig.maxAttempts || !isRetryable) {
          if (!isRetryable) {
            this.logger.error('Error is not retryable, stopping retries');
          } else {
            this.logger.error(`All ${retryConfig.maxAttempts} attempts exhausted`);
          }
          break;
        }

        // Проверяем rate limit перед следующим ретраем
        this.cleanupRetryTimestamps(retryConfig.rateLimit.windowMs);
        if (this.isRateLimitExceeded(retryConfig.rateLimit.maxRetriesPerWindow, retryConfig.rateLimit.windowMs)) {
          // Если превышен лимит, вычисляем время ожидания
          if (this.retryTimestamps.length > 0) {
            const oldestTimestamp = this.retryTimestamps[0];
            const elapsed = Date.now() - oldestTimestamp;
            const remainingWindowMs = Math.max(0, retryConfig.rateLimit.windowMs - elapsed);

            this.logger.warn(
              `Rate limit exceeded: ${retryConfig.rateLimit.maxRetriesPerWindow} retries per ${retryConfig.rateLimit.windowMs}ms. Waiting ${remainingWindowMs}ms before allowing more retries.`,
            );

            if (remainingWindowMs > 0) {
              await this.delay(remainingWindowMs);
            }

            // После ожидания очищаем старые записи и проверяем снова
            this.cleanupRetryTimestamps(retryConfig.rateLimit.windowMs);
            if (this.isRateLimitExceeded(retryConfig.rateLimit.maxRetriesPerWindow, retryConfig.rateLimit.windowMs)) {
              this.logger.error(`Rate limit still exceeded after waiting. Stopping retries for this request.`);
              break;
            }
          }
        }

        // Регистрируем попытку ретрая ПОСЛЕ проверки rate limit
        this.registerRetryAttempt();

        // Вычисляем задержку перед следующей попыткой
        const delayMs = this.calculateDelay(
          attempt,
          retryConfig.initialDelayMs,
          retryConfig.maxDelayMs,
          retryConfig.backoffMultiplier,
        );

        this.logger.log(`Waiting ${delayMs}ms before retry attempt ${attempt + 1}`);
        await this.delay(delayMs);
      }
    }

    // Если все попытки исчерпаны, возвращаем ошибку с информацией
    let errorMessage: string;
    if (lastError instanceof Error) {
      errorMessage = lastError.message;
    } else if (lastError && typeof lastError === 'object' && 'response' in lastError) {
      const errorWithResponse = lastError as { response?: { data?: unknown } };
      errorMessage = JSON.stringify(errorWithResponse.response?.data || lastError);
    } else {
      errorMessage = JSON.stringify(lastError);
    }
    const finalStatusCode = this.getStatusCode(lastError);

    this.logger.error(`ChatGPT request failed after ${retryConfig.maxAttempts} attempts: ${errorMessage}`);

    return {
      text: null,
      error: {
        message: errorMessage,
        statusCode: finalStatusCode || undefined,
        attempts: retryConfig.maxAttempts,
      },
    };
  }

  async addAnalyzeCounterpartyToQueue(
    formPaymentId: string,
    promptTemplate: string,
    counterpartyData: string,
    requestCount?: number,
  ): Promise<JobId> {
    if (!this.chatGptQueue) {
      throw new Error('ChatGPT queue is not initialized. Make sure ChatGptQueueModule is imported.');
    }

    const job = await this.chatGptQueue.add(ChatGptPattern.ANALYZE_COUNTERPARTY, {
      formPaymentId,
      promptTemplate,
      counterpartyData,
      requestCount,
    });

    this.logger.log(`Added ChatGPT analysis job to queue for form payment ${formPaymentId}, jobId: ${job.id}`);

    return String(job.id);
  }

  /**
   * Загружает файл в OpenAI Files API
   */
  async uploadFile(buffer: Buffer, fileName: string, mimeType: string): Promise<{ id: string }> {
    try {
      this.logger.log(`Uploading file to OpenAI: ${fileName} (${mimeType})`);

      const uploadableFile = await toFile(buffer, fileName, { type: mimeType });
      const file = await this.openaiInstance.files.create({
        file: uploadableFile,
        purpose: 'assistants',
      });

      this.logger.log(`File uploaded successfully: ${file.id}`);
      return { id: file.id };
    } catch (error: unknown) {
      this.logger.error(`Failed to upload file to OpenAI: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Удаляет файл из OpenAI Files API
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      this.logger.log(`Deleting file from OpenAI: ${fileId}`);
      await this.openaiInstance.files.del(fileId);
      this.logger.log(`File deleted successfully: ${fileId}`);
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to delete file from OpenAI: ${fileId}. Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Не пробрасываем ошибку, так как удаление файла не критично
    }
  }
}
