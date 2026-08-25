import { ApiProperty } from '@nestjs/swagger';
import { OrganizationStatus } from 'lib/enums/models/organization.enums';

export class ClientOrganizationItemDto {
  @ApiProperty({ description: 'ID организации' })
  _id: string;

  @ApiProperty({ description: 'Название организации' })
  name: string;

  @ApiProperty({ description: 'ИНН' })
  inn: string;

  @ApiProperty({ enum: OrganizationStatus, description: 'Статус организации' })
  status: OrganizationStatus;

  @ApiProperty({ type: Date, description: 'Дата изменения статуса', required: false })
  statusUpdatedAt?: Date;

  @ApiProperty({ type: Date, description: 'Дата создания' })
  createDate: Date;

  @ApiProperty({ description: 'Всего заявок' })
  totalRequests: number;

  @ApiProperty({ description: 'Заявок на проверке' })
  pendingCount: number;

  @ApiProperty({ description: 'Заявок одобрено' })
  approvedCount: number;

  @ApiProperty({ description: 'Заявок отклонено' })
  rejectedCount: number;

  @ApiProperty({ description: 'Других заявок' })
  otherCount: number;
}

export class ClientOrganizationListDto {
  @ApiProperty({ type: [ClientOrganizationItemDto], description: 'Список клиентов' })
  items: ClientOrganizationItemDto[];

  @ApiProperty({ description: 'Есть следующая страница' })
  hasNext: boolean;
}
