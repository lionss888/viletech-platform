import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TreasurerTaskStatus } from '../../../lib/enums/models/treasurer-task.enums';

export class TreasurerTaskUpdateStatusDto {
  @ApiProperty({ enum: TreasurerTaskStatus, description: 'Новый статус задачи' })
  @IsEnum(TreasurerTaskStatus)
  status: TreasurerTaskStatus;
}

