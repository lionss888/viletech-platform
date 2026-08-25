import { ApiProperty } from '@nestjs/swagger';
import { FormPaymentDirection, FormPaymentStage, FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { AllCurrencies } from 'lib/enums/common.enums';

class RequestStatisticsDto {
  @ApiProperty({ description: 'Заявок на проверке' })
  pending: number;

  @ApiProperty({ description: 'Заявок одобрено' })
  approved: number;

  @ApiProperty({ description: 'Заявок отклонено' })
  rejected: number;

  @ApiProperty({ description: 'Других заявок' })
  other: number;
}

class RequestOrganizationDto {
  @ApiProperty({ description: 'ID организации' })
  _id: string;

  @ApiProperty({ description: 'Название организации' })
  name: string;

  @ApiProperty({ description: 'ИНН' })
  inn: string;
}

class RequestCounterpartyDto {
  @ApiProperty({ description: 'Название контрагента' })
  name: string;
}

class RequestTotalsDto {
  @ApiProperty({ description: 'Сумма платежа' })
  amount: number;
}

class RequestCurrencyDto {
  @ApiProperty({ enum: AllCurrencies, description: 'Валюта клиента' })
  client: AllCurrencies;

  @ApiProperty({ enum: AllCurrencies, description: 'Валюта контрагента' })
  counterparty: AllCurrencies;
}

export class ClientOrganizationRequestItemDto {
  @ApiProperty({ description: 'ID заявки' })
  _id: string;

  @ApiProperty({ description: 'Номер заявки' })
  uid: number;

  @ApiProperty({ enum: FormPaymentStatus, description: 'Статус заявки' })
  status: FormPaymentStatus;

  @ApiProperty({ enum: FormPaymentStage, description: 'Этап заявки' })
  stage: FormPaymentStage;

  @ApiProperty({ enum: FormPaymentDirection, description: 'Направление' })
  direction: FormPaymentDirection;

  @ApiProperty({ type: RequestCounterpartyDto, description: 'Контрагент' })
  counterparty: RequestCounterpartyDto;

  @ApiProperty({ type: RequestTotalsDto, description: 'Суммы' })
  totals: RequestTotalsDto;

  @ApiProperty({ type: RequestCurrencyDto, description: 'Валюты' })
  currency: RequestCurrencyDto;

  @ApiProperty({ type: Date, description: 'Дата создания' })
  createDate: Date;

  @ApiProperty({ type: Date, required: false, description: 'Дата отправки на проверку' })
  sentDate?: Date;
}

export class ClientOrganizationRequestsDto {
  @ApiProperty({ type: RequestOrganizationDto, description: 'Информация об организации' })
  organization: RequestOrganizationDto;

  @ApiProperty({ type: RequestStatisticsDto, description: 'Статистика заявок' })
  statistics: RequestStatisticsDto;

  @ApiProperty({ type: [ClientOrganizationRequestItemDto], description: 'Список заявок' })
  items: ClientOrganizationRequestItemDto[];

  @ApiProperty({ description: 'Есть следующая страница' })
  hasNext: boolean;
}
