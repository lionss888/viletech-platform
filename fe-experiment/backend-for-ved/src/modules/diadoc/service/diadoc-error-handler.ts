import { Injectable, Logger } from '@nestjs/common';
import { DiadocError, DiadocErrorCode } from './diadoc.service.interface';

/**
 * Детальная информация об ошибке Diadoc
 */
export interface DiadocErrorDetails {
  code: DiadocErrorCode;
  message: string;
  httpStatus?: number;
  retryable: boolean;
  retryAfter?: number;
  userMessage: string;
  technicalDetails?: string;
}

/**
 * VF-2: Централизованный обработчик ошибок Diadoc API
 * Классифицирует ошибки, генерирует понятные сообщения и определяет стратегию обработки
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
@Injectable()
export class DiadocErrorHandler {
  private readonly logger: Logger = new Logger(DiadocErrorHandler.name);

  /**
   * Маппинг HTTP статусов на коды ошибок
   */
  private readonly httpStatusToErrorCode: Record<number, DiadocErrorCode> = {
    400: DiadocErrorCode.INVALID_REQUEST,
    401: DiadocErrorCode.AUTH_ERROR,
    403: DiadocErrorCode.ACCESS_DENIED,
    404: DiadocErrorCode.DOCUMENT_NOT_FOUND,
    409: DiadocErrorCode.ALREADY_SIGNED,
    413: DiadocErrorCode.FILE_TOO_LARGE,
    429: DiadocErrorCode.RATE_LIMIT_EXCEEDED,
    500: DiadocErrorCode.INTERNAL_ERROR,
    502: DiadocErrorCode.SERVICE_UNAVAILABLE,
    503: DiadocErrorCode.SERVICE_UNAVAILABLE,
    504: DiadocErrorCode.TIMEOUT,
  };

  /**
   * Пользовательские сообщения для кодов ошибок
   */
  private readonly userMessages: Record<DiadocErrorCode, string> = {
    [DiadocErrorCode.UNKNOWN]: 'Произошла неизвестная ошибка при работе с Диадоком',
    [DiadocErrorCode.AUTH_ERROR]: 'Ошибка аутентификации в Диадоке. Проверьте настройки авторизации',
    [DiadocErrorCode.INVALID_TOKEN]: 'Недействительный токен авторизации',
    [DiadocErrorCode.TOKEN_EXPIRED]: 'Срок действия токена истёк. Требуется повторная авторизация',
    [DiadocErrorCode.INVALID_API_CLIENT_ID]: 'Неверный ключ разработчика (API Client ID)',
    [DiadocErrorCode.BOX_NOT_FOUND]: 'Ящик организации не найден в Диадоке',
    [DiadocErrorCode.DOCUMENT_NOT_FOUND]: 'Документ не найден в Диадоке',
    [DiadocErrorCode.MESSAGE_NOT_FOUND]: 'Сообщение не найдено в Диадоке',
    [DiadocErrorCode.COUNTERPARTY_NOT_FOUND]: 'Контрагент не найден в Диадоке. Проверьте ИНН',
    [DiadocErrorCode.ACCESS_DENIED]: 'Недостаточно прав для выполнения операции',
    [DiadocErrorCode.INVALID_DOCUMENT_FORMAT]: 'Неверный формат документа',
    [DiadocErrorCode.FILE_TOO_LARGE]: 'Размер файла превышает допустимый лимит',
    [DiadocErrorCode.RATE_LIMIT_EXCEEDED]: 'Превышен лимит запросов к API Диадока. Попробуйте позже',
    [DiadocErrorCode.SERVICE_UNAVAILABLE]: 'Сервис Диадок временно недоступен. Попробуйте позже',
    [DiadocErrorCode.INTERNAL_ERROR]: 'Внутренняя ошибка сервера Диадок',
    [DiadocErrorCode.TIMEOUT]: 'Превышено время ожидания ответа от Диадока',
    [DiadocErrorCode.NETWORK_ERROR]: 'Ошибка сети при подключении к Диадоку',
    [DiadocErrorCode.INVALID_REQUEST]: 'Неверные параметры запроса',
    [DiadocErrorCode.ALREADY_SIGNED]: 'Документ уже подписан',
    [DiadocErrorCode.ALREADY_REJECTED]: 'Документ уже отклонён',
  };

  /**
   * Определяет, является ли ошибка временной
   */
  private readonly retryableCodes = new Set<DiadocErrorCode>([
    DiadocErrorCode.RATE_LIMIT_EXCEEDED,
    DiadocErrorCode.SERVICE_UNAVAILABLE,
    DiadocErrorCode.TIMEOUT,
    DiadocErrorCode.NETWORK_ERROR,
    DiadocErrorCode.INTERNAL_ERROR,
  ]);

  /**
   * Классифицирует ошибку на основе HTTP ответа
   */
  classifyError(error: any, context?: string): DiadocErrorDetails {
    const httpStatus = error?.response?.status;
    const responseData = error?.response?.data;
    const isTimeout = error?.name === 'TimeoutError' || error?.message?.includes('timeout');
    const isNetworkError = !error?.response && error?.code;

    // Определяем код ошибки
    let code: DiadocErrorCode;

    if (isTimeout) {
      code = DiadocErrorCode.TIMEOUT;
    } else if (isNetworkError) {
      code = DiadocErrorCode.NETWORK_ERROR;
    } else if (httpStatus && this.httpStatusToErrorCode[httpStatus]) {
      code = this.httpStatusToErrorCode[httpStatus];
    } else if (httpStatus && httpStatus >= 500) {
      code = DiadocErrorCode.INTERNAL_ERROR;
    } else if (httpStatus && httpStatus >= 400) {
      code = DiadocErrorCode.INVALID_REQUEST;
    } else {
      code = DiadocErrorCode.UNKNOWN;
    }

    // Уточняем код ошибки на основе содержимого ответа
    code = this.refineErrorCode(code, responseData);

    // Извлекаем сообщение об ошибке
    const technicalMessage = this.extractErrorMessage(responseData, error);

    // Получаем время ожидания для retry
    const retryAfter = this.extractRetryAfter(error?.response?.headers);

    const details: DiadocErrorDetails = {
      code,
      message: technicalMessage,
      httpStatus,
      retryable: this.retryableCodes.has(code),
      retryAfter,
      userMessage: this.userMessages[code],
      technicalDetails: context ? `Context: ${context}. ${technicalMessage}` : technicalMessage,
    };

    this.logger.warn(`Classified Diadoc error: code=${code}, httpStatus=${httpStatus}, retryable=${details.retryable}`, {
      code,
      httpStatus,
      retryable: details.retryable,
      context,
      message: technicalMessage,
    });

    return details;
  }

  /**
   * Уточняет код ошибки на основе содержимого ответа
   */
  private refineErrorCode(code: DiadocErrorCode, responseData: any): DiadocErrorCode {
    if (!responseData) {
      return code;
    }

    const message = (responseData.message || responseData.Message || '').toLowerCase();
    const errorCode = responseData.errorCode || responseData.ErrorCode || '';

    // Проверяем специфичные сообщения об ошибках
    if (message.includes('token') && message.includes('expired')) {
      return DiadocErrorCode.TOKEN_EXPIRED;
    }

    if (message.includes('token') && (message.includes('invalid') || message.includes('недействительн'))) {
      return DiadocErrorCode.INVALID_TOKEN;
    }

    if (message.includes('api_client_id') || message.includes('client_id')) {
      return DiadocErrorCode.INVALID_API_CLIENT_ID;
    }

    if (message.includes('box') && message.includes('not found')) {
      return DiadocErrorCode.BOX_NOT_FOUND;
    }

    if (message.includes('message') && message.includes('not found')) {
      return DiadocErrorCode.MESSAGE_NOT_FOUND;
    }

    if (message.includes('counterparty') || message.includes('контрагент')) {
      return DiadocErrorCode.COUNTERPARTY_NOT_FOUND;
    }

    if (message.includes('already signed') || message.includes('уже подписан')) {
      return DiadocErrorCode.ALREADY_SIGNED;
    }

    if (message.includes('already rejected') || message.includes('уже отклонен')) {
      return DiadocErrorCode.ALREADY_REJECTED;
    }

    if (message.includes('file size') || message.includes('too large') || message.includes('размер файла')) {
      return DiadocErrorCode.FILE_TOO_LARGE;
    }

    if (message.includes('format') || message.includes('invalid document') || message.includes('неверный формат')) {
      return DiadocErrorCode.INVALID_DOCUMENT_FORMAT;
    }

    return code;
  }

  /**
   * Извлекает сообщение об ошибке из ответа
   */
  private extractErrorMessage(responseData: any, error: any): string {
    if (responseData?.message) {
      return responseData.message;
    }

    if (responseData?.Message) {
      return responseData.Message;
    }

    if (responseData?.error?.message) {
      return responseData.error.message;
    }

    if (responseData?.error) {
      return typeof responseData.error === 'string' ? responseData.error : JSON.stringify(responseData.error);
    }

    if (error?.message) {
      return error.message;
    }

    return 'Unknown error';
  }

  /**
   * Извлекает время ожидания из заголовка Retry-After
   */
  private extractRetryAfter(headers: any): number | undefined {
    if (!headers) {
      return undefined;
    }

    const retryAfter = headers['retry-after'] || headers['Retry-After'];
    if (!retryAfter) {
      return undefined;
    }

    // Может быть числом секунд
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }

    // Или датой
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }

    return undefined;
  }

  /**
   * Создаёт DiadocError из деталей ошибки
   */
  createError(details: DiadocErrorDetails, originalError?: Error): DiadocError {
    return new DiadocError(
      details.message,
      details.code,
      details.httpStatus,
      details.retryable,
      details.retryAfter,
      originalError,
    );
  }

  /**
   * Обрабатывает ошибку и возвращает DiadocError
   */
  handleError(error: any, context?: string): DiadocError {
    const details = this.classifyError(error, context);
    return this.createError(details, error instanceof Error ? error : undefined);
  }

  /**
   * Проверяет, нужно ли повторить запрос
   */
  shouldRetry(error: any): boolean {
    if (error instanceof DiadocError) {
      return error.retryable;
    }

    const details = this.classifyError(error);
    return details.retryable;
  }

  /**
   * Получает рекомендуемую задержку перед повторным запросом
   */
  getRetryDelay(error: any, attempt: number): number {
    if (error instanceof DiadocError && error.retryAfter) {
      return error.retryAfter;
    }

    const details = this.classifyError(error);
    if (details.retryAfter) {
      return details.retryAfter;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }

  /**
   * Получает пользовательское сообщение для кода ошибки
   */
  getUserMessage(code: DiadocErrorCode): string {
    return this.userMessages[code] || this.userMessages[DiadocErrorCode.UNKNOWN];
  }

  /**
   * Логирует ошибку с контекстом
   */
  logError(error: any, context: string, additionalInfo?: Record<string, any>): void {
    const details = error instanceof DiadocError
      ? {
          code: error.code,
          message: error.message,
          httpStatus: error.httpStatus,
          retryable: error.retryable,
        }
      : this.classifyError(error, context);

    this.logger.error(`Diadoc error in ${context}: ${details.message}`, {
      ...details,
      ...additionalInfo,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
