import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { DiadocDocumentStatus } from '../service/diadoc.service.interface';

/**
 * VF-2: DTO для webhook-уведомлений от Diadoc
 *
 * Этот DTO используется для десериализации payload,
 * получаемого от Diadoc при изменении статуса документа.
 *
 * @example
 * ```json
 * {
 *   "documentId": "msg-123-456",
 *   "status": "signed",
 *   "messageId": "msg-123-456",
 *   "timestamp": "2025-01-15T10:30:00Z"
 * }
 * ```
 *
 * @see https://developer.kontur.ru/doc/diadoc-api/
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
export class DiadocWebhookDto {
  /**
   * ID документа в системе Diadoc
   * Используется для поиска связанной сущности в БД
   * (FormPayment или Contract)
   *
   * @example "msg-123-456-789"
   */
  @ApiProperty({
    description: 'ID документа в Diadoc (messageId)',
    example: 'msg-123-456-789',
  })
  @IsString()
  documentId: string;

  /**
   * Новый статус документа
   *
   * Возможные значения:
   * - draft - черновик
   * - sent - отправлен
   * - waiting_for_recipient_signature - ожидает подписи
   * - signed - подписан
   * - rejected - отклонён
   * - cancelled - отменён
   * - error - ошибка
   *
   * @example "signed"
   */
  @ApiProperty({
    description: 'Новый статус документа',
    enum: DiadocDocumentStatus,
    example: DiadocDocumentStatus.SIGNED,
  })
  @IsEnum(DiadocDocumentStatus)
  status: DiadocDocumentStatus;

  /**
   * ID сообщения в Diadoc (опционально)
   * Обычно совпадает с documentId
   *
   * @example "msg-123-456-789"
   */
  @ApiPropertyOptional({
    description: 'ID сообщения в Diadoc (обычно совпадает с documentId)',
    example: 'msg-123-456-789',
  })
  @IsString()
  @IsOptional()
  messageId?: string;

  /**
   * Время события (опционально)
   * ISO 8601 формат
   *
   * @example "2025-01-15T10:30:00Z"
   */
  @ApiPropertyOptional({
    description: 'Время события в формате ISO 8601',
    example: '2025-01-15T10:30:00Z',
  })
  @IsDateString()
  @IsOptional()
  timestamp?: string;

  /**
   * Причина отклонения (если статус = rejected)
   *
   * @example "Некорректные реквизиты"
   */
  @ApiPropertyOptional({
    description: 'Причина отклонения документа',
    example: 'Некорректные реквизиты',
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  /**
   * ID сущности документа внутри сообщения (опционально)
   *
   * @example "entity-123"
   */
  @ApiPropertyOptional({
    description: 'ID сущности документа внутри сообщения',
    example: 'entity-123',
  })
  @IsString()
  @IsOptional()
  entityId?: string;
}
