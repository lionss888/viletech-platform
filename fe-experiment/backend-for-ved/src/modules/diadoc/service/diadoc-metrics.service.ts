import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DiadocMetrics } from './diadoc.service.interface';
import { ConfigService } from '@nestjs/config';

/**
 * Интерфейс записи метрик в MongoDB
 */
export interface DiadocMetricsRecord {
  _id?: string;
  type: 'current' | 'hourly' | 'daily';
  timestamp: Date;
  metrics: DiadocMetrics;
  period?: {
    start: Date;
    end: Date;
  };
}

/**
 * VF-2: Сервис для хранения и агрегации метрик Diadoc
 * Использует MongoDB для хранения метрик с TTL
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
@Injectable()
export class DiadocMetricsService {
  private readonly logger: Logger = new Logger(DiadocMetricsService.name);
  private readonly enabled: boolean;

  // Текущие метрики в памяти для быстрого доступа
  private currentMetrics: DiadocMetrics = this.createEmptyMetrics();

  // TTL для разных типов метрик (в миллисекундах)
  private readonly ttlCurrent = 24 * 60 * 60 * 1000; // 1 день
  private readonly ttlHourly = 7 * 24 * 60 * 60 * 1000; // 7 дней
  private readonly ttlDaily = 30 * 24 * 60 * 60 * 1000; // 30 дней

  constructor(
    @Optional() private readonly configService?: ConfigService,
    @InjectModel('DiadocMetrics') @Optional() private readonly metricsModel?: Model<DiadocMetricsRecord>,
  ) {
    this.enabled = this.configService?.get('diadoc.enabled') || false;

    if (this.enabled) {
      this.loadCurrentMetrics();
    }
  }

  /**
   * Создаёт пустой объект метрик
   */
  private createEmptyMetrics(): DiadocMetrics {
    return {
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
  }

  /**
   * Загружает текущие метрики из MongoDB
   */
  private async loadCurrentMetrics(): Promise<void> {
    if (!this.metricsModel) {
      this.logger.warn('Metrics model not available, using in-memory storage');
      return;
    }

    try {
      const record = await this.metricsModel.findOne({ type: 'current' }).sort({ timestamp: -1 });
      if (record) {
        this.currentMetrics = record.metrics;
        this.logger.log('Loaded current metrics from database');
      }
    } catch (error) {
      this.logger.error(`Failed to load metrics from database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Сохраняет текущие метрики в MongoDB
   */
  private async saveCurrentMetrics(): Promise<void> {
    if (!this.metricsModel) {
      return;
    }

    try {
      this.currentMetrics.lastUpdated = new Date();

      await this.metricsModel.findOneAndUpdate(
        { type: 'current' },
        {
          type: 'current',
          timestamp: new Date(),
          metrics: this.currentMetrics,
        },
        { upsert: true, new: true },
      );
    } catch (error) {
      this.logger.error(`Failed to save metrics to database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Инкремент счётчика отправленных документов
   */
  async incrementDocumentSent(type: 'paymentOrder' | 'report' | 'contract'): Promise<void> {
    this.currentMetrics.documentsSent[type]++;
    this.currentMetrics.lastUpdated = new Date();
    await this.saveCurrentMetrics();

    this.logger.debug(`Document sent metric incremented: type=${type}, total=${this.currentMetrics.documentsSent[type]}`);
  }

  /**
   * Инкремент счётчика подписанных документов
   */
  async incrementDocumentSigned(): Promise<void> {
    this.currentMetrics.documentsSigned++;
    this.currentMetrics.lastUpdated = new Date();
    await this.saveCurrentMetrics();

    this.logger.debug(`Document signed metric incremented: total=${this.currentMetrics.documentsSigned}`);
  }

  /**
   * Инкремент счётчика отклонённых документов
   */
  async incrementDocumentRejected(): Promise<void> {
    this.currentMetrics.documentsRejected++;
    this.currentMetrics.lastUpdated = new Date();
    await this.saveCurrentMetrics();

    this.logger.debug(`Document rejected metric incremented: total=${this.currentMetrics.documentsRejected}`);
  }

  /**
   * Инкремент счётчика ошибок
   */
  async incrementError(type: keyof DiadocMetrics['errors']): Promise<void> {
    this.currentMetrics.errors[type]++;
    this.currentMetrics.lastUpdated = new Date();
    await this.saveCurrentMetrics();

    this.logger.debug(`Error metric incremented: type=${type}, total=${this.currentMetrics.errors[type]}`);
  }

  /**
   * Запись времени выполнения запроса
   */
  async recordRequestDuration(method: keyof DiadocMetrics['requestDurations'], duration: number): Promise<void> {
    if (!this.currentMetrics.requestDurations[method]) {
      this.currentMetrics.requestDurations[method] = [];
    }

    this.currentMetrics.requestDurations[method].push(duration);

    // Храним только последние 100 измерений
    if (this.currentMetrics.requestDurations[method].length > 100) {
      this.currentMetrics.requestDurations[method].shift();
    }

    this.currentMetrics.lastUpdated = new Date();
    // Не сохраняем каждый раз для производительности
  }

  /**
   * Получение текущих метрик
   */
  getCurrentMetrics(): DiadocMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Получение среднего времени выполнения запроса
   */
  getAverageRequestDuration(method: keyof DiadocMetrics['requestDurations']): number {
    const durations = this.currentMetrics.requestDurations[method];
    if (!durations || durations.length === 0) {
      return 0;
    }
    const sum = durations.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / durations.length);
  }

  /**
   * Получение истории метрик за период
   */
  async getMetricsHistory(
    type: 'hourly' | 'daily',
    startDate: Date,
    endDate: Date,
  ): Promise<DiadocMetricsRecord[]> {
    if (!this.metricsModel) {
      return [];
    }

    try {
      const records = await this.metricsModel.find({
        type,
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      }).sort({ timestamp: 1 });

      return records;
    } catch (error) {
      this.logger.error(`Failed to get metrics history: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Агрегация метрик по периодам
   */
  private aggregateMetrics(records: DiadocMetricsRecord[]): DiadocMetrics {
    const aggregated = this.createEmptyMetrics();

    for (const record of records) {
      const m = record.metrics;

      aggregated.documentsSent.paymentOrder += m.documentsSent.paymentOrder;
      aggregated.documentsSent.report += m.documentsSent.report;
      aggregated.documentsSent.contract += m.documentsSent.contract;
      aggregated.documentsSigned += m.documentsSigned;
      aggregated.documentsRejected += m.documentsRejected;

      aggregated.errors.temporary += m.errors.temporary;
      aggregated.errors.permanent += m.errors.permanent;
      aggregated.errors.timeout += m.errors.timeout;
      aggregated.errors.auth += m.errors.auth;
      aggregated.errors.rateLimit += m.errors.rateLimit;
    }

    aggregated.lastUpdated = new Date();
    return aggregated;
  }

  /**
   * Сброс текущих метрик
   */
  async resetCurrentMetrics(): Promise<void> {
    this.currentMetrics = this.createEmptyMetrics();
    await this.saveCurrentMetrics();
    this.logger.log('Current metrics reset');
  }

  /**
   * Периодическое сохранение метрик (каждые 5 минут)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async saveMetricsPeriodically(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.saveCurrentMetrics();
    this.logger.debug('Metrics saved periodically');
  }

  /**
   * Агрегация почасовых метрик (каждый час)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async aggregateHourlyMetrics(): Promise<void> {
    if (!this.enabled || !this.metricsModel) {
      return;
    }

    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      await this.metricsModel.create({
        type: 'hourly',
        timestamp: now,
        metrics: { ...this.currentMetrics },
        period: {
          start: hourAgo,
          end: now,
        },
      });

      this.logger.debug('Hourly metrics aggregated');
    } catch (error) {
      this.logger.error(`Failed to aggregate hourly metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Агрегация дневных метрик (каждый день в полночь)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyMetrics(): Promise<void> {
    if (!this.enabled || !this.metricsModel) {
      return;
    }

    try {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Получаем все почасовые метрики за последние 24 часа
      const hourlyRecords = await this.metricsModel.find({
        type: 'hourly',
        timestamp: {
          $gte: dayAgo,
          $lte: now,
        },
      });

      const aggregated = this.aggregateMetrics(hourlyRecords);

      await this.metricsModel.create({
        type: 'daily',
        timestamp: now,
        metrics: aggregated,
        period: {
          start: dayAgo,
          end: now,
        },
      });

      this.logger.log('Daily metrics aggregated');
    } catch (error) {
      this.logger.error(`Failed to aggregate daily metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Очистка устаревших метрик (каждый день)
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cleanupOldMetrics(): Promise<void> {
    if (!this.enabled || !this.metricsModel) {
      return;
    }

    try {
      const now = new Date();

      // Удаляем почасовые метрики старше 7 дней
      const hourlyThreshold = new Date(now.getTime() - this.ttlHourly);
      const hourlyDeleted = await this.metricsModel.deleteMany({
        type: 'hourly',
        timestamp: { $lt: hourlyThreshold },
      });

      // Удаляем дневные метрики старше 30 дней
      const dailyThreshold = new Date(now.getTime() - this.ttlDaily);
      const dailyDeleted = await this.metricsModel.deleteMany({
        type: 'daily',
        timestamp: { $lt: dailyThreshold },
      });

      this.logger.log(`Cleaned up old metrics: hourly=${hourlyDeleted.deletedCount}, daily=${dailyDeleted.deletedCount}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup old metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
