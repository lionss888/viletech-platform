/**
 * VF-2: Пример обработки Webhook от Диадока
 *
 * Этот файл демонстрирует, как настроить и обработать
 * webhook-уведомления от Диадока о статусе документов.
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */

import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { DiadocDocumentStatus } from '../service/diadoc.service.interface';

/**
 * DTO для webhook payload от Diadoc
 */
interface DiadocWebhookPayload {
  /** ID документа/сообщения в Diadoc */
  documentId: string;
  /** Новый статус документа */
  status: DiadocDocumentStatus;
  /** ID сообщения (опционально) */
  messageId?: string;
  /** Дополнительные данные (опционально) */
  metadata?: {
    /** Время события */
    timestamp?: string;
    /** Причина отклонения (если status = rejected) */
    rejectionReason?: string;
    /** ID подписи */
    signatureId?: string;
  };
}

/**
 * Результат обработки webhook
 */
interface WebhookResult {
  success: boolean;
  message: string;
  documentType?: 'paymentOrder' | 'report' | 'contract';
  entityId?: string;
  action?: string;
}

/**
 * Пример контроллера для обработки webhook от Diadoc
 *
 * Webhook URL для настройки в Diadoc:
 * https://your-domain.com/api/diadoc/webhook
 */
@ApiTags('diadoc-webhook-example')
@Controller('diadoc-webhook-example')
export class DiadocWebhookExampleController {
  private readonly logger = new Logger(DiadocWebhookExampleController.name);

  /**
   * Пример 1: Базовая обработка webhook
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook endpoint для Diadoc' })
  @ApiBody({ description: 'Payload от Diadoc' })
  @ApiResponse({ status: 200, description: 'Webhook обработан' })
  async handleWebhook(@Body() payload: DiadocWebhookPayload): Promise<WebhookResult> {
    this.logger.log('Received Diadoc webhook', {
      documentId: payload.documentId,
      status: payload.status,
    });

    try {
      // 1. Валидация payload
      this.validatePayload(payload);

      // 2. Определяем тип документа
      const documentType = await this.determineDocumentType(payload.documentId);

      // 3. Обрабатываем в зависимости от статуса
      switch (payload.status) {
        case DiadocDocumentStatus.SIGNED:
          return await this.handleSigned(payload, documentType);

        case DiadocDocumentStatus.REJECTED:
          return await this.handleRejected(payload, documentType);

        case DiadocDocumentStatus.CANCELLED:
          return await this.handleCancelled(payload, documentType);

        case DiadocDocumentStatus.WAITING_FOR_RECIPIENT_SIGNATURE:
          return await this.handleWaitingForSignature(payload, documentType);

        default:
          this.logger.warn(`Unhandled status: ${payload.status}`);
          return {
            success: true,
            message: `Status ${payload.status} acknowledged but not processed`,
          };
      }
    } catch (error) {
      this.logger.error('Failed to process webhook', {
        error: error instanceof Error ? error.message : String(error),
        payload,
      });

      // Важно: возвращаем 200, чтобы Diadoc не повторял webhook
      // Ошибку логируем и обрабатываем асинхронно
      return {
        success: false,
        message: 'Error processing webhook',
      };
    }
  }

  /**
   * Валидация payload
   */
  private validatePayload(payload: DiadocWebhookPayload): void {
    if (!payload.documentId) {
      throw new Error('documentId is required');
    }

    if (!payload.status) {
      throw new Error('status is required');
    }

    // Проверяем валидность статуса
    const validStatuses = Object.values(DiadocDocumentStatus);
    if (!validStatuses.includes(payload.status)) {
      throw new Error(`Invalid status: ${payload.status}`);
    }
  }

  /**
   * Определение типа документа по ID
   */
  private async determineDocumentType(
    documentId: string,
  ): Promise<'paymentOrder' | 'report' | 'contract' | 'unknown'> {
    // В реальной реализации:
    // 1. Ищем в FormPayment по paymentOrderDiadocDocumentId
    // 2. Ищем в FormPayment по reportDiadocDocumentId
    // 3. Ищем в Contract по diadocDocumentId

    // Пример заглушки:
    this.logger.debug(`Determining document type for: ${documentId}`);
    return 'paymentOrder'; // Заглушка
  }

