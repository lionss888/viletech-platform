import { Controller, Post, Get, Body, Logger, Inject, Optional, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiHeader } from '@nestjs/swagger';
import { DIADOC_SERVICE } from '../diadoc.constants';
import { IDiadocService, DiadocDocumentStatus, DiadocHealthStatus, DiadocMetrics } from '../service/diadoc.service.interface';
import { DiadocWebhookDto } from '../dto/diadoc-webhook.dto';
import { FORM_PAYMENT_SERVICE } from '../../form-payment/form-payment.constants';
import { IFormPaymentService } from '../../form-payment/service/form-payment.service.interface';
import { IContractService } from '../../contract/service/contract.service.interface';
import { DiadocWebhookProcessorService } from '../service/diadoc-webhook-processor.service';
import { DiadocMetricsService } from '../service/diadoc-metrics.service';
import { DiadocStatusCheckerService } from '../service/diadoc-status-checker.service';
import { DiadocWebhookGuard } from '../guards/diadoc-webhook.guard';

/**
 * DTO для ответа health check
 */
class DiadocHealthResponseDto implements DiadocHealthStatus {
  @ApiProperty({ description: 'Интеграция включена' })
  enabled: boolean;

  @ApiProperty({ description: 'Интеграция настроена' })
  configured: boolean;

  @ApiProperty({ description: 'API доступен' })
  apiReachable: boolean;

  @ApiProperty({ description: 'Аутентификация успешна' })
  authenticated: boolean;

  @ApiProperty({ description: 'Время последней проверки' })
  lastCheck: Date;

  @ApiProperty({ description: 'Сообщение об ошибке', required: false })
  error?: string;
}

