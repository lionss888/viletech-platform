/**
 * VF-2: Статусы документов в Diadoc
 * Маппинг внутренних статусов на статусы Diadoc API
 * @see https://developer.kontur.ru/doc/diadoc-api
 */
export enum DiadocDocumentStatus {
  /** Черновик - документ создан, но не отправлен */
  DRAFT = 'draft',
  /** Отправлен - документ отправлен получателю */
  SENT = 'sent',
  /** Ожидает подписи получателя */
  WAITING_FOR_RECIPIENT_SIGNATURE = 'waiting_for_recipient_signature',
  /** Подписан - документ подписан получателем */
  SIGNED = 'signed',
  /** Отклонён - получатель отклонил документ */
  REJECTED = 'rejected',
  /** Отменён - документ был отменён */
  CANCELLED = 'cancelled',
  /** Ошибка - произошла ошибка при обработке */
  ERROR = 'error',
  /** Неизвестный статус */
  UNKNOWN = 'unknown',
}

/**
 * Статусы документов из Diadoc API (BilateralDocumentStatus)
 * @see https://developer.kontur.ru/doc/diadoc-api/proto/obsolete/BilateralDocumentMetadata.html
 */
export enum DiadocApiDocumentStatus {
  UnknownBilateralDocumentStatus = 'UnknownBilateralDocumentStatus',
  OutboundWaitingForRecipientSignature = 'OutboundWaitingForRecipientSignature',
  OutboundWithRecipientSignature = 'OutboundWithRecipientSignature',
  OutboundRecipientSignatureRequestRejected = 'OutboundRecipientSignatureRequestRejected',
  OutboundWaitingForSenderSignature = 'OutboundWaitingForSenderSignature',
  OutboundInvalidSenderSignature = 'OutboundInvalidSenderSignature',
  InboundWaitingForRecipientSignature = 'InboundWaitingForRecipientSignature',
  InboundWithRecipientSignature = 'InboundWithRecipientSignature',
  InboundRecipientSignatureRequestRejected = 'InboundRecipientSignatureRequestRejected',
  InboundInvalidRecipientSignature = 'InboundInvalidRecipientSignature',
  InternalWaitingForRecipientSignature = 'InternalWaitingForRecipientSignature',
  InternalWithRecipientSignature = 'InternalWithRecipientSignature',
  InternalRecipientSignatureRequestRejected = 'InternalRecipientSignatureRequestRejected',
}

/**
 * Коды ошибок Diadoc API
 */
export enum DiadocErrorCode {
  /** Неизвестная ошибка */
  UNKNOWN = 'UNKNOWN',
  /** Ошибка аутентификации */
  AUTH_ERROR = 'AUTH_ERROR',
  /** Недействительный токен */
  INVALID_TOKEN = 'INVALID_TOKEN',
  /** Токен истёк */
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  /** Недействительный ключ разработчика */
  INVALID_API_CLIENT_ID = 'INVALID_API_CLIENT_ID',
  /** Ящик не найден */
  BOX_NOT_FOUND = 'BOX_NOT_FOUND',
  /** Документ не найден */
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  /** Сообщение не найдено */
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  /** Контрагент не найден */
  COUNTERPARTY_NOT_FOUND = 'COUNTERPARTY_NOT_FOUND',
  /** Недостаточно прав */
  ACCESS_DENIED = 'ACCESS_DENIED',
  /** Неверный формат документа */
  INVALID_DOCUMENT_FORMAT = 'INVALID_DOCUMENT_FORMAT',
  /** Превышен лимит размера файла */
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  /** Превышен лимит запросов (rate limiting) */
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  /** Сервис временно недоступен */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** Внутренняя ошибка сервера */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  /** Таймаут запроса */
  TIMEOUT = 'TIMEOUT',
  /** Сетевая ошибка */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Неверные параметры запроса */
  INVALID_REQUEST = 'INVALID_REQUEST',
  /** Документ уже подписан */
  ALREADY_SIGNED = 'ALREADY_SIGNED',
  /** Документ уже отклонён */
  ALREADY_REJECTED = 'ALREADY_REJECTED',
}

