import { ITelegramSend, TelegramSendData } from '../service/telegram.service.interface';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Lang } from '../../../lib/enums/common.enums';
import { SenderFormPaymentEvents } from '../../../lib/enums/models/sender.enums';
import { Type } from 'class-transformer';
import { AccountTelegramDto } from '../../../lib/dto/models/account.dto';

export class TelegramSendDto implements ITelegramSend<TelegramSendData> {
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountTelegramDto)
  telegram?: AccountTelegramDto;

  @IsString()
  @IsNotEmpty()
  @IsEnum(SenderFormPaymentEvents)
  event: SenderFormPaymentEvents;

  @IsString()
  @IsNotEmpty()
  @IsEnum(Lang)
  language: Lang;

  @IsNotEmpty()
  @IsOptional()
  data: TelegramSendData;
}
