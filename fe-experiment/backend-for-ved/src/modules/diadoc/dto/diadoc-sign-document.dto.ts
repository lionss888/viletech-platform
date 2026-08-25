import { IsString, IsNotEmpty, IsOptional, Matches, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * VF-2: DTO для запроса отправки документа на подписание через Diadoc
 *
 * Используется при отправке поручений на оплату, отчётов и договоров
 * контрагенту на подписание.
 *
 * @example
 * ```json
 * {
 *   "recipientInn": "1234567890",
 *   "recipientKpp": "123456789"
 * }
 * ```
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
export class DiadocSignDocumentDto {
  /**
   * ИНН организации-получателя для подписания
   *
   * Должен быть валидным ИНН (10 или 12 цифр).
   * По ИНН будет найден BoxId контрагента в системе Diadoc.
   *
   * @example "1234567890"
   */
  @ApiProperty({
    description: 'ИНН получателя для подписания (10 или 12 цифр)',
    example: '1234567890',
    minLength: 10,
    maxLength: 12,
  })
  @IsString()
  @IsNotEmpty({ message: 'ИНН получателя обязателен' })
  @Matches(/^\d{10}$|^\d{12}$/, { message: 'ИНН должен содержать 10 или 12 цифр' })
  recipientInn: string;

  /**
   * КПП организации-получателя (опционально)
   *
   * Указывается для уточнения, если у организации
   * несколько ящиков в Diadoc.
   *
   * @example "123456789"
   */
  @ApiPropertyOptional({
    description: 'КПП получателя (9 цифр, опционально)',
    example: '123456789',
    minLength: 9,
    maxLength: 9,
  })
  @IsString()
  @IsOptional()
  @Length(9, 9, { message: 'КПП должен содержать 9 цифр' })
  @Matches(/^\d{9}$/, { message: 'КПП должен содержать только цифры' })
  recipientKpp?: string;

  /**
   * Комментарий к отправке (опционально)
   *
   * Будет виден получателю в системе Diadoc.
   *
   * @example "Просьба подписать в течение 3 рабочих дней"
   */
  @ApiPropertyOptional({
    description: 'Комментарий к отправке',
    example: 'Просьба подписать в течение 3 рабочих дней',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @Length(0, 500, { message: 'Комментарий не должен превышать 500 символов' })
  comment?: string;
}

/**
 * VF-2: DTO для ответа на запрос отправки документа на подписание
 *
 * Возвращается после успешной отправки документа в Diadoc.
 *
 * @example
 * ```json
 * {
 *   "messageId": "msg-123-456",
 *   "entityId": "entity-789",
 *   "status": "sent",
 *   "recipientName": "ООО \"Компания\""
 * }
 * ```
 */
export class DiadocSignDocumentResponseDto {
  /**
   * ID сообщения в системе Diadoc
   *
   * Используется для отслеживания статуса подписания
   * и скачивания подписанного документа.
   *
   * @example "msg-123-456-789"
   */
  @ApiProperty({
    description: 'ID сообщения в Diadoc',
    example: 'msg-123-456-789',
  })
  messageId: string;

  /**
   * ID сущности документа внутри сообщения
   *
   * @example "entity-123"
   */
  @ApiPropertyOptional({
    description: 'ID сущности документа',
    example: 'entity-123',
  })
  entityId?: string;

  /**
   * Статус после отправки
   *
   * @example "sent"
   */
  @ApiPropertyOptional({
    description: 'Статус документа после отправки',
    example: 'sent',
  })
  status?: string;

  /**
   * Название организации-получателя
   *
   * @example "ООО \"Компания\""
   */
  @ApiPropertyOptional({
    description: 'Название организации-получателя',
    example: 'ООО "Компания"',
  })
  recipientName?: string;

  /**
   * BoxId организации-получателя
   *
   * @example "box-id@diadoc.ru"
   */
  @ApiPropertyOptional({
    description: 'BoxId организации-получателя',
    example: 'box-id@diadoc.ru',
  })
  recipientBoxId?: string;
}
