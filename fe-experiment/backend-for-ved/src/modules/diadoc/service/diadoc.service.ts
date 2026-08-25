import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, Observable, throwError, timer } from 'rxjs';
import { retryWhen, mergeMap, catchError, timeout } from 'rxjs/operators';
import { AxiosResponse, AxiosError } from 'axios';
import {
  IDiadocService,
  DiadocDocumentStatus,
  DiadocApiDocumentStatus,
  DiadocMetrics,
  DiadocErrorCode,
  DiadocError,
  DiadocOrganization,
  DiadocUploadResult,
  DiadocDocumentInfo,
  DiadocHealthStatus,
} from './diadoc.service.interface';
import {
  DiadocMessageResponse,
  DiadocEntity,
  DiadocOrganizationsResponse,
  DiadocOrganizationResponse,
  DiadocPostMessageRequest,
  DiadocDocumentAttachment,
  isDiadocMessageResponse,
  isDiadocEntity,
  DiadocXmlDocumentType,
  IDiadocXmlGenerationResult,
} from '../types/diadoc-api.types';
import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import { DiadocXmlGeneratorService } from './diadoc-xml-generator.service';

/**
 * VF-2: Сервис для интеграции с Diadoc API
 * @see https://developer.kontur.ru/doc/diadoc-api
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
@Injectable()
export class DiadocService implements IDiadocService {
  private readonly logger: Logger = new Logger(DiadocService.name);

  // Конфигурация
  private readonly apiUrl: string;
  private readonly apiClientId: string;
  private readonly boxId: string;
  private readonly enabled: boolean;
  private readonly requestTimeout: number;
  private readonly maxRetries: number;
  private readonly initialRetryDelay = 1000; // 1 секунда
  private readonly maxRetryDelay = 30000; // 30 секунд

  // Кэш авторизационного токена
  private authToken: string | null = null;
  private authTokenExpiresAt: Date | null = null;

  // Кэш BoxId по ИНН
  private readonly boxIdCache = new Map<string, { boxId: string; expiresAt: Date }>();
  private readonly boxIdCacheTtl = 3600000; // 1 час

  // Счётчик использования Severity fallback для мониторинга
  private severityFallbackCount = 0;

  // Метрики в памяти
  private metrics: DiadocMetrics = {
    documentsSent: {
      paymentOrder: 0,
      report: 0,
      contract: 0,
    },
    documentsSigned: 0,
    documentsRejected: 0,
    errors: {
      temporary: 0,
      permanent: 0,
      timeout: 0,
      auth: 0,
      rateLimit: 0,
    },
    requestDurations: {
      authenticate: [],
      uploadDocument: [],
      sendForSigning: [],
      getDocumentStatus: [],
      getSignedDocument: [],
      getOrganizationByInn: [],
    },
    lastUpdated: new Date(),
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly xmlGeneratorService: DiadocXmlGeneratorService,
  ) {
    const diadocConfig = this.configService.get('diadoc');
    this.apiUrl = diadocConfig?.apiUrl || 'https://diadoc-api.kontur.ru';
    this.apiClientId = diadocConfig?.apiClientId || diadocConfig?.apiKey || '';
    this.boxId = diadocConfig?.boxId || '';
    this.enabled = diadocConfig?.enabled || false;
    this.requestTimeout = diadocConfig?.timeout || 60000;
    this.maxRetries = diadocConfig?.maxRetries || 3;

    // Если токен указан в конфиге, используем его
    if (diadocConfig?.authToken) {
      this.authToken = diadocConfig.authToken;
    }

    if (!this.enabled) {
      this.logger.warn('Diadoc integration is disabled');
    } else {
      this.logger.log('Diadoc integration initialized', {
        apiUrl: this.apiUrl,
        boxId: this.boxId ? '***' + this.boxId.slice(-4) : 'not set',
        apiClientId: this.apiClientId ? '***' + this.apiClientId.slice(-4) : 'not set',
      });
    }
  }

  /**
   * Аутентификация в Diadoc API
   * Получает авторизационный токен через endpoint /V3/Authenticate
   * @see https://developer.kontur.ru/doc/diadoc-api/authentication.html
   */
  async authenticate(): Promise<string> {
    this.validateEnabled();

    // Проверяем кэш токена
    if (this.authToken && this.authTokenExpiresAt && this.authTokenExpiresAt > new Date()) {
      return this.authToken;
    }

    const diadocConfig = this.configService.get('diadoc');
    const login = diadocConfig?.login;
    const password = diadocConfig?.password;

    // Если есть статический токен в конфиге
    if (diadocConfig?.authToken) {
      this.authToken = diadocConfig.authToken;
      return this.authToken;
    }

    // Если нет логина/пароля, выбрасываем ошибку
    if (!login || !password) {
      throw new DiadocError(
        'Diadoc authentication credentials are not configured. Please set DIADOC_AUTH_TOKEN or DIADOC_LOGIN/DIADOC_PASSWORD',
        DiadocErrorCode.AUTH_ERROR,
        undefined,
        false,
      );
    }

    this.logger.log('Authenticating with Diadoc API...');

    try {
      const response = await this.measureDuration(
        async () => {
          return firstValueFrom(
            this.httpService.post(
              `${this.apiUrl}/V3/Authenticate`,
              null,
              {
                params: { login, password },
                headers: {
                  'Authorization': this.getApiClientHeader(),
                  'Content-Type': 'application/json',
                },
                timeout: this.requestTimeout,
              },
            ),
          );
        },
        'authenticate',
      );

      this.authToken = response.data;
      // Токен действителен 24 часа, обновляем за час до истечения
      this.authTokenExpiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000);

      this.logger.log('Successfully authenticated with Diadoc API');
      return this.authToken;
    } catch (error) {
      this.metrics.errors.auth++;
      const diadocError = this.handleError(error, 'authenticate');
      throw diadocError;
    }
  }

  /**
   * Формирует заголовок с ключом разработчика (без токена)
   */
  private getApiClientHeader(): string {
    if (!this.apiClientId) {
      throw new DiadocError(
        'Diadoc API client ID is not configured. Please set DIADOC_API_CLIENT_ID',
        DiadocErrorCode.INVALID_API_CLIENT_ID,
        undefined,
        false,
      );
    }
    return `DiadocAuth ddauth_api_client_id=${this.apiClientId}`;
  }

  /**
   * Формирует полный заголовок Authorization для Diadoc API
   * Формат: DiadocAuth ddauth_api_client_id={clientId},ddauth_token={token}
   */
  private async getAuthHeader(): Promise<string> {
    const token = await this.authenticate();
    return `DiadocAuth ddauth_api_client_id=${this.apiClientId},ddauth_token=${token}`;
  }

  /**
   * Загрузка документа в Diadoc и отправка получателю
   * Использует метод PostMessage V3
   * 
   * **Назначение:**
   * Этот метод используется для загрузки готовых файлов (PDF, DOCX и т.д.) в Diadoc.
   * Используется для:
   * - Поручений на оплату (paymentOrder) - PDF файлы, сгенерированные системой
   * - Отчётов агента (report) - PDF файлы, сгенерированные системой
   * - Договоров (contract) - PDF файлы
   * - Других неформализованных документов
   *
   * **Для формализованных XML документов** (счета-фактуры, УПД, ТОРГ-12) используйте метод `uploadXmlDocument()`.
   *
   * @see https://developer.kontur.ru/doc/diadoc-api/http/PostMessage.html
   *
   * @param fileBuffer - буфер файла
   * @param fileName - имя файла
   * @param mimeType - MIME тип файла
   * @param recipientBoxId - ID ящика получателя (если нужно отправить контрагенту)
   * @param needRecipientSignature - требуется ли подпись получателя (по умолчанию true при наличии recipientBoxId)
   * @param comment - комментарий к документу (опционально)
   * @param customDocumentId - пользовательский ID документа (опционально)
   */
  async uploadDocument(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    recipientBoxId?: string,
    needRecipientSignature: boolean = true,
    comment?: string,
    customDocumentId?: string,
  ): Promise<DiadocUploadResult> {
    this.validateEnabled();

    this.logger.log(`Uploading document to Diadoc: fileName=${fileName}, mimeType=${mimeType}, size=${fileBuffer.length}`, {
      fileName,
      mimeType,
      size: fileBuffer.length,
      recipientBoxId: recipientBoxId ? '***' + recipientBoxId.slice(-4) : 'not set',
      needRecipientSignature,
    });

    const authHeader = await this.getAuthHeader();

    // Формируем тело запроса согласно документации PostMessage V3
    const content = fileBuffer.toString('base64');

    // Формируем DocumentAttachment согласно документации Diadoc API
    const documentAttachment: DiadocDocumentAttachment = {
      SignedContent: {
        Content: content,
      },
      TypeNamedId: 'Nonformalized', // Неформализованный документ
      FileName: fileName,
    };

    // VF-2: Добавляем NeedRecipientSignature для запроса подписи от контрагента
    if (recipientBoxId && needRecipientSignature) {
      documentAttachment.NeedRecipientSignature = true;
    }

    // Добавляем опциональные поля
    if (comment) {
      documentAttachment.Comment = comment;
    }
    if (customDocumentId) {
      documentAttachment.CustomDocumentId = customDocumentId;
    }

    const requestBody: DiadocPostMessageRequest = {
      FromBoxId: this.boxId,
      DocumentAttachments: [documentAttachment],
    };

    // VF-2: Если указан получатель, добавляем ToBoxId для отправки контрагенту
    if (recipientBoxId) {
      requestBody.ToBoxId = recipientBoxId;
    }

    const response = await this.measureDuration(
      () => this.executeWithRetry(
        this.httpService.post(`${this.apiUrl}/V3/PostMessage`, requestBody, {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }),
        {
          method: 'uploadDocument',
          fileName,
        },
      ),
      'uploadDocument',
    );

    // Парсим ответ
    const messageId = response.data?.MessageId;
    const entities = response.data?.Entities || [];
    const documentEntity = entities.find((e: DiadocEntity) => e.AttachmentType === 'Nonformalized' || e.EntityType === 'Attachment');
    const entityId = documentEntity?.EntityId;

    if (!messageId) {
      this.logger.error(`Unexpected response structure from Diadoc API: ${JSON.stringify(response.data)}`, {
        fileName,
        responseData: response.data,
      });
      throw new DiadocError(
        'Failed to get message ID from Diadoc API response',
        DiadocErrorCode.INVALID_REQUEST,
        undefined,
        false,
      );
    }

    this.logger.log(`Document uploaded to Diadoc successfully: messageId=${messageId}, entityId=${entityId}`, {
      messageId,
      entityId,
      fileName,
    });

    return {
      messageId,
      documentId: messageId, // Для обратной совместимости
      entityId,
    };
  }

  /**
   * VF-2: Загрузка XML документа в Diadoc
   * Генерирует XML документ указанного типа на основе данных FormPayment и отправляет его в Diadoc
   *
   * @param formPayment - данные заявки для генерации XML
   * @param documentType - тип XML документа (Invoice, Torg12, AcceptanceCertificate, УПД и т.д.)
   * @param recipientBoxId - ID ящика получателя (если нужно отправить контрагенту)
   * @param needRecipientSignature - требуется ли подпись получателя (по умолчанию true)
   * @param comment - комментарий к документу (опционально)
   * @returns результат загрузки документа
   */
  async uploadXmlDocument(
    formPayment: IFormPayment,
    documentType: DiadocXmlDocumentType,
    recipientBoxId?: string,
    needRecipientSignature: boolean = true,
    comment?: string,
  ): Promise<DiadocUploadResult> {
    this.validateEnabled();

    this.logger.log(`Uploading XML document to Diadoc: type=${documentType}, formPaymentId=${formPayment._id}`, {
      documentType,
      formPaymentId: formPayment._id,
      recipientBoxId: recipientBoxId ? '***' + recipientBoxId.slice(-4) : 'not set',
      needRecipientSignature,
    });

    // Генерируем XML документ
    let xmlResult: IDiadocXmlGenerationResult;
    try {
      xmlResult = await this.xmlGeneratorService.generateXml(documentType, formPayment);
      this.logger.log(`XML document generated: fileName=${xmlResult.fileName}, size=${xmlResult.size} bytes`);
    } catch (error) {
      this.logger.error(`Failed to generate XML document: ${error instanceof Error ? error.message : String(error)}`);
      throw new DiadocError(
        `Failed to generate XML document: ${error instanceof Error ? error.message : String(error)}`,
        DiadocErrorCode.INVALID_REQUEST,
        undefined,
        false,
      );
    }

    const authHeader = await this.getAuthHeader();

    // Конвертируем XML в Base64
    const content = Buffer.from(xmlResult.xmlContent, 'utf-8').toString('base64');

    // Определяем TypeNamedId на основе типа документа
    const typeNamedId = this.getTypeNamedIdForXmlDocument(documentType);

    // Формируем DocumentAttachment
    const documentAttachment: DiadocDocumentAttachment = {
      SignedContent: {
        Content: content,
      },
      TypeNamedId: typeNamedId,
      FileName: xmlResult.fileName,
    };

    // VF-2: Добавляем NeedRecipientSignature для запроса подписи от контрагента
    if (recipientBoxId && needRecipientSignature) {
      documentAttachment.NeedRecipientSignature = true;
    }

    // Добавляем комментарий если указан
    if (comment) {
      documentAttachment.Comment = comment;
    }

    const requestBody: DiadocPostMessageRequest = {
      FromBoxId: this.boxId,
      DocumentAttachments: [documentAttachment],
    };

    // VF-2: Если указан получатель, добавляем ToBoxId для отправки контрагенту
    if (recipientBoxId) {
      requestBody.ToBoxId = recipientBoxId;
    }

    const response = await this.measureDuration(
      () => this.executeWithRetry(
        this.httpService.post(`${this.apiUrl}/V3/PostMessage`, requestBody, {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }),
        {
          method: 'uploadXmlDocument',
          fileName: xmlResult.fileName,
        },
      ),
      'uploadDocument',
    );

    // Парсим ответ
    const messageId = response.data?.MessageId;
    const entities = response.data?.Entities || [];
    const documentEntity = entities.find((e: DiadocEntity) =>
      e.AttachmentType === typeNamedId || e.EntityType === 'Attachment'
    );
    const entityId = documentEntity?.EntityId;

    if (!messageId) {
      this.logger.error(`Unexpected response structure from Diadoc API: ${JSON.stringify(response.data)}`, {
        documentType,
        responseData: response.data,
      });
      throw new DiadocError(
        'Failed to get message ID from Diadoc API response',
        DiadocErrorCode.INVALID_REQUEST,
        undefined,
        false,
      );
    }

    this.logger.log(`XML document uploaded to Diadoc successfully: messageId=${messageId}, entityId=${entityId}`, {
      messageId,
      entityId,
      documentType,
      fileName: xmlResult.fileName,
    });

    return {
      messageId,
      documentId: messageId, // Для обратной совместимости
      entityId,
    };
  }

  /**
   * VF-2: Получает TypeNamedId для XML документа
   * @see https://developer.kontur.ru/doc/diadoc-api/
   */
  private getTypeNamedIdForXmlDocument(documentType: DiadocXmlDocumentType): string {
    // Маппинг типов документов на TypeNamedId в Diadoc API
    const typeMap: Record<DiadocXmlDocumentType, string> = {
      [DiadocXmlDocumentType.INVOICE]: 'Invoice',
      [DiadocXmlDocumentType.INVOICE_CORRECTION]: 'InvoiceCorrection',
      [DiadocXmlDocumentType.TORG12]: 'Torg12',
      [DiadocXmlDocumentType.ACCEPTANCE_CERTIFICATE]: 'AcceptanceCertificate',
      [DiadocXmlDocumentType.UNIVERSAL_TRANSFER_DOCUMENT]: 'UniversalTransferDocument',
      [DiadocXmlDocumentType.XML_TORG12]: 'XmlTorg12',
      [DiadocXmlDocumentType.XML_ACCEPTANCE_CERTIFICATE]: 'XmlAcceptanceCertificate',
      [DiadocXmlDocumentType.NONFORMALIZED]: 'Nonformalized',
    };

    return typeMap[documentType] || 'Nonformalized';
  }

  /**
   * Получение информации об организации по ИНН
   * Использует метод GetOrganizationsByInnKpp
   * @see https://developer.kontur.ru/doc/diadoc-api/http/GetOrganizationsByInnKpp.html
   */
  async getOrganizationsByInn(inn: string, kpp?: string): Promise<DiadocOrganization[]> {
    this.validateEnabled();

    this.logger.debug(`Getting organizations by INN: inn=${inn}, kpp=${kpp || 'not set'}`);

    const authHeader = await this.getAuthHeader();

    const params: Record<string, string> = { inn };
    if (kpp) {
      params.kpp = kpp;
    }

    const response = await this.measureDuration(
      () => this.executeWithRetry(
        this.httpService.get(`${this.apiUrl}/GetOrganizationsByInnKpp`, {
          params,
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json; charset=utf-8',
          },
        }),
        {
          method: 'getOrganizationsByInn',
        },
      ),
      'getOrganizationByInn',
    );

    const apiResponse = response.data as DiadocOrganizationsResponse;
    const organizations: DiadocOrganization[] = (apiResponse?.Organizations || []).map((org: DiadocOrganizationResponse) => ({
      orgId: org.OrgId,
      inn: org.Inn,
      kpp: org.Kpp,
      fullName: org.FullName,
      shortName: org.ShortName,
      boxes: (org.Boxes || []).map((box) => ({
        boxId: box.BoxId,
        title: box.Title || '',
      })),
    }));

    this.logger.debug(`Found ${organizations.length} organizations for INN=${inn}`);
    return organizations;
  }

  /**
   * Получение BoxId организации по ИНН
   * С кэшированием для оптимизации
   */
  async getBoxIdByInn(inn: string, kpp?: string): Promise<string | null> {
    const cacheKey = kpp ? `${inn}-${kpp}` : inn;

    // Проверяем кэш
    const cached = this.boxIdCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.boxId;
    }

    const organizations = await this.getOrganizationsByInn(inn, kpp);
    if (organizations.length === 0 || organizations[0].boxes.length === 0) {
      this.logger.warn(`No organization found for INN=${inn}`);
      return null;
    }

    const boxId = organizations[0].boxes[0].boxId;

    // Сохраняем в кэш
    this.boxIdCache.set(cacheKey, {
      boxId,
      expiresAt: new Date(Date.now() + this.boxIdCacheTtl),
    });

    return boxId;
  }

  /**
   * VF-2: Отправка документа на подписание контрагенту
   * Использует PostMessage для отправки документа с запросом подписи
   * @see https://developer.kontur.ru/doc/diadoc-api/http/PostMessage.html
   *
   * ВАЖНО: Для новых документов рекомендуется использовать uploadDocument с recipientBoxId,
   * что позволяет отправить документ и запросить подпись в одном вызове.
   *
   * Данный метод используется для пересылки существующего документа другому получателю.
   *
   * @param documentId - ID сообщения в Diadoc (messageId)
   * @param boxId - ID ящика отправителя (опционально, берётся из конфига)
   * @param recipientInn - ИНН получателя
   * @returns ID нового сообщения в Diadoc
   */
  async sendForSigning(documentId: string, boxId: string, recipientInn: string): Promise<string> {
    this.validateEnabled();

    if (!recipientInn) {
      throw new DiadocError(
        'Recipient INN is required',
        DiadocErrorCode.INVALID_REQUEST,
        undefined,
        false,
      );
    }

    this.logger.log(`Sending document for signing: documentId=${documentId}, recipientInn=${recipientInn}`, {
      documentId,
      recipientInn,
      boxId: boxId || this.boxId,
    });

    // Получаем BoxId получателя по ИНН
    const recipientBoxId = await this.getBoxIdByInn(recipientInn);
    if (!recipientBoxId) {
      throw new DiadocError(
        `Recipient organization not found for INN: ${recipientInn}`,
        DiadocErrorCode.COUNTERPARTY_NOT_FOUND,
        undefined,
        false,
      );
    }

    const authHeader = await this.getAuthHeader();
    const senderBoxId = boxId || this.boxId;

    // VF-2: Получаем содержимое документа из существующего сообщения
    const documentInfo = await this.getDocumentInfo(documentId);
    if (!documentInfo.entityId) {
      throw new DiadocError(
        `Document entity not found for messageId: ${documentId}`,
        DiadocErrorCode.DOCUMENT_NOT_FOUND,
        undefined,
        false,
      );
    }

    // Получаем содержимое документа
    const documentContent = await this.getSignedDocument(documentId, documentInfo.entityId);
    const content = documentContent.toString('base64');

    // VF-2: Используем PostMessage для отправки документа получателю с запросом подписи
    // Это правильный способ отправки документа контрагенту согласно документации Diadoc API
    // VF-2 FIX: Используем типизированный интерфейс вместо Record<string, any>
    const requestBody: DiadocPostMessageRequest = {
      FromBoxId: senderBoxId,
      ToBoxId: recipientBoxId, // VF-2 FIX: Указываем получателя
      DocumentAttachments: [
        {
          SignedContent: {
            Content: content,
          },
          TypeNamedId: 'Nonformalized',
          FileName: documentInfo.fileName || `document-${documentId}.pdf`,
          NeedRecipientSignature: true, // VF-2 FIX: Запрашиваем подпись получателя
        },
      ],
    };

    const response = await this.measureDuration(
      () => this.executeWithRetry(
        this.httpService.post(
          `${this.apiUrl}/V3/PostMessage`,
          requestBody,
          {
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json; charset=utf-8',
            },
          },
        ),
        {
          method: 'sendForSigning',
          documentId,
        },
      ),
      'sendForSigning',
    );

    const newMessageId = response.data?.MessageId;
    if (!newMessageId) {
      throw new DiadocError(
        'Failed to get message ID from Diadoc API response',
        DiadocErrorCode.INVALID_REQUEST,
        undefined,
        false,
      );
    }

    this.logger.log(`Document sent for signing: newMessageId=${newMessageId}, recipientBoxId=${recipientBoxId}`, {
      newMessageId,
      originalDocumentId: documentId,
      recipientInn,
      recipientBoxId,
    });

    return newMessageId;
  }

  /**
   * Получение статуса документа
   * Использует метод GetMessage V6
   * @see https://developer.kontur.ru/doc/diadoc-api/http/GetMessage.html
   */
  async getDocumentStatus(messageId: string, entityId?: string): Promise<DiadocDocumentStatus> {
    this.validateEnabled();

    this.logger.debug(`Getting document status: messageId=${messageId}, entityId=${entityId || 'not set'}`);

    const authHeader = await this.getAuthHeader();

    const params: Record<string, string> = {
      boxId: this.boxId,
      messageId,
    };
    if (entityId) {
      params.entityId = entityId;
    }

    const response = await this.measureDuration(
      () => this.executeWithRetry(
        this.httpService.get(`${this.apiUrl}/V6/GetMessage`, {
          params,
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json; charset=utf-8',
          },
        }),
        {
          method: 'getDocumentStatus',
          documentId: messageId,
        },
      ),
      'getDocumentStatus',
    );

    // VF-2 FIX: Извлекаем статус согласно документации Diadoc API
    // Используем RecipientResponseStatus вместо Severity
    const entities = response.data?.Entities || [];
    const documentEntity = entities.find((e: DiadocEntity) =>
      e.AttachmentType === 'Nonformalized' ||
      e.EntityType === 'Attachment' ||
      (entityId && e.EntityId === entityId),
    );

    // Приоритет извлечения статуса (от наиболее точного к менее точному):
    // 1. RecipientResponseStatus - статус ответа получателя
    // 2. DocflowStatus.PrimaryStatus.StatusText - текст статуса документооборота
    // 3. BilateralDocumentStatus - статус двустороннего документа
    // 4. DocumentInfo.RecipientResponseStatus
    // 5. Fallback на Severity (только как последний вариант)
    const docInfo = documentEntity?.DocumentInfo;
    const docflowStatus = docInfo?.DocflowStatus;

    let status: string | undefined;
    let statusSource = 'unknown';

    // Проверяем RecipientResponseStatus
    if (docInfo?.RecipientResponseStatus) {
      status = docInfo.RecipientResponseStatus;
      statusSource = 'RecipientResponseStatus';
    }
    // Проверяем BilateralDocumentStatus
    else if (docflowStatus?.BilateralDocumentStatus) {
      status = docflowStatus.BilateralDocumentStatus;
      statusSource = 'BilateralDocumentStatus';
    }
    // Проверяем PrimaryStatus.StatusText (читаемый статус)
    else if (docflowStatus?.PrimaryStatus?.StatusText) {
      status = docflowStatus.PrimaryStatus.StatusText;
      statusSource = 'StatusText';
    }
    // Fallback на Severity (менее надёжно) - только если нет других источников статуса
    else if (docflowStatus?.PrimaryStatus?.Severity) {
      status = docflowStatus.PrimaryStatus.Severity;
      statusSource = 'Severity (fallback)';
      
      // VF-2: Улучшенное логирование и метрика для мониторинга использования Severity fallback
      this.logger.warn(
        `Using Severity as fallback for status determination (not recommended): messageId=${messageId}, ` +
        `severity=${docflowStatus.PrimaryStatus.Severity}. ` +
        `This indicates that RecipientResponseStatus, BilateralDocumentStatus, and StatusText are not available. ` +
        `Consider checking API response structure or document status.`,
        {
          messageId,
          severity: docflowStatus.PrimaryStatus.Severity,
          statusText: docflowStatus.PrimaryStatus.StatusText,
          hasRecipientResponseStatus: !!docInfo?.RecipientResponseStatus,
          hasBilateralDocumentStatus: !!docflowStatus?.BilateralDocumentStatus,
        },
      );
      
      // Записываем метрику использования Severity fallback
      this.recordSeverityFallback();
    }
    // Последний fallback
    else {
      status = documentEntity?.Status || response.data?.Status;
      statusSource = 'Entity/Response Status (fallback)';
    }

    const mappedStatus = this.mapStatus(status);
    this.logger.debug(`Document status: messageId=${messageId}, status=${mappedStatus}`, {
      messageId,
      originalStatus: status,
      statusSource,
      mappedStatus,
    });

    return mappedStatus;
  }

  /**
   * Получение информации о документе
   */
  async getDocumentInfo(messageId: string, entityId?: string): Promise<DiadocDocumentInfo> {
    this.validateEnabled();

    const authHeader = await this.getAuthHeader();

    const params: Record<string, string> = {
      boxId: this.boxId,
      messageId,
    };
    if (entityId) {
      params.entityId = entityId;
    }

    const response = await this.executeWithRetry(
      this.httpService.get(`${this.apiUrl}/V6/GetMessage`, {
        params,
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json; charset=utf-8',
        },
      }),
      {
        method: 'getDocumentInfo',
        documentId: messageId,
      },
    );

    const entities = response.data?.Entities || [];
    const documentEntity = entities.find((e: DiadocEntity) =>
      e.AttachmentType === 'Nonformalized' ||
      e.EntityType === 'Attachment' ||
      (entityId && e.EntityId === entityId),
    );

    // VF-2 FIX: Используем улучшенное извлечение статуса
    const docInfo = documentEntity?.DocumentInfo;
    const docflowStatus = docInfo?.DocflowStatus;

    // Приоритет: RecipientResponseStatus -> BilateralDocumentStatus -> StatusText -> Severity
    const rawStatus = docInfo?.RecipientResponseStatus ||
                      docflowStatus?.BilateralDocumentStatus ||
                      docflowStatus?.PrimaryStatus?.StatusText ||
                      docflowStatus?.PrimaryStatus?.Severity;

    const status = this.mapStatus(rawStatus);

    return {
      messageId,
      documentId: documentEntity?.EntityId || messageId,
      entityId: documentEntity?.EntityId,
      status,
      fileName: documentEntity?.FileName,
      createdAt: response.data?.Timestamp ? new Date(response.data.Timestamp) : undefined,
    };
  }

  /**
   * VF-2 FIX: Получение подписанного документа
   * Использует точные критерии для выбора entity вместо эвристики
   * @see https://developer.kontur.ru/doc/diadoc-api/http/GetEntityContent.html
   */
  async getSignedDocument(messageId: string, entityId?: string): Promise<Buffer> {
    this.validateEnabled();

    this.logger.log(`Getting signed document: messageId=${messageId}, entityId=${entityId || 'not set'}`);

    const authHeader = await this.getAuthHeader();

    // VF-2 FIX: Если entityId не указан, находим подписанный документ по точным критериям
    let actualEntityId = entityId;
    if (!actualEntityId) {
      actualEntityId = await this.findSignedEntityId(messageId);
    }

    if (!actualEntityId) {
      throw new DiadocError(
        'Signed document entity not found. Ensure the document has been signed.',
        DiadocErrorCode.DOCUMENT_NOT_FOUND,
        undefined,
        false,
      );
    }

    const response = await this.measureDuration(
      () => this.executeWithRetry(
        this.httpService.get(`${this.apiUrl}/V4/GetEntityContent`, {
          params: {
            boxId: this.boxId,
            messageId,
            entityId: actualEntityId,
          },
          headers: {
            'Authorization': authHeader,
          },
          responseType: 'arraybuffer',
        }),
        {
          method: 'getSignedDocument',
          documentId: messageId,
        },
      ),
      'getSignedDocument',
    );

    if (!response.data) {
      throw new DiadocError(
        'Empty response from Diadoc API',
        DiadocErrorCode.INTERNAL_ERROR,
        undefined,
        false,
      );
    }

    const buffer = Buffer.from(response.data);
    this.logger.log(`Signed document retrieved: messageId=${messageId}, size=${buffer.length} bytes`);

    return buffer;
  }

  /**
   * VF-2 FIX: Поиск EntityId подписанного документа по точным критериям
   * Улучшенная версия с правильными приоритетами выбора
   * 
   * Приоритет выбора:
   * 1. PrintForm с наличием подписи (печатная форма подписанного документа)
   * 2. SignedContent (подписанный контент)
   * 3. Nonformalized документ с RecipientResponseStatus='Signed' и наличием подписи
   * 4. Первый Nonformalized документ (fallback)
   */
  private async findSignedEntityId(messageId: string): Promise<string | undefined> {
    const authHeader = await this.getAuthHeader();

    const response = await this.executeWithRetry(
      this.httpService.get(`${this.apiUrl}/V6/GetMessage`, {
        params: {
          boxId: this.boxId,
          messageId,
        },
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json; charset=utf-8',
        },
      }),
      {
        method: 'findSignedEntityId',
        documentId: messageId,
      },
    );

    const entities: DiadocEntity[] = response.data?.Entities || [];

    // Логируем найденные entities для отладки
    this.logger.debug(`Found ${entities.length} entities in message ${messageId}`, {
      entityTypes: entities.map(e => ({ 
        id: e.EntityId, 
        type: e.EntityType, 
        attachment: e.AttachmentType,
        hasSignature: entities.some(sig => sig.ParentEntityId === e.EntityId && sig.EntityType === 'Signature'),
      })),
    });

    // Вспомогательная функция для проверки наличия подписи
    const hasSignature = (entityId: string): boolean => {
      return entities.some((e: DiadocEntity) =>
        e.ParentEntityId === entityId && e.EntityType === 'Signature'
      );
    };

    // Приоритет 1: PrintForm с наличием подписи
    const printForm = entities.find((e: DiadocEntity) =>
      (e.EntityType === 'PrintForm' || e.AttachmentType === 'PrintForm') &&
      hasSignature(e.EntityId)
    );
    if (printForm?.EntityId) {
      this.logger.debug(`Found PrintForm entity with signature: ${printForm.EntityId}`);
      return printForm.EntityId;
    }

    // Если PrintForm без подписи - всё равно используем его (печатная форма обычно подписана)
    const printFormWithoutCheck = entities.find((e: DiadocEntity) =>
      e.EntityType === 'PrintForm' || e.AttachmentType === 'PrintForm'
    );
    if (printFormWithoutCheck?.EntityId) {
      this.logger.debug(`Found PrintForm entity (signature check skipped): ${printFormWithoutCheck.EntityId}`);
      return printFormWithoutCheck.EntityId;
    }

    // Приоритет 2: SignedContent (подписанный контент)
    const signedContent = entities.find((e: DiadocEntity) =>
      e.EntityType === 'SignedContent' || e.AttachmentType === 'SignedContent'
    );
    if (signedContent?.EntityId) {
      this.logger.debug(`Found SignedContent entity: ${signedContent.EntityId}`);
      return signedContent.EntityId;
    }

    // Приоритет 3: Nonformalized документ с RecipientResponseStatus='Signed' и наличием подписи
    const signedNonformalized = entities.find((e: DiadocEntity) =>
      (e.AttachmentType === 'Nonformalized' || e.EntityType === 'Attachment') &&
      (e.DocumentInfo?.RecipientResponseStatus === 'WithRecipientSignature' ||
       e.DocumentInfo?.RecipientResponseStatus === 'RecipientResponseStatus_Accepted' ||
       e.DocumentInfo?.RecipientResponseStatus === 'Signed') &&
      hasSignature(e.EntityId)
    );
    if (signedNonformalized?.EntityId) {
      this.logger.debug(`Found signed Nonformalized document by status and signature: ${signedNonformalized.EntityId}`);
      return signedNonformalized.EntityId;
    }

    // Приоритет 4: Первый Nonformalized документ с подписью (fallback)
    const documentWithSignature = entities.find((e: DiadocEntity) =>
      (e.AttachmentType === 'Nonformalized' || e.EntityType === 'Attachment') &&
      hasSignature(e.EntityId)
    );
    if (documentWithSignature?.EntityId) {
      this.logger.debug(`Found Nonformalized document with signature (fallback): ${documentWithSignature.EntityId}`);
      return documentWithSignature.EntityId;
    }

    // Последний fallback: первый Nonformalized документ без проверки подписи
    const firstNonformalized = entities.find((e: DiadocEntity) =>
      e.AttachmentType === 'Nonformalized' || e.EntityType === 'Attachment'
    );
    if (firstNonformalized?.EntityId) {
      this.logger.warn(
        `Using first Nonformalized document without signature verification (fallback): ${firstNonformalized.EntityId}. ` +
        `MessageId: ${messageId}. This may not be the signed document.`
      );
      return firstNonformalized.EntityId;
    }

    // Fallback: возвращаем первый доступный entity с предупреждением
    const fallbackEntity = entities[0];
    if (fallbackEntity?.EntityId) {
      this.logger.warn(
        `Using fallback entity selection for messageId=${messageId}. ` +
        `No signature entity found - document may not be signed yet. ` +
        `Consider checking document status before downloading.`,
      );
      return fallbackEntity.EntityId;
    }

    // Если ничего не найдено
    this.logger.error(`No suitable entity found for messageId=${messageId}. Available entities: ${entities.map(e => e.EntityId).join(', ')}`);
    return undefined;
  }

  /**
   * Проверка здоровья сервиса
   */
  async checkHealth(): Promise<DiadocHealthStatus> {
    const status: DiadocHealthStatus = {
      enabled: this.enabled,
      configured: Boolean(this.apiClientId && this.boxId),
      apiReachable: false,
      authenticated: false,
      lastCheck: new Date(),
    };

    if (!this.enabled) {
      status.error = 'Diadoc integration is disabled';
      return status;
    }

    if (!status.configured) {
      status.error = 'Diadoc is not properly configured';
      return status;
    }

    try {
      await this.authenticate();
      status.authenticated = true;
      status.apiReachable = true;
    } catch (error) {
      status.error = error instanceof Error ? error.message : String(error);
      if (error instanceof DiadocError && error.code !== DiadocErrorCode.AUTH_ERROR) {
        status.apiReachable = true;
      }
    }

    return status;
  }

  /**
   * Получить текущие метрики
   */
  getMetrics(): DiadocMetrics {
    this.metrics.lastUpdated = new Date();
    return { ...this.metrics };
  }

  /**
   * Получить среднее время выполнения запросов по методу
   */
  getAverageRequestDuration(method: keyof DiadocMetrics['requestDurations']): number {
    const durations = this.metrics.requestDurations[method];
    if (!durations || durations.length === 0) {
      return 0;
    }
    const sum = durations.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / durations.length);
  }

  /**
   * Записать метрику отправки документа
   */
  recordDocumentSent(type: 'paymentOrder' | 'report' | 'contract'): void {
    this.metrics.documentsSent[type]++;
    this.logger.log(`Document sent metric: type=${type}, total=${this.metrics.documentsSent[type]}`);
  }

  /**
   * Записать метрику подписанного документа
   */
  recordDocumentSigned(): void {
    this.metrics.documentsSigned++;
    this.logger.log(`Document signed metric: total=${this.metrics.documentsSigned}`);
  }

  /**
   * Записать метрику отклонённого документа
   */
  recordDocumentRejected(): void {
    this.metrics.documentsRejected++;
    this.logger.log(`Document rejected metric: total=${this.metrics.documentsRejected}`);
  }

  // ============ Приватные методы ============

  /**
   * Проверяет, что интеграция включена
   */
  private validateEnabled(): void {
    if (!this.enabled) {
      throw new DiadocError(
        'Diadoc integration is disabled',
        DiadocErrorCode.SERVICE_UNAVAILABLE,
        undefined,
        false,
      );
    }
  }

  /**
   * Проверяет, является ли ошибка временной (retryable)
   */
  private isRetryableError(error: any): boolean {
    // Сетевые ошибки
    if (!error.response) {
      return true;
    }

    const status = error.response?.status;

    // Rate limiting - retry с задержкой
    if (status === 429) {
      return true;
    }

    // Временные ошибки сервера (5xx)
    if (status >= 500 && status < 600) {
      return true;
    }

    // Клиентские ошибки (4xx) обычно не retry
    return false;
  }

  /**
   * Извлекает время задержки из заголовка Retry-After
   */
  private getRetryAfterDelay(error: any): number | null {
    const retryAfter = error.response?.headers?.['retry-after'];
    if (!retryAfter) {
      return null;
    }

    // Может быть числом секунд или датой
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }

    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }

    return null;
  }

  /**
   * Вычисляет задержку перед следующей попыткой retry (exponential backoff)
   */
  private calculateRetryDelay(attempt: number, error?: any): number {
    // Сначала проверяем Retry-After
    const retryAfter = this.getRetryAfterDelay(error);
    if (retryAfter !== null) {
      return Math.min(retryAfter, this.maxRetryDelay);
    }

    // Exponential backoff
    const delay = Math.min(
      this.initialRetryDelay * Math.pow(2, attempt - 1),
      this.maxRetryDelay,
    );
    return delay;
  }

  /**
   * Записать метрику ошибки
   */
  private recordError(type: keyof DiadocMetrics['errors']): void {
    this.metrics.errors[type]++;
    this.logger.warn(`Error metric: type=${type}, total=${this.metrics.errors[type]}`);
  }

  /**
   * VF-2: Записать метрику использования Severity fallback
   * Используется для мониторинга случаев, когда статус определяется по Severity вместо документированных полей
   */
  private recordSeverityFallback(): void {
    this.severityFallbackCount++;
    this.logger.debug(`Severity fallback used: count=${this.severityFallbackCount}`);
  }

  /**
   * VF-2: Получить количество использований Severity fallback
   */
  getSeverityFallbackCount(): number {
    return this.severityFallbackCount;
  }

  /**
   * Измерить время выполнения операции
   */
  private async measureDuration<T>(
    operation: () => Promise<T>,
    method: keyof DiadocMetrics['requestDurations'],
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      // Храним только последние 100 измерений для каждого метода
      if (this.metrics.requestDurations[method]) {
        this.metrics.requestDurations[method].push(duration);
        if (this.metrics.requestDurations[method].length > 100) {
          this.metrics.requestDurations[method].shift();
        }
      }

      this.logger.debug(`[${method}] Request duration: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${method}] Request failed after ${duration}ms: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Обертка для HTTP запросов с retry логикой и таймаутом
   */
  private async executeWithRetry<T = any>(
    request: Observable<AxiosResponse<T>>,
    context: { method: string; documentId?: string; fileName?: string },
  ): Promise<AxiosResponse<T>> {
    return firstValueFrom(
      request.pipe(
        timeout(this.requestTimeout),
        retryWhen((errors) =>
          errors.pipe(
            mergeMap((error, index) => {
              const attempt = index + 1;

              // Обработка rate limiting
              if (error.response?.status === 429) {
                this.recordError('rateLimit');
              }

              if (!this.isRetryableError(error)) {
                this.logger.error(
                  `[${context.method}] Non-retryable error (attempt ${attempt}): ${error.response?.status || 'network'} - ${error.message}`,
                  {
                    documentId: context.documentId,
                    fileName: context.fileName,
                    status: error.response?.status,
                    error: error.response?.data || error.message,
                  },
                );
                return throwError(() => error);
              }

              if (attempt > this.maxRetries) {
                this.logger.error(
                  `[${context.method}] Max retries (${this.maxRetries}) exceeded`,
                  {
                    documentId: context.documentId,
                    fileName: context.fileName,
                    attempts: attempt,
                    error: error.message,
                  },
                );
                return throwError(() => error);
              }

              const delay = this.calculateRetryDelay(attempt, error);
              this.logger.warn(
                `[${context.method}] Retry attempt ${attempt}/${this.maxRetries} after ${delay}ms`,
                {
                  documentId: context.documentId,
                  fileName: context.fileName,
                  attempt,
                  delay,
                  error: error.message,
                },
              );

              return timer(delay);
            }),
          ),
        ),
        catchError((error) => {
          const diadocError = this.handleError(error, context.method);
          throw diadocError;
        }),
      ),
    );
  }

  /**
   * Обработка ошибок и преобразование в DiadocError
   */
  private handleError(error: any, method: string): DiadocError {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.response?.data?.Message || error.message || 'Unknown error';
    const isTimeout = error.name === 'TimeoutError' || error.message?.includes('timeout');

    this.logger.error(`[${method}] Request failed: ${message}`, {
      status,
      isTimeout,
      error: error.response?.data || error.stack,
    });

    if (isTimeout) {
      this.recordError('timeout');
      return new DiadocError(
        `Request timeout: ${method} took longer than ${this.requestTimeout}ms`,
        DiadocErrorCode.TIMEOUT,
        undefined,
        true,
        this.initialRetryDelay,
      );
    }

    // Классифицируем ошибку
    let errorCode = DiadocErrorCode.UNKNOWN;
    let retryable = false;

    switch (status) {
      case 400:
        errorCode = DiadocErrorCode.INVALID_REQUEST;
        break;
      case 401:
        errorCode = DiadocErrorCode.AUTH_ERROR;
        this.authToken = null; // Сбрасываем токен
        this.recordError('auth');
        break;
      case 403:
        errorCode = DiadocErrorCode.ACCESS_DENIED;
        break;
      case 404:
        errorCode = DiadocErrorCode.DOCUMENT_NOT_FOUND;
        break;
      case 429:
        errorCode = DiadocErrorCode.RATE_LIMIT_EXCEEDED;
        retryable = true;
        this.recordError('rateLimit');
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorCode = DiadocErrorCode.SERVICE_UNAVAILABLE;
        retryable = true;
        this.recordError('temporary');
        break;
      default:
        if (!error.response) {
          errorCode = DiadocErrorCode.NETWORK_ERROR;
          retryable = true;
          this.recordError('temporary');
        } else {
          this.recordError('permanent');
        }
    }

    const retryAfter = this.getRetryAfterDelay(error);

    return new DiadocError(
      `Failed to ${method}: ${message}${status ? ` (HTTP ${status})` : ''}`,
      errorCode,
      status,
      retryable,
      retryAfter || undefined,
      error,
    );
  }

  /**
   * VF-2 FIX: Маппинг статуса из Diadoc API в внутренний enum
   * Используем строгие контракты согласно документации Diadoc API
   * @see https://developer.kontur.ru/doc/diadoc-api/proto/obsolete/BilateralDocumentMetadata.html
   * @see https://developer.kontur.ru/doc/diadoc-api/proto/RecipientResponseStatus.html
   */
  private mapStatus(status: string | undefined): DiadocDocumentStatus {
    if (!status) {
      return DiadocDocumentStatus.UNKNOWN;
    }

    const statusUpper = status.toUpperCase().trim();
    const statusLower = status.toLowerCase().trim();

    // 1. Маппинг статусов BilateralDocumentStatus (приоритетный)
    const apiStatusMap: Record<string, DiadocDocumentStatus> = {
      // Статусы ожидания подписи
      [DiadocApiDocumentStatus.OutboundWaitingForRecipientSignature.toUpperCase()]: DiadocDocumentStatus.WAITING_FOR_RECIPIENT_SIGNATURE,
      [DiadocApiDocumentStatus.InboundWaitingForRecipientSignature.toUpperCase()]: DiadocDocumentStatus.WAITING_FOR_RECIPIENT_SIGNATURE,
      [DiadocApiDocumentStatus.InternalWaitingForRecipientSignature.toUpperCase()]: DiadocDocumentStatus.WAITING_FOR_RECIPIENT_SIGNATURE,
      // Статусы ожидания подписи отправителя
      [DiadocApiDocumentStatus.OutboundWaitingForSenderSignature.toUpperCase()]: DiadocDocumentStatus.DRAFT,
      // Статусы подписанных документов
      [DiadocApiDocumentStatus.OutboundWithRecipientSignature.toUpperCase()]: DiadocDocumentStatus.SIGNED,
      [DiadocApiDocumentStatus.InboundWithRecipientSignature.toUpperCase()]: DiadocDocumentStatus.SIGNED,
      [DiadocApiDocumentStatus.InternalWithRecipientSignature.toUpperCase()]: DiadocDocumentStatus.SIGNED,
      // Статусы отклонённых документов
      [DiadocApiDocumentStatus.OutboundRecipientSignatureRequestRejected.toUpperCase()]: DiadocDocumentStatus.REJECTED,
      [DiadocApiDocumentStatus.InboundRecipientSignatureRequestRejected.toUpperCase()]: DiadocDocumentStatus.REJECTED,
      [DiadocApiDocumentStatus.InternalRecipientSignatureRequestRejected.toUpperCase()]: DiadocDocumentStatus.REJECTED,
      // Статусы недействительной подписи
      [DiadocApiDocumentStatus.OutboundInvalidSenderSignature.toUpperCase()]: DiadocDocumentStatus.ERROR,
      [DiadocApiDocumentStatus.InboundInvalidRecipientSignature.toUpperCase()]: DiadocDocumentStatus.ERROR,
      // Неизвестный статус
      [DiadocApiDocumentStatus.UnknownBilateralDocumentStatus.toUpperCase()]: DiadocDocumentStatus.UNKNOWN,
    };

    if (apiStatusMap[statusUpper]) {
      return apiStatusMap[statusUpper];
    }

    // 2. Маппинг RecipientResponseStatus (для ответа получателя)
    const recipientResponseMap: Record<string, DiadocDocumentStatus> = {
      'RECIPIENTRESPONSESTATUS_UNKNOWN': DiadocDocumentStatus.UNKNOWN,
      'RECIPIENTRESPONSESTATUSNONE': DiadocDocumentStatus.WAITING_FOR_RECIPIENT_SIGNATURE,
      'RECIPIENTRESPONSESTATUS_ACCEPTED': DiadocDocumentStatus.SIGNED,
      'RECIPIENTRESPONSESTATUS_REJECTED': DiadocDocumentStatus.REJECTED,
      'WAITINGFORRECIPIENTSIGNATURE': DiadocDocumentStatus.WAITING_FOR_RECIPIENT_SIGNATURE,
      'WITHRECIPIENTSIGNATURE': DiadocDocumentStatus.SIGNED,
      'RECIPIENTSIGNATUREREQUESTREJECTED': DiadocDocumentStatus.REJECTED,
    };

    if (recipientResponseMap[statusUpper]) {
      return recipientResponseMap[statusUpper];
    }

    // 3. Общие текстовые статусы (case-insensitive)
    const generalStatusMap: Record<string, DiadocDocumentStatus> = {
      'draft': DiadocDocumentStatus.DRAFT,
      'sent': DiadocDocumentStatus.SENT,
      'delivered': DiadocDocumentStatus.SENT,
      'signed': DiadocDocumentStatus.SIGNED,
      'rejected': DiadocDocumentStatus.REJECTED,
      'cancelled': DiadocDocumentStatus.CANCELLED,
      'canceled': DiadocDocumentStatus.CANCELLED,
      'revoked': DiadocDocumentStatus.CANCELLED,
      'error': DiadocDocumentStatus.ERROR,
      'invalid': DiadocDocumentStatus.ERROR,
      'waitingforsignature': DiadocDocumentStatus.WAITING_FOR_RECIPIENT_SIGNATURE,
      'waitingforrecipientsignature': DiadocDocumentStatus.WAITING_FOR_RECIPIENT_SIGNATURE,
      'waitingforsendersignature': DiadocDocumentStatus.DRAFT,
      'completed': DiadocDocumentStatus.SIGNED,
      'finished': DiadocDocumentStatus.SIGNED,
    };

    if (generalStatusMap[statusLower.replace(/[_\s-]/g, '')]) {
      return generalStatusMap[statusLower.replace(/[_\s-]/g, '')];
    }

    // ВАЖНО: НЕ используем Severity для определения статуса!
    // Severity - это уровень критичности, а не статус подписи.
    // @see https://developer.kontur.ru/doc/diadoc-api/proto/obsolete/DocflowStatusSeverity.html
    const severityValues = ['success', 'warning', 'info', 'error', 'unknownseverity'];
    if (severityValues.includes(statusLower)) {
      this.logger.warn(
        `Received Severity value "${status}" instead of proper status. ` +
        `This should not be used for status mapping. Check that RecipientResponseStatus or BilateralDocumentStatus is used.`,
      );
      // Не маппим Severity - возвращаем UNKNOWN
      return DiadocDocumentStatus.UNKNOWN;
    }

    // Если статус не распознан, логируем предупреждение с деталями для отладки
    this.logger.warn(
      `Unknown Diadoc status: "${status}". Returning UNKNOWN. ` +
      `Expected values: RecipientResponseStatus or BilateralDocumentStatus from Diadoc API.`,
    );
    return DiadocDocumentStatus.UNKNOWN;
  }
}