/**
 * Информация об организации из Diadoc
 */
export interface DiadocOrganization {
  orgId: string;
  inn: string;
  kpp?: string;
  fullName: string;
  shortName?: string;
  boxes: DiadocBox[];
}

/**
 * Информация о ящике организации
 */
export interface DiadocBox {
  boxId: string;
  title: string;
}

/**
 * Результат загрузки документа
 *
 * Терминология Diadoc API:
 * - MessageId: ID сообщения (контейнер для документов и подписей)
 * - EntityId: ID сущности внутри сообщения (документ, подпись, печатная форма)
 *
 * Примечание: documentId - внутренний термин для обратной совместимости,
 * в Diadoc API такого понятия нет (это алиас messageId).
 *
 * @see https://developer.kontur.ru/doc/diadoc-api/http/PostMessage.html
 */
export interface DiadocUploadResult {
  /** ID сообщения в Diadoc (контейнер) */
  messageId: string;
  /** @deprecated Используйте messageId. Оставлено для обратной совместимости */
  documentId?: string;
  /** ID сущности документа внутри сообщения */
  entityId?: string;
}

/**
 * Информация о документе
 *
 * Терминология Diadoc API:
 * - MessageId: ID сообщения
 * - EntityId: ID сущности (документ, подпись)
 *
 * @see https://developer.kontur.ru/doc/diadoc-api/http/GetMessage.html
 */
export interface DiadocDocumentInfo {
  /** ID сообщения в Diadoc */
  messageId: string;
  /** @deprecated Используйте messageId или entityId. Оставлено для обратной совместимости */
  documentId: string;
  /** ID сущности документа */
  entityId?: string;
  /** Статус документа */
  status: DiadocDocumentStatus;
  /** Имя файла */
  fileName?: string;
  /** Дата создания */
  createdAt?: Date;
  /** Дата подписания */
  signedAt?: Date;
  /** Дата отклонения */
  rejectedAt?: Date;
  /** Причина отклонения */
  rejectionReason?: string;
}

/**
 * Метрики сервиса Diadoc
 */
export interface DiadocMetrics {
  documentsSent: {
    paymentOrder: number;
    report: number;
    contract: number;
  };
  documentsSigned: number;
  documentsRejected: number;
  errors: {
    temporary: number;
    permanent: number;
    timeout: number;
    auth: number;
    rateLimit: number;
  };
  requestDurations: {
    authenticate: number[];
    uploadDocument: number[];
    sendForSigning: number[];
    getDocumentStatus: number[];
    getSignedDocument: number[];
    getOrganizationByInn: number[];
  };
  lastUpdated?: Date;
}

/**
 * Результат проверки здоровья сервиса
 */
export interface DiadocHealthStatus {
  enabled: boolean;
  configured: boolean;
  apiReachable: boolean;
  authenticated: boolean;
  lastCheck: Date;
  error?: string;
}

/**
 * Интерфейс сервиса Diadoc
 */
export interface IDiadocService {
  /**
   * Аутентификация в Diadoc API
   * Получает авторизационный токен для дальнейших запросов
   * @returns Авторизационный токен (ddauth_token)
   * @throws {DiadocError} При ошибке аутентификации
   */
  authenticate(): Promise<string>;

  /**
   * Загрузка документа в Diadoc и отправка получателю
   * Использует метод PostMessage V3
   * @param fileBuffer - буфер файла
   * @param fileName - имя файла
   * @param mimeType - MIME тип файла
   * @param recipientBoxId - ID ящика получателя (если нужно отправить контрагенту)
   * @param needRecipientSignature - требуется ли подпись получателя (по умолчанию true при наличии recipientBoxId)
   * @param comment - комментарий к документу (опционально)
   * @param customDocumentId - пользовательский ID документа (опционально)
   * @returns Результат загрузки с ID сообщения и документа
   * @throws {DiadocError} При ошибке загрузки
   */
  uploadDocument(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    recipientBoxId?: string,
    needRecipientSignature?: boolean,
    comment?: string,
    customDocumentId?: string,
  ): Promise<DiadocUploadResult>;