/**
 * VF-2: Контроллер для работы с Diadoc
 * Обработка webhook, health check, метрики
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
@ApiTags('diadoc')
@Controller('diadoc')
export class DiadocController {
  private readonly logger: Logger = new Logger(DiadocController.name);

  constructor(
    private readonly webhookProcessor: DiadocWebhookProcessorService,
    @Inject(DIADOC_SERVICE) private readonly diadocService: IDiadocService,
    @Optional() private readonly metricsService?: DiadocMetricsService,
    @Optional() private readonly statusCheckerService?: DiadocStatusCheckerService,
    @Inject(FORM_PAYMENT_SERVICE) @Optional() private readonly formPaymentService?: IFormPaymentService,
    @Inject('IContractService') @Optional() private readonly contractService?: IContractService,
  ) {}

  /**
   * VF-2 FIX: Webhook для получения событий от Diadoc
   * Защищён DiadocWebhookGuard для проверки аутентификации
   */
  @Post('webhook')
  @UseGuards(DiadocWebhookGuard)
  @ApiOperation({
    summary: 'Webhook для получения событий от Diadoc',
    description: 'Endpoint для получения уведомлений о статусе документов от Diadoc API. Должен быть настроен в Diadoc как URL для webhook событий. Требует аутентификацию через заголовок X-Diadoc-Webhook-Secret.',
  })
  @ApiHeader({
    name: 'X-Diadoc-Webhook-Secret',
    description: 'Секретный ключ для аутентификации webhook запроса',
    required: false,
  })
  @ApiHeader({
    name: 'X-Diadoc-Webhook-Timestamp',
    description: 'Unix timestamp запроса для replay protection',
    required: false,
  })
  @ApiHeader({
    name: 'X-Diadoc-Webhook-Nonce',
    description: 'Уникальный идентификатор запроса для предотвращения дублей',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook обработан успешно',
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка обработки webhook (документ не найден, ошибка сохранения файла и т.д.)',
  })
  @ApiResponse({
    status: 401,
    description: 'Ошибка аутентификации webhook (неверный секрет, IP не в whitelist)',
  })
  async handleWebhook(@Body() payload: DiadocWebhookDto): Promise<{ success: boolean; message?: string }> {
    this.logger.log(`Received Diadoc webhook: documentId=${payload.documentId}, status=${payload.status}`);

    try {
      const { documentId, status } = payload;

      // 1. Пытаемся найти FormPayment по paymentOrderDiadocDocumentId
      let formPayment = await this.formPaymentService?.findOneByPaymentOrderDiadocDocumentId(documentId);

      if (formPayment) {
        await this.webhookProcessor.processFormPaymentPaymentOrderStatusChange(formPayment, documentId, status);
        return { success: true, message: 'Payment order status updated' };
      }

      // 2. Пытаемся найти FormPayment по reportDiadocDocumentId
      formPayment = await this.formPaymentService?.findOneByReportDiadocDocumentId(documentId);

      if (formPayment) {
        await this.webhookProcessor.processFormPaymentReportStatusChange(formPayment, documentId, status);
        return { success: true, message: 'Report status updated' };
      }

      // 3. Пытаемся найти Contract по diadocDocumentId
      const contract = await this.contractService?.findOneByDiadocDocumentId(documentId);

      if (contract) {
        await this.webhookProcessor.processContractStatusChange(contract, documentId, status);
        return { success: true, message: 'Contract status updated' };
      }

      this.logger.warn(`Document not found for Diadoc documentId: ${documentId}`);
      return { success: false, message: 'Document not found' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to handle Diadoc webhook: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Проверка здоровья интеграции с Diadoc
   */
  @Get('health')
  @ApiOperation({
    summary: 'Проверка здоровья интеграции с Diadoc',
    description: 'Проверяет доступность Diadoc API, корректность конфигурации и возможность аутентификации.',
  })
  @ApiResponse({
    status: 200,
    description: 'Статус здоровья интеграции',
    type: DiadocHealthResponseDto,
  })
  async checkHealth(): Promise<DiadocHealthStatus> {
    this.logger.debug('Health check requested');
    return this.diadocService.checkHealth();
  }

  /**
   * Получение текущих метрик
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'Получение метрик интеграции с Diadoc',
    description: 'Возвращает текущие метрики: количество отправленных/подписанных документов, ошибки, время выполнения запросов.',
  })
  @ApiResponse({
    status: 200,
    description: 'Текущие метрики',
  })
  async getMetrics(): Promise<{
    current: DiadocMetrics;
    averageRequestDurations: Record<string, number>;
    statusChecker?: {
      successCount: number;
      errorCount: number;
      cacheHitCount: number;
      cacheSize: number;
      lastRunTime: Date | null;
    };
  }> {
    const current = this.metricsService?.getCurrentMetrics() || this.diadocService.getMetrics();

    const methods: (keyof DiadocMetrics['requestDurations'])[] = [
      'authenticate',
      'uploadDocument',
      'sendForSigning',
      'getDocumentStatus',
      'getSignedDocument',
      'getOrganizationByInn',
    ];

    const averageRequestDurations: Record<string, number> = {};
    for (const method of methods) {
      averageRequestDurations[method] = this.diadocService.getAverageRequestDuration(method);
    }

    const result: any = {
      current,
      averageRequestDurations,
    };

    if (this.statusCheckerService) {
      result.statusChecker = this.statusCheckerService.getStatistics();
    }

    return result;
  }

  /**
   * Сброс метрик (только для тестирования/отладки)
   */
  @Post('metrics/reset')
  @ApiOperation({
    summary: 'Сброс метрик',
    description: 'Сбрасывает все текущие метрики. Используется только для тестирования и отладки.',
  })
  @ApiResponse({
    status: 200,
    description: 'Метрики сброшены',
  })
  async resetMetrics(): Promise<{ success: boolean }> {
    this.logger.warn('Metrics reset requested');

    if (this.metricsService) {
      await this.metricsService.resetCurrentMetrics();
    }

    if (this.statusCheckerService) {
      this.statusCheckerService.clearCache();
    }

    return { success: true };
  }

  /**
   * Принудительная проверка статуса документа
   */
  @Post('check-status')
  @ApiOperation({
    summary: 'Принудительная проверка статуса документа',
    description: 'Немедленно проверяет статус документа в Diadoc, игнорируя кэш.',
  })
  @ApiResponse({
    status: 200,
    description: 'Статус документа',
  })
  async checkDocumentStatus(@Body() body: { documentId: string }): Promise<{
    documentId: string;
    status: DiadocDocumentStatus;
    checkedAt: Date;
  }> {
    const { documentId } = body;

    if (!documentId) {
      throw new Error('documentId is required');
    }

    this.logger.log(`Force checking status for documentId: ${documentId}`);

    let status: DiadocDocumentStatus;

    if (this.statusCheckerService) {
      status = await this.statusCheckerService.forceCheckDocument(documentId);
    } else {
      status = await this.diadocService.getDocumentStatus(documentId);
    }

    return {
      documentId,
      status,
      checkedAt: new Date(),
    };
  }
}
