/**
 * VF-2: Пример отправки договора через Диадок
 *
 * Этот файл демонстрирует, как использовать интеграцию с Диадоком
 * для отправки договора контрагенту на подписание.
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DIADOC_SERVICE } from '../diadoc.constants';
import { IDiadocService, DiadocDocumentStatus, DiadocError, DiadocErrorCode } from '../service/diadoc.service.interface';

/**
 * Результат отправки договора
 */
interface ContractSendResult {
  success: boolean;
  messageId?: string;
  status?: DiadocDocumentStatus;
  error?: string;
  recipientOrganization?: {
    name: string;
    inn: string;
    boxId: string;
  };
}

/**
 * Пример сервиса для отправки договоров через Diadoc
 */
@Injectable()
export class ContractDiadocExample {
  private readonly logger = new Logger(ContractDiadocExample.name);

  constructor(
    @Inject(DIADOC_SERVICE) private readonly diadocService: IDiadocService,
  ) {}

  /**
   * Пример 1: Отправка договора с валидацией контрагента
   */
  async sendContractWithValidation(
    contractBuffer: Buffer,
    contractFileName: string,
    recipientInn: string,
    recipientKpp?: string,
  ): Promise<ContractSendResult> {
    this.logger.log(`Sending contract to counterparty: INN=${recipientInn}`);

    try {
      // 1. Проверяем наличие контрагента в Диадоке
      const organizations = await this.diadocService.getOrganizationsByInn(recipientInn, recipientKpp);

      if (organizations.length === 0) {
        return {
          success: false,
          error: `Organization with INN ${recipientInn} not found in Diadoc. The counterparty may not be registered.`,
        };
      }

      const organization = organizations[0];

      if (organization.boxes.length === 0) {
        return {
          success: false,
          error: `Organization ${organization.fullName} has no active boxes in Diadoc.`,
        };
      }

      const recipientBoxId = organization.boxes[0].boxId;

      this.logger.log(`Found counterparty: ${organization.fullName}, BoxId: ${recipientBoxId}`);

      // 2. Отправляем договор
      const result = await this.diadocService.uploadDocument(
        contractBuffer,
        contractFileName,
        'application/pdf',
        recipientBoxId,
      );

      // 3. Записываем метрику
      this.diadocService.recordDocumentSent('contract');

      this.logger.log(`Contract sent successfully: messageId=${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
        status: DiadocDocumentStatus.SENT,
        recipientOrganization: {
          name: organization.fullName,
          inn: organization.inn,
          boxId: recipientBoxId,
        },
      };
    } catch (error) {
      return this.handleError(error, 'sendContractWithValidation');
    }
  }

  /**
   * Пример 2: Проверка доступности контрагента перед отправкой
   */
  async checkCounterpartyAvailability(
    recipientInn: string,
    recipientKpp?: string,
  ): Promise<{
    available: boolean;
    organization?: {
      name: string;
      inn: string;
      kpp?: string;
      boxId: string;
    };
    error?: string;
  }> {
    try {
      const organizations = await this.diadocService.getOrganizationsByInn(recipientInn, recipientKpp);

      if (organizations.length === 0) {
        return {
          available: false,
          error: 'Organization not registered in Diadoc',
        };
      }

      const org = organizations[0];

      if (org.boxes.length === 0) {
        return {
          available: false,
          error: 'Organization has no active boxes',
        };
      }

      return {
        available: true,
        organization: {
          name: org.fullName,
          inn: org.inn,
          kpp: org.kpp,
          boxId: org.boxes[0].boxId,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        available: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Пример 3: Получение статуса договора
   */
  async getContractStatus(messageId: string): Promise<{
    status: DiadocDocumentStatus;
    statusDescription: string;
    isTerminal: boolean;
  }> {
    const status = await this.diadocService.getDocumentStatus(messageId);

    const statusDescriptions: Record<DiadocDocumentStatus, string> = {
      [DiadocDocumentStatus.DRAFT]: 'Договор в черновиках',
      [DiadocDocumentStatus.SENT]: 'Договор отправлен контрагенту',
      [DiadocDocumentStatus.WAITING_FOR_RECIPIENT_SIGNATURE]: 'Ожидает подписи контрагента',
      [DiadocDocumentStatus.SIGNED]: 'Договор подписан контрагентом',
      [DiadocDocumentStatus.REJECTED]: 'Договор отклонён контрагентом',
      [DiadocDocumentStatus.CANCELLED]: 'Договор отменён',
      [DiadocDocumentStatus.ERROR]: 'Ошибка обработки договора',
      [DiadocDocumentStatus.UNKNOWN]: 'Неизвестный статус',
    };

    const terminalStatuses = [
      DiadocDocumentStatus.SIGNED,
      DiadocDocumentStatus.REJECTED,
      DiadocDocumentStatus.CANCELLED,
      DiadocDocumentStatus.ERROR,
    ];

    return {
      status,
      statusDescription: statusDescriptions[status] || 'Неизвестный статус',
      isTerminal: terminalStatuses.includes(status),
    };
  }

  /**
   * Пример 4: Скачивание подписанного договора
   */
  async downloadSignedContract(messageId: string): Promise<Buffer | null> {
    const { status, isTerminal, statusDescription } = await this.getContractStatus(messageId);

    if (status !== DiadocDocumentStatus.SIGNED) {
      this.logger.warn(`Cannot download: ${statusDescription}`);

      if (!isTerminal) {
        this.logger.log('Contract is still being processed');
      }

      return null;
    }

    return this.diadocService.getSignedDocument(messageId);
  }

  /**
   * Обработка ошибок с формированием результата
   */
  private handleError(error: any, context: string): ContractSendResult {
    if (error instanceof DiadocError) {
      this.logger.error(`Diadoc error in ${context}: ${error.message}`, {
        code: error.code,
        httpStatus: error.httpStatus,
      });

      const userMessages: Partial<Record<DiadocErrorCode, string>> = {
        [DiadocErrorCode.AUTH_ERROR]: 'Ошибка авторизации в Диадоке. Обратитесь к администратору.',
        [DiadocErrorCode.COUNTERPARTY_NOT_FOUND]: 'Контрагент не найден в системе Диадок.',
        [DiadocErrorCode.ACCESS_DENIED]: 'Недостаточно прав для выполнения операции.',
        [DiadocErrorCode.RATE_LIMIT_EXCEEDED]: 'Превышен лимит запросов. Попробуйте позже.',
        [DiadocErrorCode.SERVICE_UNAVAILABLE]: 'Сервис Диадок временно недоступен.',
        [DiadocErrorCode.FILE_TOO_LARGE]: 'Размер файла договора превышает допустимый лимит.',
      };

      return {
        success: false,
        error: userMessages[error.code] || error.message,
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`Unknown error in ${context}: ${errorMessage}`);

    return {
      success: false,
      error: 'Произошла ошибка при отправке договора.',
    };
  }
}

/**
 * Пример использования:
 *
 * const example = new ContractDiadocExample(diadocService);
 *
 * // Проверка доступности контрагента
 * const availability = await example.checkCounterpartyAvailability('1234567890');
 * if (!availability.available) {
 *   console.log('Counterparty not available:', availability.error);
 *   return;
 * }
 *
 * // Отправка договора
 * const result = await example.sendContractWithValidation(
 *   contractBuffer,
 *   'contract-123.pdf',
 *   '1234567890',
 * );
 *
 * if (result.success) {
 *   console.log('Contract sent:', result.messageId);
 *
 *   // Проверка статуса
 *   const status = await example.getContractStatus(result.messageId);
 *   console.log('Status:', status.statusDescription);
 *
 *   // Скачивание подписанного
 *   if (status.status === DiadocDocumentStatus.SIGNED) {
 *     const signedDoc = await example.downloadSignedContract(result.messageId);
 *     await fs.writeFile('signed-contract.pdf', signedDoc);
 *   }
 * }
 */
