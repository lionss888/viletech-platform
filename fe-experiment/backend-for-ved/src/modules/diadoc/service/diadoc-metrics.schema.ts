import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * VF-2: Схема для хранения метрик Diadoc в MongoDB
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */

@Schema({ _id: false })
export class DocumentsSentMetrics {
  @Prop({ default: 0 })
  paymentOrder: number;

  @Prop({ default: 0 })
  report: number;

  @Prop({ default: 0 })
  contract: number;
}

@Schema({ _id: false })
export class ErrorsMetrics {
  @Prop({ default: 0 })
  temporary: number;

  @Prop({ default: 0 })
  permanent: number;

  @Prop({ default: 0 })
  timeout: number;

  @Prop({ default: 0 })
  auth: number;

  @Prop({ default: 0 })
  rateLimit: number;
}

@Schema({ _id: false })
export class RequestDurationsMetrics {
  @Prop({ type: [Number], default: [] })
  authenticate: number[];

  @Prop({ type: [Number], default: [] })
  uploadDocument: number[];

  @Prop({ type: [Number], default: [] })
  sendForSigning: number[];

  @Prop({ type: [Number], default: [] })
  getDocumentStatus: number[];

  @Prop({ type: [Number], default: [] })
  getSignedDocument: number[];

  @Prop({ type: [Number], default: [] })
  getOrganizationByInn: number[];
}

@Schema({ _id: false })
export class DiadocMetricsData {
  @Prop({ type: DocumentsSentMetrics, default: () => ({}) })
  documentsSent: DocumentsSentMetrics;

  @Prop({ default: 0 })
  documentsSigned: number;

  @Prop({ default: 0 })
  documentsRejected: number;

  @Prop({ type: ErrorsMetrics, default: () => ({}) })
  errors: ErrorsMetrics;

  @Prop({ type: RequestDurationsMetrics, default: () => ({}) })
  requestDurations: RequestDurationsMetrics;

  @Prop({ type: Date })
  lastUpdated?: Date;
}

@Schema({ _id: false })
export class MetricsPeriod {
  @Prop({ type: Date, required: true })
  start: Date;

  @Prop({ type: Date, required: true })
  end: Date;
}

@Schema({
  collection: 'diadoc_metrics',
  timestamps: true,
})
export class DiadocMetrics extends Document {
  @Prop({ required: true, enum: ['current', 'hourly', 'daily'], index: true })
  type: 'current' | 'hourly' | 'daily';

  @Prop({ required: true, type: Date, index: true })
  timestamp: Date;

  @Prop({ type: DiadocMetricsData, required: true })
  metrics: DiadocMetricsData;

  @Prop({ type: MetricsPeriod, required: false })
  period?: MetricsPeriod;
}

export const DiadocMetricsSchema = SchemaFactory.createForClass(DiadocMetrics);

// Индексы для оптимизации запросов
DiadocMetricsSchema.index({ type: 1, timestamp: -1 });

// TTL индекс для автоматического удаления старых записей
// Примечание: TTL управляется вручную в DiadocMetricsService для гибкости
