import { ApiProperty } from '@nestjs/swagger';
import { OrganizationStatus, OrganizationBusinessFormType } from 'lib/enums/models/organization.enums';

class OrganizationAccountDto {
  @ApiProperty({ description: 'ID аккаунта' })
  _id: string;

  @ApiProperty({ description: 'Email аккаунта' })
  email: string;

  @ApiProperty({ description: 'Имя пользователя', required: false })
  firstName?: string;

  @ApiProperty({ description: 'Фамилия пользователя', required: false })
  lastName?: string;
}

export class ClientOrganizationDto {
  @ApiProperty({ description: 'ID организации' })
  _id: string;

  @ApiProperty({ description: 'Название организации' })
  name: string;

  @ApiProperty({ description: 'Полное название', required: false })
  fullName?: string;

  @ApiProperty({ enum: OrganizationBusinessFormType, description: 'Организационно-правовая форма', required: false })
  businessForm?: OrganizationBusinessFormType;

  @ApiProperty({ description: 'ИНН' })
  inn: string;

  @ApiProperty({ description: 'ОГРН', required: false })
  ogrn?: string;

  @ApiProperty({ description: 'КПП', required: false })
  kpp?: string;

  @ApiProperty({ description: 'Юридический адрес', required: false })
  legalAddress?: string;

  @ApiProperty({ description: 'Телефон', required: false })
  phone?: string;

  @ApiProperty({ description: 'Email', required: false })
  email?: string;

  @ApiProperty({ enum: OrganizationStatus, description: 'Статус организации' })
  status: OrganizationStatus;

  @ApiProperty({ type: Date, description: 'Дата создания' })
  createDate: Date;

  @ApiProperty({ type: Date, description: 'Дата обновления', required: false })
  updateDate?: Date;

  @ApiProperty({ description: 'ID файла карточки организации', required: false })
  organizationCard?: string;

  @ApiProperty({ type: OrganizationAccountDto, description: 'Информация об аккаунте', required: false })
  account?: OrganizationAccountDto;
}
