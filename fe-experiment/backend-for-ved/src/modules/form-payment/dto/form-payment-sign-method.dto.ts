/**
 * VF-2: DTO для установки способа подписи документов
 *
 * Позволяет выбрать способ подписи поручения и отчёта:
 * - manual: подписание вручную (загрузка файла)
 * - diadoc: подписание через ЭДО (Diadoc)
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';

/**
 * Допустимые значения способа подписи
 */
export type SignMethodType = 'manual' | 'diadoc';

/**
 * DTO для установки способа подписи документов FormPayment
 */
export class FormPaymentSignMethodDto {
  @ApiPropertyOptional({
    enum: ['manual', 'diadoc'],
    description: 'Способ подписи поручения на оплату',
    example: 'diadoc',
  })
  @IsOptional()
  @IsIn(['manual', 'diadoc'], { message: 'paymentOrderSignMethod must be either "manual" or "diadoc"' })
  paymentOrderSignMethod?: SignMethodType;

  @ApiPropertyOptional({
    enum: ['manual', 'diadoc'],
    description: 'Способ подписи отчёта агента',
    example: 'diadoc',
  })
  @IsOptional()
  @IsIn(['manual', 'diadoc'], { message: 'reportSignMethod must be either "manual" or "diadoc"' })
  reportSignMethod?: SignMethodType;
}

/**
 * DTO ответа на запрос установки способа подписи
 */
export class FormPaymentSignMethodResponseDto {
  @ApiProperty({
    enum: ['manual', 'diadoc'],
    description: 'Текущий способ подписи поручения на оплату',
    example: 'diadoc',
    nullable: true,
  })
  paymentOrderSignMethod: SignMethodType | null;

  @ApiProperty({
    enum: ['manual', 'diadoc'],
    description: 'Текущий способ подписи отчёта агента',
    example: 'manual',
    nullable: true,
  })
  reportSignMethod: SignMethodType | null;

  @ApiProperty({
    description: 'Можно ли изменить способ подписи поручения',
    example: true,
  })
  canChangePaymentOrderSignMethod: boolean;

  @ApiProperty({
    description: 'Можно ли изменить способ подписи отчёта',
    example: true,
  })
  canChangeReportSignMethod: boolean;
}
