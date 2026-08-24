import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiadocDocumentStatus } from '../service/diadoc.service.interface';

/**
 * VF-2: DTO для ответа с информацией о статусе документа в Diadoc
 *
 * Используется в ответах API при запросе статуса документа.
 *
 * @example
 * ```json
 * {
 *   "status": "signed",
 *   "documentId": "msg-123",
 *   "messageId": "msg-123",
 *   "checkedAt": "2025-01-15T10:30:00Z"
 * }
 * ```
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
export class DiadocStatusResponseDto {
  /**
   * Текущий статус документа в системе Diadoc
   *
   * @example "signed"
   */
  @ApiProperty({
    description: 'Статус документа в Diadoc',
    enum: DiadocDocumentStatus,
    example: DiadocDocumentStatus.SIGNED,
  })
  status: DiadocDocumentStatus;

  /**
   * ID документа в Diadoc
   *
   * @example "msg-123-456"
   */
  @ApiPropertyOptional({
    description: 'ID документа в Diadoc',
    example: 'msg-123-456',
  })
  documentId?: string;

  /**
   * ID сообщения в Diadoc (обычно совпадает с documentId)
   *
   * @example "msg-123-456"
   */
  @ApiPropertyOptional({
    description: 'ID сообщения в Diadoc',
    example: 'msg-123-456',
  })
  messageId?: string;

  /**
   * Время проверки статуса
   *
   * @example "2025-01-15T10:30:00Z"
   */
  @ApiPropertyOptional({
    description: 'Время проверки статуса',
    type: Date,
  })
  checkedAt?: Date;

  /**
   * Описание статуса на русском языке
   *
   * @example "Документ подписан контрагентом"
   */
  @ApiPropertyOptional({
    description: 'Описание статуса',
    example: 'Документ подписан контрагентом',
  })
  statusDescription?: string;

  /**
   * Флаг терминального статуса
   * true если статус финальный (signed, rejected, cancelled)
   *
   * @example true
   */
  @ApiPropertyOptional({
    description: 'Является ли статус терминальным',
    example: true,
  })
  isTerminal?: boolean;
}

/**
 * DTO для запроса проверки статуса документа
 */
export class DiadocCheckStatusDto {
  /**
   * ID документа для проверки статуса
   *
   * @example "msg-123-456"
   */
  @ApiProperty({
    description: 'ID документа в Diadoc',
    example: 'msg-123-456',
  })
  documentId: string;

  /**
   * ID сущности внутри сообщения (опционально)
   *
   * @example "entity-789"
   */
  @ApiPropertyOptional({
    description: 'ID сущности документа',
    example: 'entity-789',
  })
  entityId?: string;
}