  /**
   * Обработка подписанного документа
   */
  private async handleSigned(
    payload: DiadocWebhookPayload,
    documentType: string,
  ): Promise<WebhookResult> {
    this.logger.log(`Document signed: ${payload.documentId}, type: ${documentType}`);

    // В реальной реализации:
    // 1. Проверяем идемпотентность (не обработан ли уже)
    // 2. Скачиваем подписанный документ
    // 3. Сохраняем в FileService
    // 4. Обновляем статус в БД
    // 5. Отправляем уведомления

    return {
      success: true,
      message: 'Document signed and processed',
      documentType: documentType as any,
      action: 'downloaded_and_saved',
    };
  }

  /**
   * Обработка отклонённого документа
   */
  private async handleRejected(
    payload: DiadocWebhookPayload,
    documentType: string,
  ): Promise<WebhookResult> {
    const reason = payload.metadata?.rejectionReason || 'No reason provided';
    this.logger.warn(`Document rejected: ${payload.documentId}, reason: ${reason}`);

    // В реальной реализации:
    // 1. Обновляем статус в БД
    // 2. Сохраняем причину отклонения
    // 3. Отправляем уведомление пользователю

    return {
      success: true,
      message: `Document rejected: ${reason}`,
      documentType: documentType as any,
      action: 'status_updated',
    };
  }

  /**
   * Обработка отменённого документа
   */
  private async handleCancelled(
    payload: DiadocWebhookPayload,
    documentType: string,
  ): Promise<WebhookResult> {
    this.logger.log(`Document cancelled: ${payload.documentId}`);

    // В реальной реализации:
    // 1. Обновляем статус в БД
    // 2. Возможно, возвращаем к предыдущему статусу

    return {
      success: true,
      message: 'Document cancelled',
      documentType: documentType as any,
      action: 'status_updated',
    };
  }

  /**
   * Обработка ожидания подписи
   */
  private async handleWaitingForSignature(
    payload: DiadocWebhookPayload,
    documentType: string,
  ): Promise<WebhookResult> {
    this.logger.log(`Document waiting for signature: ${payload.documentId}`);

    // Обычно этот статус не требует действий
    // Можно использовать для отправки напоминаний

    return {
      success: true,
      message: 'Document is waiting for signature',
      documentType: documentType as any,
      action: 'acknowledged',
    };
  }
}

/**
 * Пример настройки webhook в Diadoc:
 *
 * 1. Войдите в личный кабинет Diadoc
 * 2. Перейдите в настройки интеграции
 * 3. Добавьте webhook URL: https://your-domain.com/api/diadoc/webhook
 * 4. Выберите события:
 *    - DocumentSigned
 *    - DocumentRejected
 *    - DocumentCancelled
 * 5. Настройте формат payload: JSON
 * 6. Сохраните настройки
 *
 * Рекомендации по безопасности:
 * - Используйте HTTPS
 * - Добавьте валидацию подписи запроса (если поддерживается)
 * - Ограничьте доступ по IP (IP-адреса Diadoc)
 * - Логируйте все входящие запросы
 */

/**
 * Пример middleware для валидации webhook
 */
export function validateDiadocWebhook(allowedIps: string[]) {
  return (req: any, res: any, next: any) => {
    const clientIp = req.ip || req.connection.remoteAddress;

    if (!allowedIps.includes(clientIp)) {
      console.warn(`Rejected webhook from unauthorized IP: ${clientIp}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

/**
 * Пример конфигурации в модуле:
 *
 * @Module({
 *   controllers: [DiadocWebhookExampleController],
 * })
 * export class DiadocWebhookExampleModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(validateDiadocWebhook(['195.16.98.0/24', '193.0.124.0/24']))
 *       .forRoutes('diadoc-webhook-example');
 *   }
 * }
 */
