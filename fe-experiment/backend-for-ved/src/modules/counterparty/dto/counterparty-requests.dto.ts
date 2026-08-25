import { ApiProperty } from '@nestjs/swagger';
import { FormPaymentDirection, FormPaymentStage, FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { AllCurrencies } from 'lib/enums/common.enums';

class CounterpartyRequestStatisticsDto {
  @ApiProperty({ description: 'Заявок на проверке' })
  pending: number;

  @ApiProperty({ description: 'Заявок одобрено' })
  approved: number;

  @ApiProperty({ description: 'Заявок отклонено' })
  rejected: number;

  @ApiProperty({ description: 'Других заявок' })
  other: number;
}

class CounterpartyInfoDto {
  @ApiProperty({ description: 'ID контрагента' })
  _id: string;

  @ApiProperty({ description: 'Название контрагента' })
  name: string;

  @ApiProperty({ description: 'Страна контрагента' })
  country: string;

  @ApiProperty({ description: 'ИНН контрагента (для российских)', required: false })
  inn?: string;
}

class RequestClientOrganizationDto {
  @ApiProperty({ description: 'Название организации клиента' })
  name: string;

  @ApiProperty({ description: 'ИНН организации клиента' })
  inn: string;
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

export class CounterpartyRequestItemDto {
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

  @ApiProperty({ type: RequestClientOrganizationDto, description: 'Организация клиента' })
  clientOrganization: RequestClientOrganizationDto;

  @ApiProperty({ type: RequestTotalsDto, description: 'Суммы' })
  totals: RequestTotalsDto;

  @ApiProperty({ type: RequestCurrencyDto, description: 'Валюты' })
  currency: RequestCurrencyDto;

  @ApiProperty({ type: Date, description: 'Дата создания' })
  createDate: Date;

  @ApiProperty({ type: Date, required: false, description: 'Дата отправки на проверку' })
  sentDate?: Date;
}

export class CounterpartyRequestsDto {
  @ApiProperty({ type: CounterpartyInfoDto, description: 'Информация о контрагенте' })
  counterparty: CounterpartyInfoDto;

  @ApiProperty({ type: CounterpartyRequestStatisticsDto, description: 'Статистика заявок' })
  statistics: CounterpartyRequestStatisticsDto;

  @ApiProperty({ type: [CounterpartyRequestItemDto], description: 'Список заявок' })
  items: CounterpartyRequestItemDto[];

  @ApiProperty({ description: 'Есть следующая страница' })
  hasNext: boolean;
}