  /**
   * Отправка документа на подписание
   * @param documentId - ID документа в Diadoc (messageId)
   * @param boxId - ID ящика отправителя (опционально, берётся из конфига)
   * @param recipientInn - ИНН получателя
   * @returns ID сообщения в Diadoc
   * @throws {DiadocError} При ошибке отправки
   */
  sendForSigning(documentId: string, boxId: string, recipientInn: string): Promise<string>;

  /**
   * Получение статуса документа
   * Использует метод GetMessage V6
   * @param messageId - ID сообщения в Diadoc
   * @param entityId - ID сущности (опционально)
   * @returns Статус документа
   * @throws {DiadocError} При ошибке получения статуса
   */
  getDocumentStatus(messageId: string, entityId?: string): Promise<DiadocDocumentStatus>;

  /**
   * Получение информации о документе
   * @param messageId - ID сообщения
   * @param entityId - ID сущности (опционально)
   * @returns Информация о документе
   */
  getDocumentInfo(messageId: string, entityId?: string): Promise<DiadocDocumentInfo>;

  /**
   * Получение подписанного документа
   * @param messageId - ID сообщения в Diadoc
   * @param entityId - ID сущности документа
   * @returns Буфер подписанного документа
   * @throws {DiadocError} При ошибке получения документа
   */
  getSignedDocument(messageId: string, entityId?: string): Promise<Buffer>;

  /**
   * Получение информации об организации по ИНН
   * Использует метод GetOrganizationsByInnKpp
   * @param inn - ИНН организации
   * @param kpp - КПП организации (опционально)
   * @returns Список организаций с указанным ИНН
   * @throws {DiadocError} При ошибке поиска
   */
  getOrganizationsByInn(inn: string, kpp?: string): Promise<DiadocOrganization[]>;

  /**
   * Получение BoxId организации по ИНН
   * @param inn - ИНН организации
   * @param kpp - КПП организации (опционально)
   * @returns BoxId первой найденной организации или null
   */
  getBoxIdByInn(inn: string, kpp?: string): Promise<string | null>;

  /**
   * Проверка здоровья сервиса
   * @returns Статус здоровья сервиса
   */
  checkHealth(): Promise<DiadocHealthStatus>;

  /**
   * Получить текущие метрики
   * @returns Объект с метриками сервиса
   */
  getMetrics(): DiadocMetrics;

  /**
   * Получить среднее время выполнения запросов по методу
   * @param method - Название метода
   * @returns Среднее время в миллисекундах
   */
  getAverageRequestDuration(method: keyof DiadocMetrics['requestDurations']): number;

  /**
   * Записать метрику отправки документа
   * @param type - Тип документа
   */
  recordDocumentSent(type: 'paymentOrder' | 'report' | 'contract'): void;

  /**
   * Записать метрику подписанного документа
   */
  recordDocumentSigned(): void;

  /**
   * Записать метрику отклонённого документа
   */
  recordDocumentRejected(): void;
}

/**
 * Класс ошибки Diadoc
 */
export class DiadocError extends Error {
  constructor(
    message: string,
    public readonly code: DiadocErrorCode,
    public readonly httpStatus?: number,
    public readonly retryable: boolean = false,
    public readonly retryAfter?: number,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'DiadocError';
  }

  /**
   * Проверяет, является ли ошибка временной
   */
  isTemporary(): boolean {
    return this.retryable;
  }

  /**
   * Получает время ожидания перед повторной попыткой
   */
  getRetryDelay(): number {
    return this.retryAfter || 1000;
  }
}
