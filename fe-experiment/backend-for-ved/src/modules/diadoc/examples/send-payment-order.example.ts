/**
 * VF-2: Пример отправки поручения на оплату через Диадок
 *
 * Этот файл демонстрирует, как использовать интеграцию с Диадоком
 * для отправки поручения на оплату контрагенту на подписание.
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DIADOC_SERVICE } from '../diadoc.constants';
import { IDiadocService, DiadocDocumentStatus, DiadocError, DiadocErrorCode } from '../service/diadoc.service.interface';

/**
 * Пример сервиса, демонстрирующего работу с Diadoc
 */
@Injectable()
export class PaymentOrderDiadocExample {
  private readonly logger = new Logger(PaymentOrderDiadocExample.name);

  constructor(
    @Inject(DIADOC_SERVICE) private readonly diadocService: IDiadocService,
  ) {}

  /**
   * Пример 1: Простая отправка документа
   */
  async sendPaymentOrderSimple(
    fileBuffer: Buffer,
    fileName: string,
    recipientInn: string,
  ): Promise<string> {
    this.logger.log('Sending payment order to Diadoc...');

    try {
      // 1. Получаем BoxId контрагента по ИНН
      const recipientBoxId = await this.diadocService.getBoxIdByInn(recipientInn);

      if (!recipientBoxId) {
        throw new Error(`Recipient not found for INN: ${recipientInn}`);
      }

      // 2. Загружаем документ и отправляем
      const result = await this.diadocService.uploadDocument(
        fileBuffer,
        fileName,
        'application/pdf',
        recipientBoxId,
      );

      this.logger.log(`Payment order sent: messageId=${result.messageId}`);

      // 3. Записываем метрику
      this.diadocService.recordDocumentSent('paymentOrder');

      return result.messageId;
    } catch (error) {
      this.handleError(error, 'sendPaymentOrderSimple');
      throw error;
    }
  }

  /**
   * Пример 2: Отправка с проверкой статуса
   */
  async sendAndWaitForSignature(
    fileBuffer: Buffer,
    fileName: string,
    recipientInn: string,
    maxWaitTimeMs: number = 60000, // 1 минута
    checkIntervalMs: number = 5000, // 5 секунд
  ): Promise<{ messageId: string; status: DiadocDocumentStatus }> {
    // 1. Отправляем документ
    const messageId = await this.sendPaymentOrderSimple(fileBuffer, fileName, recipientInn);

    // 2. Ждём подписания
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTimeMs) {
      const status = await this.diadocService.getDocumentStatus(messageId);

      this.logger.log(`Document status: ${status}`);

      // Проверяем терминальные статусы
      if (status === DiadocDocumentStatus.SIGNED) {
        this.logger.log('Document signed!');
        this.diadocService.recordDocumentSigned();
        return { messageId, status };
      }

      if (status === DiadocDocumentStatus.REJECTED) {
        this.logger.warn('Document rejected');
        this.diadocService.recordDocumentRejected();
        return { messageId, status };
      }

      if (status === DiadocDocumentStatus.CANCELLED) {
        this.logger.warn('Document cancelled');
        return { messageId, status };
      }

      // Ждём перед следующей проверкой
      await this.sleep(checkIntervalMs);
    }

    this.logger.warn('Timeout waiting for signature');
    return { messageId, status: DiadocDocumentStatus.WAITING_FOR_RECIPIENT_SIGNATURE };
  }

  /**
   * Пример 3: Скачивание подписанного документа
   */
  async downloadSignedDocument(messageId: string): Promise<Buffer> {
    this.logger.log(`Downloading signed document: ${messageId}`);

    try {
      // 1. Проверяем статус
      const status = await this.diadocService.getDocumentStatus(messageId);

      if (status !== DiadocDocumentStatus.SIGNED) {
        throw new Error(`Document is not signed yet. Current status: ${status}`);
      }

      // 2. Скачиваем документ
      const buffer = await this.diadocService.getSignedDocument(messageId);

      this.logger.log(`Downloaded signed document: ${buffer.length} bytes`);

      return buffer;
    } catch (error) {
      this.handleError(error, 'downloadSignedDocument');
      throw error;
    }
  }

  /**
   * Пример 4: Полный workflow с обработкой ошибок
   */
  async fullWorkflow(
    fileBuffer: Buffer,
    fileName: string,
    recipientInn: string,
  ): Promise<{
    success: boolean;
    messageId?: string;
    signedDocument?: Buffer;
    error?: string;
  }> {
    try {
      // 1. Отправляем документ
      const { messageId, status } = await this.sendAndWaitForSignature(
        fileBuffer,
        fileName,
        recipientInn,
        300000, // 5 минут ожидания
      );

      // 2. Если подписан - скачиваем
      if (status === DiadocDocumentStatus.SIGNED) {
        const signedDocument = await this.downloadSignedDocument(messageId);
        return { success: true, messageId, signedDocument };
      }

      // 3. Если отклонён - возвращаем ошибку
      if (status === DiadocDocumentStatus.REJECTED) {
        return { success: false, messageId, error: 'Document was rejected by recipient' };
      }

      // 4. Если таймаут - документ ещё обрабатывается
      return { success: true, messageId, error: 'Document is still being processed' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Обработка ошибок Diadoc
   */
  private handleError(error: any, context: string): void {
    if (error instanceof DiadocError) {
      this.logger.error(`Diadoc error in ${context}:`, {
        code: error.code,
        message: error.message,
        httpStatus: error.httpStatus,
        retryable: error.retryable,
      });

      // Специфичная обработка по коду ошибки
      switch (error.code) {
        case DiadocErrorCode.AUTH_ERROR:
          this.logger.error('Authentication failed. Check credentials.');
          break;
        case DiadocErrorCode.COUNTERPARTY_NOT_FOUND:
          this.logger.error('Counterparty not found. Check INN.');
          break;
        case DiadocErrorCode.RATE_LIMIT_EXCEEDED:
          this.logger.warn(`Rate limited. Retry after ${error.retryAfter}ms`);
          break;
        default:
          break;
      }
    } else {
      this.logger.error(`Unknown error in ${context}: ${error}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Пример использования в контроллере:
 *
 * @Controller('payment-orders')
 * class PaymentOrderController {
 *   constructor(private readonly example: PaymentOrderDiadocExample) {}
 *
 *   @Post(':id/send-to-diadoc')
 *   async sendToDiadoc(@Param('id') id: string, @Body() dto: { recipientInn: string }) {
 *     const fileBuffer = await this.getPaymentOrderFile(id);
 *     const result = await this.example.sendPaymentOrderSimple(
 *       fileBuffer,
 *       `payment-order-${id}.pdf`,
 *       dto.recipientInn,
 *     );
 *     return { messageId: result };
 *   }
 * }
 */
