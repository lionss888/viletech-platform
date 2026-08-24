import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class FormPaymentCopyDto {
  @ApiProperty({
    description: 'Новая сумма заявки (обязательное поле)',
    example: 100000,
    minimum: 1,
    maximum: 999999999,
  })
  @IsNumber()
  @Min(1, { message: 'Сумма должна быть положительным числом' })
  @Max(999999999, { message: 'Сумма не должна превышать 999,999,999' })
  amount: number;

  @ApiProperty({
    description: 'Комментарий к копированию (необязательное поле)',
    example: 'Копия заявки с измененной суммой',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class FormPaymentCopyResponseDto {
  @ApiProperty({
    description: 'ID скопированной заявки',
    example: '64a1b2c3d4e5f6789012345',
  })
  _id: string;

  @ApiProperty({
    description: 'ID исходной заявки',
    example: '64a1b2c3d4e5f6789012346',
  })
  sourceFormId: string;

  @ApiProperty({
    description: 'Дата копирования',
    example: '2024-01-15T10:30:00Z',
  })
  copyDate: string;

  @ApiProperty({
    description: 'Статус новой заявки',
    example: 'DRAFT',
  })
  status: string;
}
